'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  Edit2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  exportRefuelingsToCSV,
  formatCurrency,
  formatDateBR,
  formatDecimal,
  formatKm,
} from '@/lib/calculations';
import { ComputedRefueling, FuelType, Vehicle } from '@/lib/types';
import { ConfirmDialog } from './ConfirmDialog';

interface HistoryViewProps {
  vehicle: Vehicle | null;
  computed: ComputedRefueling[];
  onAddRefueling: () => void;
  onEditRefueling: (refueling: ComputedRefueling) => void;
  onDeleteRefueling: (id: string) => void;
}

const TANK_FILTER_OPTIONS = [
  { id: 'ALL', label: 'Todos' },
  { id: 'FULL', label: 'Tanque completo' },
  { id: 'PARTIAL', label: 'Parcial' },
] as const;

interface HistoryItemProps {
  item: ComputedRefueling;
  onEdit: (item: ComputedRefueling) => void;
  onRequestDelete: (item: ComputedRefueling) => void;
}

const HistoryTableRow = React.memo(function HistoryTableRow({
  item,
  onEdit,
  onRequestDelete,
}: HistoryItemProps) {
  const handleEdit = useCallback(() => onEdit(item), [item, onEdit]);
  const handleDelete = useCallback(
    () => onRequestDelete(item),
    [item, onRequestDelete]
  );

  return (
    <tr className="hover:bg-[#161B26] transition-colors">
      <td className="py-3 px-4 font-mono text-xs text-[#F1F5F9] tabular-nums whitespace-nowrap">
        {formatDateBR(item.date)}
      </td>
      <td className="py-3 px-4 max-w-[220px]">
        <div className="text-sm font-medium text-[#F1F5F9] truncate">
          {item.station || 'Posto não informado'}
        </div>
        <div className="text-xs text-[#94A3B8] truncate">
          {item.fuelType}
          {!item.fullTank && ' · Parcial'}
          {item.notes ? ` · ${item.notes}` : ''}
        </div>
      </td>
      <td className="py-3 px-4 text-right font-mono text-xs text-[#F1F5F9] tabular-nums whitespace-nowrap">
        {formatKm(item.odometerKm)}
      </td>
      <td className="py-3 px-4 text-right font-mono text-xs text-[#CBD5E1] tabular-nums whitespace-nowrap">
        {item.distanceKm !== null ? formatKm(item.distanceKm) : '—'}
      </td>
      <td className="py-3 px-4 text-right font-mono text-xs text-[#F1F5F9] tabular-nums whitespace-nowrap">
        {formatDecimal(item.liters)} L
      </td>
      <td className="py-3 px-4 text-right font-mono text-xs text-[#CBD5E1] tabular-nums whitespace-nowrap">
        {formatCurrency(item.pricePerLiter)}
      </td>
      <td className="py-3 px-4 text-right font-mono text-sm font-semibold text-[#F1F5F9] tabular-nums whitespace-nowrap">
        {formatCurrency(item.totalPaid)}
      </td>
      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums whitespace-nowrap">
        {item.isFirstRecord ? (
          <span className="text-[#64748B]">1º registro</span>
        ) : item.consumptionKmPerL !== null ? (
          <span
            className={`inline-flex items-center gap-1 font-semibold ${
              item.isEstimated ? 'text-amber-300' : 'text-[#38BDF8]'
            }`}
            title={
              item.isEstimated
                ? 'Estimado: envolve abastecimento parcial'
                : 'Medição com tanque completo'
            }
          >
            {item.isEstimated && (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            )}
            {formatDecimal(item.consumptionKmPerL)} km/l
            {item.isEstimated ? ' (est.)' : ''}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className="py-3 px-4 text-right font-mono text-xs text-[#CBD5E1] tabular-nums whitespace-nowrap">
        {item.costPerKm !== null ? `${formatCurrency(item.costPerKm)}/km` : '—'}
      </td>
      <td className="py-3 px-4 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={handleEdit}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#232A3B] transition-colors"
            aria-label={`Editar abastecimento de ${formatDateBR(item.date)}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 transition-colors"
            aria-label={`Excluir abastecimento de ${formatDateBR(item.date)}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

const HistoryMobileCard = React.memo(function HistoryMobileCard({
  item,
  onEdit,
  onRequestDelete,
}: HistoryItemProps) {
  const handleEdit = useCallback(() => onEdit(item), [item, onEdit]);
  const handleDelete = useCallback(
    () => onRequestDelete(item),
    [item, onRequestDelete]
  );

  return (
    <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#F1F5F9] truncate">
            {item.station || 'Posto não informado'}
          </div>
          <div className="text-xs text-[#94A3B8] mt-0.5 font-mono tabular-nums">
            {formatDateBR(item.date)} · {item.fuelType}
            {!item.fullTank ? ' · Parcial' : ''}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-base font-bold text-[#F1F5F9] tabular-nums">
            {formatCurrency(item.totalPaid)}
          </div>
          <div className="font-mono text-xs text-[#94A3B8] tabular-nums">
            {formatDecimal(item.liters)} L · {formatCurrency(item.pricePerLiter)}
            /L
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#1E2534] text-xs">
        <div>
          <span className="text-[#64748B] block">Quilometragem</span>
          <span className="font-mono text-[#F1F5F9] tabular-nums">
            {formatKm(item.odometerKm)}
          </span>
        </div>
        <div>
          <span className="text-[#64748B] block">Distância</span>
          <span className="font-mono text-[#F1F5F9] tabular-nums">
            {item.distanceKm !== null
              ? formatKm(item.distanceKm)
              : '1º registro'}
          </span>
        </div>
        <div>
          <span className="text-[#64748B] block">Consumo médio</span>
          <span
            className={`font-mono font-semibold tabular-nums ${
              item.isEstimated ? 'text-amber-300' : 'text-[#38BDF8]'
            }`}
          >
            {item.consumptionKmPerL !== null
              ? `${formatDecimal(item.consumptionKmPerL)} km/l${item.isEstimated ? ' (est.)' : ''}`
              : '—'}
          </span>
        </div>
        <div>
          <span className="text-[#64748B] block">Custo por km</span>
          <span className="font-mono text-[#F1F5F9] tabular-nums">
            {item.costPerKm !== null
              ? `${formatCurrency(item.costPerKm)}/km`
              : '—'}
          </span>
        </div>
      </div>

      {item.notes && <p className="text-xs text-[#94A3B8] pt-1">{item.notes}</p>}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E2534]">
        <button
          type="button"
          onClick={handleEdit}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#CBD5E1] bg-[#0B0D12] border border-[#232A3B] hover:border-[#3B82F6] transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Editar
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400 bg-[#0B0D12] border border-[#232A3B] hover:border-red-500/40 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Excluir
        </button>
      </div>
    </div>
  );
});

export const HistoryView = React.memo(function HistoryView({
  vehicle,
  computed,
  onAddRefueling,
  onEditRefueling,
  onDeleteRefueling,
}: HistoryViewProps) {
  const [search, setSearch] = useState('');
  const [fuelFilter, setFuelFilter] = useState<'ALL' | FuelType>('ALL');
  const [tankFilter, setTankFilter] = useState<'ALL' | 'FULL' | 'PARTIAL'>('ALL');
  const [deletingItem, setDeletingItem] = useState<ComputedRefueling | null>(
    null
  );

  // Display newest first in history table
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...computed]
      .reverse()
      .filter((r) => {
        if (fuelFilter !== 'ALL' && r.fuelType !== fuelFilter) return false;
        if (tankFilter === 'FULL' && !r.fullTank) return false;
        if (tankFilter === 'PARTIAL' && r.fullTank) return false;
        if (q) {
          const hay = `${r.station || ''} ${r.notes || ''} ${formatDateBR(r.date)} ${r.fuelType}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [computed, search, fuelFilter, tankFilter]);

  const handleExportCSV = useCallback(() => {
    if (vehicle) exportRefuelingsToCSV(vehicle, computed);
  }, [vehicle, computed]);

  const handleRequestDelete = useCallback((item: ComputedRefueling) => {
    setDeletingItem(item);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deletingItem) onDeleteRefueling(deletingItem.id);
  }, [deletingItem, onDeleteRefueling]);

  const handleCancelDelete = useCallback(() => {
    setDeletingItem(null);
  }, []);

  if (!vehicle) {
    return (
      <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-8 text-center">
        <p className="text-sm text-[#94A3B8]">
          Cadastre ou selecione um veículo para visualizar o histórico de
          abastecimentos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F1F5F9]">
            Histórico de abastecimentos
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            {vehicle.brand} {vehicle.name} ·{' '}
            <span className="font-mono tabular-nums">
              {computed.length}{' '}
              {computed.length === 1 ? 'registro' : 'registros'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={computed.length === 0}
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#12161F] border border-[#232A3B] hover:border-[#3B82F6] text-sm font-medium text-[#F1F5F9] disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4 text-[#38BDF8]" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={onAddRefueling}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Novo abastecimento
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por posto, data ou observação..."
            className="w-full h-10 pl-10 pr-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filtrar por combustível"
            value={fuelFilter}
            onChange={(e) => setFuelFilter(e.target.value as 'ALL' | FuelType)}
            className="h-10 px-3 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
          >
            <option value="ALL">Todos combustíveis</option>
            <option value="Gasolina">Gasolina</option>
            <option value="Etanol">Etanol</option>
            <option value="Diesel">Diesel</option>
            <option value="GNV">GNV</option>
          </select>

          <div className="flex items-center gap-1 p-1 bg-[#0B0D12] border border-[#232A3B] rounded-lg">
            {TANK_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTankFilter(opt.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  tankFilter === opt.id
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

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-10 text-center">
          <p className="text-sm text-[#94A3B8]">
            {computed.length === 0
              ? 'Nenhum abastecimento registrado para este veículo.'
              : 'Nenhum registro corresponde aos filtros aplicados.'}
          </p>
          {computed.length === 0 && (
            <button
              type="button"
              onClick={onAddRefueling}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-sm font-semibold text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Registrar primeiro abastecimento
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-[#12161F] border border-[#232A3B] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#232A3B] bg-[#0E1118] text-xs font-medium text-[#94A3B8]">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Posto / Combustível</th>
                    <th className="py-3 px-4 text-right">Quilometragem</th>
                    <th className="py-3 px-4 text-right">Distância</th>
                    <th className="py-3 px-4 text-right">Litros</th>
                    <th className="py-3 px-4 text-right">Preço/L</th>
                    <th className="py-3 px-4 text-right">Valor pago</th>
                    <th className="py-3 px-4 text-right">Consumo</th>
                    <th className="py-3 px-4 text-right">Custo/km</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1D2332] text-sm">
                  {filtered.map((item) => (
                    <HistoryTableRow
                      key={item.id}
                      item={item}
                      onEdit={onEditRefueling}
                      onRequestDelete={handleRequestDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {filtered.map((item) => (
              <HistoryMobileCard
                key={item.id}
                item={item}
                onEdit={onEditRefueling}
                onRequestDelete={handleRequestDelete}
              />
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(deletingItem)}
        title="Excluir abastecimento?"
        description={
          deletingItem
            ? `Tem certeza que deseja excluir o registro de ${formatDateBR(deletingItem.date)} (${formatKm(deletingItem.odometerKm)}, ${formatCurrency(deletingItem.totalPaid)})? Os cálculos de consumo dos trechos seguintes serão recalculados automaticamente.`
            : ''
        }
        confirmLabel="Excluir registro"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
});
