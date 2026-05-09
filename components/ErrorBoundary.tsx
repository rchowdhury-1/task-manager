'use client';
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackClassName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState(s => ({ hasError: false, error: null, resetKey: s.resetKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={`bg-surface rounded-xl p-6 border border-p1/30 text-center space-y-3 ${this.props.fallbackClassName ?? ''}`}>
          <h2 className="text-lg font-semibold text-primary">Something went wrong</h2>
          <p className="text-sm text-secondary">{this.state.error?.message ?? 'An unexpected error occurred.'}</p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
