# Twilio + Azure Pipecat — AI Call Agent

A real-time AI phone call agent built with [Pipecat](https://github.com/pipecat-ai/pipecat), Twilio, and Azure Cognitive Services. Uses Azure STT (Speech-to-Text), Azure OpenAI (LLM), and Azure TTS (Text-to-Speech) in a streaming pipeline.

## Architecture

```
Caller ←→ Twilio ←→ WebSocket ←→ Pipecat Pipeline
                                    ├─ Azure STT (Speech → Text)
                                    ├─ Azure OpenAI (Text → Response)
                                    └─ Azure TTS (Response → Speech)
```

## Prerequisites

- **Python 3.11+**
- **[Twilio account](https://www.twilio.com/)** with an active phone number
- **Azure Cognitive Services** — Speech API key & endpoint
- **Azure OpenAI** — LLM API key & endpoint
- **[ngrok](https://ngrok.com/)** (for local development to expose your WebSocket)

## Setup

1. **Clone and navigate:**
   ```bash
   cd twilio-with-azure-pipecat
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   Or with `uv`:
   ```bash
   uv sync
   ```

3. **Create `.env` file** with the following variables:
   ```env
   ACCOUNT_SID=your_twilio_account_sid
   AUTH_TOKEN=your_twilio_auth_token
   FROM=+1234567890
   TO=+0987654321
   SERVER_URL=your-domain.ngrok-free.app

   AZURE_LLM_API_KEY=your_azure_openai_key
   AZURE_LLM_ENDPOINT=https://your-resource.openai.azure.com/

   AZURE_SPEECH_API_KEY=your_azure_speech_key
   AZURE_SPEECH_ENDPOINT=https://eastus.api.cognitive.microsoft.com/
   ```

4. **Start ngrok** (terminal 1):
   ```bash
   ngrok http 5050
   ```
   Copy the `https://xxxxx.ngrok-free.app` URL and set it as `SERVER_URL` in your `.env`.

5. **Run the server** (terminal 2):
   ```bash
   python server.py
   ```

6. **Trigger a call:**
   Open your browser or use curl:
   ```bash
   curl http://localhost:5050/
   ```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Triggers an outbound call |
| `GET` | `/health` | Health check endpoint |
| `WS` | `/media-stream` | WebSocket endpoint for Twilio streams |

## Testing Mode

Run with `--test` flag:
```bash
python server.py --test
```
