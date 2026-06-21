
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangleIcon } from './ui/Icons';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * ErrorBoundary catches errors in its child component tree and displays a fallback UI.
 */
// Fix: Importing Component directly and extending it helps TypeScript resolve inherited members like 'props'.
class ErrorBoundary extends Component<Props, State> {
  // Explicitly declare state to ensure proper typing.
  public state: State = {
    hasError: false
  };

  // Fix: Removed redundant constructor to rely on class property initialization for better type inference in some environments.

  // Standard static method for updating error state based on an exception.
  static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  // Standard lifecycle method for logging caught errors.
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console or an error monitoring service.
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    // If an error occurred, render the fallback UI.
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-300">
            <div className="text-center p-8 bg-gray-800 rounded-lg shadow-2xl border border-red-700 max-w-md">
                <AlertTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Something went wrong.</h1>
                <p className="text-gray-400">
                    An unexpected error has occurred. Please try refreshing the page.
                    If the problem persists, please check the console for more details.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-6 px-4 py-2 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-700 transition-colors"
                >
                    Refresh Page
                </button>
            </div>
        </div>
      );
    }

    // When no error exists, render children normally.
    // Fix: Explicitly returning children and ensuring TS recognizes 'props' correctly.
    return this.props.children || null;
  }
}

export default ErrorBoundary;
