import { User } from 'firebase/auth';
import {
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { FuelType, Refueling, Vehicle } from './types';

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const VALID_FUELS: FuelType[] = ['Gasolina', 'Etanol', 'Diesel', 'GNV'];

function sanitizeId(raw: string, fallbackPrefix: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  if (cleaned && VALID_ID_REGEX.test(cleaned)) return cleaned;
  return `${fallbackPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function clampString(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

function clampFuel(fuel: FuelType): FuelType {
  return VALID_FUELS.includes(fuel) ? fuel : 'Gasolina';
}

export async function ensureUserProfile(user: User): Promise<string | null> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    const email = clampString(user.email || '', 200);
    const displayName = clampString(user.displayName || 'Usuário', 120);

    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return null;
    }

    const data = snap.data();
    if (data.email !== email || data.displayName !== displayName) {
      await updateDoc(ref, {
        email,
        displayName,
        updatedAt: serverTimestamp(),
      });
    }
    return typeof data.activeVehicleId === 'string'
      ? data.activeVehicleId
      : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateActiveVehicleId(
  uid: string,
  vehicleId: string | null
): Promise<void> {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  try {
    await updateDoc(ref, {
      activeVehicleId: vehicleId ? sanitizeId(vehicleId, 'veh') : deleteField(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createVehicleDoc(
  uid: string,
  data: Omit<Vehicle, 'id' | 'createdAt'>,
  explicitId?: string
): Promise<string> {
  const vehicleId = explicitId
    ? sanitizeId(explicitId, 'veh')
    : `veh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const path = `users/${uid}/vehicles/${vehicleId}`;
  const ref = doc(db, 'users', uid, 'vehicles', vehicleId);

  const payload: Record<string, unknown> = {
    ownerId: uid,
    name: clampString(data.name, 80) || 'Veículo',
    brand: clampString(data.brand, 60) || 'Marca',
    year: Math.min(2100, Math.max(1950, Math.round(data.year))),
    defaultFuel: clampFuel(data.defaultFuel),
    currentOdometer: Math.min(
      10000000,
      Math.max(0, Math.round(data.currentOdometer))
    ),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (
    data.tankCapacity !== undefined &&
    data.tankCapacity > 0 &&
    data.tankCapacity <= 2000
  ) {
    payload.tankCapacity = Number(data.tankCapacity);
  }

  try {
    await setDoc(ref, payload);
    return vehicleId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateVehicleDoc(
  uid: string,
  vehicleId: string,
  data: Omit<Vehicle, 'id' | 'createdAt'>
): Promise<void> {
  const path = `users/${uid}/vehicles/${vehicleId}`;
  const ref = doc(db, 'users', uid, 'vehicles', vehicleId);

  const payload: Record<string, unknown> = {
    name: clampString(data.name, 80) || 'Veículo',
    brand: clampString(data.brand, 60) || 'Marca',
    year: Math.min(2100, Math.max(1950, Math.round(data.year))),
    defaultFuel: clampFuel(data.defaultFuel),
    currentOdometer: Math.min(
      10000000,
      Math.max(0, Math.round(data.currentOdometer))
    ),
    tankCapacity:
      data.tankCapacity !== undefined &&
      data.tankCapacity > 0 &&
      data.tankCapacity <= 2000
        ? Number(data.tankCapacity)
        : deleteField(),
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncVehicleOdometerDoc(
  uid: string,
  vehicleId: string,
  currentOdometer: number
): Promise<void> {
  const path = `users/${uid}/vehicles/${vehicleId}`;
  const ref = doc(db, 'users', uid, 'vehicles', vehicleId);
  try {
    await updateDoc(ref, {
      currentOdometer: Math.min(10000000, Math.max(0, Math.round(currentOdometer))),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteVehicleWithRefuelings(
  uid: string,
  vehicleId: string,
  refuelingIds: string[]
): Promise<void> {
  const path = `users/${uid}/vehicles/${vehicleId}`;
  try {
    const batch = writeBatch(db);
    for (const rid of refuelingIds) {
      batch.delete(doc(db, 'users', uid, 'refuelings', rid));
    }
    batch.delete(doc(db, 'users', uid, 'vehicles', vehicleId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createRefuelingDoc(
  uid: string,
  data: Omit<Refueling, 'id' | 'createdAt'>,
  explicitId?: string
): Promise<string> {
  const refuelingId = explicitId
    ? sanitizeId(explicitId, 'ref')
    : `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const path = `users/${uid}/refuelings/${refuelingId}`;
  const ref = doc(db, 'users', uid, 'refuelings', refuelingId);

  const payload: Record<string, unknown> = {
    ownerId: uid,
    vehicleId: sanitizeId(data.vehicleId, 'veh'),
    date: data.date.slice(0, 10),
    odometerKm: Math.min(10000000, Math.max(0, Math.round(data.odometerKm))),
    totalPaid: Math.min(1000000, Math.max(0.01, Number(data.totalPaid.toFixed(2)))),
    liters: Math.min(5000, Math.max(0.01, Number(data.liters.toFixed(2)))),
    pricePerLiter: Math.min(
      1000,
      Math.max(0.001, Number(data.pricePerLiter.toFixed(3)))
    ),
    fuelType: clampFuel(data.fuelType),
    fullTank: Boolean(data.fullTank),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const station = data.station ? clampString(data.station, 100) : '';
  if (station) payload.station = station;

  const notes = data.notes ? clampString(data.notes, 400) : '';
  if (notes) payload.notes = notes;

  try {
    await setDoc(ref, payload);
    return refuelingId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateRefuelingDoc(
  uid: string,
  refuelingId: string,
  data: Omit<Refueling, 'id' | 'createdAt'>
): Promise<void> {
  const path = `users/${uid}/refuelings/${refuelingId}`;
  const ref = doc(db, 'users', uid, 'refuelings', refuelingId);

  const station = data.station ? clampString(data.station, 100) : '';
  const notes = data.notes ? clampString(data.notes, 400) : '';

  const payload: Record<string, unknown> = {
    date: data.date.slice(0, 10),
    odometerKm: Math.min(10000000, Math.max(0, Math.round(data.odometerKm))),
    totalPaid: Math.min(1000000, Math.max(0.01, Number(data.totalPaid.toFixed(2)))),
    liters: Math.min(5000, Math.max(0.01, Number(data.liters.toFixed(2)))),
    pricePerLiter: Math.min(
      1000,
      Math.max(0.001, Number(data.pricePerLiter.toFixed(3)))
    ),
    fuelType: clampFuel(data.fuelType),
    fullTank: Boolean(data.fullTank),
    station: station ? station : deleteField(),
    notes: notes ? notes : deleteField(),
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteRefuelingDoc(
  uid: string,
  refuelingId: string
): Promise<void> {
  const path = `users/${uid}/refuelings/${refuelingId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'refuelings', refuelingId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function replaceWorkspaceInFirestore(
  uid: string,
  existingVehicleIds: string[],
  existingRefuelingIds: string[],
  newVehicles: Vehicle[],
  newRefuelings: Refueling[],
  activeVehicleId: string | null
): Promise<void> {
  const basePath = `users/${uid}`;
  try {
    // Delete existing documents first
    const deleteBatch = writeBatch(db);
    for (const rid of existingRefuelingIds) {
      deleteBatch.delete(doc(db, 'users', uid, 'refuelings', rid));
    }
    for (const vid of existingVehicleIds) {
      deleteBatch.delete(doc(db, 'users', uid, 'vehicles', vid));
    }
    if (existingRefuelingIds.length > 0 || existingVehicleIds.length > 0) {
      await deleteBatch.commit();
    }

    // Create vehicles first so refuelings pass exists() Master Gate check
    const idMap = new Map<string, string>();
    for (const v of newVehicles) {
      const safeVid = sanitizeId(v.id, 'veh');
      idMap.set(v.id, safeVid);
      await createVehicleDoc(
        uid,
        {
          name: v.name,
          brand: v.brand,
          year: v.year,
          defaultFuel: v.defaultFuel,
          currentOdometer: v.currentOdometer,
          tankCapacity: v.tankCapacity,
        },
        safeVid
      );
    }

    for (const r of newRefuelings) {
      const mappedVehicleId = idMap.get(r.vehicleId);
      if (!mappedVehicleId) continue;
      await createRefuelingDoc(uid, {
        vehicleId: mappedVehicleId,
        date: r.date,
        odometerKm: r.odometerKm,
        totalPaid: r.totalPaid,
        liters: r.liters,
        pricePerLiter: r.pricePerLiter,
        fuelType: r.fuelType,
        fullTank: r.fullTank,
        station: r.station,
        notes: r.notes,
      });
    }

    const mappedActive =
      activeVehicleId && idMap.has(activeVehicleId)
        ? idMap.get(activeVehicleId)!
        : newVehicles[0]
          ? idMap.get(newVehicles[0].id)!
          : null;

    await updateActiveVehicleId(uid, mappedActive);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, basePath);
  }
}
