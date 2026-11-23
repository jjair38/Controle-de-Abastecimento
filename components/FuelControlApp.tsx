'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  BarChart3,
  Car,
  History,
  LayoutDashboard,
  LogOut,
  Plus,
  Upload,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { computeVehicleRefuelings } from '@/lib/calculations';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  testConnection,
} from '@/lib/firebase';
import {
  createRefuelingDoc,
  createVehicleDoc,
  deleteRefuelingDoc,
  deleteVehicleWithRefuelings,
  ensureUserProfile,
  replaceWorkspaceInFirestore,
  syncVehicleOdometerDoc,
  updateActiveVehicleId,
  updateRefuelingDoc,
  updateVehicleDoc,
} from '@/lib/firestore-service';
import { createSeedData } from '@/lib/seed';
import {
  exportBackupJSON,
  loadWorkspace as loadLocalLegacyWorkspace,
  validateBackupPayload,
} from '@/lib/storage';
import {
  ActiveTab,
  ComputedRefueling,
  Refueling,
  Vehicle,
} from '@/lib/types';
import { DashboardView } from './DashboardView';
import { ErrorBoundary } from './ErrorBoundary';
import { HistoryView } from './HistoryView';
import { LoginScreen } from './LoginScreen';
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
        <header className="sticky top-0 z-30 bg-[#0B0D12]/90 border-b border-[#1E2534]">
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

  // Offer 1-click localStorage migration if user has non-demo local data and empty cloud
  const [migratingLocal, setMigratingLocal] = useState(false);
  const [localLegacyDismissed, setLocalLegacyDismissed] = useState(false);

  const localLegacyData = useMemo(() => {
    const local = loadLocalLegacyWorkspace();
    if (!local.isDemoData && local.vehicles.length > 0) {
      return local;
    }
    return null;
  }, []);

  if (asyncError) {
    throw asyncError;
  }

  useEffect(() => {
    let active = true;
    let unsubProfile: (() => void) | undefined;
    let unsubVehicles: (() => void) | undefined;
    let unsubRefuelings: (() => void) | undefined;

    let profileLoaded = false;
    let vehiclesLoaded = false;
    let refuelingsLoaded = false;

    const markReady = () => {
      if (active && profileLoaded && vehiclesLoaded && refuelingsLoaded) {
        setDataReady(true);
      }
    };

    const captureError = (err: unknown) => {
      if (!active) return;
      setAsyncError(err instanceof Error ? err : new Error(String(err)));
    };

    ensureUserProfile(user)
      .then(() => {
        if (!active) return;

        const profilePath = `users/${user.uid}`;
        unsubProfile = onSnapshot(
          doc(db, 'users', user.uid),
          (snap) => {
            if (!active) return;
            const d = snap.data();
            setActiveVehicleId(
              d && typeof d.activeVehicleId === 'string'
                ? d.activeVehicleId
                : null
            );
            profileLoaded = true;
            markReady();
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
        const vehiclesQuery = collection(db, 'users', user.uid, 'vehicles');
        unsubVehicles = onSnapshot(
          vehiclesQuery,
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
        const refuelingsQuery = collection(db, 'users', user.uid, 'refuelings');
        unsubRefuelings = onSnapshot(
          refuelingsQuery,
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
                station:
                  typeof raw.station === 'string' ? raw.station : undefined,
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
      })
      .catch(captureError);

    return () => {
      active = false;
      unsubProfile?.();
      unsubVehicles?.();
      unsubRefuelings?.();
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

  const runCloudOp = (op: () => Promise<void>) => {
    op().catch((err) => {
      setAsyncError(err instanceof Error ? err : new Error(String(err)));
    });
  };

  const handleSelectVehicle = (vehicleId: string) => {
    setActiveVehicleId(vehicleId);
    runCloudOp(() => updateActiveVehicleId(user.uid, vehicleId));
  };

  const handleSaveVehicle = (
    data: Omit<Vehicle, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    runCloudOp(async () => {
      if (existingId) {
        await updateVehicleDoc(user.uid, existingId, data);
      } else {
        const createdId = await createVehicleDoc(user.uid, data);
        await updateActiveVehicleId(user.uid, createdId);
      }
    });
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    const linkedIds = refuelings
      .filter((r) => r.vehicleId === vehicleId)
      .map((r) => r.id);
    const nextVehicle = vehicles.find((v) => v.id !== vehicleId) || null;

    runCloudOp(async () => {
      await deleteVehicleWithRefuelings(user.uid, vehicleId, linkedIds);
      if (activeVehicleId === vehicleId) {
        await updateActiveVehicleId(user.uid, nextVehicle?.id ?? null);
      }
    });
  };

  const handleSaveRefueling = (
    data: Omit<Refueling, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
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
  };

  const handleDeleteRefueling = (refuelingId: string) => {
    runCloudOp(() => deleteRefuelingDoc(user.uid, refuelingId));
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
      await replaceWorkspaceInFirestore(
        user.uid,
        vehicles.map((v) => v.id),
        refuelings.map((r) => r.id),
        validated.vehicles,
        validated.refuelings,
        validated.activeVehicleId
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
  };

  const handleMigrateLocal = () => {
    if (!localLegacyData) return;
    setMigratingLocal(true);
    replaceWorkspaceInFirestore(
      user.uid,
      vehicles.map((v) => v.id),
      refuelings.map((r) => r.id),
      localLegacyData.vehicles,
      localLegacyData.refuelings,
      localLegacyData.activeVehicleId
    )
      .then(() => {
        setLocalLegacyDismissed(true);
      })
      .catch((err) => {
        setAsyncError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setMigratingLocal(false);
      });
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

  const handleSignOut = () => {
    void signOut(auth);
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#F1F5F9] flex flex-col">
      {/* Top Bar (Strict 3-zone contract) */}
      <header className="sticky top-0 z-30 bg-[#0B0D12]/90 backdrop-blur-md border-b border-[#1E2534]">
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
                  vehicles={vehicles}
                  computed={computedRefuelings}
                  onSelectVehicle={handleSelectVehicle}
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
                  userEmail={user.email || ''}
                  userName={user.displayName || 'Usuário'}
                  vehicles={vehicles}
                  refuelings={refuelings}
                  activeVehicleId={activeVehicle?.id ?? null}
                  onSelectVehicle={(id) => {
                    handleSelectVehicle(id);
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
                  onExportBackup={() =>
                    exportBackupJSON({
                      version: 1,
                      vehicles,
                      refuelings,
                      activeVehicleId: activeVehicle?.id ?? null,
                    })
                  }
                  onImportBackup={handleImportBackup}
                  onLoadDemo={() => {
                    const demo = createSeedData();
                    runCloudOp(() =>
                      replaceWorkspaceInFirestore(
                        user.uid,
                        vehicles.map((v) => v.id),
                        refuelings.map((r) => r.id),
                        demo.vehicles,
                        demo.refuelings,
                        demo.activeVehicleId
                      )
                    );
                  }}
                  onClearAll={() => {
                    runCloudOp(() =>
                      replaceWorkspaceInFirestore(
                        user.uid,
                        vehicles.map((v) => v.id),
                        refuelings.map((r) => r.id),
                        [],
                        [],
                        null
                      )
                    );
                  }}
                  onSignOut={handleSignOut}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
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
