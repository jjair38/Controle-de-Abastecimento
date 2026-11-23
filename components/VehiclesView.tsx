'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Car,
  Check,
  Database,
  Download,
  Edit2,
  LogOut,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  UserCheck,
} from 'lucide-react';
import {
  computeDashboardMetrics,
  computeVehicleRefuelings,
  exportRefuelingsToCSV,
  formatCurrency,
  formatDecimal,
  formatKm,
  getEffectiveVehicleOdometer,
} from '@/lib/calculations';
import { ComputedRefueling, Refueling, Vehicle } from '@/lib/types';
import { ConfirmDialog } from './ConfirmDialog';

interface VehiclesViewProps {
  userEmail: string;
  userName: string;
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
  onSignOut: () => void;
}

interface VehicleSummary {
  vehicle: Vehicle;
  isActive: boolean;
  refuelingsCount: number;
  computed: ComputedRefueling[];
  overallAvgConsumption: number | null;
  overallTotalSpent: number;
  effectiveOdometer: number;
}

const VehicleCard = React.memo(function VehicleCard({
  summary,
  onSelectVehicle,
  onEditVehicle,
  onRequestDelete,
}: {
  summary: VehicleSummary;
  onSelectVehicle: (id: string) => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onRequestDelete: (vehicle: Vehicle) => void;
}) {
  const {
    vehicle: v,
    isActive,
    refuelingsCount,
    computed,
    overallAvgConsumption,
    overallTotalSpent,
    effectiveOdometer,
  } = summary;

  const handleSelect = useCallback(
    () => onSelectVehicle(v.id),
    [onSelectVehicle, v.id]
  );
  const handleExport = useCallback(
    () => exportRefuelingsToCSV(v, computed),
    [v, computed]
  );
  const handleEdit = useCallback(
    () => onEditVehicle(v),
    [onEditVehicle, v]
  );
  const handleDelete = useCallback(
    () => onRequestDelete(v),
    [onRequestDelete, v]
  );

  return (
    <div
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
              {formatKm(effectiveOdometer)}
            </span>
          </div>
          <div>
            <span className="text-[#64748B] block">Registros</span>
            <span className="font-mono text-[#F1F5F9] tabular-nums mt-0.5 block">
              {refuelingsCount}
            </span>
          </div>
          <div>
            <span className="text-[#64748B] block">Consumo</span>
            <span className="font-mono text-[#38BDF8] font-semibold tabular-nums mt-0.5 block">
              {overallAvgConsumption !== null
                ? `${formatDecimal(overallAvgConsumption)} km/l`
                : '—'}
            </span>
          </div>
          <div>
            <span className="text-[#64748B] block">Total gasto</span>
            <span className="font-mono text-[#F1F5F9] tabular-nums mt-0.5 block">
              {formatCurrency(overallTotalSpent)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#1E2534]">
        <div className="flex items-center gap-2">
          {!isActive && (
            <button
              type="button"
              onClick={handleSelect}
              className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white transition-colors whitespace-nowrap"
            >
              Selecionar
            </button>
          )}
          {computed.length > 0 && (
            <button
              type="button"
              onClick={handleExport}
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
            onClick={handleEdit}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#232A3B] transition-colors"
            aria-label={`Editar ${v.brand} ${v.name}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 transition-colors"
            aria-label={`Excluir ${v.brand} ${v.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

export const VehiclesView = React.memo(function VehiclesView({
  userEmail,
  userName,
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
  onSignOut,
}: VehiclesViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmLoadDemo, setConfirmLoadDemo] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const vehicleSummaries = useMemo<VehicleSummary[]>(() => {
    const byVehicle = new Map<string, Refueling[]>();
    for (const r of refuelings) {
      const list = byVehicle.get(r.vehicleId);
      if (list) {
        list.push(r);
      } else {
        byVehicle.set(r.vehicleId, [r]);
      }
    }

    const now = new Date();
    return vehicles.map((v) => {
      const vRefuelings = byVehicle.get(v.id) ?? [];
      const computed = computeVehicleRefuelings(vRefuelings);
      const metrics = computeDashboardMetrics(computed, now);
      const effectiveOdometer = getEffectiveVehicleOdometer(v, vRefuelings);
      return {
        vehicle: v,
        isActive: v.id === activeVehicleId,
        refuelingsCount: vRefuelings.length,
        computed,
        overallAvgConsumption: metrics.overallAvgConsumption,
        overallTotalSpent: metrics.overallTotalSpent,
        effectiveOdometer,
      };
    });
  }, [vehicles, refuelings, activeVehicleId]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const res = await onImportBackup(file);
      setBackupFeedback(res);
      e.target.value = '';
    },
    [onImportBackup]
  );

  const handleRequestDelete = useCallback((v: Vehicle) => {
    setDeletingVehicle(v);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deletingVehicle) onDeleteVehicle(deletingVehicle.id);
  }, [deletingVehicle, onDeleteVehicle]);

  const handleCancelDelete = useCallback(() => {
    setDeletingVehicle(null);
  }, []);

  const handleTriggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleOpenLoadDemo = useCallback(() => setConfirmLoadDemo(true), []);
  const handleCloseLoadDemo = useCallback(() => setConfirmLoadDemo(false), []);
  const handleOpenClearAll = useCallback(() => setConfirmClearAll(true), []);
  const handleCloseClearAll = useCallback(() => setConfirmClearAll(false), []);

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
              separados na nuvem.
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
                onClick={handleOpenLoadDemo}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#181D29] border border-[#232A3B] hover:border-[#3B82F6] text-sm font-medium text-[#F1F5F9] transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-[#38BDF8]" />
                Carregar dados de exemplo
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicleSummaries.map((summary) => (
              <VehicleCard
                key={summary.vehicle.id}
                summary={summary}
                onSelectVehicle={onSelectVehicle}
                onEditVehicle={onEditVehicle}
                onRequestDelete={handleRequestDelete}
              />
            ))}
          </div>
        )}
      </section>

      {/* Google Account Section */}
      <section className="bg-[#12161F] border border-[#232A3B] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <UserCheck className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-[#F1F5F9]">
              Conta Google conectada
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1 truncate">
              {userName} · {userEmail}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#0B0D12] border border-[#232A3B] hover:border-red-500/40 text-xs font-medium text-[#CBD5E1] hover:text-red-300 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          Sair da conta
        </button>
      </section>

      {/* Backup & Data Section */}
      <section className="bg-[#12161F] border border-[#232A3B] rounded-xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-base font-semibold text-[#F1F5F9]">
              Backup e sincronização na nuvem
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed max-w-2xl">
              Todos os seus veículos, abastecimentos e manutenções ficam salvos
              na sua conta Google em tempo real. Você também pode exportar ou
              restaurar uma cópia de segurança em arquivo JSON.
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
            onClick={handleTriggerFileInput}
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
            onClick={handleOpenLoadDemo}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#0B0D12] border border-[#232A3B] hover:border-[#3B82F6] text-xs font-medium text-[#CBD5E1] transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            Carregar dados de exemplo
          </button>

          <button
            type="button"
            onClick={handleOpenClearAll}
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
            ? `Excluir "${deletingVehicle.brand} ${deletingVehicle.name}" removerá também todos os abastecimentos e manutenções vinculados a ele. Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir veículo"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <ConfirmDialog
        isOpen={confirmClearAll}
        title="Limpar todos os dados?"
        description="Todos os veículos, abastecimentos e manutenções salvos na sua conta serão removidos para que você possa começar do zero."
        confirmLabel="Limpar tudo"
        onConfirm={onClearAll}
        onCancel={handleCloseClearAll}
      />

      <ConfirmDialog
        isOpen={confirmLoadDemo}
        title="Carregar dados de demonstração?"
        description="Isso substituirá os dados atuais da conta por dois veículos de exemplo (Honda Civic Touring e Fiat Strada Volcano) com histórico de abastecimentos."
        confirmLabel="Carregar exemplo"
        danger={false}
        onConfirm={onLoadDemo}
        onCancel={handleCloseLoadDemo}
      />
    </div>
  );
});
