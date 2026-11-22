export type FuelType = 'Gasolina' | 'Etanol' | 'Diesel' | 'GNV';

export type ReportPeriod = 'month' | 'quarter' | 'semester' | 'year' | 'all';

export type ActiveTab = 'dashboard' | 'history' | 'reports' | 'vehicles';

export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  year: number;
  defaultFuel: FuelType;
  currentOdometer: number;
  tankCapacity?: number;
  createdAt: string;
}

export interface Refueling {
  id: string;
  vehicleId: string;
  date: string; // YYYY-MM-DD
  odometerKm: number;
  totalPaid: number;
  liters: number;
  pricePerLiter: number;
  fuelType: FuelType;
  fullTank: boolean;
  station?: string;
  notes?: string;
  createdAt: string;
}

export interface ComputedRefueling extends Refueling {
  previousOdometerKm: number | null;
  distanceKm: number | null;
  consumptionKmPerL: number | null;
  costPerKm: number | null;
  isFirstRecord: boolean;
  isEstimated: boolean;
}

export interface AlertItem {
  id: string;
  type: 'consumption' | 'price' | 'monthly_spend' | 'reminder';
  severity: 'danger' | 'warning' | 'info';
  title: string;
  description: string;
  metricLabel: string;
}

export interface MonthlyBucket {
  monthKey: string; // YYYY-MM
  label: string;
  totalSpent: number;
  totalLiters: number;
  distanceKm: number;
  avgConsumptionKmPerL: number | null;
  avgPricePerLiter: number | null;
  avgCostPerKm: number | null;
  count: number;
}

export interface FuelComparisonItem {
  fuelType: FuelType;
  count: number;
  totalSpent: number;
  totalLiters: number;
  distanceKm: number;
  avgConsumptionKmPerL: number | null;
  avgCostPerKm: number | null;
  avgPricePerLiter: number;
}

export interface AppStorageData {
  version: number;
  vehicles: Vehicle[];
  refuelings: Refueling[];
  activeVehicleId: string | null;
  isDemoData?: boolean;
}
