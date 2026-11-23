'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { FuelType, Vehicle } from '@/lib/types';

interface VehicleModalProps {
  isOpen: boolean;
  editingVehicle: Vehicle | null;
  onClose: () => void;
  onSave: (data: Omit<Vehicle, 'id' | 'createdAt'>, existingId?: string) => void;
}

const FUEL_OPTIONS: FuelType[] = ['Gasolina', 'Etanol', 'Diesel', 'GNV'];

export function VehicleModal({
  isOpen,
  editingVehicle,
  onClose,
  onSave,
}: VehicleModalProps) {
  if (!isOpen) return null;

  return (
    <VehicleModalForm
      key={editingVehicle?.id ?? 'new'}
      editingVehicle={editingVehicle}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function VehicleModalForm({
  editingVehicle,
  onClose,
  onSave,
}: Omit<VehicleModalProps, 'isOpen'>) {
  const [name, setName] = useState(editingVehicle?.name ?? '');
  const [brand, setBrand] = useState(editingVehicle?.brand ?? '');
  const [year, setYear] = useState(
    String(editingVehicle?.year ?? new Date().getFullYear())
  );
  const [defaultFuel, setDefaultFuel] = useState<FuelType>(
    editingVehicle?.defaultFuel ?? 'Gasolina'
  );
  const [currentOdometer, setCurrentOdometer] = useState(
    editingVehicle ? String(editingVehicle.currentOdometer) : ''
  );
  const [tankCapacity, setTankCapacity] = useState(
    editingVehicle?.tankCapacity !== undefined
      ? String(editingVehicle.tankCapacity)
      : ''
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedBrand = brand.trim();
    const parsedYear = Number(year);
    const parsedOdometer = Number(currentOdometer.replace(',', '.'));
    const parsedTank = tankCapacity.trim()
      ? Number(tankCapacity.replace(',', '.'))
      : undefined;

    if (!trimmedName) {
      setError('Informe o nome ou modelo do veículo.');
      return;
    }
    if (!trimmedBrand) {
      setError('Informe a marca do veículo.');
      return;
    }
    if (
      !Number.isInteger(parsedYear) ||
      parsedYear < 1950 ||
      parsedYear > new Date().getFullYear() + 1
    ) {
      setError('Informe um ano válido para o veículo.');
      return;
    }
    if (
      currentOdometer.trim() === '' ||
      Number.isNaN(parsedOdometer) ||
      parsedOdometer < 0
    ) {
      setError('A quilometragem atual deve ser um número igual ou maior que zero.');
      return;
    }
    if (parsedTank !== undefined && (Number.isNaN(parsedTank) || parsedTank <= 0)) {
      setError('A capacidade do tanque deve ser maior que zero.');
      return;
    }

    onSave(
      {
        name: trimmedName,
        brand: trimmedBrand,
        year: parsedYear,
        defaultFuel,
        currentOdometer: Math.round(parsedOdometer),
        tankCapacity: parsedTank,
      },
      editingVehicle?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vehicle-modal-title"
    >
      <div className="w-full max-w-lg bg-[#12161F] border border-[#232A3B] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232A3B]">
          <div>
            <h2
              id="vehicle-modal-title"
              className="font-display text-lg font-semibold text-[#F1F5F9]"
            >
              {editingVehicle ? 'Editar veículo' : 'Cadastrar veículo'}
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Dados isolados por veículo para cálculo exato de consumo e custos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1B2130] transition-colors"
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
                Marca *
              </label>
              <input
                type="text"
                maxLength={60}
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex: Honda"
                className="w-full h-11 px-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Nome ou modelo *
              </label>
              <input
                type="text"
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Civic Touring"
                className="w-full h-11 px-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Ano *
              </label>
              <input
                type="number"
                min={1950}
                max={new Date().getFullYear() + 1}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] font-mono tabular-nums focus:outline-none focus:border-[#3B82F6]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Combustível padrão *
              </label>
              <select
                value={defaultFuel}
                onChange={(e) => setDefaultFuel(e.target.value as FuelType)}
                className="w-full h-11 px-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
              >
                {FUEL_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Quilometragem atual (km) *
              </label>
              <input
                type="number"
                min={0}
                max={10000000}
                step="1"
                value={currentOdometer}
                onChange={(e) => setCurrentOdometer(e.target.value)}
                placeholder="Ex: 50000"
                className="w-full h-11 px-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] font-mono tabular-nums placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Capacidade do tanque (L) — opcional
              </label>
              <input
                type="number"
                min={1}
                max={2000}
                step="0.5"
                value={tankCapacity}
                onChange={(e) => setTankCapacity(e.target.value)}
                placeholder="Ex: 56"
                className="w-full h-11 px-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] font-mono tabular-nums placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#232A3B]">
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
              {editingVehicle ? 'Salvar alterações' : 'Cadastrar veículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
