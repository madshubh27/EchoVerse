/**
 * StatusBar
 * =========
 * Fixed bottom bar showing connection state, session ID, and latency.
 */
export default function StatusBar({ connectionState, sessionId }) {
    const stateColors = {
        disconnected: '#6b7280',
        connecting: '#f59e0b',
        connected: '#10b981',
    }

    const stateLabels = {
        disconnected: 'Disconnected',
        connecting: 'Connecting...',
        connected: 'Connected',
    }

    return (
        <footer className="status-bar">
            <div className="status-item">
                <span
                    className="status-dot"
                    style={{ backgroundColor: stateColors[connectionState] }}
                />
                <span>{stateLabels[connectionState]}</span>
            </div>

            {sessionId && (
                <div className="status-item session-id">
                    <span className="status-label">Session:</span>
                    <code>{sessionId.slice(0, 8)}...</code>
                </div>
            )}

            <div className="status-item">
                <span className="status-label">EchoVerse</span>
                <span className="status-version">v1.0</span>
            </div>
        </footer>
    )
}
