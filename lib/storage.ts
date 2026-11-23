import { createEmptyWorkspace, createSeedData } from './seed';
import { AppStorageData, MaintenanceItem, Refueling, Vehicle } from './types';

const STORAGE_KEY = 'fuel_control_workspace_v1';

export function loadWorkspace(): AppStorageData {
  if (typeof window === 'undefined') {
    return createSeedData();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedData();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as AppStorageData;
    if (
      !parsed ||
      !Array.isArray(parsed.vehicles) ||
      !Array.isArray(parsed.refuelings)
    ) {
      const seed = createSeedData();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return parsed;
  } catch {
    return createSeedData();
  }
}

export function peekLocalLegacyWorkspace(): AppStorageData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppStorageData;
    if (
      !parsed ||
      !Array.isArray(parsed.vehicles) ||
      !Array.isArray(parsed.refuelings)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveWorkspace(data: AppStorageData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage quota exceeded or unavailable
  }
}

export function exportBackupJSON(data: AppStorageData): void {
  const payload = {
    app: 'Controle de Abastecimento - Jair',
    exportedAt: new Date().toISOString(),
    version: data.version,
    vehicles: data.vehicles,
    refuelings: data.refuelings,
    maintenances: data.maintenances ?? [],
    activeVehicleId: data.activeVehicleId,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `fuel-control-backup-${today}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function validateBackupPayload(raw: unknown): AppStorageData | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.vehicles) || !Array.isArray(obj.refuelings)) {
    return null;
  }

  const validVehicles: Vehicle[] = obj.vehicles.filter(
    (v): v is Vehicle =>
      Boolean(v) &&
      typeof v === 'object' &&
      typeof (v as Vehicle).id === 'string' &&
      typeof (v as Vehicle).name === 'string' &&
      typeof (v as Vehicle).brand === 'string' &&
      typeof (v as Vehicle).year === 'number' &&
      typeof (v as Vehicle).currentOdometer === 'number' &&
      (v as Vehicle).currentOdometer >= 0
  );

  const vehicleIds = new Set(validVehicles.map((v) => v.id));

  const validRefuelings: Refueling[] = obj.refuelings.filter(
    (r): r is Refueling =>
      Boolean(r) &&
      typeof r === 'object' &&
      typeof (r as Refueling).id === 'string' &&
      typeof (r as Refueling).vehicleId === 'string' &&
      vehicleIds.has((r as Refueling).vehicleId) &&
      typeof (r as Refueling).date === 'string' &&
      typeof (r as Refueling).odometerKm === 'number' &&
      (r as Refueling).odometerKm >= 0 &&
      typeof (r as Refueling).totalPaid === 'number' &&
      (r as Refueling).totalPaid > 0 &&
      typeof (r as Refueling).liters === 'number' &&
      (r as Refueling).liters > 0
  );

  const validMaintenances: MaintenanceItem[] = Array.isArray(obj.maintenances)
    ? obj.maintenances.filter(
        (m): m is MaintenanceItem =>
          Boolean(m) &&
          typeof m === 'object' &&
          typeof (m as MaintenanceItem).id === 'string' &&
          typeof (m as MaintenanceItem).vehicleId === 'string' &&
          vehicleIds.has((m as MaintenanceItem).vehicleId) &&
          typeof (m as MaintenanceItem).title === 'string' &&
          typeof (m as MaintenanceItem).lastDoneKm === 'number' &&
          (m as MaintenanceItem).lastDoneKm >= 0 &&
          typeof (m as MaintenanceItem).intervalKm === 'number' &&
          (m as MaintenanceItem).intervalKm >= 100
      )
    : [];

  const activeVehicleId =
    typeof obj.activeVehicleId === 'string' &&
    vehicleIds.has(obj.activeVehicleId)
      ? obj.activeVehicleId
      : validVehicles[0]?.id || null;

  return {
    version: 1,
    vehicles: validVehicles,
    refuelings: validRefuelings,
    maintenances: validMaintenances,
    activeVehicleId,
    isDemoData: false,
  };
}

export { createEmptyWorkspace };
