import { Component } from 'react'

/**
 * ErrorBoundary
 * =============
 * Catches any unhandled React render errors and shows a friendly
 * fallback UI instead of a blank white page.
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] Caught render error:', error, info)
    }

    render() {
        if (!this.state.hasError) return this.props.children

        return (
            <div className="error-boundary-fallback">
                <div className="error-boundary-card">
                    <div className="error-boundary-icon">⚠️</div>
                    <h2>Something went wrong</h2>
                    <p>The application encountered an unexpected error.</p>
                    {this.state.error && (
                        <pre className="error-boundary-detail">
                            {this.state.error.message}
                        </pre>
                    )}
                    <button
                        className="error-boundary-btn"
                        onClick={() => window.location.reload()}
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        )
    }
}
