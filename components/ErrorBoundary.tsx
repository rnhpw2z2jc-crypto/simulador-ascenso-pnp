'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass rounded-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-danger/20 border-2 border-danger mb-4">
              <AlertTriangle className="w-8 h-8 text-danger" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Algo salio mal</h2>
            <p className="text-slate-400 text-sm mb-6">
              La app encontro un error inesperado. Puede reintentar o volver al inicio.
            </p>
            {this.state.error && (
              <div className="bg-navy-800 rounded-lg p-3 mb-6 text-left">
                <p className="text-xs text-danger font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { localStorage.removeItem('simulador_user'); window.location.reload(); }}
                className="flex-1 py-2.5 bg-navy-700 hover:bg-navy-600 text-white font-medium rounded-lg transition-colors"
              >
                Volver al Login
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
