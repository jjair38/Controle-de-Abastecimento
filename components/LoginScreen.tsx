'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { BarChart3, Fuel, LogIn, ShieldCheck } from 'lucide-react';
import {
  browserLocalPersistence,
  setPersistence,
  signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

function formatAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: string }).code)
      : '';
  const hostname =
    typeof window !== 'undefined' ? window.location.hostname : '';

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'A janela de login foi fechada antes de concluir o acesso. Clique novamente e conclua a escolha da conta.';
    case 'auth/cancelled-popup-request':
      return 'Outra tentativa de login foi iniciada. Aguarde um instante e clique apenas uma vez em Entrar com Google.';
    case 'auth/popup-blocked':
      return 'O navegador bloqueou o pop-up de login do Google. Libere pop-ups para este site nas configurações do navegador e tente novamente.';
    case 'auth/unauthorized-domain':
      return `O domínio atual (${hostname}) ainda não está autorizado no Firebase Authentication. Adicione "${hostname}" em Authentication > Settings > Authorized domains no Console do Firebase.`;
    case 'auth/operation-not-allowed':
      return 'O login com Google não está ativado neste projeto Firebase. Ative o provedor Google em Authentication > Sign-in method.';
    case 'auth/network-request-failed':
      return 'Falha de conexão com os servidores do Google. Verifique sua internet e tente novamente.';
    case 'auth/web-storage-unsupported':
      return 'Seu navegador está bloqueando cookies ou armazenamento local necessários para o login do Google. Desative o bloqueio de cookies de terceiros ou abra fora do modo anônimo.';
    case 'auth/internal-error':
      return 'O navegador interrompeu a comunicação com a janela do Google (comum quando cookies de terceiros ou bloqueadores estão ativos). Tente permitir cookies para este site ou abrir o app em uma nova aba.';
    default:
      return code
        ? `Não foi possível entrar com sua conta Google (${code}). Tente novamente ou abra o app em uma nova aba.`
        : 'Não foi possível entrar com sua conta Google. Tente novamente em instantes.';
  }
}

export function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const handleGoogleLogin = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setError(null);
    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence).catch(() => {});
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#F1F5F9] flex flex-col justify-center items-center px-4 py-10">
      <div className="w-full max-w-md bg-[#12161F] border border-[#232A3B] rounded-2xl p-7 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/assets/aistudio/Logotipo_JJ_Automotivo_em_Azul_e_Prata_6621a1b1.png"
            alt="Logotipo Controle de Abastecimento - Jair"
            width={104}
            height={104}
            referrerPolicy="no-referrer"
            priority
            className="w-24 h-24 rounded-2xl object-cover border border-[#232A3B] mb-4"
          />
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
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-200 leading-relaxed">
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
