-- EchoVerse Voice Agent — Database Schema
-- This runs automatically on first docker compose up

CREATE TABLE IF NOT EXISTS call_logs (
    id              SERIAL PRIMARY KEY,
    session_id      UUID NOT NULL UNIQUE,
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    duration_ms     INTEGER,
    transcript      JSONB DEFAULT '[]'::jsonb,
    actions_taken   JSONB DEFAULT '[]'::jsonb,
    llm_model       VARCHAR(100),
    stt_provider    VARCHAR(100),
    tts_provider    VARCHAR(100),
    total_tokens    INTEGER DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'active',
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_session_id ON call_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_started_at ON call_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
