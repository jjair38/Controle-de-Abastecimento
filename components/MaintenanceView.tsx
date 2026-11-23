'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
  Wrench,
} from 'lucide-react';
import {
  formatCurrency,
  formatDateBR,
  formatKm,
} from '@/lib/calculations';
import {
  ComputedMaintenanceItem,
  MaintenanceCategory,
  MaintenanceItem,
  Vehicle,
} from '@/lib/types';
import { ConfirmDialog } from './ConfirmDialog';
import { MAINTENANCE_PRESETS, MaintenancePreset } from './MaintenanceModal';

interface MaintenanceViewProps {
  vehicle: Vehicle | null;
  effectiveOdometerKm: number;
  computedMaintenances: ComputedMaintenanceItem[];
  onAddMaintenance: (preset?: MaintenancePreset) => void;
  onEditMaintenance: (item: MaintenanceItem) => void;
  onRenewMaintenance: (item: MaintenanceItem) => void;
  onDeleteMaintenance: (id: string) => void;
  onQuickCreatePreset: (preset: MaintenancePreset) => void;
}

const CATEGORY_FILTER_OPTIONS: ('ALL' | MaintenanceCategory)[] = [
  'ALL',
  'Motor & Óleo',
  'Filtros',
  'Freios',
  'Pneus & Suspensão',
  'Elétrica',
  'Geral',
];

export const MaintenanceView = React.memo(function MaintenanceView({
  vehicle,
  effectiveOdometerKm,
  computedMaintenances,
  onAddMaintenance,
  onEditMaintenance,
  onRenewMaintenance,
  onDeleteMaintenance,
  onQuickCreatePreset,
}: MaintenanceViewProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATTENTION' | 'OK'>(
    'ALL'
  );
  const [categoryFilter, setCategoryFilter] = useState<
    'ALL' | MaintenanceCategory
  >('ALL');
  const [search, setSearch] = useState('');
  const [deletingItem, setDeletingItem] =
    useState<ComputedMaintenanceItem | null>(null);

  const summary = useMemo(() => {
    let okCount = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;
    let totalCost = 0;

    for (const item of computedMaintenances) {
      if (item.status === 'overdue') overdueCount += 1;
      else if (item.status === 'due_soon') dueSoonCount += 1;
      else okCount += 1;

      if (typeof item.cost === 'number' && item.cost > 0) {
        totalCost += item.cost;
      }
    }

    return {
      okCount,
      dueSoonCount,
      overdueCount,
      totalCost,
    };
  }, [computedMaintenances]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return computedMaintenances.filter((item) => {
      if (statusFilter === 'ATTENTION' && item.status === 'ok') return false;
      if (statusFilter === 'OK' && item.status !== 'ok') return false;
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }
      if (q) {
        const hay = `${item.title} ${item.category} ${item.notes || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [computedMaintenances, statusFilter, categoryFilter, search]);

  if (!vehicle) {
    return (
      <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-8 text-center">
        <p className="text-sm text-[#94A3B8]">
          Cadastre ou selecione um veículo para acompanhar manutenções por
          quilometragem.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header & Odômetro sincronizado */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[#12161F] border border-[#232A3B] rounded-xl p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#94A3B8]">
            <span>{vehicle.brand} {vehicle.name}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-[#38BDF8]">
              Odômetro atual: {formatKm(effectiveOdometerKm)}
            </span>
            <span aria-hidden="true">·</span>
            <span>Atualizado automaticamente pelos abastecimentos</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#F1F5F9] mt-1">
            Manutenção preventiva
          </h1>
        </div>

        <button
          type="button"
          onClick={() => onAddMaintenance()}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nova manutenção
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Em dia</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-emerald-400 tabular-nums mt-2">
            {summary.okCount}
          </div>
          <p className="text-xs text-[#64748B] mt-1">Dentro do intervalo</p>
        </div>

        <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Próximas da troca</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-amber-300 tabular-nums mt-2">
            {summary.dueSoonCount}
          </div>
          <p className="text-xs text-[#64748B] mt-1">Atenção preventiva</p>
        </div>

        <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Vencidas</span>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-red-400 tabular-nums mt-2">
            {summary.overdueCount}
          </div>
          <p className="text-xs text-[#64748B] mt-1">Troca recomendada agora</p>
        </div>

        <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Custo registrado</span>
            <Wallet className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#F1F5F9] tabular-nums mt-2">
            {formatCurrency(summary.totalCost)}
          </div>
          <p className="text-xs text-[#64748B] mt-1">Soma das últimas trocas</p>
        </div>
      </div>

      {/* Filters */}
      {computedMaintenances.length > 0 && (
        <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar manutenção (ex: óleo, filtro, freio)..."
              className="w-full h-10 pl-10 pr-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filtrar por categoria"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(
                  e.target.value as 'ALL' | MaintenanceCategory
                )
              }
              className="h-10 px-3 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
            >
              {CATEGORY_FILTER_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'Todas categorias' : cat}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 p-1 bg-[#0B0D12] border border-[#232A3B] rounded-lg">
              {(
                [
                  { id: 'ALL', label: 'Todas' },
                  { id: 'ATTENTION', label: 'Atenção / Vencidas' },
                  { id: 'OK', label: 'Em dia' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatusFilter(opt.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === opt.id
                      ? 'bg-[#2563EB] text-white'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* List or Empty State */}
      {computedMaintenances.length === 0 ? (
        <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-8 sm:p-10 text-center space-y-5">
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#2563EB]/15 text-[#38BDF8] flex items-center justify-center mx-auto mb-3">
              <Wrench className="w-6 h-6" />
            </div>
            <h2 className="font-display text-lg font-semibold text-[#F1F5F9]">
              Controle automático de manutenções por KM
            </h2>
            <p className="text-sm text-[#94A3B8] mt-1.5 max-w-xl mx-auto leading-relaxed">
              Cadastre itens como troca de óleo a cada 10.000 km. A cada
              abastecimento registrado, a quilometragem restante e os alertas
              são atualizados automaticamente.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => onQuickCreatePreset(MAINTENANCE_PRESETS[0])}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs sm:text-sm font-semibold text-white transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Ativar troca de óleo (10.000 km)
            </button>
            <button
              type="button"
              onClick={() => onAddMaintenance()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] hover:border-[#3B82F6] text-xs sm:text-sm font-medium text-[#F1F5F9] transition-colors whitespace-nowrap"
            >
              Adicionar item personalizado
            </button>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-8 text-center">
          <p className="text-sm text-[#94A3B8]">
            Nenhuma manutenção corresponde aos filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const isOverdue = item.status === 'overdue';
            const isSoon = item.status === 'due_soon';

            const borderTone = isOverdue
              ? 'border-red-500/40'
              : isSoon
                ? 'border-amber-500/40'
                : 'border-[#232A3B]';
            const barColor = isOverdue
              ? 'bg-red-500'
              : isSoon
                ? 'bg-amber-400'
                : 'bg-[#38BDF8]';
            const statusTextColor = isOverdue
              ? 'text-red-400'
              : isSoon
                ? 'text-amber-300'
                : 'text-emerald-400';

            const StatusIcon = isOverdue
              ? AlertCircle
              : isSoon
                ? AlertTriangle
                : CheckCircle2;

            const statusLabel = isOverdue
              ? item.kmRemaining <= 0
                ? `Vencida · +${formatKm(Math.abs(item.kmRemaining))} de atraso`
                : 'Vencida por prazo'
              : isSoon
                ? item.kmRemaining <=
                  Math.min(1500, Math.max(500, Math.round(item.intervalKm * 0.15)))
                  ? `Próxima · Faltam ${formatKm(item.kmRemaining)}`
                  : `Próxima · ${item.daysRemaining} dia(s)`
                : `Em dia · Faltam ${formatKm(item.kmRemaining)}`;

            return (
              <div
                key={item.id}
                className={`bg-[#12161F] border ${borderTone} rounded-xl p-5 flex flex-col justify-between gap-4`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-[#94A3B8] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>{item.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          A cada {formatKm(item.intervalKm)}
                        </span>
                        {item.cost !== undefined && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {formatCurrency(item.cost)}
                            </span>
                          </>
                        )}
                      </div>
                      <h2 className="font-display text-lg font-semibold text-[#F1F5F9] truncate mt-0.5">
                        {item.title}
                      </h2>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 font-mono tabular-nums ${statusTextColor}`}
                    >
                      <StatusIcon className="w-4 h-4 shrink-0" />
                      <span>{statusLabel}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className="text-[#CBD5E1]">
                        Rodados: {formatKm(item.kmDrivenSinceLast)} /{' '}
                        {formatKm(item.intervalKm)}
                      </span>
                      <span className="text-[#94A3B8]">
                        {Math.round(item.progressPct)}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#0B0D12] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${Math.min(100, item.progressPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* KM details row */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1E2534] text-xs">
                    <div>
                      <span className="text-[#64748B] block">Última troca</span>
                      <span className="font-mono text-[#F1F5F9] tabular-nums mt-0.5 block">
                        {formatKm(item.lastDoneKm)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Odômetro atual</span>
                      <span className="font-mono text-[#CBD5E1] tabular-nums mt-0.5 block">
                        {formatKm(item.currentOdometerKm)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Próxima troca</span>
                      <span className="font-mono text-[#38BDF8] font-semibold tabular-nums mt-0.5 block">
                        {formatKm(item.nextDueKm)}
                      </span>
                    </div>
                  </div>

                  {(item.lastDoneDate || item.nextDueDate || item.notes) && (
                    <div className="text-xs text-[#94A3B8] space-y-1">
                      {(item.lastDoneDate || item.nextDueDate) && (
                        <div className="font-mono tabular-nums">
                          {item.lastDoneDate &&
                            `Feita em ${formatDateBR(item.lastDoneDate)}`}
                          {item.lastDoneDate && item.nextDueDate && ' · '}
                          {item.nextDueDate &&
                            `Limite temporal: ${formatDateBR(item.nextDueDate)}`}
                        </div>
                      )}
                      {item.notes && <p className="text-[#CBD5E1]">{item.notes}</p>}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#1E2534]">
                  <button
                    type="button"
                    onClick={() => onRenewMaintenance(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Registrar troca
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditMaintenance(item)}
                      className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#232A3B] transition-colors"
                      aria-label={`Editar ${item.title}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingItem(item)}
                      className="p-2 rounded-lg text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      aria-label={`Excluir ${item.title}`}
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

      <ConfirmDialog
        isOpen={Boolean(deletingItem)}
        title="Excluir item de manutenção?"
        description={
          deletingItem
            ? `Tem certeza que deseja remover "${deletingItem.title}" do plano de manutenção de ${vehicle.name}?`
            : ''
        }
        confirmLabel="Excluir item"
        onConfirm={() => {
          if (deletingItem) onDeleteMaintenance(deletingItem.id);
        }}
        onCancel={() => setDeletingItem(null)}
      />
    </div>
  );
});
