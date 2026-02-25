import { useEffect, useRef } from 'react'

/**
 * DebugPanel
 * ==========
 * Live event log for debugging — shows token requests,
 * connection events, errors, and tool calls.
 */
export default function DebugPanel({ events }) {
    const bottomRef = useRef(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [events])

    const typeIcons = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️',
        tool: '🔧',
    }

    return (
        <div className="panel debug-panel">
            <div className="panel-header">
                <span className="panel-icon">🐛</span>
                <h3>Debug Log</h3>
                {events.length > 0 && (
                    <span className="panel-badge">{events.length}</span>
                )}
            </div>

            <div className="panel-content">
                {events.length === 0 ? (
                    <div className="empty-state">
                        <p>Events will appear here when you connect.</p>
                    </div>
                ) : (
                    events.map((event, i) => (
                        <div key={i} className={`debug-entry ${event.type}`}>
                            <span className="debug-icon">{typeIcons[event.type] || 'ℹ️'}</span>
                            <span className="debug-time">
                                {new Date(event.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="debug-message">{event.message}</span>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    )
}
