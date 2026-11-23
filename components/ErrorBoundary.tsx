'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

function extractReadableError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      error?: string;
      operationType?: string;
      path?: string;
    };
    if (parsed && parsed.error) {
      return `${parsed.error}${parsed.path ? ` (${parsed.operationType || 'op'} em ${parsed.path})` : ''}`;
    }
  } catch {
    // Plain error message
  }
  return raw;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Ocorreu um erro inesperado ao sincronizar dados.',
    };
  }

  render() {
    if (this.state.hasError) {
      const details = extractReadableError(this.state.message);
      return (
        <div className="min-h-screen bg-[#0B0D12] text-[#F1F5F9] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#12161F] border border-[#232A3B] rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="font-display text-lg font-semibold text-[#F1F5F9]">
              Falha de conexão ou permissão
            </h2>
            <p className="text-xs text-[#94A3B8] leading-relaxed break-words">
              Não foi possível concluir a operação com o banco de dados. Tente
              recarregar a página ou entrar novamente na sua conta Google.
            </p>
            {details && (
              <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#1E2534] text-left font-mono text-[11px] text-red-300 break-all">
                {details}
              </div>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-sm font-semibold text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
