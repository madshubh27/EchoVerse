"""
EchoVerse Voice Agent — Main Entry Point
============================================
Real-time voice pipeline: VAD → STT → LLM → TTS
Built on the LiveKit Agents SDK.

Usage:
    python main.py dev         # Development mode with auto-reload
    python main.py start       # Production mode
"""

import os
import json
import time
import logging
import asyncio

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from prompts import SYSTEM_PROMPT, TOOL_DEFINITIONS
from observability import (
    logger,
    log_call_start,
    log_call_end,
    log_stt_event,
    log_llm_event,
    log_tool_call,
    save_call_log,
)

# ── LiveKit Agents SDK imports ────────────────────────────────────
try:
    from livekit.agents import (
        AutoSubscribe,
        JobContext,
        JobProcess,
        WorkerOptions,
        cli,
        llm,
    )
    from livekit.agents.pipeline import VoicePipelineAgent
    from livekit.plugins import openai, deepgram, silero

    LIVEKIT_AVAILABLE = True
except ImportError:
    LIVEKIT_AVAILABLE = False
    logger.warning("livekit-agents not installed — running in stub mode")


# ── Tool Execution ────────────────────────────────────────────────

MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8002")


async def execute_tool(tool_name: str, args: dict, session_id: str) -> str:
    """Execute a tool call by forwarding to the MCP server."""
    import httpx

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{MCP_SERVER_URL}/tools/{tool_name}",
                json={"args": args, "session_id": session_id},
            )
            resp.raise_for_status()
            result = resp.json()
            log_tool_call(session_id, tool_name, args, result)
            return json.dumps(result)
    except Exception as e:
        error_msg = f"Tool '{tool_name}' failed: {str(e)}"
        logger.error("tool.execution_failed", tool_name=tool_name, error=str(e))
        return json.dumps({"error": error_msg})


# ── Agent Setup ───────────────────────────────────────────────────

if LIVEKIT_AVAILABLE:

    def prewarm(proc: JobProcess):
        """Pre-load VAD model for faster startup."""
        proc.userdata["vad"] = silero.VAD.load()

    async def entrypoint(ctx: JobContext):
        """
        Main agent entrypoint — called for each new room participant.
        Sets up the full VAD → STT → LLM → TTS pipeline.
        """
        # Extract session_id from participant metadata
        session_id = "unknown"
        call_start = time.time()

        await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

        participant = await ctx.wait_for_participant()

        # Try to extract session_id from participant metadata
        try:
            meta = json.loads(participant.metadata or "{}")
            session_id = meta.get("session_id", session_id)
        except (json.JSONDecodeError, TypeError):
            pass

        log_call_start(session_id)

        # ── Build the AI function context (tools) ─────────────
        fnc_ctx = llm.FunctionContext()

        @fnc_ctx.ai_callable(description="Post a message to a Slack channel")
        async def post_slack_message(channel: str, message: str) -> str:
            return await execute_tool(
                "post_slack_message",
                {"channel": channel, "message": message},
                session_id,
            )

        @fnc_ctx.ai_callable(description="Create a Jira ticket")
        async def create_jira_ticket(
            summary: str,
            description: str,
            priority: str = "Medium",
            issue_type: str = "Task",
        ) -> str:
            return await execute_tool(
                "create_jira_ticket",
                {
                    "summary": summary,
                    "description": description,
                    "priority": priority,
                    "issue_type": issue_type,
                },
                session_id,
            )

        @fnc_ctx.ai_callable(description="Send an email notification")
        async def send_email(to: str, subject: str, body: str) -> str:
            return await execute_tool(
                "send_email",
                {"to": to, "subject": subject, "body": body},
                session_id,
            )

        @fnc_ctx.ai_callable(description="Update a StatusPage component")
        async def update_statuspage(
            component_name: str, status: str, message: str = ""
        ) -> str:
            return await execute_tool(
                "update_statuspage",
                {
                    "component_name": component_name,
                    "status": status,
                    "message": message,
                },
                session_id,
            )

        # ── Configure pipeline components ─────────────────────

        # STT — Deepgram (fast, streaming) with OpenAI Whisper fallback
        stt_provider = os.getenv("STT_PROVIDER", "deepgram")
        if stt_provider == "deepgram" and os.getenv("DEEPGRAM_API_KEY"):
            stt = deepgram.STT()
        else:
            stt = openai.STT()

        # LLM — GPT-4o by default
        llm_model = openai.LLM(
            model=os.getenv("LLM_MODEL", "gpt-4o"),
            temperature=0.7,
        )

        # TTS — OpenAI TTS (ElevenLabs can be swapped in)
        tts = openai.TTS(
            voice=os.getenv("TTS_VOICE", "alloy"),
        )

        # ── Create the voice pipeline agent ───────────────────
        agent = VoicePipelineAgent(
            vad=ctx.proc.userdata["vad"],
            stt=stt,
            llm=llm_model,
            tts=tts,
            fnc_ctx=fnc_ctx,
            chat_ctx=llm.ChatContext().append(
                role="system",
                text=SYSTEM_PROMPT,
            ),
        )

        # ── Event handlers for observability ──────────────────
        transcript_log = []
        actions_log = []

        @agent.on("user_speech_committed")
        def on_user_speech(msg):
            transcript_log.append({"role": "user", "text": str(msg)})
            log_stt_event(session_id, str(msg), 0)

        @agent.on("agent_speech_committed")
        def on_agent_speech(msg):
            transcript_log.append({"role": "agent", "text": str(msg)})

        # ── Start the agent ───────────────────────────────────
        agent.start(ctx.room, participant)
        logger.info("agent.started", session_id=session_id, participant=participant.identity)

        await agent.say(
            "Hello! I'm EchoVerse, your AI assistant. How can I help you today?",
            allow_interruptions=True,
        )

        # Wait until the participant disconnects
        try:
            await asyncio.sleep(3600)  # Max 1 hour call
        except asyncio.CancelledError:
            pass
        finally:
            duration_ms = (time.time() - call_start) * 1000
            log_call_end(session_id, duration_ms)

            # Persist call log
            await save_call_log(
                session_id=session_id,
                transcript=transcript_log,
                actions_taken=actions_log,
                duration_ms=int(duration_ms),
            )

    # ── CLI Entry ─────────────────────────────────────────────
    if __name__ == "__main__":
        cli.run_app(
            WorkerOptions(
                entrypoint_fnc=entrypoint,
                prewarm_fnc=prewarm,
            )
        )

else:
    # Stub mode for when LiveKit SDK is not installed
    if __name__ == "__main__":
        print("=" * 60)
        print("  EchoVerse Voice Agent")
        print("  LiveKit Agents SDK not installed.")
        print("  Install with: pip install -r requirements.txt")
        print("  Then run: python main.py dev")
        print("=" * 60)
