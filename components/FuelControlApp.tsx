'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  BarChart3,
  Car,
  History,
  LayoutDashboard,
  LogOut,
  Plus,
  Upload,
  Wrench,
} from 'lucide-react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import {
  computeVehicleMaintenances,
  computeVehicleRefuelings,
  getEffectiveVehicleOdometer,
} from '@/lib/calculations';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  testConnection,
} from '@/lib/firebase';
import {
  createMaintenanceDoc,
  createRefuelingDoc,
  createVehicleDoc,
  deleteMaintenanceDoc,
  deleteRefuelingDoc,
  deleteVehicleWithRefuelings,
  ensureUserProfile,
  replaceWorkspaceInFirestore,
  syncVehicleOdometerDoc,
  updateActiveVehicleId,
  updateMaintenanceDoc,
  updateRefuelingDoc,
  updateVehicleDoc,
} from '@/lib/firestore-service';
import { createSeedData } from '@/lib/seed';
import {
  createEmptyWorkspace,
  exportBackupJSON,
  peekLocalLegacyWorkspace,
  saveWorkspace,
  validateBackupPayload,
} from '@/lib/storage';
import {
  ActiveTab,
  ComputedRefueling,
  MaintenanceItem,
  Refueling,
  Vehicle,
} from '@/lib/types';
import { DashboardView } from './DashboardView';
import { ErrorBoundary } from './ErrorBoundary';
import { HistoryView } from './HistoryView';
import { LoginScreen } from './LoginScreen';
import { MaintenanceModal, MaintenancePreset } from './MaintenanceModal';
import { MaintenanceView } from './MaintenanceView';
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
  { id: 'maintenance', label: 'Manutenção', icon: Wrench },
  { id: 'vehicles', label: 'Veículos', icon: Car },
];

export function FuelControlApp() {
  return (
    <ErrorBoundary>
      <FuelControlAuthGate />
    </ErrorBoundary>
  );
}

function FuelControlAuthGate() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    void testConnection();
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0B0D12] text-[#F1F5F9] flex flex-col">
        <header className="sticky top-0 z-30 bg-[#0B0D12]/95 border-b border-[#1E2534]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
            <div className="flex items-center gap-3 min-w-0">
              <Image
                src="/assets/aistudio/Logotipo_JJ_Automotivo_em_Azul_e_Prata_6621a1b1.png"
                alt="Logo Controle de Abastecimento - Jair"
                width={36}
                height={36}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-lg object-cover border border-[#232A3B] shrink-0"
              />
              <span className="font-display text-base sm:text-lg font-bold tracking-tight text-[#F1F5F9] whitespace-nowrap shrink-0">
                Controle de Abastecimento - Jair
              </span>
            </div>
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

  if (!user) {
    return <LoginScreen />;
  }

  return <FuelControlCloudWorkspace key={user.uid} user={user} />;
}

function FuelControlCloudWorkspace({ user }: { user: User }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [refuelings, setRefuelings] = useState<Refueling[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceItem[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [asyncError, setAsyncError] = useState<Error | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [refuelingModalOpen, setRefuelingModalOpen] = useState(false);
  const [editingRefueling, setEditingRefueling] = useState<Refueling | null>(
    null
  );
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] =
    useState<MaintenanceItem | null>(null);
  const [maintenanceRenewMode, setMaintenanceRenewMode] = useState(false);
  const [maintenancePreset, setMaintenancePreset] =
    useState<MaintenancePreset | null>(null);

  const [opError, setOpError] = useState<string | null>(null);
  const [migratingLocal, setMigratingLocal] = useState(false);
  const [localLegacyDismissed, setLocalLegacyDismissed] = useState(false);

  const localLegacyData = useMemo(() => {
    const local = peekLocalLegacyWorkspace();
    if (local && !local.isDemoData && local.vehicles.length > 0) {
      return local;
    }
    return null;
  }, []);

  if (asyncError) {
    throw asyncError;
  }

  useEffect(() => {
    let active = true;
    let vehiclesLoaded = false;
    let refuelingsLoaded = false;
    let maintenancesLoaded = false;

    const markReady = () => {
      if (active && vehiclesLoaded && refuelingsLoaded && maintenancesLoaded) {
        setDataReady(true);
      }
    };

    const captureError = (err: unknown) => {
      if (!active) return;
      setAsyncError(err instanceof Error ? err : new Error(String(err)));
    };

    // Ensure profile in parallel without blocking real-time listeners
    ensureUserProfile(user).catch(captureError);

    const profilePath = `users/${user.uid}`;
    const unsubProfile = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (!active) return;
        const d = snap.data();
        setActiveVehicleId(
          d && typeof d.activeVehicleId === 'string'
            ? d.activeVehicleId
            : null
        );
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, profilePath);
        } catch (e) {
          captureError(e);
        }
      }
    );

    const vehiclesPath = `users/${user.uid}/vehicles`;
    const unsubVehicles = onSnapshot(
      collection(db, 'users', user.uid, 'vehicles'),
      (snapshot) => {
        if (!active) return;
        const list: Vehicle[] = snapshot.docs.map((d) => {
          const raw = d.data();
          const createdAtIso =
            raw.createdAt && typeof raw.createdAt.toDate === 'function'
              ? raw.createdAt.toDate().toISOString()
              : new Date().toISOString();
          return {
            id: d.id,
            name: String(raw.name || ''),
            brand: String(raw.brand || ''),
            year: Number(raw.year || new Date().getFullYear()),
            defaultFuel: raw.defaultFuel || 'Gasolina',
            currentOdometer: Number(raw.currentOdometer || 0),
            tankCapacity:
              typeof raw.tankCapacity === 'number'
                ? raw.tankCapacity
                : undefined,
            createdAt: createdAtIso,
          };
        });
        list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        setVehicles(list);
        vehiclesLoaded = true;
        markReady();
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, vehiclesPath);
        } catch (e) {
          captureError(e);
        }
      }
    );

    const refuelingsPath = `users/${user.uid}/refuelings`;
    const unsubRefuelings = onSnapshot(
      collection(db, 'users', user.uid, 'refuelings'),
      (snapshot) => {
        if (!active) return;
        const list: Refueling[] = snapshot.docs.map((d) => {
          const raw = d.data();
          const createdAtIso =
            raw.createdAt && typeof raw.createdAt.toDate === 'function'
              ? raw.createdAt.toDate().toISOString()
              : new Date().toISOString();
          return {
            id: d.id,
            vehicleId: String(raw.vehicleId || ''),
            date: String(raw.date || ''),
            odometerKm: Number(raw.odometerKm || 0),
            totalPaid: Number(raw.totalPaid || 0),
            liters: Number(raw.liters || 0),
            pricePerLiter: Number(raw.pricePerLiter || 0),
            fuelType: raw.fuelType || 'Gasolina',
            fullTank: Boolean(raw.fullTank),
            station: typeof raw.station === 'string' ? raw.station : undefined,
            notes: typeof raw.notes === 'string' ? raw.notes : undefined,
            createdAt: createdAtIso,
          };
        });
        setRefuelings(list);
        refuelingsLoaded = true;
        markReady();
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, refuelingsPath);
        } catch (e) {
          captureError(e);
        }
      }
    );

    const maintenancesPath = `users/${user.uid}/maintenances`;
    const unsubMaintenances = onSnapshot(
      collection(db, 'users', user.uid, 'maintenances'),
      (snapshot) => {
        if (!active) return;
        const list: MaintenanceItem[] = snapshot.docs.map((d) => {
          const raw = d.data();
          const createdAtIso =
            raw.createdAt && typeof raw.createdAt.toDate === 'function'
              ? raw.createdAt.toDate().toISOString()
              : new Date().toISOString();
          return {
            id: d.id,
            vehicleId: String(raw.vehicleId || ''),
            title: String(raw.title || ''),
            category: raw.category || 'Geral',
            lastDoneKm: Number(raw.lastDoneKm || 0),
            intervalKm: Number(raw.intervalKm || 10000),
            lastDoneDate:
              typeof raw.lastDoneDate === 'string'
                ? raw.lastDoneDate
                : undefined,
            intervalMonths:
              typeof raw.intervalMonths === 'number'
                ? raw.intervalMonths
                : undefined,
            cost: typeof raw.cost === 'number' ? raw.cost : undefined,
            notes: typeof raw.notes === 'string' ? raw.notes : undefined,
            createdAt: createdAtIso,
          };
        });
        setMaintenances(list);
        maintenancesLoaded = true;
        markReady();
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, maintenancesPath);
        } catch (e) {
          captureError(e);
        }
      }
    );

    return () => {
      active = false;
      unsubProfile();
      unsubVehicles();
      unsubRefuelings();
      unsubMaintenances();
    };
  }, [user]);

  const activeVehicle = useMemo(() => {
    if (vehicles.length === 0) return null;
    return vehicles.find((v) => v.id === activeVehicleId) || vehicles[0];
  }, [vehicles, activeVehicleId]);

  const activeVehicleRefuelings = useMemo(() => {
    if (!activeVehicle) return [];
    return refuelings.filter((r) => r.vehicleId === activeVehicle.id);
  }, [refuelings, activeVehicle]);

  const computedRefuelings = useMemo(
    () => computeVehicleRefuelings(activeVehicleRefuelings),
    [activeVehicleRefuelings]
  );

  const effectiveOdometerKm = useMemo(() => {
    if (!activeVehicle) return 0;
    return getEffectiveVehicleOdometer(activeVehicle, activeVehicleRefuelings);
  }, [activeVehicle, activeVehicleRefuelings]);

  const activeVehicleMaintenances = useMemo(() => {
    if (!activeVehicle) return [];
    return maintenances.filter((m) => m.vehicleId === activeVehicle.id);
  }, [maintenances, activeVehicle]);

  const computedMaintenances = useMemo(
    () =>
      computeVehicleMaintenances(
        effectiveOdometerKm,
        activeVehicleMaintenances,
        new Date()
      ),
    [effectiveOdometerKm, activeVehicleMaintenances]
  );

  const attentionMaintenanceCount = useMemo(
    () => computedMaintenances.filter((m) => m.status !== 'ok').length,
    [computedMaintenances]
  );

  const runCloudOp = useCallback((op: () => Promise<void>) => {
    setOpError(null);
    op().catch((err) => {
      const raw = err instanceof Error ? err.message : String(err);
      let readable = raw;
      try {
        const parsed = JSON.parse(raw) as { error?: string };
        if (parsed?.error) readable = parsed.error;
      } catch {
        // plain text error
      }
      setOpError(`Erro ao salvar na nuvem: ${readable}`);
    });
  }, []);

  const handleSelectVehicle = useCallback(
    (vehicleId: string) => {
      setActiveVehicleId(vehicleId);
      runCloudOp(() => updateActiveVehicleId(user.uid, vehicleId));
    },
    [runCloudOp, user.uid]
  );

  const handleSaveVehicle = useCallback(
    (data: Omit<Vehicle, 'id' | 'createdAt'>, existingId?: string) => {
      runCloudOp(async () => {
        if (existingId) {
          await updateVehicleDoc(user.uid, existingId, data);
        } else {
          const createdId = await createVehicleDoc(user.uid, data);
          await updateActiveVehicleId(user.uid, createdId);
        }
      });
    },
    [runCloudOp, user.uid]
  );

  const handleDeleteVehicle = useCallback(
    (vehicleId: string) => {
      const linkedRefIds = refuelings
        .filter((r) => r.vehicleId === vehicleId)
        .map((r) => r.id);
      const linkedMaintIds = maintenances
        .filter((m) => m.vehicleId === vehicleId)
        .map((m) => m.id);
      const nextVehicle = vehicles.find((v) => v.id !== vehicleId) || null;

      runCloudOp(async () => {
        await deleteVehicleWithRefuelings(
          user.uid,
          vehicleId,
          linkedRefIds,
          linkedMaintIds
        );
        if (activeVehicleId === vehicleId) {
          await updateActiveVehicleId(user.uid, nextVehicle?.id ?? null);
        }
      });
    },
    [activeVehicleId, maintenances, refuelings, runCloudOp, user.uid, vehicles]
  );

  const handleSaveRefueling = useCallback(
    (data: Omit<Refueling, 'id' | 'createdAt'>, existingId?: string) => {
      runCloudOp(async () => {
        if (existingId) {
          await updateRefuelingDoc(user.uid, existingId, data);
        } else {
          await createRefuelingDoc(user.uid, data);
        }
        const targetVehicle = vehicles.find((v) => v.id === data.vehicleId);
        if (targetVehicle && data.odometerKm > targetVehicle.currentOdometer) {
          await syncVehicleOdometerDoc(
            user.uid,
            targetVehicle.id,
            data.odometerKm
          );
        }
      });
    },
    [runCloudOp, user.uid, vehicles]
  );

  const handleDeleteRefueling = useCallback(
    (refuelingId: string) => {
      runCloudOp(() => deleteRefuelingDoc(user.uid, refuelingId));
    },
    [runCloudOp, user.uid]
  );

  const handleSaveMaintenance = useCallback(
    (data: Omit<MaintenanceItem, 'id' | 'createdAt'>, existingId?: string) => {
      runCloudOp(async () => {
        if (existingId) {
          await updateMaintenanceDoc(user.uid, existingId, data);
        } else {
          await createMaintenanceDoc(user.uid, data);
        }
      });
    },
    [runCloudOp, user.uid]
  );

  const handleDeleteMaintenance = useCallback(
    (maintenanceId: string) => {
      runCloudOp(() => deleteMaintenanceDoc(user.uid, maintenanceId));
    },
    [runCloudOp, user.uid]
  );

  const handleQuickCreateMaintenance = useCallback(
    (preset: MaintenancePreset) => {
      if (!activeVehicle) return;
      const todayIso = new Date().toISOString().slice(0, 10);
      runCloudOp(async () => {
        await createMaintenanceDoc(user.uid, {
          vehicleId: activeVehicle.id,
          title: preset.title,
          category: preset.category,
          lastDoneKm: effectiveOdometerKm,
          intervalKm: preset.intervalKm,
          lastDoneDate: todayIso,
          intervalMonths: preset.intervalMonths,
          notes: preset.notes,
        });
      });
    },
    [activeVehicle, effectiveOdometerKm, runCloudOp, user.uid]
  );

  const handleImportBackup = useCallback(
    async (file: File): Promise<{ ok: boolean; message: string }> => {
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
        await replaceWorkspaceInFirestore(
          user.uid,
          vehicles.map((v) => v.id),
          refuelings.map((r) => r.id),
          validated.vehicles,
          validated.refuelings,
          validated.activeVehicleId,
          maintenances.map((m) => m.id),
          validated.maintenances ?? []
        );
        return {
          ok: true,
          message: `Backup restaurado na nuvem com sucesso: ${validated.vehicles.length} veículo(s) e ${validated.refuelings.length} abastecimento(s).`,
        };
      } catch {
        return {
          ok: false,
          message: 'Não foi possível importar o arquivo JSON selecionado.',
        };
      }
    },
    [maintenances, refuelings, user.uid, vehicles]
  );

  const handleMigrateLocal = () => {
    if (!localLegacyData) return;
    setMigratingLocal(true);
    replaceWorkspaceInFirestore(
      user.uid,
      vehicles.map((v) => v.id),
      refuelings.map((r) => r.id),
      localLegacyData.vehicles,
      localLegacyData.refuelings,
      localLegacyData.activeVehicleId,
      maintenances.map((m) => m.id),
      localLegacyData.maintenances ?? []
    )
      .then(() => {
        saveWorkspace(createEmptyWorkspace());
        setLocalLegacyDismissed(true);
      })
      .catch((err) => {
        setOpError(
          err instanceof Error
            ? `Erro ao importar dados locais: ${err.message}`
            : 'Erro ao importar dados locais.'
        );
      })
      .finally(() => {
        setMigratingLocal(false);
      });
  };

  const openAddRefueling = useCallback(() => {
    if (!activeVehicle) {
      setEditingVehicle(null);
      setVehicleModalOpen(true);
      return;
    }
    setEditingRefueling(null);
    setRefuelingModalOpen(true);
  }, [activeVehicle]);

  const openEditRefueling = useCallback((item: ComputedRefueling) => {
    setEditingRefueling(item);
    setRefuelingModalOpen(true);
  }, []);

  const openAddVehicle = useCallback(() => {
    setEditingVehicle(null);
    setVehicleModalOpen(true);
  }, []);

  const openEditVehicle = useCallback((v: Vehicle) => {
    setEditingVehicle(v);
    setVehicleModalOpen(true);
  }, []);

  const openAddMaintenance = useCallback((preset?: MaintenancePreset) => {
    setEditingMaintenance(null);
    setMaintenanceRenewMode(false);
    setMaintenancePreset(preset ?? null);
    setMaintenanceModalOpen(true);
  }, []);

  const openEditMaintenance = useCallback((item: MaintenanceItem) => {
    setEditingMaintenance(item);
    setMaintenanceRenewMode(false);
    setMaintenancePreset(null);
    setMaintenanceModalOpen(true);
  }, []);

  const openRenewMaintenance = useCallback((item: MaintenanceItem) => {
    setEditingMaintenance(item);
    setMaintenanceRenewMode(true);
    setMaintenancePreset(null);
    setMaintenanceModalOpen(true);
  }, []);

  const handleSignOut = useCallback(() => {
    void signOut(auth);
  }, []);

  const handleSelectVehicleAndGoDashboard = useCallback(
    (id: string) => {
      handleSelectVehicle(id);
      setActiveTab('dashboard');
    },
    [handleSelectVehicle]
  );

  const handleExportBackup = useCallback(() => {
    exportBackupJSON({
      version: 1,
      vehicles,
      refuelings,
      maintenances,
      activeVehicleId: activeVehicle?.id ?? null,
    });
  }, [vehicles, refuelings, maintenances, activeVehicle]);

  const handleLoadDemo = useCallback(() => {
    const demo = createSeedData();
    runCloudOp(() =>
      replaceWorkspaceInFirestore(
        user.uid,
        vehicles.map((v) => v.id),
        refuelings.map((r) => r.id),
        demo.vehicles,
        demo.refuelings,
        demo.activeVehicleId,
        maintenances.map((m) => m.id),
        []
      )
    );
  }, [maintenances, refuelings, runCloudOp, user.uid, vehicles]);

  const handleClearAll = useCallback(() => {
    runCloudOp(() =>
      replaceWorkspaceInFirestore(
        user.uid,
        vehicles.map((v) => v.id),
        refuelings.map((r) => r.id),
        [],
        [],
        null,
        maintenances.map((m) => m.id),
        []
      )
    );
  }, [maintenances, refuelings, runCloudOp, user.uid, vehicles]);

  const handleCloseVehicleModal = useCallback(() => {
    setVehicleModalOpen(false);
    setEditingVehicle(null);
  }, []);

  const handleCloseRefuelingModal = useCallback(() => {
    setRefuelingModalOpen(false);
    setEditingRefueling(null);
  }, []);

  const handleCloseMaintenanceModal = useCallback(() => {
    setMaintenanceModalOpen(false);
    setEditingMaintenance(null);
    setMaintenanceRenewMode(false);
    setMaintenancePreset(null);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#F1F5F9] flex flex-col">
      {/* Top Bar (Strict 3-zone contract) */}
      <header className="sticky top-0 z-30 bg-[#0B0D12]/95 border-b border-[#1E2534]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 text-left min-w-0 shrink-0"
          >
            <Image
              src="/assets/aistudio/Logotipo_JJ_Automotivo_em_Azul_e_Prata_6621a1b1.png"
              alt="Logo Controle de Abastecimento - Jair"
              width={36}
              height={36}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-lg object-cover border border-[#232A3B] shrink-0"
            />
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-[#F1F5F9] whitespace-nowrap truncate max-w-[175px] sm:max-w-none">
              Controle de Abastecimento - Jair
            </span>
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
                  <span>{item.label}</span>
                  {item.id === 'maintenance' && attentionMaintenanceCount > 0 && (
                    <span className="ml-1.5 font-mono text-xs text-amber-400 tabular-nums">
                      ({attentionMaintenanceCount})
                    </span>
                  )}
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12 space-y-5">
        {/* Account Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#94A3B8] px-1">
          <div className="flex items-center gap-2 min-w-0 truncate">
            <span className="truncate">
              Conta Google:{' '}
              <strong className="font-medium text-[#CBD5E1]">
                {user.email || user.displayName}
              </strong>
            </span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>

        {opError && (
          <div className="bg-red-500/10 border border-red-500/35 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-red-200">
            <span className="break-words">{opError}</span>
            <button
              type="button"
              onClick={() => setOpError(null)}
              className="px-2.5 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 text-white shrink-0"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Optional localStorage migration banner if cloud is empty and local user data exists */}
        {dataReady &&
          vehicles.length === 0 &&
          localLegacyData &&
          !localLegacyDismissed && (
            <div className="bg-[#12161F] border border-[#2563EB]/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-[#CBD5E1]">
                Encontramos{' '}
                <strong className="text-white">
                  {localLegacyData.vehicles.length} veículo(s)
                </strong>{' '}
                e{' '}
                <strong className="text-white">
                  {localLegacyData.refuelings.length} abastecimento(s)
                </strong>{' '}
                salvos neste navegador anteriormente. Deseja salvar na sua conta
                Google?
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setLocalLegacyDismissed(true)}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#94A3B8] hover:text-white"
                >
                  Ignorar
                </button>
                <button
                  type="button"
                  disabled={migratingLocal}
                  onClick={handleMigrateLocal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white disabled:opacity-60 whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {migratingLocal ? 'Importando...' : 'Importar para a nuvem'}
                </button>
              </div>
            </div>
          )}

        {!dataReady ? (
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
        ) : (
          <div>
            {activeTab === 'dashboard' && (
              <DashboardView
                vehicle={activeVehicle}
                vehicles={vehicles}
                effectiveOdometerKm={effectiveOdometerKm}
                computed={computedRefuelings}
                computedMaintenances={computedMaintenances}
                onSelectVehicle={handleSelectVehicle}
                onAddRefueling={openAddRefueling}
                onAddVehicle={openAddVehicle}
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

            {activeTab === 'maintenance' && (
              <MaintenanceView
                vehicle={activeVehicle}
                effectiveOdometerKm={effectiveOdometerKm}
                computedMaintenances={computedMaintenances}
                onAddMaintenance={openAddMaintenance}
                onEditMaintenance={openEditMaintenance}
                onRenewMaintenance={openRenewMaintenance}
                onDeleteMaintenance={handleDeleteMaintenance}
                onQuickCreatePreset={handleQuickCreateMaintenance}
              />
            )}

            {activeTab === 'vehicles' && (
              <VehiclesView
                userEmail={user.email || ''}
                userName={user.displayName || 'Usuário'}
                vehicles={vehicles}
                refuelings={refuelings}
                activeVehicleId={activeVehicle?.id ?? null}
                onSelectVehicle={handleSelectVehicleAndGoDashboard}
                onAddVehicle={openAddVehicle}
                onEditVehicle={openEditVehicle}
                onDeleteVehicle={handleDeleteVehicle}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
                onLoadDemo={handleLoadDemo}
                onClearAll={handleClearAll}
                onSignOut={handleSignOut}
              />
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0B0D12]/95 border-t border-[#1E2534] h-14 px-1 flex items-center justify-around"
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
              className={`flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
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
        onClose={handleCloseVehicleModal}
        onSave={handleSaveVehicle}
      />

      <RefuelingModal
        isOpen={refuelingModalOpen}
        vehicle={activeVehicle}
        vehicleRefuelings={activeVehicleRefuelings}
        editingRefueling={editingRefueling}
        onClose={handleCloseRefuelingModal}
        onSave={handleSaveRefueling}
      />

      <MaintenanceModal
        isOpen={maintenanceModalOpen}
        vehicle={activeVehicle}
        effectiveOdometerKm={effectiveOdometerKm}
        editingItem={editingMaintenance}
        isRenewMode={maintenanceRenewMode}
        initialPreset={maintenancePreset}
        onClose={handleCloseMaintenanceModal}
        onSave={handleSaveMaintenance}
      />
    </div>
  );
}
