'use client';

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import {
  BarChart3,
  Car,
  History,
  LayoutDashboard,
  Plus,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { computeVehicleRefuelings } from '@/lib/calculations';
import { createEmptyWorkspace, createSeedData } from '@/lib/seed';
import {
  exportBackupJSON,
  loadWorkspace,
  saveWorkspace,
  validateBackupPayload,
} from '@/lib/storage';
import {
  ActiveTab,
  AppStorageData,
  ComputedRefueling,
  Refueling,
  Vehicle,
} from '@/lib/types';
import { DashboardView } from './DashboardView';
import { HistoryView } from './HistoryView';
import { RefuelingModal } from './RefuelingModal';
import { ReportsView } from './ReportsView';
import { VehicleModal } from './VehicleModal';
import { VehiclesView } from './VehiclesView';

const NAV_ITEMS: {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'vehicles', label: 'Veículos', icon: Car },
];

const emptySubscribe = () => () => {};

export function FuelControlApp() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isClient) {
    return (
      <div className="min-h-screen bg-[#0B0D12] text-[#F1F5F9] flex flex-col">
        <header className="sticky top-0 z-30 bg-[#0B0D12]/90 border-b border-[#1E2534]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-[#F1F5F9] whitespace-nowrap shrink-0">
              Controle de Abastecimento - Jair
            </span>
          </div>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            <div className="h-24 rounded-xl bg-[#12161F] border border-[#232A3B]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-32 rounded-xl bg-[#12161F] border border-[#232A3B]"
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return <FuelControlWorkspace />;
}

function FuelControlWorkspace() {
  const [workspace, setWorkspace] = useState<AppStorageData>(() =>
    loadWorkspace()
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [refuelingModalOpen, setRefuelingModalOpen] = useState(false);
  const [editingRefueling, setEditingRefueling] = useState<Refueling | null>(
    null
  );

  const updateWorkspace = (updater: (prev: AppStorageData) => AppStorageData) => {
    setWorkspace((prev) => {
      const next = updater(prev);
      saveWorkspace(next);
      return next;
    });
  };

  const activeVehicle = useMemo(() => {
    if (workspace.vehicles.length === 0) return null;
    return (
      workspace.vehicles.find((v) => v.id === workspace.activeVehicleId) ||
      workspace.vehicles[0]
    );
  }, [workspace]);

  const activeVehicleRefuelings = useMemo(() => {
    if (!activeVehicle) return [];
    return workspace.refuelings.filter((r) => r.vehicleId === activeVehicle.id);
  }, [workspace.refuelings, activeVehicle]);

  const computedRefuelings = useMemo(
    () => computeVehicleRefuelings(activeVehicleRefuelings),
    [activeVehicleRefuelings]
  );

  const handleSaveVehicle = (
    data: Omit<Vehicle, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    updateWorkspace((prev) => {
      if (existingId) {
        return {
          ...prev,
          isDemoData: false,
          vehicles: prev.vehicles.map((v) =>
            v.id === existingId ? { ...v, ...data } : v
          ),
        };
      }
      const newVehicle: Vehicle = {
        ...data,
        id: `veh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
      };
      return {
        ...prev,
        isDemoData: false,
        vehicles: [...prev.vehicles, newVehicle],
        activeVehicleId: newVehicle.id,
      };
    });
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    updateWorkspace((prev) => {
      const remainingVehicles = prev.vehicles.filter((v) => v.id !== vehicleId);
      const remainingRefuelings = prev.refuelings.filter(
        (r) => r.vehicleId !== vehicleId
      );
      const nextActiveId =
        prev.activeVehicleId === vehicleId
          ? remainingVehicles[0]?.id || null
          : prev.activeVehicleId;

      return {
        ...prev,
        isDemoData: false,
        vehicles: remainingVehicles,
        refuelings: remainingRefuelings,
        activeVehicleId: nextActiveId,
      };
    });
  };

  const handleSaveRefueling = (
    data: Omit<Refueling, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    updateWorkspace((prev) => {
      let nextRefuelings: Refueling[];
      if (existingId) {
        nextRefuelings = prev.refuelings.map((r) =>
          r.id === existingId ? { ...r, ...data } : r
        );
      } else {
        const created: Refueling = {
          ...data,
          id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
        };
        nextRefuelings = [...prev.refuelings, created];
      }

      const nextVehicles = prev.vehicles.map((v) => {
        if (v.id !== data.vehicleId) return v;
        if (data.odometerKm > v.currentOdometer) {
          return { ...v, currentOdometer: data.odometerKm };
        }
        return v;
      });

      return {
        ...prev,
        isDemoData: false,
        vehicles: nextVehicles,
        refuelings: nextRefuelings,
      };
    });
  };

  const handleDeleteRefueling = (refuelingId: string) => {
    updateWorkspace((prev) => ({
      ...prev,
      isDemoData: false,
      refuelings: prev.refuelings.filter((r) => r.id !== refuelingId),
    }));
  };

  const handleImportBackup = async (
    file: File
  ): Promise<{ ok: boolean; message: string }> => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validated = validateBackupPayload(parsed);
      if (!validated) {
        return {
          ok: false,
          message:
            'Arquivo de backup inválido. Verifique se é um arquivo JSON exportado pelo Controle de Abastecimento - Jair.',
        };
      }
      saveWorkspace(validated);
      setWorkspace(validated);
      return {
        ok: true,
        message: `Backup restaurado com sucesso: ${validated.vehicles.length} veículo(s) e ${validated.refuelings.length} abastecimento(s).`,
      };
    } catch {
      return {
        ok: false,
        message: 'Não foi possível ler o arquivo JSON selecionado.',
      };
    }
  };

  const openAddRefueling = () => {
    if (!activeVehicle) {
      setEditingVehicle(null);
      setVehicleModalOpen(true);
      return;
    }
    setEditingRefueling(null);
    setRefuelingModalOpen(true);
  };

  const openEditRefueling = (item: ComputedRefueling) => {
    setEditingRefueling(item);
    setRefuelingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#F1F5F9] flex flex-col">
      {/* Top Bar (Strict 3-zone contract) */}
      <header className="sticky top-0 z-30 bg-[#0B0D12]/90 backdrop-blur-md border-b border-[#1E2534]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="font-display text-base sm:text-lg font-bold tracking-tight text-[#F1F5F9] whitespace-nowrap shrink-0 text-left truncate max-w-[210px] sm:max-w-none"
          >
            Controle de Abastecimento - Jair
          </button>

          <nav
            className="hidden md:flex items-center gap-7"
            aria-label="Navegação principal"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-[#F1F5F9]'
                      : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#3B82F6] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={openAddRefueling}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs sm:text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{activeVehicle ? 'Abastecer' : 'Novo veículo'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeTab === 'dashboard' && (
              <DashboardView
                vehicle={activeVehicle}
                vehicles={workspace.vehicles}
                computed={computedRefuelings}
                onSelectVehicle={(id) =>
                  updateWorkspace((prev) => ({ ...prev, activeVehicleId: id }))
                }
                onAddRefueling={openAddRefueling}
                onAddVehicle={() => {
                  setEditingVehicle(null);
                  setVehicleModalOpen(true);
                }}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                vehicle={activeVehicle}
                computed={computedRefuelings}
                onAddRefueling={openAddRefueling}
                onEditRefueling={openEditRefueling}
                onDeleteRefueling={handleDeleteRefueling}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                vehicle={activeVehicle}
                computed={computedRefuelings}
              />
            )}

            {activeTab === 'vehicles' && (
              <VehiclesView
                vehicles={workspace.vehicles}
                refuelings={workspace.refuelings}
                activeVehicleId={activeVehicle?.id ?? null}
                onSelectVehicle={(id) => {
                  updateWorkspace((prev) => ({ ...prev, activeVehicleId: id }));
                  setActiveTab('dashboard');
                }}
                onAddVehicle={() => {
                  setEditingVehicle(null);
                  setVehicleModalOpen(true);
                }}
                onEditVehicle={(v) => {
                  setEditingVehicle(v);
                  setVehicleModalOpen(true);
                }}
                onDeleteVehicle={handleDeleteVehicle}
                onExportBackup={() => exportBackupJSON(workspace)}
                onImportBackup={handleImportBackup}
                onLoadDemo={() => {
                  const demo = createSeedData();
                  saveWorkspace(demo);
                  setWorkspace(demo);
                }}
                onClearAll={() => {
                  const empty = createEmptyWorkspace();
                  saveWorkspace(empty);
                  setWorkspace(empty);
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0B0D12]/95 backdrop-blur-md border-t border-[#1E2534] h-14 px-2 flex items-center justify-around"
        aria-label="Navegação móvel"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                isActive ? 'text-[#38BDF8]' : 'text-[#94A3B8]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <VehicleModal
        isOpen={vehicleModalOpen}
        editingVehicle={editingVehicle}
        onClose={() => {
          setVehicleModalOpen(false);
          setEditingVehicle(null);
        }}
        onSave={handleSaveVehicle}
      />

      <RefuelingModal
        isOpen={refuelingModalOpen}
        vehicle={activeVehicle}
        vehicleRefuelings={activeVehicleRefuelings}
        editingRefueling={editingRefueling}
        onClose={() => {
          setRefuelingModalOpen(false);
          setEditingRefueling(null);
        }}
        onSave={handleSaveRefueling}
      />
    </div>
  );
}
