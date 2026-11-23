'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Wrench, X } from 'lucide-react';
import { formatKm } from '@/lib/calculations';
import {
  MaintenanceCategory,
  MaintenanceItem,
  Vehicle,
} from '@/lib/types';

export interface MaintenancePreset {
  title: string;
  category: MaintenanceCategory;
  intervalKm: number;
  intervalMonths?: number;
  notes?: string;
}

export const MAINTENANCE_PRESETS: MaintenancePreset[] = [
  {
    title: 'Troca de óleo do motor',
    category: 'Motor & Óleo',
    intervalKm: 10000,
    intervalMonths: 12,
    notes: 'Óleo sintético + verificação de nível',
  },
  {
    title: 'Filtro de óleo',
    category: 'Filtros',
    intervalKm: 10000,
    intervalMonths: 12,
  },
  {
    title: 'Filtro de ar do motor',
    category: 'Filtros',
    intervalKm: 15000,
    intervalMonths: 12,
  },
  {
    title: 'Alinhamento e balanceamento',
    category: 'Pneus & Suspensão',
    intervalKm: 10000,
  },
  {
    title: 'Pastilhas de freio',
    category: 'Freios',
    intervalKm: 30000,
  },
  {
    title: 'Correia dentada / acessórios',
    category: 'Motor & Óleo',
    intervalKm: 50000,
    intervalMonths: 48,
  },
];

const CATEGORY_OPTIONS: MaintenanceCategory[] = [
  'Motor & Óleo',
  'Freios',
  'Pneus & Suspensão',
  'Filtros',
  'Elétrica',
  'Geral',
];

interface MaintenanceModalProps {
  isOpen: boolean;
  vehicle: Vehicle | null;
  effectiveOdometerKm: number;
  editingItem: MaintenanceItem | null;
  isRenewMode?: boolean;
  initialPreset?: MaintenancePreset | null;
  onClose: () => void;
  onSave: (
    data: Omit<MaintenanceItem, 'id' | 'createdAt'>,
    existingId?: string
  ) => void;
}

export function MaintenanceModal({
  isOpen,
  vehicle,
  effectiveOdometerKm,
  editingItem,
  isRenewMode = false,
  initialPreset = null,
  onClose,
  onSave,
}: MaintenanceModalProps) {
  if (!isOpen || !vehicle) return null;

  return (
    <MaintenanceModalForm
      key={`${vehicle.id}-${editingItem?.id ?? 'new'}-${isRenewMode ? 'renew' : 'edit'}-${initialPreset?.title ?? 'none'}`}
      vehicle={vehicle}
      effectiveOdometerKm={effectiveOdometerKm}
      editingItem={editingItem}
      isRenewMode={isRenewMode}
      initialPreset={initialPreset}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

interface MaintenanceModalFormProps {
  vehicle: Vehicle;
  effectiveOdometerKm: number;
  editingItem: MaintenanceItem | null;
  isRenewMode: boolean;
  initialPreset: MaintenancePreset | null;
  onClose: () => void;
  onSave: (
    data: Omit<MaintenanceItem, 'id' | 'createdAt'>,
    existingId?: string
  ) => void;
}

function MaintenanceModalForm({
  vehicle,
  effectiveOdometerKm,
  editingItem,
  isRenewMode,
  initialPreset,
  onClose,
  onSave,
}: MaintenanceModalFormProps) {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState(
    editingItem?.title ?? initialPreset?.title ?? ''
  );
  const [category, setCategory] = useState<MaintenanceCategory>(
    editingItem?.category ?? initialPreset?.category ?? 'Motor & Óleo'
  );
  const [lastDoneKm, setLastDoneKm] = useState(() => {
    if (isRenewMode) {
      return String(effectiveOdometerKm);
    }
    if (editingItem) {
      return String(editingItem.lastDoneKm);
    }
    return String(effectiveOdometerKm);
  });
  const [intervalKm, setIntervalKm] = useState(
    editingItem
      ? String(editingItem.intervalKm)
      : initialPreset
        ? String(initialPreset.intervalKm)
        : '10000'
  );
  const [lastDoneDate, setLastDoneDate] = useState(() => {
    if (isRenewMode) return todayIso;
    return editingItem?.lastDoneDate ?? todayIso;
  });
  const [intervalMonths, setIntervalMonths] = useState(
    editingItem?.intervalMonths !== undefined
      ? String(editingItem.intervalMonths)
      : initialPreset?.intervalMonths !== undefined
        ? String(initialPreset.intervalMonths)
        : ''
  );
  const [cost, setCost] = useState(
    isRenewMode
      ? ''
      : editingItem?.cost !== undefined
        ? editingItem.cost.toFixed(2)
        : ''
  );
  const [notes, setNotes] = useState(
    editingItem?.notes ?? initialPreset?.notes ?? ''
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const applyPreset = (preset: MaintenancePreset) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setIntervalKm(String(preset.intervalKm));
    setIntervalMonths(
      preset.intervalMonths !== undefined ? String(preset.intervalMonths) : ''
    );
    if (preset.notes) setNotes(preset.notes);
  };

  const preview = useMemo(() => {
    const baseKm = Number(lastDoneKm.replace(',', '.'));
    const stepKm = Number(intervalKm.replace(',', '.'));
    if (
      Number.isNaN(baseKm) ||
      Number.isNaN(stepKm) ||
      baseKm < 0 ||
      stepKm < 100
    ) {
      return null;
    }
    const nextDueKm = Math.round(baseKm) + Math.round(stepKm);
    const remaining = nextDueKm - effectiveOdometerKm;
    return {
      nextDueKm,
      remaining,
    };
  }, [lastDoneKm, intervalKm, effectiveOdometerKm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const parsedLastKm = Number(lastDoneKm.replace(',', '.'));
    const parsedIntervalKm = Number(intervalKm.replace(',', '.'));
    const parsedMonths = intervalMonths.trim()
      ? Number(intervalMonths.trim())
      : undefined;
    const parsedCost = cost.trim()
      ? Number(cost.replace(',', '.'))
      : undefined;

    if (!trimmedTitle) {
      setError('Informe o nome da manutenção (ex: Troca de óleo do motor).');
      return;
    }
    if (
      lastDoneKm.trim() === '' ||
      Number.isNaN(parsedLastKm) ||
      parsedLastKm < 0 ||
      parsedLastKm > 10000000
    ) {
      setError('Informe uma quilometragem da última troca entre 0 e 10.000.000 km.');
      return;
    }
    if (
      intervalKm.trim() === '' ||
      Number.isNaN(parsedIntervalKm) ||
      parsedIntervalKm < 100 ||
      parsedIntervalKm > 500000
    ) {
      setError('O intervalo em quilômetros deve estar entre 100 e 500.000 km.');
      return;
    }
    if (
      parsedMonths !== undefined &&
      (!Number.isInteger(parsedMonths) || parsedMonths < 1 || parsedMonths > 120)
    ) {
      setError('O intervalo em meses deve ser um número inteiro entre 1 e 120.');
      return;
    }
    if (
      parsedCost !== undefined &&
      (Number.isNaN(parsedCost) || parsedCost < 0 || parsedCost > 1000000)
    ) {
      setError('O valor gasto deve ser um número positivo.');
      return;
    }

    onSave(
      {
        vehicleId: vehicle.id,
        title: trimmedTitle.slice(0, 80),
        category,
        lastDoneKm: Math.round(parsedLastKm),
        intervalKm: Math.round(parsedIntervalKm),
        lastDoneDate: lastDoneDate.trim() || undefined,
        intervalMonths: parsedMonths,
        cost:
          parsedCost !== undefined ? Number(parsedCost.toFixed(2)) : undefined,
        notes: notes.trim().slice(0, 400) || undefined,
      },
      editingItem?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="maintenance-modal-title"
    >
      <div className="w-full max-w-xl bg-[#12161F] border border-[#232A3B] rounded-2xl shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232A3B]">
          <div className="min-w-0">
            <h2
              id="maintenance-modal-title"
              className="font-display text-lg font-semibold text-[#F1F5F9] flex items-center gap-2"
            >
              <Wrench className="w-4 h-4 text-[#38BDF8] shrink-0" />
              <span>
                {isRenewMode
                  ? 'Registrar troca / execução'
                  : editingItem
                    ? 'Editar manutenção'
                    : 'Nova manutenção preventiva'}
              </span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5 truncate">
              {vehicle.brand} {vehicle.name} · Odômetro atual:{' '}
              <span className="font-mono tabular-nums text-[#CBD5E1]">
                {formatKm(effectiveOdometerKm)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1B2130] transition-colors shrink-0"
            aria-label="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
              {error}
            </div>
          )}

          {!editingItem && (
            <div>
              <span className="block text-xs font-medium text-[#94A3B8] mb-2">
                Modelos rápidos (clique para preencher)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MAINTENANCE_PRESETS.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      title === preset.title
                        ? 'bg-[#2563EB]/20 border-[#2563EB] text-[#38BDF8]'
                        : 'bg-[#0B0D12] border-[#232A3B] text-[#CBD5E1] hover:border-[#3B82F6]'
                    }`}
                  >
                    {preset.title} ({preset.intervalKm / 1000}k)
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Item de manutenção *
              </label>
              <input
                type="text"
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Troca de óleo do motor"
                className="w-full h-11 px-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Categoria *
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as MaintenanceCategory)
                }
                className="w-full h-11 px-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                KM da última troca / realização *
              </label>
              <input
                type="number"
                min={0}
                max={10000000}
                step="1"
                value={lastDoneKm}
                onChange={(e) => setLastDoneKm(e.target.value)}
                placeholder={`Ex: ${effectiveOdometerKm}`}
                className="w-full h-11 px-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] font-mono tabular-nums placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Trocar a cada quantos KM *
              </label>
              <input
                type="number"
                min={100}
                max={500000}
                step="100"
                value={intervalKm}
                onChange={(e) => setIntervalKm(e.target.value)}
                placeholder="Ex: 10000"
                className="w-full h-11 px-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] font-mono tabular-nums placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Data da troca — opcional
              </label>
              <input
                type="date"
                value={lastDoneDate}
                onChange={(e) => setLastDoneDate(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] font-mono tabular-nums focus:outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Prazo (meses) — opcional
              </label>
              <input
                type="number"
                min={1}
                max={120}
                step="1"
                value={intervalMonths}
                onChange={(e) => setIntervalMonths(e.target.value)}
                placeholder="Ex: 12"
                className="w-full h-11 px-3 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] font-mono tabular-nums placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Valor (R$) — opcional
              </label>
              <input
                type="number"
                min={0}
                max={1000000}
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="Ex: 320.00"
                className="w-full h-11 px-3 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] font-mono tabular-nums placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
              Observações / oficina / especificação — opcional
            </label>
            <input
              type="text"
              maxLength={400}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Óleo 5W30 sintético, oficina Silva"
              className="w-full h-11 px-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          {preview && (
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#161B26] border border-[#232A3B]">
              <div>
                <div className="text-xs text-[#94A3B8]">Odômetro atual</div>
                <div className="font-mono text-sm font-semibold text-[#F1F5F9] tabular-nums mt-0.5">
                  {formatKm(effectiveOdometerKm)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#94A3B8]">Próxima troca</div>
                <div className="font-mono text-sm font-semibold text-[#38BDF8] tabular-nums mt-0.5">
                  {formatKm(preview.nextDueKm)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#94A3B8]">Saldo restante</div>
                <div
                  className={`font-mono text-sm font-semibold tabular-nums mt-0.5 ${
                    preview.remaining <= 0
                      ? 'text-red-400'
                      : preview.remaining <= 1000
                        ? 'text-amber-300'
                        : 'text-emerald-400'
                  }`}
                >
                  {preview.remaining <= 0
                    ? `Vencido (${formatKm(Math.abs(preview.remaining))})`
                    : formatKm(preview.remaining)}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-white hover:bg-[#1B2130] transition-colors whitespace-nowrap shrink-0"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors whitespace-nowrap shrink-0"
            >
              {isRenewMode
                ? 'Confirmar troca'
                : editingItem
                  ? 'Salvar alterações'
                  : 'Salvar manutenção'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
