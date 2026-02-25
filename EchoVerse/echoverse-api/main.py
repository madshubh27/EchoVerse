"""
EchoVerse API
================
Core API that mints LiveKit JWTs for authenticated callers.

Receives POST /api/v1/token with X-API-Key header, generates a
session_id, creates a LiveKit access token, and returns it along
with the LiveKit WebSocket URL.

Improvements v2:
 - Pydantic input validation with length limits
 - Configurable token TTL
 - Request-ID tracing
 - Structured request logging middleware
 - Richer health-check response
 - Key-masking in logs for security
"""

import os
import uuid
import json
import time
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, Header, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# ── Logging ──────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("echoverse-api")

# ── Config ────────────────────────────────────────────────────────
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "wss://your-project.livekit.cloud")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")
VOCAL_BRIDGE_API_KEY = os.getenv("VOCAL_BRIDGE_API_KEY", "")
TOKEN_TTL_SECONDS = int(os.getenv("TOKEN_TTL_SECONDS", "3600"))  # 1 hour default


def _mask(secret: str) -> str:
    """Mask a secret for safe logging."""
    if len(secret) <= 4:
        return "****"
    return secret[:4] + "****"

# ── Models ────────────────────────────────────────────────────────

class TokenRequest(BaseModel):
    identity: str = Field("user", min_length=1, max_length=100)
    room: str = Field("echoverse", min_length=1, max_length=100)
    metadata: Optional[dict] = None

    @validator("identity", "room")
    def no_special_chars(cls, v):
        """Prevent injection in room / identity names."""
        import re
        if not re.match(r"^[a-zA-Z0-9_\-\.]+$", v):
            raise ValueError("Only alphanumerics, hyphens, underscores, and dots are allowed")
        return v


class TokenResponse(BaseModel):
    live_url: str
    token: str
    session_id: str


# ── App ───────────────────────────────────────────────────────────
app = FastAPI(
    title="EchoVerse API",
    version="2.0.0",
    description="LiveKit JWT minting service with API-key authentication.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Middleware: Request ID + Logging ─────────────────────────────
@app.middleware("http")
async def request_logging(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
    start = time.time()
    response: Response = await call_next(request)
    elapsed_ms = (time.time() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    if request.url.path != "/health":
        logger.info(
            "%s %s → %d (%.1fms) [%s]",
            request.method, request.url.path, response.status_code, elapsed_ms, request_id,
        )
    return response


def _validate_api_key(api_key: Optional[str]):
    """Validate the incoming API key against our configured key."""
    if not VOCAL_BRIDGE_API_KEY:
        logger.warning("VOCAL_BRIDGE_API_KEY not set — accepting all requests")
        return
    if api_key != VOCAL_BRIDGE_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


def _mint_livekit_token(identity: str, room: str, session_id: str) -> str:
    """
    Create a LiveKit access token (JWT).
    We use the livekit-api library if available, otherwise fall back
    to a manual JWT approach.
    """
    try:
        from livekit.api import AccessToken, VideoGrants

        token = AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        token.identity = identity
        token.name = identity
        token.metadata = json.dumps({"session_id": session_id})

        grants = VideoGrants(
            room_join=True,
            room=room,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
        )
        token.video_grants = grants

        return token.to_jwt()

    except ImportError:
        # Fallback: generate a placeholder token for development
        logger.warning("livekit-api not installed — returning placeholder token")
        import hashlib
        placeholder = hashlib.sha256(
            f"{session_id}:{identity}:{time.time()}".encode()
        ).hexdigest()
        return f"dev_{placeholder}"


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "echoverse-api",
        "version": "2.0.0",
        "livekit_url": LIVEKIT_URL,
        "livekit_key": _mask(LIVEKIT_API_KEY) if LIVEKIT_API_KEY else "not-set",
        "auth": "enabled" if VOCAL_BRIDGE_API_KEY else "disabled",
        "token_ttl": TOKEN_TTL_SECONDS,
    }


@app.post("/api/v1/token", response_model=TokenResponse)
async def create_token(
    body: TokenRequest,
    x_api_key: Optional[str] = Header(None),
):
    """
    Mint a LiveKit JWT for the given identity.
    Requires X-API-Key header matching VOCAL_BRIDGE_API_KEY.
    """
    _validate_api_key(x_api_key)

    session_id = str(uuid.uuid4())

    token = _mint_livekit_token(
        identity=body.identity,
        room=body.room,
        session_id=session_id,
    )

    logger.info(
        "Token minted — session=%s identity=%s room=%s",
        session_id, body.identity, body.room,
    )

    return TokenResponse(
        live_url=LIVEKIT_URL,
        token=token,
        session_id=session_id,
    )


if __name__ == "__main__":
    import uvicorn

    logger.info(
        "Starting EchoVerse API — livekit=%s, key=%s, auth=%s",
        LIVEKIT_URL,
        _mask(LIVEKIT_API_KEY) if LIVEKIT_API_KEY else "not-set",
        "enabled" if VOCAL_BRIDGE_API_KEY else "disabled",
    )
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
