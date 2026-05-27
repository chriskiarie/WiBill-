'use client'
import { ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, retry: () => void) => ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  retry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    const { hasError, error } = this.state
    const { children, fallback } = this.props

    if (hasError && error) {
      if (fallback) {
        return fallback(error, this.retry)
      }

      return (
        <div
          style={{
            padding: '20px',
            background: '#1a0000',
            border: '1px solid #4a0000',
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <div style={{ color: '#ff6b6b', fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#ff8787',
              fontFamily: 'DM Mono, monospace',
              marginBottom: 12,
              maxHeight: 100,
              overflowY: 'auto',
            }}
          >
            {error.message}
          </div>
          <button
            onClick={this.retry}
            style={{
              padding: '6px 12px',
              background: '#ff6b6b',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Try Again
          </button>
        </div>
      )
    }

    return children
  }
}

// Add React import for class component
import React from 'react'