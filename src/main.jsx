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
          background: '#0A0A0A',
          color: '#EDEDED',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          padding: '32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#FF3B3B', marginBottom: '12px', letterSpacing: '2px' }}>
            RENDER ERROR
          </div>
          <div style={{
            fontSize: '11px',
            color: '#6B7280',
            maxWidth: '600px',
            marginBottom: '24px',
            background: 'rgba(255,59,59,0.05)',
            border: '1px solid #FF3B3B',
            padding: '16px',
            textAlign: 'left',
            wordBreak: 'break-word',
          }}>
            {String(this.state.error)}
          </div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '16px' }}>
            Open DevTools (F12) → Console for the full stack trace.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              background: '#00E0FF',
              color: '#0A0A0A',
              border: 'none',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '1px',
            }}
          >
            RELOAD PAGE
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
