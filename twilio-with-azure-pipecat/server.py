import argparse
import os
import json
import uvicorn
from agent import run_bot
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from twilio.rest import Client

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Env Validation ---
REQUIRED_ENV_VARS = [
    "ACCOUNT_SID",
    "AUTH_TOKEN",
    "FROM",
    "TO",
    "SERVER_URL",
    "AZURE_LLM_API_KEY",
    "AZURE_LLM_ENDPOINT",
    "AZURE_SPEECH_API_KEY",
    "AZURE_SPEECH_ENDPOINT",
]


@app.on_event("startup")
async def validate_env():
    missing = [key for key in REQUIRED_ENV_VARS if not os.getenv(key)]
    if missing:
        raise RuntimeError(
            f"Missing required environment variables: {', '.join(missing)}"
        )


# --- Health Check ---
@app.get("/health")
async def health_check():
    return JSONResponse({"status": "ok"})


@app.get("/")
async def start_call():
    print("POST TwiML")

    client = Client(os.getenv("ACCOUNT_SID"), os.getenv("AUTH_TOKEN"))

    server_url = os.getenv("SERVER_URL")
    client.calls.create(
        from_=os.getenv("FROM"),
        to=os.getenv("TO"),
        twiml=f"""<?xml version="1.0" encoding="UTF-8"?>
        <Response>
        <Connect>
            <Stream url="wss://{server_url}/media-stream" />
        </Connect>
        </Response>""",
    )
    return JSONResponse({"message": "Call initiated successfully."})


@app.websocket("/media-stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    start_data = websocket.iter_text()
    await start_data.__anext__()
    call_data = json.loads(await start_data.__anext__())
    print(call_data, flush=True)
    stream_sid = call_data["start"]["streamSid"]
    print("WebSocket connection accepted")
    await run_bot(websocket, stream_sid, app.state.testing)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pipecat Twilio Chatbot Server")
    parser.add_argument(
        "-t",
        "--test",
        action="store_true",
        default=False,
        help="set the server in testing mode",
    )
    args, _ = parser.parse_known_args()

    app.state.testing = args.test

    uvicorn.run(app, host="0.0.0.0", port=5050)
