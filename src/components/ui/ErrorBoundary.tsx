import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '../../lib/logger';

type Props = { children: ReactNode; resetKey?: string };
type State = { failed: boolean };

/** Per-route boundary so a render error never produces a white screen. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('Route crashed', error, info.componentStack);
  }

  override componentDidUpdate(prev: Props): void {
    if (this.state.failed && prev.resetKey !== this.props.resetKey)
      this.setState({ failed: false });
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="card space-y-3">
        <h2>Something went wrong on this page</h2>
        <p>Your plan is saved in this browser. Try again, or go to another page.</p>
        <button
          type="button"
          className="rounded bg-accent px-4 py-2 text-accent-fg"
          onClick={() => this.setState({ failed: false })}
        >
          Try again
        </button>
      </div>
    );
  }
}
