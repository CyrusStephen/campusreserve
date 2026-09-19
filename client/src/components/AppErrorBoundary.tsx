import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { failed: boolean }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State { return { failed: true } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CampusReserve screen error', error, info)
  }

  render() {
    if (this.state.failed) return <main className="cr-recovery-page" role="alert"><div className="cr-panel cr-recovery-card">
      <p className="cr-eyebrow">Something interrupted this screen</p><h1>The page could not be displayed.</h1>
      <p>Your previous pages are safe. Return to the workspace or reload this screen to try again.</p>
      <div className="cr-inline"><a className="cr-button cr-button-primary" href="/app/resources">Browse resources</a><button className="cr-button" type="button" onClick={() => window.location.reload()}>Reload page</button></div>
    </div></main>
    return this.props.children
  }
}
