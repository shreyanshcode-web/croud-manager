import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Component } from 'react'

/**
 * Error Boundary — catches any React render/lifecycle errors and shows a
 * readable error screen instead of a blank white page.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[App Error Boundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: 'var(--bg, #0C0E14)',
          color: '#F0F2F8',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', sans-serif",
          padding: '32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: '#9AA0B8', maxWidth: 280, marginBottom: 24, lineHeight: 1.5 }}>
            The app hit an unexpected issue. Please try reloading.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: '#6366F1',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
