'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calculator, X } from 'lucide-react';
import {
  formatCurrency,
  formatDecimal,
  formatKm,
  sortRefuelingsChronologically,
} from '@/lib/calculations';
import { FuelType, Refueling, Vehicle } from '@/lib/types';

interface RefuelingModalProps {
  isOpen: boolean;
  vehicle: Vehicle | null;
  vehicleRefuelings: Refueling[];
  editingRefueling: Refueling | null;
  onClose: () => void;
  onSave: (
    data: Omit<Refueling, 'id' | 'createdAt'>,
    existingId?: string
  ) => void;
}

type CalcTarget = 'price' | 'liters' | 'total';
const FUEL_OPTIONS: FuelType[] = ['Gasolina', 'Etanol', 'Diesel', 'GNV'];

export function RefuelingModal({
  isOpen,
  vehicle,
  vehicleRefuelings,
  editingRefueling,
  onClose,
  onSave,
}: RefuelingModalProps) {
  if (!isOpen || !vehicle) return null;

  return (
    <RefuelingModalForm
      key={`${vehicle.id}-${editingRefueling?.id ?? 'new'}`}
      vehicle={vehicle}
      vehicleRefuelings={vehicleRefuelings}
      editingRefueling={editingRefueling}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

interface RefuelingModalFormProps {
  vehicle: Vehicle;
  vehicleRefuelings: Refueling[];
  editingRefueling: Refueling | null;
  onClose: () => void;
  onSave: (
    data: Omit<Refueling, 'id' | 'createdAt'>,
    existingId?: string
  ) => void;
}

function RefuelingModalForm({
  vehicle,
  vehicleRefuelings,
  editingRefueling,
  onClose,
  onSave,
}: RefuelingModalFormProps) {
  const odometerContext = useMemo(() => {
    const others = editingRefueling
      ? vehicleRefuelings.filter((r) => r.id !== editingRefueling.id)
      : vehicleRefuelings;
    const sortedOthers = sortRefuelingsChronologically(others);

    if (sortedOthers.length === 0) {
      return {
        prevRecord: null as Refueling | null,
        nextRecord: null as Refueling | null,
        minAllowedKm: 0,
        maxAllowedKm: null as number | null,
      };
    }

    if (!editingRefueling) {
      const last = sortedOthers[sortedOthers.length - 1];
      return {
        prevRecord: last,
        nextRecord: null,
        minAllowedKm: last.odometerKm,
        maxAllowedKm: null,
      };
    }

    const allSorted = sortRefuelingsChronologically(vehicleRefuelings);
    const idx = allSorted.findIndex((r) => r.id === editingRefueling.id);
    const prevRecord = idx > 0 ? allSorted[idx - 1] : null;
    const nextRecord =
      idx >= 0 && idx < allSorted.length - 1 ? allSorted[idx + 1] : null;

    return {
      prevRecord,
      nextRecord,
      minAllowedKm: prevRecord ? prevRecord.odometerKm : 0,
      maxAllowedKm: nextRecord ? nextRecord.odometerKm : null,
    };
  }, [editingRefueling, vehicleRefuelings]);

  const initialSuggestedKm = editingRefueling
    ? String(editingRefueling.odometerKm)
    : (() => {
        const km = odometerContext.prevRecord
          ? Math.max(vehicle.currentOdometer, odometerContext.prevRecord.odometerKm)
          : vehicle.currentOdometer;
        return km > 0 ? String(km) : '';
      })();

  const [date, setDate] = useState(
    editingRefueling?.date ?? new Date().toISOString().slice(0, 10)
  );
  const [odometerKm, setOdometerKm] = useState(initialSuggestedKm);
  const [totalPaid, setTotalPaid] = useState(
    editingRefueling ? editingRefueling.totalPaid.toFixed(2) : ''
  );
  const [liters, setLiters] = useState(
    editingRefueling ? editingRefueling.liters.toFixed(2) : ''
  );
  const [pricePerLiter, setPricePerLiter] = useState(
    editingRefueling ? editingRefueling.pricePerLiter.toFixed(3) : ''
  );
  const [calcTarget, setCalcTarget] = useState<CalcTarget>('price');
  const [fuelType, setFuelType] = useState<FuelType>(
    editingRefueling?.fuelType ?? vehicle.defaultFuel
  );
  const [fullTank, setFullTank] = useState(
    editingRefueling ? editingRefueling.fullTank : true
  );
  const [station, setStation] = useState(editingRefueling?.station ?? '');
  const [notes, setNotes] = useState(editingRefueling?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleTotalChange = (val: string) => {
    setTotalPaid(val);
    const t = parseFloat(val.replace(',', '.'));
    if (calcTarget === 'price') {
      const l = parseFloat(liters.replace(',', '.'));
      if (t > 0 && l > 0) {
        setPricePerLiter((t / l).toFixed(3));
      } else {
        setPricePerLiter('');
      }
    } else if (calcTarget === 'liters') {
      const p = parseFloat(pricePerLiter.replace(',', '.'));
      if (t > 0 && p > 0) {
        setLiters((t / p).toFixed(2));
      } else {
        setLiters('');
      }
    }
  };

  const handleLitersChange = (val: string) => {
    setLiters(val);
    const l = parseFloat(val.replace(',', '.'));
    if (calcTarget === 'price') {
      const t = parseFloat(totalPaid.replace(',', '.'));
      if (t > 0 && l > 0) {
        setPricePerLiter((t / l).toFixed(3));
      } else {
        setPricePerLiter('');
      }
    } else if (calcTarget === 'total') {
      const p = parseFloat(pricePerLiter.replace(',', '.'));
      if (l > 0 && p > 0) {
        setTotalPaid((l * p).toFixed(2));
      } else {
        setTotalPaid('');
      }
    }
  };

  const handlePriceChange = (val: string) => {
    setPricePerLiter(val);
    const p = parseFloat(val.replace(',', '.'));
    if (calcTarget === 'liters') {
      const t = parseFloat(totalPaid.replace(',', '.'));
      if (t > 0 && p > 0) {
        setLiters((t / p).toFixed(2));
      } else {
        setLiters('');
      }
    } else if (calcTarget === 'total') {
      const l = parseFloat(liters.replace(',', '.'));
      if (l > 0 && p > 0) {
        setTotalPaid((l * p).toFixed(2));
      } else {
        setTotalPaid('');
      }
    }
  };

  const preview = useMemo(() => {
    const km = parseFloat(odometerKm.replace(',', '.'));
    const t = parseFloat(totalPaid.replace(',', '.'));
    const l = parseFloat(liters.replace(',', '.'));

    const prevKm = odometerContext.prevRecord?.odometerKm ?? null;
    const distance =
      prevKm !== null && !Number.isNaN(km) && km >= prevKm ? km - prevKm : null;
    const consumption =
      distance !== null && distance > 0 && l > 0 ? distance / l : null;
    const costPerKm =
      distance !== null && distance > 0 && t > 0 ? t / distance : null;

    return {
      distance,
      consumption,
      costPerKm,
    };
  }, [odometerKm, totalPaid, liters, odometerContext.prevRecord]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!date) {
      setError('Informe a data do abastecimento.');
      return;
    }

    const parsedKm = Number(odometerKm.replace(',', '.'));
    const parsedTotal = Number(totalPaid.replace(',', '.'));
    const parsedLiters = Number(liters.replace(',', '.'));
    const parsedPrice = Number(pricePerLiter.replace(',', '.'));

    if (odometerKm.trim() === '' || Number.isNaN(parsedKm) || parsedKm < 0) {
      setError(
        'A quilometragem deve ser um número válido igual ou maior que zero.'
      );
      return;
    }

    if (
      odometerContext.prevRecord &&
      parsedKm < odometerContext.prevRecord.odometerKm
    ) {
      setError(
        `A quilometragem não pode ser menor que o abastecimento anterior (${formatKm(odometerContext.prevRecord.odometerKm)}).`
      );
      return;
    }

    if (
      odometerContext.nextRecord &&
      parsedKm > odometerContext.nextRecord.odometerKm
    ) {
      setError(
        `A quilometragem não pode ultrapassar o abastecimento seguinte (${formatKm(odometerContext.nextRecord.odometerKm)}).`
      );
      return;
    }

    if (Number.isNaN(parsedTotal) || parsedTotal <= 0) {
      setError('O valor total pago deve ser maior que zero.');
      return;
    }

    if (Number.isNaN(parsedLiters) || parsedLiters <= 0) {
      setError('A quantidade de litros deve ser maior que zero.');
      return;
    }

    if (vehicle.tankCapacity && parsedLiters > vehicle.tankCapacity * 1.15) {
      setError(
        `A quantidade informada (${formatDecimal(parsedLiters)} L) excede a capacidade do tanque (${vehicle.tankCapacity} L). Verifique o valor.`
      );
      return;
    }

    const computedPrice =
      !Number.isNaN(parsedPrice) && parsedPrice > 0
        ? parsedPrice
        : parsedTotal / parsedLiters;

    onSave(
      {
        vehicleId: vehicle.id,
        date,
        odometerKm: Math.round(parsedKm),
        totalPaid: Number(parsedTotal.toFixed(2)),
        liters: Number(parsedLiters.toFixed(2)),
        pricePerLiter: Number(computedPrice.toFixed(3)),
        fuelType,
        fullTank,
        station: station.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      editingRefueling?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refueling-modal-title"
    >
      <div className="w-full max-w-xl bg-[#12161F] border border-[#232A3B] rounded-2xl shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232A3B]">
          <div className="min-w-0">
            <h2
              id="refueling-modal-title"
              className="font-display text-lg font-semibold text-[#F1F5F9]"
            >
              {editingRefueling
                ? 'Editar abastecimento'
                : 'Registrar abastecimento'}
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5 truncate">
              {vehicle.brand} {vehicle.name} · {vehicle.year}
              {odometerContext.prevRecord
                ? ` · KM anterior: ${formatKm(odometerContext.prevRecord.odometerKm)}`
                : ' · Primeiro abastecimento'}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Data do abastecimento *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] font-mono tabular-nums focus:outline-none focus:border-[#3B82F6]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Quilometragem atual (KM) *
              </label>
              <input
                type="number"
                min={odometerContext.minAllowedKm}
                max={odometerContext.maxAllowedKm ?? undefined}
                step="1"
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value)}
                placeholder={
                  odometerContext.prevRecord
                    ? `Mínimo ${odometerContext.prevRecord.odometerKm}`
                    : 'Ex: 50000'
                }
                className="w-full h-11 px-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] font-mono tabular-nums placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
                required
              />
            </div>
          </div>

          <div className="pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-[#94A3B8] flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-[#3B82F6]" />
                Cálculo automático
              </span>
              <div className="flex items-center gap-1 p-0.5 bg-[#0B0D12] border border-[#232A3B] rounded-lg">
                {(
                  [
                    { id: 'price', label: 'Preço/L' },
                    { id: 'liters', label: 'Litros' },
                    { id: 'total', label: 'Total R$' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setCalcTarget(mode.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      calcTarget === mode.id
                        ? 'bg-[#2563EB] text-white'
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                  Valor total (R$) {calcTarget === 'total' ? '(auto)' : '*'}
                </label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={totalPaid}
                  onChange={(e) => handleTotalChange(e.target.value)}
                  readOnly={calcTarget === 'total'}
                  placeholder="220.00"
                  className={`w-full h-11 px-3.5 rounded-lg border text-sm font-mono tabular-nums focus:outline-none ${
                    calcTarget === 'total'
                      ? 'bg-[#171C28] border-[#2563EB]/40 text-[#38BDF8]'
                      : 'bg-[#0B0D12] border-[#232A3B] text-[#F1F5F9] focus:border-[#3B82F6]'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                  Litros (L) {calcTarget === 'liters' ? '(auto)' : '*'}
                </label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={liters}
                  onChange={(e) => handleLitersChange(e.target.value)}
                  readOnly={calcTarget === 'liters'}
                  placeholder="38.00"
                  className={`w-full h-11 px-3.5 rounded-lg border text-sm font-mono tabular-nums focus:outline-none ${
                    calcTarget === 'liters'
                      ? 'bg-[#171C28] border-[#2563EB]/40 text-[#38BDF8]'
                      : 'bg-[#0B0D12] border-[#232A3B] text-[#F1F5F9] focus:border-[#3B82F6]'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                  Preço / Litro (R$) {calcTarget === 'price' ? '(auto)' : '*'}
                </label>
                <input
                  type="number"
                  min={0.01}
                  step="0.001"
                  value={pricePerLiter}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  readOnly={calcTarget === 'price'}
                  placeholder="5.789"
                  className={`w-full h-11 px-3.5 rounded-lg border text-sm font-mono tabular-nums focus:outline-none ${
                    calcTarget === 'price'
                      ? 'bg-[#171C28] border-[#2563EB]/40 text-[#38BDF8]'
                      : 'bg-[#0B0D12] border-[#232A3B] text-[#F1F5F9] focus:border-[#3B82F6]'
                  }`}
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Tipo de combustível *
              </label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as FuelType)}
                className="w-full h-11 px-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
              >
                {FUEL_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Nome do posto — opcional
              </label>
              <input
                type="text"
                maxLength={100}
                value={station}
                onChange={(e) => setStation(e.target.value)}
                placeholder="Ex: Shell Select Paulista"
                className="w-full h-11 px-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0B0D12] border border-[#232A3B] space-y-2">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <span className="text-sm font-medium text-[#F1F5F9] block">
                  Tanque completado até a trava
                </span>
                <span className="text-xs text-[#94A3B8]">
                  Recomendado para cálculo exato de consumo em km/l.
                </span>
              </div>
              <input
                type="checkbox"
                checked={fullTank}
                onChange={(e) => setFullTank(e.target.checked)}
                className="w-5 h-5 accent-[#2563EB] rounded cursor-pointer shrink-0"
              />
            </label>

            {!fullTank && (
              <div className="flex items-start gap-2 pt-2 border-t border-[#1E2534] text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Abastecimento parcial: o consumo exibido será estimado e a
                  medição poderá ficar imprecisa até o próximo tanque completo.
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
              Observações — opcional
            </label>
            <input
              type="text"
              maxLength={400}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Trecho rodoviário, ar-condicionado ligado..."
              className="w-full h-11 px-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#161B26] border border-[#232A3B]">
            <div>
              <div className="text-xs text-[#94A3B8]">Distância</div>
              <div className="font-mono text-sm font-semibold text-[#F1F5F9] tabular-nums mt-0.5">
                {preview.distance !== null
                  ? formatKm(preview.distance)
                  : odometerContext.prevRecord
                    ? '—'
                    : '1º registro'}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#94A3B8]">Consumo prev.</div>
              <div className="font-mono text-sm font-semibold text-[#38BDF8] tabular-nums mt-0.5">
                {preview.consumption !== null
                  ? `${formatDecimal(preview.consumption)} km/l`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#94A3B8]">Custo por km</div>
              <div className="font-mono text-sm font-semibold text-[#F1F5F9] tabular-nums mt-0.5">
                {preview.costPerKm !== null
                  ? `${formatCurrency(preview.costPerKm)}/km`
                  : '—'}
              </div>
            </div>
          </div>

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
              {editingRefueling ? 'Salvar alterações' : 'Salvar abastecimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
