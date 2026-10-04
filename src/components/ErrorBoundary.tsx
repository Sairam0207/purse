import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportError } from '../lib/monitoring'

interface State {
  error: Error | null
}

/**
 * Catches render errors in a page so one broken screen doesn't blank the whole app.
 * The layout keys it by route, so navigating away remounts it and clears the error.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, { componentStack: info.componentStack ?? undefined })
  }

  render() {
    if (!this.state.error) return this.props.children
    const chunkFailed = /dynamically imported module|Loading chunk|Failed to fetch/i.test(this.state.error.message)
    return (
      <div className="page empty" role="alert">
        <h1>{chunkFailed ? 'A new version is available' : 'This screen hit a problem'}</h1>
        <p>
          {chunkFailed
            ? 'Part of the app failed to download, usually because it was just updated. Reload to get the latest version.'
            : 'Your data is safe. Reload the page, or go back to the overview.'}
        </p>
        <div className="button-row">
          <button className="btn btn-primary" onClick={() => location.reload()}>
            Reload
          </button>
          <a className="btn btn-ghost" href="#/">
            Go to overview
          </a>
        </div>
      </div>
    )
  }
}
