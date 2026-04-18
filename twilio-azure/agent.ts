import WebSocket from "ws";
import express from "express";
import dotenv from "dotenv";
import Twilio from "twilio";
import { AzureOpenAI } from "openai";
import {
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
} from "openai/resources/index.mjs";
import * as speechSdk from "microsoft-cognitiveservices-speech-sdk";

dotenv.config({ path: "../.env" });

const PORT = process.env.PORT || 5050;

// --- Env Validation ---
const REQUIRED_ENV_VARS = [
  "AZURE_TTS_TOKEN",
  "AZURE_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "AZURE_API_VERSION",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "FROM_NUMBER",
  "TO_NUMBER",
  "SERVER_URL",
];
for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

abstract class BaseWorkflow {
  pipe(consumer: BaseWorkflow): BaseWorkflow {
    return consumer;
  }

  listener(data: any) { }
}

class AzureTTS extends BaseWorkflow {
  synthesizer: speechSdk.SpeechSynthesizer;
  consumer?: BaseWorkflow;

  constructor() {
    super();
    const subscriptionKey = process.env.AZURE_TTS_TOKEN as string;
    const serviceRegion = "eastus";
    const speechConfig = speechSdk.SpeechConfig.fromSubscription(
      subscriptionKey,
      serviceRegion
    );
    speechConfig.speechSynthesisLanguage = "en-US";
    speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural";
    speechConfig.speechSynthesisOutputFormat =
      speechSdk.SpeechSynthesisOutputFormat.Raw8Khz8BitMonoMULaw;

    // Use null audio config — we'll capture raw bytes from the result instead
    // of routing to the default speaker (which doesn't exist on a server)
    this.synthesizer = new speechSdk.SpeechSynthesizer(speechConfig, null as any);
  }

  sendText(text: string): void {
    console.log("[AzureTTS] REQUEST", text);
    this.synthesizer.speakTextAsync(
      text,
      (result) => {
        if (
          result.reason === speechSdk.ResultReason.SynthesizingAudioCompleted
        ) {
          console.log("Audio synthesis completed.");
          const base64Audio = Buffer.from(result.audioData).toString("base64");
          if (this.consumer) {
            console.timeEnd("AzureTTS");
            this.consumer.listener(base64Audio);
          }
        } else {
          console.error("Error during synthesis:", result.errorDetails);
        }
      },
      (error) => {
        console.error("Synthesis error:", error);
      }
    );
  }

  pipe(consumer: BaseWorkflow): BaseWorkflow {
    this.consumer = consumer;
    return consumer;
  }

  async listener(data: string): Promise<void> {
    console.time("AzureTTS");
    this.sendText(data);
  }
}

class AzureSTT extends BaseWorkflow {
  pushStream: speechSdk.PushAudioInputStream;
  recognizer: speechSdk.SpeechRecognizer;
  convertedText = "";
  consumer?: BaseWorkflow;

  constructor() {
    super();
    const subscriptionKey = process.env.AZURE_TTS_TOKEN as string;
    const serviceRegion = "eastus";
    const speechConfig = speechSdk.SpeechConfig.fromSubscription(
      subscriptionKey,
      serviceRegion
    );
    speechConfig.speechRecognitionLanguage = "en-US";

    const audioFormat = speechSdk.AudioStreamFormat.getWaveFormatPCM(
      8000,
      16,
      1
    );

    this.pushStream = speechSdk.AudioInputStream.createPushStream(audioFormat);
    const audioConfig = speechSdk.AudioConfig.fromStreamInput(this.pushStream);

    this.recognizer = new speechSdk.SpeechRecognizer(speechConfig, audioConfig);

    this.setupEventHandlers();
    this.start();
  }

  setupEventHandlers() {
    this.recognizer.recognized = (_s, e) => {
      if (e.result.reason === speechSdk.ResultReason.RecognizedSpeech) {
        console.log(`RECOGNIZED: Text=${e.result.text}`);
        this.convertedText += e.result.text.trim();
        if (this.consumer) {
          console.timeEnd("AzureSTT");
          this.consumer.listener(e.result.text.trim());
        }
      }
    };

    this.recognizer.canceled = (_s, e) => {
      console.error(`CANCELED: ${e.reason}`);
      if (e.reason === speechSdk.CancellationReason.Error) {
        console.error(`CANCELED: ErrorCode=${e.errorCode}`);
        console.error(`CANCELED: ErrorDetails=${e.errorDetails}`);
      }
    };

    this.recognizer.sessionStopped = (_s, _e) => {
      console.log("Azure Speech session stopped.");
    };
  }

  async send(payload: string) {
    const buffer = Buffer.from(payload, "base64");
    const pcmBuffer = convertMuLawToPCM(buffer);
    this.pushStream.write(pcmBuffer);
  }

  start() {
    this.recognizer.startContinuousRecognitionAsync();
  }

  stop() {
    this.recognizer.stopContinuousRecognitionAsync(() => {
      this.pushStream.close();
    });
  }

  pipe(consumer: BaseWorkflow): BaseWorkflow {
    this.consumer = consumer;
    return consumer;
  }

  async listener(data: string) {
    console.time("AzureSTT");
    this.send(data);
  }
}

class AzureOpenAIWrapper extends BaseWorkflow {
  conversation: Array<
    ChatCompletionSystemMessageParam | ChatCompletionUserMessageParam
  > = [
      {
        role: "system",
        content:
          "You are an elementary teacher in an audio call. Your output will be converted to audio so don't include special characters in your answers. Respond to what the student said in a short short sentence.",
      },
    ];
  openAI: AzureOpenAI;
  consumer!: BaseWorkflow;

  constructor() {
    super();
    this.openAI = new AzureOpenAI({
      endpoint: process.env.AZURE_BASE_URL,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_API_VERSION,
    });
  }

  async handleMessage(data: string) {
    this.convert(data);
    console.time("AzureOPENAI");
    const response = await this.openAI.chat.completions.create({
      messages: this.conversation,
      model: "gpt-4o-mini",
    });
    console.log("[AzureOpenAI] RESPONSE", response.choices[0].message.content);
    this.consumer.listener(response.choices[0].message.content);
    console.timeEnd("AzureOPENAI");
  }

  convert(data: string) {
    if (data) {
      this.conversation.push({ role: "user", content: data });
    }
  }

  pipe(consumer: BaseWorkflow): BaseWorkflow {
    this.consumer = consumer;
    return consumer;
  }

  listener(data: any): void {
    console.log("[AzureOpenAI]", data);
    this.handleMessage(data);
  }
}

class TwilioWrapper extends BaseWorkflow {
  consumer!: BaseWorkflow;
  ws: WebSocket | null = null;
  twilio: ReturnType<typeof Twilio>;
  streamSid: string = "";
  callInfo: { from: string; to: string };

  constructor(callInfo: { from: string; to: string }) {
    super();
    this.callInfo = callInfo;
    this.twilio = Twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  }

  setWs(ws: WebSocket) {
    if (!this.ws) {
      this.ws = ws;
    }
  }

  start() {
    this.twilio.calls.create({
      twiml: `<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="wss://${process.env.SERVER_URL}/media-stream"/></Connect></Response>`,
      to: this.callInfo.to,
      from: this.callInfo.from,
    });
  }

  messageHandler(message: any) {
    this.streamSid = message.streamSid;
    if (message.event === "media") {
      this.consumer.listener(message.media.payload);
    }
  }

  pipe(consumer: BaseWorkflow): BaseWorkflow {
    this.consumer = consumer;
    return consumer;
  }

  listener(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          event: "media",
          streamSid: this.streamSid,
          media: { payload: data },
        })
      );
    }
  }
}

function convertMuLawToPCM(muLawBuffer: Buffer): Buffer {
  const pcmBuffer = Buffer.alloc(muLawBuffer.length * 2);
  for (let i = 0; i < muLawBuffer.length; i++) {
    const muLawByte = muLawBuffer[i];
    const pcmVal = muLawToLinear(muLawByte);
    pcmBuffer.writeInt16LE(pcmVal, i * 2);
  }
  return pcmBuffer;
}

function muLawToLinear(muLawByte: number): number {
  muLawByte = ~muLawByte & 0xff;
  const MULAW_BIAS = 33;
  const sign = muLawByte & 0x80;
  const exponent = (muLawByte >> 4) & 0x07;
  const mantissa = muLawByte & 0x0f;
  let sample = ((mantissa << 3) + MULAW_BIAS) << exponent;
  return sign !== 0 ? -sample : sample;
}

// --- App Setup ---
const app = express();

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Create per-call instances
app.get("/trigger-call", async (_req, res) => {
  const callAgent = new TwilioWrapper({
    from: `+${process.env.FROM_NUMBER}`,
    to: `+${process.env.TO_NUMBER}`,
  });

  const azureSTT = new AzureSTT();
  const azureTTS = new AzureTTS();
  const azureOpenAI = new AzureOpenAIWrapper();

  callAgent.pipe(azureSTT).pipe(azureOpenAI).pipe(azureTTS).pipe(callAgent);

  // Store for WS association
  activeAgents.push({ callAgent, azureSTT });

  callAgent.start();
  res.json({ message: "Call initiated successfully." });
});

const activeAgents: { callAgent: TwilioWrapper; azureSTT: AzureSTT }[] = [];

const wss = new WebSocket.Server({ noServer: true });

wss.on("connection", async (websocket) => {
  // Find an agent without a WS connection
  const entry = activeAgents.find((a) => !a.callAgent.ws);
  if (!entry) {
    console.error("No active agent waiting for WebSocket connection.");
    websocket.close();
    return;
  }

  entry.callAgent.setWs(websocket);

  websocket.on("message", async (message: any) => {
    entry.callAgent.messageHandler(JSON.parse(message));
  });

  websocket.on("close", () => {
    entry.azureSTT.stop();
    const idx = activeAgents.indexOf(entry);
    if (idx !== -1) activeAgents.splice(idx, 1);
    console.log("Call cleaned up.");
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

server.on("upgrade", (request, socket, head) => {
  // @ts-ignore
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws);
  });
});

// --- Graceful Shutdown ---
function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down...`);
  for (const entry of activeAgents) {
    entry.azureSTT.stop();
  }
  activeAgents.length = 0;
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.env.NODE_NO_WARNINGS = "1";
