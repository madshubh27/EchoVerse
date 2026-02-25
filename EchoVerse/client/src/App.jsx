import { useState, useCallback, useEffect } from 'react'
import VoiceAgent from './components/VoiceAgent'
import TranscriptPanel from './components/TranscriptPanel'
import StatusBar from './components/StatusBar'
import DebugPanel from './components/DebugPanel'
import './App.css'

const TOKEN_PROXY_URL = import.meta.env.VITE_TOKEN_PROXY_URL || 'http://localhost:8000'

function App() {
  const [connectionState, setConnectionState] = useState('disconnected')
  const [transcript, setTranscript] = useState([])
  const [debugEvents, setDebugEvents] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [tokenData, setTokenData] = useState(null)
  const [error, setError] = useState(null)

  const addTranscript = useCallback((entry) => {
    setTranscript((prev) => [...prev, { ...entry, timestamp: Date.now() }])
  }, [])

  const addDebugEvent = useCallback((event) => {
    setDebugEvents((prev) => [...prev.slice(-100), { ...event, timestamp: Date.now() }])
  }, [])

  const handleConnect = useCallback(async () => {
    setError(null)
    setConnectionState('connecting')
    addDebugEvent({ type: 'info', message: 'Requesting voice token...' })

    try {
      const resp = await fetch(`${TOKEN_PROXY_URL}/api/voice-token`)
      if (!resp.ok) throw new Error(`Token request failed: ${resp.status}`)

      const data = await resp.json()
      setTokenData(data)
      setSessionId(data.session_id)
      addDebugEvent({ type: 'success', message: `Token received — session: ${data.session_id}` })
    } catch (err) {
      setError(err.message)
      setConnectionState('disconnected')
      addDebugEvent({ type: 'error', message: err.message })
    }
  }, [addDebugEvent])

  const handleDisconnect = useCallback(() => {
    setTokenData(null)
    setConnectionState('disconnected')
    addDebugEvent({ type: 'info', message: 'Disconnected from voice agent' })
  }, [addDebugEvent])

  return (
    <div className="app">
      {/* Background gradient orbs */}
      <div className="bg-orb bg-orb-1"></div>
      <div className="bg-orb bg-orb-2"></div>
      <div className="bg-orb bg-orb-3"></div>

      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🎤</span>
          <h1>EchoVerse</h1>
        </div>
        <p className="subtitle">AI-Powered Voice Agent</p>
      </header>

      <main className="app-main">
        <div className="agent-section">
          <VoiceAgent
            tokenData={tokenData}
            connectionState={connectionState}
            setConnectionState={setConnectionState}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onTranscript={addTranscript}
            onDebugEvent={addDebugEvent}
            error={error}
          />
        </div>

        <div className="panels-section">
          <TranscriptPanel transcript={transcript} />
          <DebugPanel events={debugEvents} />
        </div>
      </main>

      <StatusBar
        connectionState={connectionState}
        sessionId={sessionId}
      />
    </div>
  )
}

export default App
