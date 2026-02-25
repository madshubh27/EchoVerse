import { useEffect, useRef, useState, useCallback } from 'react'

const TOKEN_PROXY_URL = import.meta.env.VITE_TOKEN_PROXY_URL || 'http://localhost:8000'

/**
 * VoiceAgent Component
 * ====================
 * Uses the browser's Web Speech API for speech recognition and
 * the Token Proxy's /api/chat endpoint for AI responses.
 * Also supports LiveKit mode when proper keys are configured.
 */
export default function VoiceAgent({
    tokenData,
    connectionState,
    setConnectionState,
    onConnect,
    onDisconnect,
    onTranscript,
    onDebugEvent,
    error,
}) {
    const [audioLevel, setAudioLevel] = useState(0)
    const [isListening, setIsListening] = useState(false)
    const recognitionRef = useRef(null)
    const synthRef = useRef(window.speechSynthesis)
    const chatHistoryRef = useRef([])
    const audioContextRef = useRef(null)
    const analyserRef = useRef(null)
    const micStreamRef = useRef(null)
    const animFrameRef = useRef(null)

    // Audio level visualization from mic
    const startAudioVisualization = useCallback((stream) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)()
            const analyser = audioContext.createAnalyser()
            const microphone = audioContext.createMediaStreamSource(stream)
            analyser.fftSize = 256
            microphone.connect(analyser)

            audioContextRef.current = audioContext
            analyserRef.current = analyser

            const dataArray = new Uint8Array(analyser.frequencyBinCount)
            const updateLevel = () => {
                analyser.getByteFrequencyData(dataArray)
                const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
                setAudioLevel(avg / 128) // Normalize to 0-2 range
                animFrameRef.current = requestAnimationFrame(updateLevel)
            }
            updateLevel()
        } catch (e) {
            console.warn('Audio visualization not available:', e)
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

    // Text-to-Speech for agent responses
    const speak = useCallback((text) => {
        return new Promise((resolve) => {
            // Cancel any ongoing speech
            synthRef.current.cancel()

            const utterance = new SpeechSynthesisUtterance(text)
            utterance.rate = 1.0
            utterance.pitch = 1.0
            utterance.volume = 1.0

            // Try to pick a good voice
            const voices = synthRef.current.getVoices()
            const preferredVoice = voices.find(v =>
                v.name.includes('Samantha') ||
                v.name.includes('Google') ||
                v.name.includes('Premium') ||
                v.lang === 'en-US'
            )
            if (preferredVoice) utterance.voice = preferredVoice

            utterance.onend = resolve
            utterance.onerror = resolve
            synthRef.current.speak(utterance)
        })
    }, [])

    // Send message to chat API and get response
    const sendToChat = useCallback(async (userText) => {
        chatHistoryRef.current.push({ role: 'user', content: userText })

        onTranscript({ role: 'user', text: userText })
        onDebugEvent({ type: 'info', message: `STT: "${userText}"` })

        try {
            const resp = await fetch(`${TOKEN_PROXY_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: chatHistoryRef.current,
                    session_id: tokenData?.session_id || '',
                }),
            })

            if (!resp.ok) throw new Error(`Chat API error: ${resp.status}`)

            const data = await resp.json()
            const aiText = data.response

            chatHistoryRef.current.push({ role: 'assistant', content: aiText })
            onTranscript({ role: 'agent', text: aiText })
            onDebugEvent({ type: 'success', message: `LLM (${data.model}): "${aiText.slice(0, 80)}..."` })

            // Speak the response
            await speak(aiText)

        } catch (err) {
            onDebugEvent({ type: 'error', message: `Chat error: ${err.message}` })
        }
    }, [tokenData, onTranscript, onDebugEvent, speak])

    // Start speech recognition
    const startListening = useCallback(async () => {
        // Check browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) {
            onDebugEvent({ type: 'error', message: 'Speech recognition not supported. Use Chrome or Edge.' })
            return
        }

        try {
            // Request mic permission first
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            micStreamRef.current = stream
            onDebugEvent({ type: 'success', message: '🎙️ Microphone access granted' })
            startAudioVisualization(stream)

            // Set up speech recognition
            const recognition = new SpeechRecognition()
            recognition.continuous = true
            recognition.interimResults = true
            recognition.lang = 'en-US'

            recognition.onstart = () => {
                setIsListening(true)
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
                if (event.error !== 'no-speech') {
                    onDebugEvent({ type: 'error', message: `Speech error: ${event.error}` })
                }
            }

            recognition.onend = () => {
                // Restart if still supposed to be listening
                if (isListening && recognitionRef.current) {
                    try {
                        recognition.start()
                    } catch (e) {
                        // Ignore
                    }
                }
            }

            recognitionRef.current = recognition
            recognition.start()

        } catch (err) {
            onDebugEvent({ type: 'error', message: `Mic error: ${err.message}` })
            setConnectionState('disconnected')
        }
    }, [onDebugEvent, sendToChat, startAudioVisualization, setConnectionState, isListening])

    // Stop listening
    const stopListening = useCallback(() => {
        setIsListening(false)

        if (recognitionRef.current) {
            recognitionRef.current.abort()
            recognitionRef.current = null
        }

        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(track => track.stop())
            micStreamRef.current = null
        }

        stopAudioVisualization()
        synthRef.current.cancel()
    }, [stopAudioVisualization])

    // Handle connect button
    const handleButtonClick = useCallback(async () => {
        if (connectionState === 'disconnected') {
            setConnectionState('connecting')
            onDebugEvent({ type: 'info', message: 'Connecting...' })

            // First get a token/session
            try {
                const resp = await fetch(`${TOKEN_PROXY_URL}/api/voice-token`)
                if (resp.ok) {
                    const data = await resp.json()
                    onDebugEvent({ type: 'success', message: `Session: ${data.session_id}` })
                }
            } catch (e) {
                onDebugEvent({ type: 'warning', message: 'Token proxy unavailable — demo mode' })
            }

            // Start with the welcome message
            onConnect()
            setConnectionState('connected')

            onTranscript({ role: 'agent', text: "Hello! I'm EchoVerse, your AI voice assistant. How can I help you today?" })
            onDebugEvent({ type: 'success', message: '🟢 Connected — speaking greeting...' })

            // Speak greeting then start listening
            await speak("Hello! I'm EchoVerse, your AI voice assistant. How can I help you today?")
            await startListening()

        } else {
            // Disconnect
            stopListening()
            setConnectionState('disconnected')
            onDisconnect()
            chatHistoryRef.current = []
            onDebugEvent({ type: 'info', message: 'Disconnected' })
        }
    }, [connectionState, setConnectionState, onConnect, onDisconnect, onDebugEvent, onTranscript, speak, startListening, stopListening])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopListening()
        }
    }, [stopListening])

    const isConnected = connectionState === 'connected'
    const isConnecting = connectionState === 'connecting'
    const pulseScale = 1 + audioLevel * 0.3

    return (
        <div className="voice-agent-card">
            <div className="agent-visualizer">
                {/* Outer pulse rings */}
                <div
                    className={`pulse-ring pulse-ring-1 ${isConnected ? 'active' : ''}`}
                    style={isConnected ? { transform: `scale(${pulseScale * 1.4})` } : {}}
                />
                <div
                    className={`pulse-ring pulse-ring-2 ${isConnected ? 'active' : ''}`}
                    style={isConnected ? { transform: `scale(${pulseScale * 1.2})` } : {}}
                />

                {/* Main button */}
                <button
                    className={`agent-button ${connectionState}`}
                    onClick={handleButtonClick}
                    disabled={isConnecting}
                    style={isConnected ? { transform: `scale(${pulseScale})` } : {}}
                >
                    <div className="button-content">
                        {isConnecting ? (
                            <div className="spinner" />
                        ) : isConnected ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                            </svg>
                        )}
                    </div>
                </button>
            </div>

            <div className="agent-label">
                {isConnecting
                    ? 'Connecting...'
                    : isConnected
                        ? '🟢 Listening — Tap to end'
                        : 'Tap to start conversation'}
            </div>

            {error && <div className="agent-error">{error}</div>}
        </div>
    )
}
