"""
EchoVerse — Observability Module
====================================
Structured logging, OpenTelemetry tracing, and Prometheus metrics.
All events are correlated by session_id.
"""

import os
import time
import json
import logging
from functools import wraps

# ── Structured Logging ────────────────────────────────────────────
try:
    import structlog
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer() if os.getenv("ENV") != "production"
            else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
    logger = structlog.get_logger("echoverse")
except ImportError:
    logger = logging.getLogger("echoverse")
    logging.basicConfig(level=logging.INFO)

# ── OpenTelemetry Tracing ─────────────────────────────────────────
tracer = None
try:
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

    otel_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    if otel_endpoint:
        provider = TracerProvider()
        provider.add_span_processor(
            BatchSpanProcessor(OTLPSpanExporter(endpoint=otel_endpoint))
        )
        trace.set_tracer_provider(provider)
        tracer = trace.get_tracer("echoverse-agent")
        logger.info("otel.initialized", endpoint=otel_endpoint)
except ImportError:
    logger.info("opentelemetry not installed — tracing disabled")

# ── Prometheus Metrics ────────────────────────────────────────────
metrics_enabled = False
try:
    from prometheus_client import Counter, Histogram, start_http_server

    call_counter = Counter("voice_calls_total", "Total voice calls processed")
    stt_latency = Histogram("stt_latency_seconds", "STT processing time")
    llm_latency = Histogram("llm_latency_seconds", "LLM response time")
    tts_latency = Histogram("tts_latency_seconds", "TTS processing time")
    tool_calls_counter = Counter(
        "tool_calls_total", "Tool calls by name", ["tool_name"]
    )

    # Start metrics server on port 9091 (9090 used by OTEL)
    start_http_server(9091)
    metrics_enabled = True
    logger.info("prometheus.started", port=9091)
except ImportError:
    logger.info("prometheus_client not installed — metrics disabled")


# ── Helpers ───────────────────────────────────────────────────────

def log_stt_event(session_id: str, text: str, duration_ms: float, confidence: float = 0.0):
    """Log a speech-to-text transcription event."""
    logger.info(
        "stt.transcript",
        session_id=session_id,
        text=text,
        duration_ms=round(duration_ms, 2),
        confidence=round(confidence, 3),
    )
    if metrics_enabled:
        stt_latency.observe(duration_ms / 1000)


def log_llm_event(session_id: str, model: str, input_tokens: int, output_tokens: int, latency_ms: float):
    """Log an LLM response event."""
    logger.info(
        "llm.response",
        session_id=session_id,
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        latency_ms=round(latency_ms, 2),
    )
    if metrics_enabled:
        llm_latency.observe(latency_ms / 1000)


def log_tts_event(session_id: str, text_length: int, latency_ms: float):
    """Log a text-to-speech synthesis event."""
    logger.info(
        "tts.synthesis",
        session_id=session_id,
        text_length=text_length,
        latency_ms=round(latency_ms, 2),
    )
    if metrics_enabled:
        tts_latency.observe(latency_ms / 1000)


def log_tool_call(session_id: str, tool_name: str, args: dict, result: dict | str):
    """Log a tool execution event."""
    logger.info(
        "tool.call",
        session_id=session_id,
        tool_name=tool_name,
        args=args,
        result=str(result)[:500],
    )
    if metrics_enabled:
        tool_calls_counter.labels(tool_name=tool_name).inc()


def log_call_start(session_id: str):
    """Log the start of a voice call."""
    logger.info("call.started", session_id=session_id)
    if metrics_enabled:
        call_counter.inc()


def log_call_end(session_id: str, duration_ms: float):
    """Log the end of a voice call."""
    logger.info(
        "call.ended",
        session_id=session_id,
        duration_ms=round(duration_ms, 2),
    )


# ── Call Log Storage ──────────────────────────────────────────────

async def save_call_log(
    session_id: str,
    transcript: list,
    actions_taken: list,
    duration_ms: int = 0,
    llm_model: str = "gpt-4o",
    total_tokens: int = 0,
):
    """Persist a call summary to PostgreSQL."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.warning("DATABASE_URL not set — skipping call log storage")
        return

    try:
        import asyncpg
        conn = await asyncpg.connect(database_url)
        await conn.execute(
            """
            INSERT INTO call_logs (session_id, transcript, actions_taken, duration_ms, llm_model, total_tokens, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'completed')
            ON CONFLICT (session_id) DO UPDATE SET
                transcript = $2, actions_taken = $3, duration_ms = $4,
                total_tokens = $6, status = 'completed', updated_at = NOW()
            """,
            session_id,
            json.dumps(transcript),
            json.dumps(actions_taken),
            duration_ms,
            llm_model,
            total_tokens,
        )
        await conn.close()
        logger.info("call_log.saved", session_id=session_id)
    except ImportError:
        logger.warning("asyncpg not installed — skipping call log storage")
    except Exception as e:
        logger.error("call_log.save_failed", session_id=session_id, error=str(e))
