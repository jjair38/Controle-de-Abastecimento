'use client';

import React, { useRef, useState } from 'react';
import {
  Car,
  Check,
  Database,
  Download,
  Edit2,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  computeDashboardMetrics,
  computeVehicleRefuelings,
  exportRefuelingsToCSV,
  formatCurrency,
  formatDecimal,
  formatKm,
} from '@/lib/calculations';
import { Refueling, Vehicle } from '@/lib/types';
import { ConfirmDialog } from './ConfirmDialog';

interface VehiclesViewProps {
  vehicles: Vehicle[];
  refuelings: Refueling[];
  activeVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  onAddVehicle: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => Promise<{ ok: boolean; message: string }>;
  onLoadDemo: () => void;
  onClearAll: () => void;
}

export function VehiclesView({
  vehicles,
  refuelings,
  activeVehicleId,
  onSelectVehicle,
  onAddVehicle,
  onEditVehicle,
  onDeleteVehicle,
  onExportBackup,
  onImportBackup,
  onLoadDemo,
  onClearAll,
}: VehiclesViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmLoadDemo, setConfirmLoadDemo] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await onImportBackup(file);
    setBackupFeedback(res);
    e.target.value = '';
  };

  return (
    <div className="space-y-8">
      {/* Vehicles Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#F1F5F9]">
              Meus veículos
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Gerencie múltiplos veículos com históricos e médias totalmente
              separados.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddVehicle}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Cadastrar veículo
          </button>
        </div>

        {vehicles.length === 0 ? (
          <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-10 text-center">
            <Car className="w-8 h-8 text-[#38BDF8] mx-auto mb-3" />
            <h2 className="font-display text-lg font-semibold text-[#F1F5F9]">
              Nenhum veículo cadastrado
            </h2>
            <p className="text-sm text-[#94A3B8] mt-1 max-w-md mx-auto">
              Cadastre seu veículo ou carregue dados de demonstração para
              explorar os gráficos e relatórios.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
              <button
                type="button"
                onClick={onAddVehicle}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-sm font-semibold text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                Cadastrar veículo
              </button>
              <button
                type="button"
                onClick={() => setConfirmLoadDemo(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#181D29] border border-[#232A3B] hover:border-[#3B82F6] text-sm font-medium text-[#F1F5F9] transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-[#38BDF8]" />
                Carregar dados de exemplo
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles.map((v) => {
              const isActive = v.id === activeVehicleId;
              const vRefuelings = refuelings.filter((r) => r.vehicleId === v.id);
              const computed = computeVehicleRefuelings(vRefuelings);
              const metrics = computeDashboardMetrics(computed, new Date());

              return (
                <div
                  key={v.id}
                  className={`rounded-xl border p-5 transition-colors flex flex-col justify-between gap-4 ${
                    isActive
                      ? 'bg-[#141A26] border-[#2563EB]'
                      : 'bg-[#12161F] border-[#232A3B] hover:border-[#334155]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-[#94A3B8]">
                          {v.brand} · {v.year} · {v.defaultFuel}
                        </div>
                        <h2 className="font-display text-lg font-semibold text-[#F1F5F9] truncate mt-0.5">
                          {v.name}
                        </h2>
                      </div>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#38BDF8] shrink-0">
                          <Check className="w-3.5 h-3.5" />
                          Ativo
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#1E2534] text-xs">
                      <div>
                        <span className="text-[#64748B] block">Odômetro</span>
                        <span className="font-mono text-[#F1F5F9] tabular-nums mt-0.5 block">
                          {formatKm(v.currentOdometer)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Registros</span>
                        <span className="font-mono text-[#F1F5F9] tabular-nums mt-0.5 block">
                          {vRefuelings.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Consumo</span>
                        <span className="font-mono text-[#38BDF8] font-semibold tabular-nums mt-0.5 block">
                          {metrics.overallAvgConsumption !== null
                            ? `${formatDecimal(metrics.overallAvgConsumption)} km/l`
                            : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Total gasto</span>
                        <span className="font-mono text-[#F1F5F9] tabular-nums mt-0.5 block">
                          {formatCurrency(metrics.overallTotalSpent)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#1E2534]">
                    <div className="flex items-center gap-2">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => onSelectVehicle(v.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white transition-colors whitespace-nowrap"
                        >
                          Selecionar
                        </button>
                      )}
                      {computed.length > 0 && (
                        <button
                          type="button"
                          onClick={() => exportRefuelingsToCSV(v, computed)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] hover:border-[#3B82F6] text-xs font-medium text-[#CBD5E1] transition-colors whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
                          CSV
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditVehicle(v)}
                        className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#232A3B] transition-colors"
                        aria-label={`Editar ${v.brand} ${v.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingVehicle(v)}
                        className="p-2 rounded-lg text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label={`Excluir ${v.brand} ${v.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Backup & Data Section */}
      <section className="bg-[#12161F] border border-[#232A3B] rounded-xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-base font-semibold text-[#F1F5F9]">
              Backup e armazenamento local
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed max-w-2xl">
              Todos os seus veículos e abastecimentos ficam salvos
              automaticamente no navegador. Exporte um backup em JSON para
              guardar uma cópia de segurança ou transferir para outro
              dispositivo.
            </p>
          </div>
        </div>

        {backupFeedback && (
          <div
            className={`p-3 rounded-lg border text-xs ${
              backupFeedback.ok
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {backupFeedback.message}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onExportBackup}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Exportar backup (.json)
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#0B0D12] border border-[#232A3B] hover:border-[#3B82F6] text-xs font-medium text-[#F1F5F9] transition-colors whitespace-nowrap"
          >
            <Upload className="w-4 h-4 text-[#38BDF8]" />
            Restaurar backup (.json)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setConfirmLoadDemo(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#0B0D12] border border-[#232A3B] hover:border-[#3B82F6] text-xs font-medium text-[#CBD5E1] transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar dados de exemplo
          </button>

          <button
            type="button"
            onClick={() => setConfirmClearAll(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#0B0D12] border border-[#232A3B] hover:border-red-500/40 text-xs font-medium text-red-400 transition-colors whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4" />
            Limpar tudo
          </button>
        </div>
      </section>

      <ConfirmDialog
        isOpen={Boolean(deletingVehicle)}
        title="Excluir veículo?"
        description={
          deletingVehicle
            ? `Excluir "${deletingVehicle.brand} ${deletingVehicle.name}" removerá também todos os abastecimentos vinculados a ele. Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir veículo"
        onConfirm={() => {
          if (deletingVehicle) onDeleteVehicle(deletingVehicle.id);
        }}
        onCancel={() => setDeletingVehicle(null)}
      />

      <ConfirmDialog
        isOpen={confirmClearAll}
        title="Limpar todos os dados?"
        description="Todos os veículos e registros de abastecimento salvos localmente serão removidos para que você possa começar do zero."
        confirmLabel="Limpar tudo"
        onConfirm={onClearAll}
        onCancel={() => setConfirmClearAll(false)}
      />

      <ConfirmDialog
        isOpen={confirmLoadDemo}
        title="Carregar dados de demonstração?"
        description="Isso substituirá os dados atuais por dois veículos de exemplo (Honda Civic Touring e Fiat Strada Volcano) com histórico de abastecimentos."
        confirmLabel="Carregar exemplo"
        danger={false}
        onConfirm={onLoadDemo}
        onCancel={() => setConfirmLoadDemo(false)}
      />
    </div>
  );
}
