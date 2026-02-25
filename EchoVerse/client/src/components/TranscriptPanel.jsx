import { useEffect, useRef } from 'react'

/**
 * TranscriptPanel
 * ===============
 * Displays the real-time conversation transcript with
 * user and agent messages in a chat-like view.
 */
export default function TranscriptPanel({ transcript }) {
    const bottomRef = useRef(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [transcript])

    return (
        <div className="panel transcript-panel">
            <div className="panel-header">
                <span className="panel-icon">💬</span>
                <h3>Transcript</h3>
                {transcript.length > 0 && (
                    <span className="panel-badge">{transcript.length}</span>
                )}
            </div>

            <div className="panel-content">
                {transcript.length === 0 ? (
                    <div className="empty-state">
                        <p>Start a conversation to see the transcript here.</p>
                    </div>
                ) : (
                    transcript.map((entry, i) => (
                        <div key={i} className={`transcript-entry ${entry.role}`}>
                            <div className="entry-avatar">
                                {entry.role === 'user' ? '👤' : '🤖'}
                            </div>
                            <div className="entry-bubble">
                                <div className="entry-role">
                                    {entry.role === 'user' ? 'You' : 'EchoVerse'}
                                </div>
                                <div className="entry-text">{entry.text}</div>
                                <div className="entry-time">
                                    {new Date(entry.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    )
}
