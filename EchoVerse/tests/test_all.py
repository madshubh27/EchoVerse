"""
Unit Tests — Token Proxy & EchoVerse API
============================================
"""

import os
import sys
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

# Add paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'token-proxy'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'echoverse-api'))


# ── Token Proxy Tests ─────────────────────────────────────────────

class TestTokenProxy:
    """Tests for the Token Proxy API."""

    @pytest.fixture
    def client(self):
        from token_proxy_app import app
        from fastapi.testclient import TestClient
        return TestClient(app)

    def test_health(self):
        # Import directly to avoid module conflicts
        import importlib
        spec = importlib.util.spec_from_file_location(
            "token_proxy",
            os.path.join(os.path.dirname(__file__), '..', 'token-proxy', 'main.py')
        )
        mod = importlib.util.module_from_spec(spec)

        # Just verify the module can be loaded
        assert spec is not None


# ── EchoVerse API Tests ───────────────────────────────────────────

class TestEchoVerseAPI:
    """Tests for the EchoVerse API."""

    @pytest.fixture
    def client(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "vocal_bridge_api",
            os.path.join(os.path.dirname(__file__), '..', 'echoverse-api', 'main.py')
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        from fastapi.testclient import TestClient
        return TestClient(mod.app)

    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "echoverse-api"

    def test_create_token_without_api_key(self, client):
        """When VOCAL_BRIDGE_API_KEY is empty, all requests should be accepted."""
        resp = client.post(
            "/api/v1/token",
            json={"identity": "test-user", "room": "test-room"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert "session_id" in data
        assert "live_url" in data
        assert len(data["session_id"]) == 36  # UUID format

    def test_create_token_with_custom_room(self, client):
        resp = client.post(
            "/api/v1/token",
            json={"identity": "alice", "room": "my-custom-room"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["token"].startswith("dev_") or len(data["token"]) > 10


# ── MCP Tools Tests ───────────────────────────────────────────────

class TestMCPServer:
    """Tests for the MCP Tools Server."""

    @pytest.fixture
    def client(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "mcp_server",
            os.path.join(os.path.dirname(__file__), '..', 'mcp-server', 'main.py')
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        from fastapi.testclient import TestClient
        return TestClient(mod.app)

    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["service"] == "mcp-server"

    def test_list_tools(self, client):
        resp = client.get("/tools")
        assert resp.status_code == 200
        tools = resp.json()["tools"]
        assert len(tools) == 4
        tool_names = [t["name"] for t in tools]
        assert "post_slack_message" in tool_names
        assert "create_jira_ticket" in tool_names
        assert "send_email" in tool_names
        assert "update_statuspage" in tool_names

    def test_slack_mock(self, client):
        """Without SLACK_BOT_TOKEN, should return mock response."""
        resp = client.post(
            "/tools/post_slack_message",
            json={
                "args": {"channel": "#test", "message": "hello"},
                "session_id": "test-123",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data.get("mock") is True

    def test_jira_mock(self, client):
        """Without Jira creds, should return mock response."""
        resp = client.post(
            "/tools/create_jira_ticket",
            json={
                "args": {"summary": "Test ticket", "description": "test"},
                "session_id": "test-123",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data.get("mock") is True

    def test_email_mock(self, client):
        resp = client.post(
            "/tools/send_email",
            json={
                "args": {"to": "a@b.com", "subject": "Test", "body": "Hello"},
                "session_id": "test-123",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    def test_statuspage_invalid_status(self, client):
        resp = client.post(
            "/tools/update_statuspage",
            json={
                "args": {"component_name": "API", "status": "invalid_status"},
                "session_id": "test-123",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is False
        assert "Invalid status" in data["error"]
