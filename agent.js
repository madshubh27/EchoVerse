const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");
const Twilio = require("twilio");
const { createServer } = require("http");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

// --- Env Validation ---
const REQUIRED_ENV_VARS = [
  "AGENT_ID",
  "API_KEY",
  "TWILIO_ACC",
  "TWILIO_KEY",
  "FROM_NUMBER",
  "SERVER_URL",
];
for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const app = express();
app.use(express.json());

const server = createServer(app);
const websocket = new WebSocketServer({ noServer: true });

// --- Rate Limiting (simple in-memory) ---
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5; // max 5 calls per minute per IP

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

// --- Health Check ---
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// --- Phone number validation (E.164) ---
function isValidE164(number) {
  return /^\+[1-9]\d{1,14}$/.test(number);
}

// Endpoint to initiate an outbound call
app.get("/outbound-call", (req, res) => {
  // Rate limiting
  const clientIp = req.ip || req.connection.remoteAddress;
  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  }

  // Input validation
  const toNumber = req.query.toNumber;
  if (!toNumber || !isValidE164(toNumber)) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid or missing 'toNumber' query parameter. Use E.164 format, e.g. +14155551234",
    });
  }

  const twilioClient = new Twilio(
    process.env.TWILIO_ACC,
    process.env.TWILIO_KEY
  );

  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Connect>
        <Stream url="wss://${process.env.SERVER_URL}/outbound-stream" />
      </Connect>
    </Response>`;

  twilioClient.calls
    .create({
      from: process.env.FROM_NUMBER,
      to: toNumber,
      twiml: twimlResponse,
    })
    .then((call) => {
      res.send({
        success: true,
        message: "Call initiated",
        callSid: call.sid,
      });
    })
    .catch((error) => {
      console.error("Failed to initiate call:", error.message);
      res.status(500).send({
        success: false,
        message: "Failed to initiate call",
        error: error.message,
      });
    });
});

// Handle WebSocket connection from Twilio
websocket.on("connection", async (ws) => {
  let elevenWs;
  let streamSid;

  console.log("Stream connected from Twilio");

  // Set up the Eleven Labs WebSocket
  await setupElevenLabs();

  // Handle WebSocket errors
  ws.on("error", (err) => console.error("Error on Twilio WebSocket:", err));

  // Handle incoming messages from Twilio
  ws.on("message", (message) => {
    try {
      const msg = JSON.parse(message);
      switch (msg.event) {
        case "start":
          streamSid = msg.start.streamSid;
          console.log(`Started StreamSid ${streamSid}`);
          break;

        case "media":
          if (elevenWs?.readyState === WebSocket.OPEN) {
            // Send payload directly — it's already base64 from Twilio
            const audioMessage = {
              user_audio_chunk: msg.media.payload,
            };
            elevenWs.send(JSON.stringify(audioMessage));
          }
          break;

        case "stop":
          if (elevenWs?.readyState === WebSocket.OPEN) elevenWs.close();
          console.log("Stream ended");
          break;

        default:
          console.log(`Unhandled event: ${msg.event}`);
      }
    } catch (error) {
      console.error("Error processing Twilio message:", error, streamSid);
    }
  });

  // Close connection
  ws.on("close", () => {
    console.log("Connection closed by Twilio");
    if (elevenWs?.readyState === WebSocket.OPEN) elevenWs.close();
  });

  // Set up Eleven Labs WebSocket
  async function setupElevenLabs() {
    try {
      const { data } = await axios.get(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${process.env.AGENT_ID}`,
        { headers: { "xi-api-key": process.env.API_KEY } }
      );
      elevenWs = new WebSocket(data.signed_url);

      elevenWs.on("open", () => console.log("Connected to Eleven Labs"));
      elevenWs.on("message", (data) =>
        handleElevenLabsMessages(JSON.parse(data))
      );
      elevenWs.on("error", (error) =>
        console.error("Error with Eleven Labs WebSocket:", error)
      );
      elevenWs.on("close", () => console.log("Disconnected from Eleven Labs"));
    } catch (error) {
      console.error("Error setting up Eleven Labs WebSocket:", error);
      // Close the Twilio WebSocket since we can't process audio without ElevenLabs
      ws.close();
    }
  }

  // Handle Eleven Labs WebSocket messages
  function handleElevenLabsMessages(message) {
    switch (message.type) {
      case "audio":
        if (streamSid) {
          const audioData = {
            event: "media",
            streamSid,
            media: {
              payload:
                message.audio_event?.audio_base_64 ||
                message.audio?.chunk ||
                "",
            },
          };
          ws.send(JSON.stringify(audioData));
        }
        break;
      case "interruption":
        ws.send(JSON.stringify({ event: "clear", streamSid }));
        break;
      case "ping":
        if (message.ping_event?.event_id) {
          elevenWs.send(
            JSON.stringify({
              type: "pong",
              event_id: message.ping_event.event_id,
            })
          );
        }
        break;
      default:
        console.log(`Unhandled message type from Eleven Labs: ${message.type}`);
    }
  }
});

websocket.on("error", (error) => {
  console.error("Error on Twilio WebSocket:", error);
});

server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`)
    .pathname;

  console.log("RECEIVED UPGRADE ON", pathname);

  if (pathname === "/outbound-stream") {
    websocket.handleUpgrade(request, socket, head, (ws) => {
      websocket.emit("connection", ws, request);
    });
  }
});

// --- Graceful Shutdown ---
function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
  // Force exit after 5 seconds if server hasn't closed
  setTimeout(() => process.exit(1), 5000);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Start the server on port 8080
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
