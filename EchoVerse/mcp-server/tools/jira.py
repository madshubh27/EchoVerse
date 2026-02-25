"""
Jira Integration Tool
=====================
Creates tickets in Jira using the REST API v3.
Includes input validation, timeout handling, and priority normalization.
"""

import os
import base64
import logging

logger = logging.getLogger("mcp.jira")

JIRA_EMAIL = os.getenv("JIRA_EMAIL", "")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN", "")
JIRA_DOMAIN = os.getenv("JIRA_DOMAIN", "")
JIRA_PROJECT_KEY = os.getenv("JIRA_PROJECT_KEY", "OPS")
JIRA_TIMEOUT = float(os.getenv("JIRA_TIMEOUT", "15"))  # seconds

VALID_PRIORITIES = {"Critical", "High", "Medium", "Low"}
VALID_ISSUE_TYPES = {"Bug", "Task", "Incident", "Story", "Epic"}


async def create_jira_ticket(
    summary: str,
    description: str,
    priority: str = "Medium",
    issue_type: str = "Task",
) -> dict:
    """Create a Jira ticket."""
    # Input validation
    if not summary or not summary.strip():
        return {"ok": False, "error": "Summary cannot be empty"}
    if len(summary) > 255:
        return {"ok": False, "error": "Summary must be 255 characters or fewer"}

    # Normalize inputs
    priority = priority.title() if priority else "Medium"
    if priority not in VALID_PRIORITIES:
        priority = "Medium"
    issue_type = issue_type.title() if issue_type else "Task"
    if issue_type not in VALID_ISSUE_TYPES:
        issue_type = "Task"
    if not all([JIRA_EMAIL, JIRA_API_TOKEN, JIRA_DOMAIN]):
        logger.warning("Jira credentials not set — returning mock response")
        return {
            "ok": True,
            "mock": True,
            "key": f"{JIRA_PROJECT_KEY}-999",
            "summary": summary,
            "priority": priority,
            "issue_type": issue_type,
            "note": "Mock response — set JIRA_* env vars for real integration",
        }

    try:
        import httpx

        auth = base64.b64encode(
            f"{JIRA_EMAIL}:{JIRA_API_TOKEN}".encode()
        ).decode()

        async with httpx.AsyncClient(timeout=JIRA_TIMEOUT) as client:
            resp = await client.post(
                f"https://{JIRA_DOMAIN}.atlassian.net/rest/api/3/issue",
                headers={
                    "Authorization": f"Basic {auth}",
                    "Content-Type": "application/json",
                },
                json={
                    "fields": {
                        "project": {"key": JIRA_PROJECT_KEY},
                        "summary": summary,
                        "description": {
                            "type": "doc",
                            "version": 1,
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [
                                        {"type": "text", "text": description}
                                    ],
                                }
                            ],
                        },
                        "issuetype": {"name": issue_type},
                        "priority": {"name": priority},
                    }
                },
            )
            resp.raise_for_status()
            data = resp.json()

            logger.info("Jira ticket created: %s — %s", data.get("key"), summary[:60])
            return {
                "ok": True,
                "key": data.get("key"),
                "id": data.get("id"),
                "url": f"https://{JIRA_DOMAIN}.atlassian.net/browse/{data.get('key')}",
            }

    except httpx.TimeoutException:
        logger.error("Jira API timed out after %.1fs", JIRA_TIMEOUT)
        return {"ok": False, "error": "Jira API timed out"}
    except Exception as e:
        logger.error("Jira API error: %s", str(e))
        return {"ok": False, "error": str(e)}
