# 🎤 EchoVerse — AI Voice Agent

> A real-time AI voice agent system that lets users speak naturally, have their speech processed by an **STT → LLM → TTS** pipeline, and trigger automated actions in Slack, Jira, Email, and StatusPage.

![Architecture](https://img.shields.io/badge/Architecture-Microservices-blueviolet)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![LiveKit](https://img.shields.io/badge/LiveKit-WebRTC-green)

---

## 🚀 Deploying to Vercel (medai-nine.vercel.app)

The `client/` directory is a self-contained Vite + React app with serverless API routes in `client/api/`.

### 1. Import into Vercel
- Go to [vercel.com/new](https://vercel.com/new) → Import repo.
- **Root Directory**: set to `client` (not the repo root).
- Framework: **Vite** (auto-detected from `vercel.json`).

### 2. Set Environment Variables in Vercel

Go to **Project → Settings → Environment Variables** and add:

| Variable | Required? | Description |
|---|---|---|
| `OPENAI_API_KEY` | Recommended | `sk-…` key for GPT-4o-mini. Without it, demo-mode responses are used. |
| `LIVEKIT_URL` | Optional | `wss://your-project.livekit.cloud` for WebRTC voice (LiveKit mode). |
| `LIVEKIT_API_KEY` | Optional | LiveKit API key. |
| `LIVEKIT_API_SECRET` | Optional | LiveKit API secret. |

> **⚠️ Never put API keys in `VITE_*` variables** — they would be exposed in the browser bundle.
> All keys above are consumed only by the serverless API routes (`/api/*`).

### 3. Verify Deployment

```bash
# Health check (should return {"status":"ok"})
curl https://medai-nine.vercel.app/api/health

# Chat endpoint (should return AI or demo response)
curl -X POST https://medai-nine.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello"}]}'
```

### Local development (Vercel CLI)
```bash
cd client
npm install
cp .env.example .env.local   # adjust if needed
npx vercel dev               # runs API routes + Vite together
```

---

## Architecture

```
User (Voice) → Browser Client → Token Proxy → EchoVerse API (JWT)
                    ↕ WebRTC
              LiveKit Cloud ↔ Voice Agent (STT → LLM → TTS)
                                    ↕
                              MCP Tools Server → Slack / Jira / Email / StatusPage
                                    ↕
                            Observability Layer (Logs, Traces, Metrics)
```

## Project Structure

```
echoverse/
├── token-proxy/           # FastAPI — GET /api/voice-token
├── echoverse-api/      # FastAPI — POST /api/v1/token (JWT minting)
├── agent/                 # LiveKit Agents SDK — VAD → STT → LLM → TTS
│   ├── main.py            # Voice pipeline entry point
│   ├── prompts.py         # System prompt & tool definitions
│   └── observability.py   # Logging, tracing, metrics
├── mcp-server/            # FastAPI — Tool execution server
│   └── tools/             # Slack, Jira, Email, StatusPage integrations
├── client/                # React + Vite — Browser UI
│   └── src/components/    # VoiceAgent, TranscriptPanel, DebugPanel
├── tests/                 # Unit & integration tests
├── docker-compose.yml     # Postgres, Redis, OTEL Collector
├── init.sql               # Database schema
└── .env.example           # Environment template
```

## Quick Start

### 1. Setup Environment
```bash
cp .env.example .env
# Edit .env with your API keys (LiveKit, OpenAI, etc.)
```

### 2. Start Infrastructure
```bash
docker compose up -d postgres redis otel-collector
```

### 3. Start Backend Services
```bash
# Terminal 1 — Token Proxy
cd token-proxy && pip install -r requirements.txt && python main.py

# Terminal 2 — EchoVerse API
cd echoverse-api && pip install -r requirements.txt && python main.py

# Terminal 3 — MCP Tools Server
cd mcp-server && pip install -r requirements.txt && python main.py

# Terminal 4 — Voice Agent
cd agent && pip install -r requirements.txt && python main.py dev
```

### 4. Start Frontend
```bash
cd client && npm install && npm run dev
```

Open **http://localhost:5173** and click the microphone button!

## API Keys Required

| Service | Env Variable | Required? |
|---------|-------------|-----------|
| LiveKit Cloud | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | ✅ Yes |
| OpenAI | `OPENAI_API_KEY` | ✅ Yes (LLM + TTS) |
| Deepgram | `DEEPGRAM_API_KEY` | Optional (STT) |
| ElevenLabs | `ELEVENLABS_API_KEY` | Optional (TTS) |
| Slack | `SLACK_BOT_TOKEN` | Optional |
| Jira | `JIRA_*` | Optional |
| Email | `EMAIL_*` | Optional |

> All tools work in **mock mode** when credentials aren't configured — the agent will still respond but external actions will be simulated.

## Running Tests
```bash
pip install pytest httpx fastapi
python -m pytest tests/ -v
```

## License
MIT
