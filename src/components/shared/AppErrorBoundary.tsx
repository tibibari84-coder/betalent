'use client';

import React from 'react';
import Link from 'next/link';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AppErrorBoundary caught:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center"
          style={{ backgroundColor: '#0D0D0E', color: '#F5F7FA' }}
        >
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-[15px] text-[#B7BDC7] mb-6 max-w-md">
            A problem occurred loading this page. You can try again or go back to the home page.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.reset}
              className="px-5 py-2.5 rounded-xl font-semibold text-white border-0 cursor-pointer transition-opacity hover:opacity-95"
              style={{ background: '#B11226' }}
            >
              Try again
            </button>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl font-semibold border border-white/20 text-[#F5F7FA] no-underline transition-colors hover:bg-white/10"
            >
              Go home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
