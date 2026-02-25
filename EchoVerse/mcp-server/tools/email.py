"""
Email Integration Tool
======================
Sends emails via SMTP.
Includes input validation, email format check, and timeout handling.
"""

import os
import re
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("mcp.email")

EMAIL_FROM = os.getenv("EMAIL_FROM", "")
EMAIL_SMTP_HOST = os.getenv("EMAIL_SMTP_HOST", "smtp.gmail.com")
EMAIL_SMTP_PORT = int(os.getenv("EMAIL_SMTP_PORT", "587"))
EMAIL_SMTP_USER = os.getenv("EMAIL_SMTP_USER", "")
EMAIL_SMTP_PASSWORD = os.getenv("EMAIL_SMTP_PASSWORD", "")
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "15"))  # seconds

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


async def send_email(to: str, subject: str, body: str) -> dict:
    """Send an email via SMTP."""
    # Input validation
    if not to or not to.strip():
        return {"ok": False, "error": "Recipient address is required"}
    if not EMAIL_REGEX.match(to.strip()):
        return {"ok": False, "error": f"Invalid email address: {to}"}
    if not subject or not subject.strip():
        return {"ok": False, "error": "Subject is required"}
    if len(subject) > 200:
        return {"ok": False, "error": "Subject must be 200 characters or fewer"}

    to = to.strip()
    subject = subject.strip()

    if not all([EMAIL_FROM, EMAIL_SMTP_USER, EMAIL_SMTP_PASSWORD]):
        logger.warning("Email credentials not set — returning mock response")
        return {
            "ok": True,
            "mock": True,
            "to": to,
            "subject": subject,
            "note": "Mock response — set EMAIL_* env vars for real integration",
        }

    try:
        msg = MIMEMultipart()
        msg["From"] = EMAIL_FROM
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(body or "", "plain"))

        import asyncio

        def _send():
            with smtplib.SMTP(EMAIL_SMTP_HOST, EMAIL_SMTP_PORT, timeout=EMAIL_TIMEOUT) as server:
                server.starttls()
                server.login(EMAIL_SMTP_USER, EMAIL_SMTP_PASSWORD)
                server.send_message(msg)

        await asyncio.to_thread(_send)

        logger.info("Email sent to %s — subject: %s", to, subject[:60])
        return {
            "ok": True,
            "to": to,
            "subject": subject,
        }

    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP authentication failed")
        return {"ok": False, "error": "SMTP authentication failed"}
    except smtplib.SMTPException as e:
        logger.error("SMTP error: %s", str(e))
        return {"ok": False, "error": f"SMTP error: {str(e)}"}
    except Exception as e:
        logger.error("Email send error: %s", str(e))
        return {"ok": False, "error": str(e)}
