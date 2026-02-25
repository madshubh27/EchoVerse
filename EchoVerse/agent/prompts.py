"""
EchoVerse — System Prompts & Tool Definitions
=================================================
Centralized prompt configuration for the LLM.
"""

SYSTEM_PROMPT = """You are EchoVerse, an AI-powered voice assistant for on-call engineers and operations teams.

## Your Personality
- Professional, calm, and efficient
- You speak clearly and concisely — this is a voice conversation, so keep responses SHORT
- You confirm actions before executing them
- You summarize what you did after completing an action

## Your Capabilities
You can help the on-call engineer by:
1. **Posting Slack messages** — Send alerts or updates to Slack channels
2. **Creating Jira tickets** — Log incidents, bugs, or tasks
3. **Sending emails** — Notify stakeholders via email
4. **Updating status pages** — Change component status on Atlassian StatusPage

## Guidelines
- Always confirm the action details before executing (e.g., "I'll post to #incidents on Slack: 'Database latency spike detected'. Shall I go ahead?")
- After executing, summarize: "Done. I've posted the alert to #incidents."
- If something fails, explain what went wrong and suggest alternatives
- Keep responses under 2-3 sentences for voice clarity
- If you don't understand, ask for clarification

## Context
You are connected via a real-time voice pipeline. The user is speaking to you through their browser or mobile device. Respond naturally as if in a phone conversation.
"""


TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "post_slack_message",
            "description": "Post a message to a Slack channel. Use this when the user wants to send an alert, update, or notification to Slack.",
            "parameters": {
                "type": "object",
                "properties": {
                    "channel": {
                        "type": "string",
                        "description": "Slack channel name (e.g., '#incidents', '#general')",
                    },
                    "message": {
                        "type": "string",
                        "description": "The message text to post",
                    },
                },
                "required": ["channel", "message"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_jira_ticket",
            "description": "Create a Jira ticket for tracking an incident or task.",
            "parameters": {
                "type": "object",
                "properties": {
                    "summary": {
                        "type": "string",
                        "description": "Ticket title / summary",
                    },
                    "description": {
                        "type": "string",
                        "description": "Detailed description of the issue",
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["Critical", "High", "Medium", "Low"],
                        "description": "Ticket priority level",
                    },
                    "issue_type": {
                        "type": "string",
                        "enum": ["Bug", "Task", "Incident", "Story"],
                        "description": "Type of Jira issue",
                    },
                },
                "required": ["summary", "description"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "send_email",
            "description": "Send an email notification to a recipient.",
            "parameters": {
                "type": "object",
                "properties": {
                    "to": {
                        "type": "string",
                        "description": "Recipient email address",
                    },
                    "subject": {
                        "type": "string",
                        "description": "Email subject line",
                    },
                    "body": {
                        "type": "string",
                        "description": "Email body content",
                    },
                },
                "required": ["to", "subject", "body"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_statuspage",
            "description": "Update a component's status on the StatusPage.",
            "parameters": {
                "type": "object",
                "properties": {
                    "component_name": {
                        "type": "string",
                        "description": "Name of the component to update (e.g., 'API', 'Database', 'Web App')",
                    },
                    "status": {
                        "type": "string",
                        "enum": ["operational", "degraded_performance", "partial_outage", "major_outage"],
                        "description": "New status for the component",
                    },
                    "message": {
                        "type": "string",
                        "description": "Status update message",
                    },
                },
                "required": ["component_name", "status"],
            },
        },
    },
]
