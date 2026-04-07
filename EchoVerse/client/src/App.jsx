import { useState, useCallback } from 'react'
import VoiceAgent from './components/VoiceAgent'
import TranscriptPanel from './components/TranscriptPanel'
import StatusBar from './components/StatusBar'
import DebugPanel from './components/DebugPanel'
import './App.css'

function App() {
  const [connectionState, setConnectionState] = useState('disconnected')
  const [transcript, setTranscript] = useState([])
  const [debugEvents, setDebugEvents] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [error, setError] = useState(null)

  const addTranscript = useCallback((entry) => {
    setTranscript((prev) => [...prev, { ...entry, timestamp: Date.now() }])
  }, [])

  const addDebugEvent = useCallback((event) => {
    setDebugEvents((prev) => [...prev.slice(-100), { ...event, timestamp: Date.now() }])
  }, [])

  // Session ID is now set by VoiceAgent internally; we just track connection state
  const handleConnect = useCallback(() => {
    setError(null)
    setSessionId(null) // VoiceAgent will log session in debug panel
  }, [])

  const handleDisconnect = useCallback(() => {
    setSessionId(null)
    setError(null)
    addDebugEvent({ type: 'info', message: 'Disconnected from voice agent' })
  }, [addDebugEvent])

  return (
    <div className="app">
      {/* Background gradient orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

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
