import { useEffect, useRef, useState, useCallback } from 'react'

// Point to /api (same origin on Vercel) or override via env
const API_BASE = import.meta.env.VITE_TOKEN_PROXY_URL || '/api'

// Phase labels shown in the UI
const PHASE_LABELS = {
    idle: 'Tap to start conversation',
    connecting: 'Connecting…',
    listening: '🟢 Listening — tap to end',
    thinking: '🤔 Thinking…',
    speaking: '🔊 Speaking…',
    error: 'Something went wrong — tap to retry',
}

/**
 * VoiceAgent Component
 * ====================
 * Browser Web Speech API → /api/chat → SpeechSynthesis pipeline.
 * All phases (listening / thinking / speaking / error) are surfaced
 * to the user with clear labels and button states.
 */
export default function VoiceAgent({
    connectionState,
    setConnectionState,
    onConnect,
    onDisconnect,
    onTranscript,
    onDebugEvent,
    error: externalError,
}) {
    const [audioLevel, setAudioLevel] = useState(0)
    const [phase, setPhase] = useState('idle')
    const [localError, setLocalError] = useState(null)
    const [browserWarning, setBrowserWarning] = useState(null)

    // Use refs for values consumed inside event callbacks to avoid stale closures
    const isListeningRef = useRef(false)
    const recognitionRef = useRef(null)
    const synthRef = useRef(window.speechSynthesis)
    const chatHistoryRef = useRef([])
    const audioContextRef = useRef(null)
    const analyserRef = useRef(null)
    const micStreamRef = useRef(null)
    const animFrameRef = useRef(null)

    // ── Browser compatibility check ─────────────────────────────────
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const hasMic = navigator.mediaDevices && navigator.mediaDevices.getUserMedia

        if (!SpeechRecognition || !hasMic) {
            setBrowserWarning(
                '⚠️ Your browser does not support voice input. Please use Google Chrome or Microsoft Edge for the best experience.'
            )
        }
    }, [])

    // ── Audio level visualization ───────────────────────────────────
    const startAudioVisualization = useCallback((stream) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)()
            const analyser = audioContext.createAnalyser()
            const microphone = audioContext.createMediaStreamSource(stream)
            analyser.fftSize = 256
            microphone.connect(analyser)

            // Resume context if browser suspended it (autoplay policy)
            if (audioContext.state === 'suspended') {
                audioContext.resume().catch(() => { })
            }

            audioContextRef.current = audioContext
            analyserRef.current = analyser

            const dataArray = new Uint8Array(analyser.frequencyBinCount)
            const updateLevel = () => {
                analyser.getByteFrequencyData(dataArray)
                const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
                setAudioLevel(avg / 128)
                animFrameRef.current = requestAnimationFrame(updateLevel)
            }
            updateLevel()
        } catch (e) {
            console.warn('[VoiceAgent] Audio visualization unavailable:', e)
        }
    }, [])

    const stopAudioVisualization = useCallback(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { })
            audioContextRef.current = null
        }
        setAudioLevel(0)
    }, [])

    // ── Text-to-Speech ──────────────────────────────────────────────
    const speak = useCallback((text) => {
        return new Promise((resolve) => {
            synthRef.current.cancel()
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.rate = 1.0
            utterance.pitch = 1.0
            utterance.volume = 1.0

            const voices = synthRef.current.getVoices()
            const preferred = voices.find(
                (v) =>
                    v.name.includes('Samantha') ||
                    v.name.includes('Google') ||
                    v.name.includes('Premium') ||
                    v.lang === 'en-US'
            )
            if (preferred) utterance.voice = preferred

            utterance.onend = resolve
            utterance.onerror = resolve
            synthRef.current.speak(utterance)
        })
    }, [])

    // ── Chat API call ───────────────────────────────────────────────
    const sendToChat = useCallback(
        async (userText) => {
            chatHistoryRef.current.push({ role: 'user', content: userText })
            onTranscript({ role: 'user', text: userText })
            onDebugEvent({ type: 'info', message: `STT: "${userText}"` })

            setPhase('thinking')

            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 30_000)

            try {
                const resp = await fetch(`${API_BASE}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: chatHistoryRef.current,
                        session_id: '',
                    }),
                    signal: controller.signal,
                })

                clearTimeout(timeoutId)

                if (!resp.ok) throw new Error(`Chat API error: ${resp.status}`)

                const data = await resp.json()
                const aiText = data.response

                if (!aiText) throw new Error('Empty response from AI')

                chatHistoryRef.current.push({ role: 'assistant', content: aiText })
                onTranscript({ role: 'agent', text: aiText })
                onDebugEvent({
                    type: 'success',
                    message: `${data.model === 'demo' ? '[Demo]' : 'LLM'}: "${aiText.slice(0, 80)}…"`,
                })

                setPhase('speaking')
                await speak(aiText)

                // Return to listening if still connected
                if (isListeningRef.current) setPhase('listening')
            } catch (err) {
                clearTimeout(timeoutId)
                const msg =
                    err.name === 'AbortError'
                        ? 'Request timed out after 30 s — please try again.'
                        : `Chat error: ${err.message}`
                setLocalError(msg)
                onDebugEvent({ type: 'error', message: msg })
                setPhase('error')
            }
        },
        [onTranscript, onDebugEvent, speak]
    )

    // ── Speech recognition ──────────────────────────────────────────
    const startListening = useCallback(async () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) {
            const msg =
                'Speech recognition is not supported. Please use Google Chrome or Microsoft Edge.'
            setLocalError(msg)
            onDebugEvent({ type: 'error', message: msg })
            setConnectionState('disconnected')
            setPhase('error')
            return
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            const msg = 'Microphone access is not available in this browser.'
            setLocalError(msg)
            onDebugEvent({ type: 'error', message: msg })
            setConnectionState('disconnected')
            setPhase('error')
            return
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            micStreamRef.current = stream
            onDebugEvent({ type: 'success', message: '🎙️ Microphone access granted' })
            startAudioVisualization(stream)
        } catch (err) {
            let userMsg
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                userMsg =
                    'Microphone access was denied. Please allow microphone access in your browser settings and try again.'
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                userMsg =
                    'No microphone found. Please connect a microphone and try again.'
            } else {
                userMsg = `Could not access microphone: ${err.message}`
            }
            setLocalError(userMsg)
            onDebugEvent({ type: 'error', message: userMsg })
            setConnectionState('disconnected')
            setPhase('error')
            return
        }

        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'

        recognition.onstart = () => {
            setPhase('listening')
            onDebugEvent({ type: 'success', message: 'Speech recognition started — speak now!' })
        }

        recognition.onresult = (event) => {
            let finalTranscript = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript
                }
            }
            if (finalTranscript.trim()) {
                sendToChat(finalTranscript.trim())
            }
        }

        recognition.onerror = (event) => {
            if (event.error === 'no-speech') return // benign
            onDebugEvent({ type: 'error', message: `Speech error: ${event.error}` })
        }

        recognition.onend = () => {
            // Use isListeningRef (not state) to avoid stale closure
            if (isListeningRef.current && recognitionRef.current) {
                try {
                    recognition.start()
                } catch {
                    // Already started — ignore
                }
            }
        }

        recognitionRef.current = recognition
        recognition.start()
    }, [onDebugEvent, sendToChat, startAudioVisualization, setConnectionState])

    // ── Stop listening ──────────────────────────────────────────────
    const stopListening = useCallback(() => {
        isListeningRef.current = false

        if (recognitionRef.current) {
            recognitionRef.current.abort()
            recognitionRef.current = null
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach((t) => t.stop())
            micStreamRef.current = null
        }
        stopAudioVisualization()
        synthRef.current.cancel()
    }, [stopAudioVisualization])

    // ── Main button handler ─────────────────────────────────────────
    const handleButtonClick = useCallback(async () => {
        setLocalError(null)

        if (connectionState === 'disconnected' || connectionState === 'error' || phase === 'error') {
            setConnectionState('connecting')
            setPhase('connecting')
            onDebugEvent({ type: 'info', message: 'Connecting…' })

            // Request session token (always succeeds — demo mode if no LiveKit configured)
            try {
                const resp = await fetch(`${API_BASE}/voice-token`)
                if (resp.ok) {
                    const data = await resp.json()
                    onDebugEvent({ type: 'success', message: `Session: ${data.session_id} [${data.mode}]` })
                }
            } catch {
                onDebugEvent({ type: 'warning', message: 'Token endpoint offline — demo mode' })
            }

            onConnect()
            setConnectionState('connected')
            isListeningRef.current = true

            const greeting = "Hello! I'm EchoVerse, your AI voice assistant. How can I help you today?"
            onTranscript({ role: 'agent', text: greeting })
            onDebugEvent({ type: 'success', message: '🟢 Connected — speaking greeting…' })
            setPhase('speaking')
            await speak(greeting)

            await startListening()
        } else {
            // Disconnect
            stopListening()
            setConnectionState('disconnected')
            setPhase('idle')
            onDisconnect()
            chatHistoryRef.current = []
            onDebugEvent({ type: 'info', message: 'Disconnected' })
        }
    }, [
        connectionState,
        phase,
        setConnectionState,
        onConnect,
        onDisconnect,
        onDebugEvent,
        onTranscript,
        speak,
        startListening,
        stopListening,
    ])

    // ── Cleanup on unmount ──────────────────────────────────────────
    useEffect(() => {
        return () => {
            isListeningRef.current = false
            stopListening()
        }
    }, [stopListening])

    const isConnected = connectionState === 'connected'
    const isConnecting = connectionState === 'connecting' || phase === 'connecting'
    const pulseScale = 1 + audioLevel * 0.3
    const displayError = localError || externalError

    return (
        <div className="voice-agent-card">
            {/* Browser warning banner */}
            {browserWarning && (
                <div className="browser-warning-banner">
                    {browserWarning}
                </div>
            )}

            <div className="agent-visualizer">
                <div
                    className={`pulse-ring pulse-ring-1 ${isConnected ? 'active' : ''}`}
                    style={isConnected ? { transform: `scale(${pulseScale * 1.4})` } : {}}
                />
                <div
                    className={`pulse-ring pulse-ring-2 ${isConnected ? 'active' : ''}`}
                    style={isConnected ? { transform: `scale(${pulseScale * 1.2})` } : {}}
                />

                <button
                    className={`agent-button ${connectionState}`}
                    onClick={handleButtonClick}
                    disabled={isConnecting}
                    style={isConnected ? { transform: `scale(${pulseScale})` } : {}}
                    aria-label={PHASE_LABELS[phase] || phase}
                >
                    <div className="button-content">
                        {isConnecting ? (
                            <div className="spinner" />
                        ) : isConnected ? (
                            // Microphone ON icon
                            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                            </svg>
                        ) : (
                            // Microphone OFF icon
                            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                            </svg>
                        )}
                    </div>
                </button>
            </div>

            {/* Phase label */}
            <div className={`agent-label phase-${phase}`}>
                {PHASE_LABELS[phase] || PHASE_LABELS.idle}
            </div>

            {/* Error display */}
            {displayError && (
                <div className="agent-error" role="alert">
                    {displayError}
                    <button
                        className="agent-error-retry"
                        onClick={() => {
                            setLocalError(null)
                            setPhase('idle')
                            setConnectionState('disconnected')
                        }}
                    >
                        Try Again
                    </button>
                </div>
            )}
        </div>
    )
}
