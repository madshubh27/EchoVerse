"""
MCP Tools Server
================
FastAPI server that exposes tool endpoints for the Voice Agent.
Each tool integrates with an external system (Slack, Jira, Email, StatusPage).
The Voice Agent calls these endpoints when the LLM decides to use a tool.

Improvements v2:
 - Request-ID tracing & structured logging middleware
 - Input validation with Pydantic Field constraints
 - Per-tool execution timing + richer tool metadata
 - Better error responses with details
 - Richer /health with tool-readiness check
"""

import os
import uuid
import time
import logging

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from tools.slack import post_slack_message
from tools.jira import create_jira_ticket
from tools.email import send_email
from tools.statuspage import update_statuspage

# ── Logging ──────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("mcp-server")

# ── Models ────────────────────────────────────────────────────────

class ToolRequest(BaseModel):
    args: dict
    session_id: str = Field("", max_length=100)


# ── Tool Configuration ───────────────────────────────────────────
TOOL_REGISTRY = {
    "post_slack_message": {
        "fn": post_slack_message,
        "description": "Post a message to a Slack channel",
        "params": ["channel", "message"],
        "required": ["message"],
        "env_check": "SLACK_BOT_TOKEN",
    },
    "create_jira_ticket": {
        "fn": create_jira_ticket,
        "description": "Create a Jira ticket",
        "params": ["summary", "description", "priority", "issue_type"],
        "required": ["summary"],
        "env_check": "JIRA_API_TOKEN",
    },
    "send_email": {
        "fn": send_email,
        "description": "Send an email",
        "params": ["to", "subject", "body"],
        "required": ["to", "subject"],
        "env_check": "EMAIL_SMTP_USER",
    },
    "update_statuspage": {
        "fn": update_statuspage,
        "description": "Update StatusPage component status",
        "params": ["component_name", "status", "message"],
        "required": ["component_name", "status"],
        "env_check": "STATUSPAGE_API_KEY",
    },
}


# ── App ───────────────────────────────────────────────────────────
app = FastAPI(
    title="EchoVerse – MCP Tools Server",
    version="2.0.0",
    description="Tool execution server for Slack, Jira, Email, and StatusPage integrations.",
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


@app.get("/health")
async def health():
    """Health check with tool-readiness status."""
    tool_status = {}
    for name, cfg in TOOL_REGISTRY.items():
        env_var = cfg["env_check"]
        tool_status[name] = "live" if os.getenv(env_var, "") else "mock"
    return {
        "status": "ok",
        "service": "mcp-server",
        "version": "2.0.0",
        "tools": tool_status,
    }


@app.get("/tools")
async def list_tools():
    """List all available tools with metadata."""
    tools = []
    for name, cfg in TOOL_REGISTRY.items():
        tools.append({
            "name": name,
            "description": cfg["description"],
            "params": cfg["params"],
            "required": cfg["required"],
            "mode": "live" if os.getenv(cfg["env_check"], "") else "mock",
        })
    return {"tools": tools}


# ── Tool Endpoints ────────────────────────────────────────────────

async def _run_tool(tool_name: str, req: ToolRequest) -> dict:
    """Execute a tool with timing, validation, and error handling."""
    cfg = TOOL_REGISTRY.get(tool_name)
    if not cfg:
        raise HTTPException(status_code=404, detail=f"Unknown tool: {tool_name}")

    args = req.args

    # Validate required params
    missing = [p for p in cfg["required"] if not args.get(p)]
    if missing:
        return {"ok": False, "error": f"Missing required params: {missing}"}

    start = time.time()
    try:
        result = await cfg["fn"](**{k: args.get(k, "") for k in cfg["params"]})
        elapsed_ms = (time.time() - start) * 1000
        logger.info(
            "Tool %s executed in %.1fms | session=%s | ok=%s",
            tool_name, elapsed_ms, req.session_id or "none",
            result.get("ok", "?"),
        )
        result["execution_ms"] = round(elapsed_ms, 1)
        return result
    except Exception as e:
        elapsed_ms = (time.time() - start) * 1000
        logger.error("Tool %s failed after %.1fms: %s", tool_name, elapsed_ms, str(e))
        return {"ok": False, "error": str(e), "execution_ms": round(elapsed_ms, 1)}


@app.post("/tools/post_slack_message")
async def handle_slack(req: ToolRequest):
    return await _run_tool("post_slack_message", req)


@app.post("/tools/create_jira_ticket")
async def handle_jira(req: ToolRequest):
    return await _run_tool("create_jira_ticket", req)


@app.post("/tools/send_email")
async def handle_email(req: ToolRequest):
    return await _run_tool("send_email", req)


@app.post("/tools/update_statuspage")
async def handle_statuspage(req: ToolRequest):
    return await _run_tool("update_statuspage", req)


# ── Global Error Handler ──────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled: %s %s → %s", request.method, request.url.path, str(exc))
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting MCP Tools Server — %d tools registered", len(TOOL_REGISTRY))
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
