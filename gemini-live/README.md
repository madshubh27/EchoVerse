# med_ai — Healthcare Voice Assistant

> **AI-powered voice assistant for healthcare** — speak naturally to check symptoms, book appointments, set medication reminders, and more.

---

## Table of Contents

- [What is med\_ai?](#what-is-med_ai)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Features Guide](#features-guide)
- [AI Tools Reference](#ai-tools-reference)
- [Voice Selection](#voice-selection)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Important Disclaimers](#important-disclaimers)

---

## What is med_ai?

**med_ai** is a browser-based real-time voice assistant built for healthcare use cases. You speak to it through your microphone, and it responds in a natural, human-like voice. It can help with:

- Checking the severity of symptoms
- Finding nearby clinics and hospitals
- Booking medical appointments
- Looking up medication information
- Setting prescription reminders
- Checking weather and health alerts (air quality, pollen, UV)
- Generating session summaries to share with your doctor

---

## How It Works

med_ai uses a **3-stage audio pipeline**:

```
Your voice (mic)
      │
      ▼
┌─────────────────────────────────┐
│   Google Gemini Live 2.5 API    │
│  • Listens to your speech (STT) │
│  • Understands your intent (LLM)│
│  • Calls healthcare tools       │
│  • Generates text response      │
└────────────┬────────────────────┘
             │ Text response
             ▼
┌─────────────────────────────────┐
│       ElevenLabs TTS API        │
│  • Converts text → speech audio │
│  • Premium, natural-sounding    │
│    voice (8 voices to choose)   │
└────────────┬────────────────────┘
             │ Audio
             ▼
         🔊 Speaker
```

### Step-by-step flow:
1. **You speak** → your microphone captures audio and streams it in real-time
2. **Gemini listens** → transcribes your speech and understands the full context
3. **Gemini thinks** → looks at your patient profile, language, and conversation history to decide the best response. If a healthcare tool (e.g. "find clinic") is needed, it calls it
4. **Tool executes** → the tool runs and returns data (clinic locations, symptom analysis, etc.)
5. **Gemini responds** → generates a text response incorporating tool results
6. **ElevenLabs speaks** → converts the text to natural speech and plays it through your speakers
7. **Transcription appears** → both your words and the AI's response appear in the live transcript panel

---

## Getting Started

### Prerequisites
- Node.js 18+
- A modern browser (Chrome recommended — required for Web Audio API)
- A microphone

### 1. Install dependencies
```bash
cd gemini-live
npm install
```

### 2. Set your API keys
Create or edit `.env.local` in the `gemini-live` folder:
```env
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

- Get your **Gemini API key** free at [aistudio.google.com](https://aistudio.google.com)
- Get your **ElevenLabs API key** free at [elevenlabs.io](https://elevenlabs.io) (10,000 free characters/month)

### 3. Start the app
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Allow microphone access
When prompted, click **Allow** to give the browser access to your microphone.

---

## Features Guide

### 🎙️ Starting a Conversation
Click the blue **"Start Conversation"** button. The waveform visualizer will animate when your microphone is active. Speak naturally — the AI understands conversational speech.

### 🌙 Dark Mode
Click the moon icon (🌙) in the top-right header to switch to dark mode. Your preference is saved and persists between sessions.

### 🌍 Language Selection
Use the language dropdown in the header to switch languages. The AI will detect and respond in your chosen language. Supports: English, Hindi (हिन्दी), Spanish, French, German, Japanese, Chinese, Arabic, Portuguese, Korean.

### 👤 Patient Profile
Click the **person icon** in the header to open your patient profile. Fill in:
- **Name** and **Age**
- **Known Allergies** (e.g. "penicillin, peanuts")
- **Existing Conditions** (e.g. "Type 2 Diabetes, Hypertension")
- **Current Medications** (e.g. "Metformin 500mg")

Your profile is **automatically injected into every conversation** so the AI gives contextually relevant advice.

### 📞 Call History
Click the **clock icon** in the header to view your past sessions. Each session shows:
- Date and time
- Duration
- Language used
- Full conversation transcript (click to expand)

Sessions are stored locally in your browser and survive page refreshes.

### 📊 Session Summary
After ending a call, a **Session Summary** card appears showing:
- Call duration
- Number of messages
- Tools that were activated
- Key conversation highlights
- **"Print for Doctor"** — opens a print dialog to share with your physician

### 🆘 Emergency SOS
During an active call, a red **SOS button** appears in the bottom-left corner. Tapping it will prompt you to call emergency services (911). Use this if the AI identifies a medical emergency.

### 💊 Prescription Reminders
Ask the AI to set a reminder (e.g. *"Remind me to take Ibuprofen at 8 AM daily"*) — the AI will call the reminder tool and trigger a browser notification. You must allow notifications when prompted.

---

## AI Tools Reference

The AI has access to these healthcare tools:

| Tool | Trigger example | What it does |
|------|----------------|--------------|
| `checkSymptomSeverity` | *"I have a headache and fever for 2 days"* | Analyzes symptoms and recommends action |
| `bookAppointment` | *"Book a cardiology appointment for Monday"* | Schedules a medical appointment |
| `findNearbyClinic` | *"Find an urgent care near me"* | Lists nearby healthcare facilities |
| `setPrescriptionReminder` | *"Remind me to take my blood pressure medication at 9 AM"* | Sets a medication reminder + browser notification |
| `getMedicationInfo` | *"What are the side effects of Metformin?"* | Returns dosage, side effects, interactions |
| `getWeatherHealthAlert` | *"Is the air quality safe in Mumbai today?"* | Checks air quality, pollen, UV index |
| `generateSessionSummary` | *"Summarize this consultation for my doctor"* | Creates a structured report |

---

## Voice Selection

Choose from **8 premium ElevenLabs voices**:

| Voice | Type | Character |
|-------|------|-----------|
| **Sarah** | Female | Warm, professional |
| **Liam** | Male | Friendly |
| **Lily** | Female | Calm, nurturing |
| **Chris** | Male | Clear, confident |
| **Jessica** | Female | Expressive |
| **Brian** | Male | Deep, authoritative |
| **Charlotte** | Female | Sophisticated |
| **Laura** | Female | Upbeat, caring |

Voice selection is saved and cannot be changed during an active call.

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini Live API key |
| `ELEVENLABS_API_KEY` | ⚠️ Recommended | ElevenLabs TTS API key — AI will not speak without this |

### ElevenLabs Model
The app uses `eleven_turbo_v2_5` — the lowest-latency model available, optimized for real-time conversational use.

---

## Architecture

```
gemini-live/
├── App.tsx                    # Root component — state management, modal wiring
├── constants.ts               # AI tools, languages, system prompt
├── types.ts                   # TypeScript interfaces
├── .env.local                 # API keys (never commit this!)
│
├── components/
│   ├── VoiceAgent.tsx         # Core audio pipeline (Gemini + ElevenLabs)
│   ├── AudioVisualizer.tsx    # Canvas waveform visualizer
│   ├── Header.tsx             # Navigation bar
│   ├── TranscriptionView.tsx  # Live conversation transcript
│   ├── ToolActivity.tsx       # AI tool call display
│   ├── VoiceSelector.tsx      # ElevenLabs voice picker
│   ├── DarkModeToggle.tsx     # Theme toggle
│   ├── LanguageSelector.tsx   # Language picker
│   ├── UserProfile.tsx        # Patient profile modal
│   ├── CallHistory.tsx        # Past sessions modal
│   ├── SessionSummary.tsx     # Post-call summary + print
│   └── EmergencySOS.tsx       # Emergency call button
│
└── services/
    └── elevenlabs.ts          # ElevenLabs streaming TTS service
```

---

## Important Disclaimers

> ⚠️ **med_ai is a demonstration tool, not a medical device.**

- **Do NOT use for emergency situations** — call 911 or your local emergency number directly
- AI responses are generated by a language model and **may be inaccurate**
- Always consult a qualified healthcare professional for medical advice, diagnosis, or treatment
- Prescription and medication information provided is for **reference only** — follow your doctor's instructions
- API keys are stored in `.env.local` — **do not share or commit this file**
- All session data is stored locally in your browser — it is **not transmitted to any server** beyond Gemini and ElevenLabs APIs

---

*Built with Google Gemini Live 2.5, ElevenLabs TTS, and React.*
