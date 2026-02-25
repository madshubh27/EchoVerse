"""
Token Proxy API
===============
Lightweight FastAPI proxy that fronts the EchoVerse API.
Clients call GET /api/voice-token — this service validates the
request, calls the EchoVerse API to mint a LiveKit JWT, and
returns { url, token, session_id } to the caller.

Also provides a POST /api/chat endpoint for demo mode (when
LiveKit is not configured) that generates AI-like responses.

Improvements v2:
 - In-memory sliding-window rate limiter per IP
 - Circuit breaker for upstream EchoVerse API
 - Request-ID tracing on every response
 - Structured request logging middleware
 - Pydantic input validation for chat messages
 - Retry with exponential back-off for OpenAI 429s
 - Tool-name allow-list to prevent path traversal
 - Global unhandled-exception handler
"""

import os
import uuid
import time
import logging
import asyncio
from contextlib import asynccontextmanager
from collections import defaultdict
from typing import Optional, List

import httpx
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# ── Structured Logging ────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("token-proxy")

# ── Config ────────────────────────────────────────────────────────
VOCAL_BRIDGE_API_URL = os.getenv("VOCAL_BRIDGE_API_URL", "http://localhost:8001")
VOCAL_BRIDGE_API_KEY = os.getenv("VOCAL_BRIDGE_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
RATE_LIMIT_RPM = int(os.getenv("RATE_LIMIT_RPM", "60"))
MAX_CHAT_MSG_LEN = 2000
MAX_CHAT_HISTORY = 20


# ── Rate Limiter (Sliding Window) ─────────────────────────────────
class RateLimiter:
    """In-memory sliding-window rate limiter keyed by IP."""

    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        cutoff = now - self.window
        self._hits[key] = [t for t in self._hits[key] if t > cutoff]
        if len(self._hits[key]) >= self.max_requests:
            return False
        self._hits[key].append(now)
        return True

    def remaining(self, key: str) -> int:
        now = time.time()
        cutoff = now - self.window
        self._hits[key] = [t for t in self._hits[key] if t > cutoff]
        return max(0, self.max_requests - len(self._hits[key]))


rate_limiter = RateLimiter(max_requests=RATE_LIMIT_RPM)


# ── Circuit Breaker ───────────────────────────────────────────────
class CircuitBreaker:
    """Prevents cascading failures when upstream is unhealthy."""

    def __init__(self, threshold: int = 5, recovery_s: float = 30.0):
        self.threshold = threshold
        self.recovery_s = recovery_s
        self.failures = 0
        self.last_failure = 0.0
        self.state = "closed"  # closed | open | half-open

    def record_success(self):
        self.failures = 0
        self.state = "closed"

    def record_failure(self):
        self.failures += 1
        self.last_failure = time.time()
        if self.failures >= self.threshold:
            self.state = "open"
            logger.warning("Circuit breaker OPEN after %d failures", self.failures)

    def can_proceed(self) -> bool:
        if self.state == "closed":
            return True
        if self.state == "open" and time.time() - self.last_failure > self.recovery_s:
            self.state = "half-open"
            return True
        return self.state == "half-open"


upstream_breaker = CircuitBreaker()

# ── HTTP Client ───────────────────────────────────────────────────
http_client: Optional[httpx.AsyncClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(30.0, connect=10.0),
        limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
    )
    logger.info(
        "Token Proxy started — upstream=%s, rate_limit=%d RPM, openai=%s",
        VOCAL_BRIDGE_API_URL, RATE_LIMIT_RPM,
        "configured" if OPENAI_API_KEY else "demo-mode",
    )
    yield
    logger.info("Shutting down — draining connections…")
    await http_client.aclose()
    logger.info("Shutdown complete.")


# ── App ───────────────────────────────────────────────────────────
app = FastAPI(
    title="EchoVerse – Token Proxy",
    version="2.0.0",
    description="Voice token proxy with rate limiting, circuit breaking, and chat API.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Middleware: Request ID + Logging + Rate Limiting ──────────────
@app.middleware("http")
async def request_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
    start = time.time()
    client_ip = request.client.host if request.client else "unknown"

    # Rate-limit check
    if not rate_limiter.is_allowed(client_ip):
        logger.warning("Rate limited %s %s from %s", request.method, request.url.path, client_ip)
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Try again later."},
            headers={"Retry-After": "60", "X-Request-ID": request_id},
        )

    response: Response = await call_next(request)
    elapsed_ms = (time.time() - start) * 1000

    response.headers["X-Request-ID"] = request_id
    response.headers["X-RateLimit-Remaining"] = str(rate_limiter.remaining(client_ip))

    if request.url.path != "/health":  # skip noisy health probes
        logger.info(
            "%s %s → %d (%.1fms) [%s] ip=%s",
            request.method, request.url.path, response.status_code,
            elapsed_ms, request_id, client_ip,
        )
    return response


# ── Models for chat ──────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str = Field(..., pattern=r"^(user|assistant|system)$")
    content: str = Field(..., min_length=1, max_length=MAX_CHAT_MSG_LEN)

    @validator("content")
    def strip_whitespace(cls, v):
        return v.strip()


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., min_length=1, max_length=MAX_CHAT_HISTORY)
    session_id: str = ""


# ── Demo responses for when OpenAI isn't configured ──────────────

DEMO_RESPONSES = {
    "hello": "Hello! I'm EchoVerse, your AI voice assistant. I can help you post Slack messages, create Jira tickets, send emails, and update status pages. What would you like to do?",
    "hi": "Hi there! I'm EchoVerse. How can I assist you today? I can help with Slack, Jira, email, and status page updates.",
    "help": "I can help you with: 1) Posting messages to Slack channels, 2) Creating Jira tickets for incidents, 3) Sending email notifications, 4) Updating your status page. Just tell me what you need!",
    "slack": "Sure! I can post a message to Slack. Which channel would you like me to post to, and what should the message say?",
    "jira": "I can create a Jira ticket for you. What should the title be, and how would you describe the issue?",
    "email": "I can send an email. Who should I send it to, what's the subject, and what should the message say?",
    "status": "I can update your status page. Which component needs to be updated, and what's the new status?",
    "default": "I understand. As EchoVerse, I can help you with Slack messages, Jira tickets, emails, and status page updates. Could you tell me more about what you need?",
}


def get_demo_response(user_message: str) -> str:
    """Generate a demo response based on keyword matching."""
    msg = user_message.lower().strip()
    for key, response in DEMO_RESPONSES.items():
        if key in msg:
            return response
    return DEMO_RESPONSES["default"]


# ── Endpoints ─────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "token-proxy",
        "version": "2.0.0",
        "upstream": "healthy" if upstream_breaker.state == "closed" else upstream_breaker.state,
        "openai": "configured" if OPENAI_API_KEY else "demo",
    }


@app.get("/api/voice-token")
async def get_voice_token():
    """
    Client-facing endpoint.
    Calls the EchoVerse API to mint a LiveKit token.
    Returns: { url, token, session_id }
    """
    if not upstream_breaker.can_proceed():
        raise HTTPException(status_code=503, detail="Upstream temporarily unavailable — retrying soon.")

    try:
        resp = await http_client.post(
            f"{VOCAL_BRIDGE_API_URL}/api/v1/token",
            headers={"X-API-Key": VOCAL_BRIDGE_API_KEY} if VOCAL_BRIDGE_API_KEY else {},
            json={"identity": "web-user"},
        )
        resp.raise_for_status()
        data = resp.json()
        upstream_breaker.record_success()
        return {
            "url": data.get("live_url", ""),
            "token": data.get("token", ""),
            "session_id": data.get("session_id", ""),
        }
    except httpx.HTTPStatusError as e:
        upstream_breaker.record_failure()
        logger.error("EchoVerse API HTTP %s: %s", e.response.status_code, e.response.text[:200])
        raise HTTPException(status_code=502, detail="Failed to mint token")
    except httpx.RequestError as e:
        upstream_breaker.record_failure()
        logger.error("Connection to EchoVerse API failed: %s", str(e))
        raise HTTPException(status_code=502, detail="EchoVerse API unreachable")


@app.post("/api/chat")
async def chat(req: ChatRequest):
    """
    Chat endpoint for the browser client.
    If OPENAI_API_KEY is set, forwards to OpenAI.
    Otherwise, returns demo responses.
    """
    user_message = ""
    for msg in reversed(req.messages):
        if msg.role == "user":
            user_message = msg.content
            break

    if not user_message:
        return {"response": "I didn't catch that. Could you repeat?"}

    # Try OpenAI if key is available — with retry + exponential back-off
    if OPENAI_API_KEY and OPENAI_API_KEY.startswith("sk-"):
        for attempt in range(3):
            try:
                openai_messages = [
                    {
                        "role": "system",
                        "content": (
                            "You are EchoVerse, an AI voice assistant for on-call engineers. "
                            "Keep responses SHORT (1-2 sentences) since this is a voice conversation. "
                            "You can help with: posting Slack messages, creating Jira tickets, "
                            "sending emails, and updating status pages. "
                            "Always confirm actions before executing them."
                        ),
                    }
                ]
                for msg in req.messages[-MAX_CHAT_HISTORY:]:
                    openai_messages.append({"role": msg.role, "content": msg.content})

                resp = await http_client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENAI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "messages": openai_messages,
                        "max_tokens": 150,
                        "temperature": 0.7,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                ai_response = data["choices"][0]["message"]["content"]

                usage = data.get("usage", {})
                logger.info(
                    "OpenAI tokens: %d in / %d out, model=%s",
                    usage.get("prompt_tokens", 0),
                    usage.get("completion_tokens", 0),
                    data.get("model", "unknown"),
                )
                return {"response": ai_response, "model": "gpt-4o-mini"}

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429 and attempt < 2:
                    wait = 2 ** attempt
                    logger.warning("OpenAI rate-limited — retry in %ds (attempt %d/3)", wait, attempt + 1)
                    await asyncio.sleep(wait)
                    continue
                logger.error("OpenAI HTTP %d: %s", e.response.status_code, e.response.text[:200])
                break
            except Exception as e:
                logger.error("OpenAI error (attempt %d): %s", attempt + 1, str(e))
                if attempt < 2:
                    await asyncio.sleep(1)
                    continue
                break

    # Fallback to demo responses
    return {"response": get_demo_response(user_message), "model": "demo"}


ALLOWED_TOOLS = {"post_slack_message", "create_jira_ticket", "send_email", "update_statuspage"}


@app.post("/api/tools/{tool_name}")
async def execute_tool(tool_name: str, req: dict):
    """Proxy tool calls to the MCP server with allow-list validation."""
    if tool_name not in ALLOWED_TOOLS:
        raise HTTPException(status_code=400, detail=f"Unknown tool: {tool_name}")

    mcp_url = os.getenv("MCP_SERVER_URL", "http://localhost:8002")
    try:
        resp = await http_client.post(
            f"{mcp_url}/tools/{tool_name}",
            json=req,
            timeout=15.0,
        )
        resp.raise_for_status()
        return resp.json()
    except httpx.TimeoutException:
        logger.error("MCP timeout for tool: %s", tool_name)
        return {"ok": False, "error": f"Tool '{tool_name}' timed out"}
    except Exception as e:
        logger.error("MCP tool error (%s): %s", tool_name, str(e))
        return {"ok": False, "error": str(e)}


# ── Global Error Handler ──────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled: %s %s → %s", request.method, request.url.path, str(exc))
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        access_log=False,  # handled by our middleware
    )
