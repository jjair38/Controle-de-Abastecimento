'use client';

import React, { useState } from 'react';
import { BarChart3, Fuel, LogIn, ShieldCheck } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

export function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code: string }).code)
          : '';
      if (code === 'auth/popup-closed-by-user') {
        setError('A janela de login foi fechada antes de concluir o acesso.');
      } else if (code === 'auth/popup-blocked') {
        setError(
          'O navegador bloqueou a janela de login do Google. Permita pop-ups para este site e tente novamente.'
        );
      } else {
        setError(
          'Não foi possível entrar com sua conta Google. Tente novamente em instantes.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#F1F5F9] flex flex-col justify-center items-center px-4 py-10">
      <div className="w-full max-w-md bg-[#12161F] border border-[#232A3B] rounded-2xl p-7 sm:p-8 shadow-2xl space-y-6">
        <div>
          <p className="text-xs font-medium text-[#38BDF8]">
            Acesso pessoal sincronizado
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F1F5F9] mt-1 tracking-tight text-balance">
            Controle de Abastecimento - Jair
          </h1>
          <p className="text-sm text-[#94A3B8] mt-2 leading-relaxed">
            Entre com sua conta Google para manter todos os veículos,
            abastecimentos e relatórios salvos automaticamente na nuvem, no
            celular e no computador.
          </p>
        </div>

        <div className="space-y-3 pt-2 border-t border-[#1E2534]">
          <div className="flex items-start gap-3">
            <Fuel className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              Registro rápido com cálculo automático de preço por litro, km/l e
              custo por quilômetro.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <BarChart3 className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              Gráficos mensais, trimestrais, semestrais e anuais com alertas
              inteligentes.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              Dados salvos permanentemente na sua conta Google, sem perder ao
              fechar ou trocar de aparelho.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 leading-relaxed">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full h-11 px-5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-sm font-semibold text-white transition-colors inline-flex items-center justify-center gap-2.5"
        >
          <LogIn className="w-4 h-4" />
          <span>{loading ? 'Conectando ao Google...' : 'Entrar com Google'}</span>
        </button>
      </div>
    </div>
  );
}
