import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Primitives';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected interface error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <div className="sp-card max-w-md p-6">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-status-error" />
            <h2 className="text-lg font-semibold text-text-primary">Something went wrong</h2>
            <p className="mt-2 text-sm text-text-secondary">{this.state.message}</p>
            <Button
              className="mt-4"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Reload Application
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
