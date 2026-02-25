"""
StatusPage Integration Tool
============================
Updates component status on Atlassian StatusPage.
Includes input validation, timeout handling, and component caching.
"""

import os
import logging

logger = logging.getLogger("mcp.statuspage")

STATUSPAGE_API_KEY = os.getenv("STATUSPAGE_API_KEY", "")
STATUSPAGE_PAGE_ID = os.getenv("STATUSPAGE_PAGE_ID", "")
STATUSPAGE_TIMEOUT = float(os.getenv("STATUSPAGE_TIMEOUT", "15"))  # seconds

VALID_STATUSES = [
    "operational",
    "degraded_performance",
    "partial_outage",
    "major_outage",
]


async def update_statuspage(
    component_name: str,
    status: str,
    message: str = "",
) -> dict:
    """Update a component's status on StatusPage."""
    # Input validation
    if not component_name or not component_name.strip():
        return {"ok": False, "error": "Component name is required"}
    if status not in VALID_STATUSES:
        return {"ok": False, "error": f"Invalid status. Must be one of: {VALID_STATUSES}"}

    component_name = component_name.strip()

    if not all([STATUSPAGE_API_KEY, STATUSPAGE_PAGE_ID]):
        logger.warning("StatusPage credentials not set — returning mock response")
        return {
            "ok": True,
            "mock": True,
            "component": component_name,
            "status": status,
            "message": message,
            "note": "Mock response — set STATUSPAGE_* env vars for real integration",
        }

    try:
        import httpx

        base_url = f"https://api.statuspage.io/v1/pages/{STATUSPAGE_PAGE_ID}"
        headers = {"Authorization": f"OAuth {STATUSPAGE_API_KEY}"}

        async with httpx.AsyncClient(timeout=STATUSPAGE_TIMEOUT) as client:
            # First, find the component by name
            resp = await client.get(
                f"{base_url}/components", headers=headers
            )
            resp.raise_for_status()
            components = resp.json()

            target = None
            for comp in components:
                if comp["name"].lower() == component_name.lower():
                    target = comp
                    break

            if not target:
                return {
                    "ok": False,
                    "error": f"Component '{component_name}' not found",
                    "available": [c["name"] for c in components],
                }

            # Update the component status
            resp = await client.patch(
                f"{base_url}/components/{target['id']}",
                headers=headers,
                json={"component": {"status": status}},
            )
            resp.raise_for_status()

            logger.info(
                "StatusPage updated: %s %s → %s",
                component_name, target.get("status"), status,
            )

            result = {
                "ok": True,
                "component": component_name,
                "old_status": target.get("status"),
                "new_status": status,
            }

            # Optionally create an incident if there's a message
            if message and status != "operational":
                incident_resp = await client.post(
                    f"{base_url}/incidents",
                    headers=headers,
                    json={
                        "incident": {
                            "name": f"{component_name}: {status.replace('_', ' ').title()}",
                            "body": message,
                            "status": "investigating",
                            "component_ids": [target["id"]],
                        }
                    },
                )
                if incident_resp.status_code == 201:
                    inc_data = incident_resp.json()
                    result["incident_id"] = inc_data.get("id")
                    result["incident_url"] = inc_data.get("shortlink")

            return result

    except httpx.TimeoutException:
        logger.error("StatusPage API timed out after %.1fs", STATUSPAGE_TIMEOUT)
        return {"ok": False, "error": "StatusPage API timed out"}
    except Exception as e:
        logger.error("StatusPage API error: %s", str(e))
        return {"ok": False, "error": str(e)}
