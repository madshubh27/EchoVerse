"""
Slack Integration Tool
======================
Posts messages to Slack channels using the Slack Web API.
Includes input validation, timeout handling, and structured error responses.
"""

import os
import logging

logger = logging.getLogger("mcp.slack")

SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
SLACK_TIMEOUT = float(os.getenv("SLACK_TIMEOUT", "10"))  # seconds


async def post_slack_message(channel: str, message: str) -> dict:
    """Post a message to a Slack channel."""
    # Input validation
    if not message or not message.strip():
        return {"ok": False, "error": "Message cannot be empty"}
    if len(message) > 4000:
        return {"ok": False, "error": "Message exceeds Slack's 4000 character limit"}

    channel = (channel or "#general").strip()

    if not SLACK_BOT_TOKEN:
        logger.warning("SLACK_BOT_TOKEN not set — returning mock response")
        return {
            "ok": True,
            "mock": True,
            "channel": channel,
            "message": message[:100],
            "note": "Mock response — set SLACK_BOT_TOKEN for real integration",
        }

    try:
        import httpx

        async with httpx.AsyncClient(timeout=SLACK_TIMEOUT) as client:
            clean_channel = channel.lstrip("#")

            resp = await client.post(
                "https://slack.com/api/chat.postMessage",
                headers={
                    "Authorization": f"Bearer {SLACK_BOT_TOKEN}",
                    "Content-Type": "application/json",
                },
                json={
                    "channel": clean_channel,
                    "text": message,
                    "unfurl_links": False,
                },
            )
            data = resp.json()

            if not data.get("ok"):
                error = data.get("error", "Unknown error")
                logger.error("Slack API rejected: %s", error)
                return {"ok": False, "error": error}

            logger.info("Slack message sent to #%s (%d chars)", clean_channel, len(message))
            return {
                "ok": True,
                "channel": data.get("channel"),
                "ts": data.get("ts"),
                "message": message[:100],
            }

    except httpx.TimeoutException:
        logger.error("Slack API timed out after %.1fs", SLACK_TIMEOUT)
        return {"ok": False, "error": "Slack API timed out"}
    except Exception as e:
        logger.error("Slack API error: %s", str(e))
        return {"ok": False, "error": str(e)}
