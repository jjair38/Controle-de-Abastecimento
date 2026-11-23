import {
  AlertItem,
  ComputedMaintenanceItem,
  ComputedRefueling,
  FuelComparisonItem,
  FuelType,
  MaintenanceItem,
  MaintenanceStatus,
  MonthlyBucket,
  Refueling,
  ReportPeriod,
  Vehicle,
} from './types';

const MONTH_NAMES_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDecimal(
  value: number | null | undefined,
  decimals = 2
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatKm(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0,
  }).format(Math.round(value))} km`;
}

export function formatDateBR(isoDate: string): string {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

export function formatMonthShort(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  const idx = Number(m) - 1;
  if (!y || idx < 0 || idx > 11) return monthKey;
  return `${MONTH_NAMES_SHORT[idx]}/${y.slice(2)}`;
}

export function getMonthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function sortRefuelingsChronologically(
  refuelings: Refueling[]
): Refueling[] {
  return [...refuelings].sort((a, b) => {
    if (a.odometerKm !== b.odometerKm) return a.odometerKm - b.odometerKm;
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function computeVehicleRefuelings(
  refuelings: Refueling[]
): ComputedRefueling[] {
  const sorted = sortRefuelingsChronologically(refuelings);
  return sorted.map((item, idx) => {
    if (idx === 0) {
      return {
        ...item,
        previousOdometerKm: null,
        distanceKm: null,
        consumptionKmPerL: null,
        costPerKm: null,
        isFirstRecord: true,
        isEstimated: !item.fullTank,
      };
    }

    const prev = sorted[idx - 1];
    const distanceKm = item.odometerKm - prev.odometerKm;
    const validDistance = distanceKm > 0;
    const consumptionKmPerL =
      validDistance && item.liters > 0 ? distanceKm / item.liters : null;
    const costPerKm =
      validDistance && item.totalPaid >= 0 ? item.totalPaid / distanceKm : null;
    const isEstimated = !item.fullTank || !prev.fullTank;

    return {
      ...item,
      previousOdometerKm: prev.odometerKm,
      distanceKm: distanceKm >= 0 ? distanceKm : null,
      consumptionKmPerL,
      costPerKm,
      isFirstRecord: false,
      isEstimated,
    };
  });
}

export interface DashboardMetrics {
  monthKey: string;
  monthLabel: string;
  monthCount: number;
  monthTotalSpent: number;
  monthTotalLiters: number;
  monthDistanceKm: number;
  monthAvgConsumption: number | null;
  monthConsumptionIsEstimated: boolean;
  monthAvgCostPerKm: number | null;
  monthAvgPricePerLiter: number | null;
  overallAvgConsumption: number | null;
  overallAvgCostPerKm: number | null;
  overallTotalSpent: number;
  overallDistanceKm: number;
  latestRefueling: ComputedRefueling | null;
}

export function computeDashboardMetrics(
  computed: ComputedRefueling[],
  referenceDate: Date = new Date()
): DashboardMetrics {
  const yyyy = referenceDate.getFullYear();
  const mm = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const currentMonthKey = `${yyyy}-${mm}`;

  const monthItems = computed.filter(
    (r) => getMonthKey(r.date) === currentMonthKey
  );

  const monthTotalSpent = monthItems.reduce((acc, r) => acc + r.totalPaid, 0);
  const monthTotalLiters = monthItems.reduce((acc, r) => acc + r.liters, 0);
  const monthDistanceKm = monthItems.reduce(
    (acc, r) => acc + (r.distanceKm && r.distanceKm > 0 ? r.distanceKm : 0),
    0
  );

  // Accurate intervals in month (both current and previous were full tank)
  const monthAccurateIntervals = monthItems.filter(
    (r) => r.distanceKm && r.distanceKm > 0 && r.liters > 0 && !r.isEstimated
  );
  const monthAllIntervals = monthItems.filter(
    (r) => r.distanceKm && r.distanceKm > 0 && r.liters > 0
  );

  let monthAvgConsumption: number | null = null;
  let monthConsumptionIsEstimated = false;

  if (monthAccurateIntervals.length > 0) {
    const dist = monthAccurateIntervals.reduce(
      (s, r) => s + (r.distanceKm || 0),
      0
    );
    const lit = monthAccurateIntervals.reduce((s, r) => s + r.liters, 0);
    monthAvgConsumption = lit > 0 ? dist / lit : null;
  } else if (monthAllIntervals.length > 0) {
    const dist = monthAllIntervals.reduce(
      (s, r) => s + (r.distanceKm || 0),
      0
    );
    const lit = monthAllIntervals.reduce((s, r) => s + r.liters, 0);
    monthAvgConsumption = lit > 0 ? dist / lit : null;
    monthConsumptionIsEstimated = true;
  }

  let monthAvgCostPerKm: number | null = null;
  if (monthAllIntervals.length > 0) {
    const dist = monthAllIntervals.reduce(
      (s, r) => s + (r.distanceKm || 0),
      0
    );
    const paid = monthAllIntervals.reduce((s, r) => s + r.totalPaid, 0);
    monthAvgCostPerKm = dist > 0 ? paid / dist : null;
  }

  const monthAvgPricePerLiter =
    monthTotalLiters > 0 ? monthTotalSpent / monthTotalLiters : null;

  // Overall metrics
  const overallAccurate = computed.filter(
    (r) => r.distanceKm && r.distanceKm > 0 && r.liters > 0 && !r.isEstimated
  );
  const overallIntervals = computed.filter(
    (r) => r.distanceKm && r.distanceKm > 0 && r.liters > 0
  );

  let overallAvgConsumption: number | null = null;
  const targetOverall =
    overallAccurate.length > 0 ? overallAccurate : overallIntervals;
  if (targetOverall.length > 0) {
    const dist = targetOverall.reduce((s, r) => s + (r.distanceKm || 0), 0);
    const lit = targetOverall.reduce((s, r) => s + r.liters, 0);
    overallAvgConsumption = lit > 0 ? dist / lit : null;
  }

  let overallAvgCostPerKm: number | null = null;
  if (overallIntervals.length > 0) {
    const dist = overallIntervals.reduce(
      (s, r) => s + (r.distanceKm || 0),
      0
    );
    const paid = overallIntervals.reduce((s, r) => s + r.totalPaid, 0);
    overallAvgCostPerKm = dist > 0 ? paid / dist : null;
  }

  const overallTotalSpent = computed.reduce((s, r) => s + r.totalPaid, 0);
  const overallDistanceKm = computed.reduce(
    (s, r) => s + (r.distanceKm && r.distanceKm > 0 ? r.distanceKm : 0),
    0
  );

  const latestRefueling =
    computed.length > 0 ? computed[computed.length - 1] : null;

  return {
    monthKey: currentMonthKey,
    monthLabel: formatMonthShort(currentMonthKey),
    monthCount: monthItems.length,
    monthTotalSpent,
    monthTotalLiters,
    monthDistanceKm,
    monthAvgConsumption,
    monthConsumptionIsEstimated,
    monthAvgCostPerKm,
    monthAvgPricePerLiter,
    overallAvgConsumption,
    overallAvgCostPerKm,
    overallTotalSpent,
    overallDistanceKm,
    latestRefueling,
  };
}

export function getEffectiveVehicleOdometer(
  vehicle: Vehicle,
  vehicleRefuelings: Pick<Refueling, 'odometerKm'>[]
): number {
  let maxKm = vehicle.currentOdometer || 0;
  for (const r of vehicleRefuelings) {
    if (r.odometerKm > maxKm) {
      maxKm = r.odometerKm;
    }
  }
  return maxKm;
}

function addMonthsToIsoDate(isoDate: string, months: number): string | null {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1 + months, d);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function computeVehicleMaintenances(
  effectiveOdometerKm: number,
  items: MaintenanceItem[],
  referenceDate: Date = new Date()
): ComputedMaintenanceItem[] {
  const refMidday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    12,
    0,
    0
  );

  const computed = items.map((item): ComputedMaintenanceItem => {
    const nextDueKm = item.lastDoneKm + item.intervalKm;
    const kmDrivenSinceLast = Math.max(0, effectiveOdometerKm - item.lastDoneKm);
    const kmRemaining = nextDueKm - effectiveOdometerKm;
    const progressPct =
      item.intervalKm > 0
        ? Math.min(100, Math.max(0, (kmDrivenSinceLast / item.intervalKm) * 100))
        : 0;

    let nextDueDate: string | null = null;
    let daysRemaining: number | null = null;
    if (item.lastDoneDate && item.intervalMonths && item.intervalMonths > 0) {
      nextDueDate = addMonthsToIsoDate(item.lastDoneDate, item.intervalMonths);
      if (nextDueDate) {
        const dueMidday = new Date(`${nextDueDate}T12:00:00`);
        daysRemaining = Math.ceil(
          (dueMidday.getTime() - refMidday.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }

    const kmWarningThreshold = Math.min(
      1500,
      Math.max(500, Math.round(item.intervalKm * 0.15))
    );

    let status: MaintenanceStatus = 'ok';
    if (kmRemaining <= 0 || (daysRemaining !== null && daysRemaining <= 0)) {
      status = 'overdue';
    } else if (
      kmRemaining <= kmWarningThreshold ||
      (daysRemaining !== null && daysRemaining <= 30)
    ) {
      status = 'due_soon';
    }

    return {
      ...item,
      currentOdometerKm: effectiveOdometerKm,
      nextDueKm,
      kmDrivenSinceLast,
      kmRemaining,
      progressPct,
      nextDueDate,
      daysRemaining,
      status,
    };
  });

  const priority: Record<MaintenanceStatus, number> = {
    overdue: 0,
    due_soon: 1,
    ok: 2,
  };

  return computed.sort((a, b) => {
    if (priority[a.status] !== priority[b.status]) {
      return priority[a.status] - priority[b.status];
    }
    return a.kmRemaining - b.kmRemaining;
  });
}

export function computeAlerts(
  vehicle: Vehicle,
  computed: ComputedRefueling[],
  referenceDate: Date = new Date(),
  maintenances: ComputedMaintenanceItem[] = []
): AlertItem[] {
  const alerts: AlertItem[] = [];
  const effectiveOdometer = getEffectiveVehicleOdometer(vehicle, computed);

  // Maintenance alerts (highest operational priority)
  for (const m of maintenances) {
    if (m.status === 'overdue') {
      const overdueKm = Math.max(0, Math.abs(m.kmRemaining));
      const byKm = m.kmRemaining <= 0;
      alerts.push({
        id: `maint-overdue-${m.id}`,
        type: 'maintenance',
        severity: 'danger',
        title: `Manutenção vencida: ${m.title}`,
        description: byKm
          ? `O veículo atingiu ${formatKm(effectiveOdometer)} e ultrapassou o limite previsto de ${formatKm(m.nextDueKm)} (última troca em ${formatKm(m.lastDoneKm)}).`
          : `O prazo programado venceu em ${formatDateBR(m.nextDueDate || '')}. Odômetro atual: ${formatKm(effectiveOdometer)}.`,
        metricLabel: byKm ? `+${formatKm(overdueKm)} atraso` : 'Prazo vencido',
        targetTab: 'maintenance',
      });
    } else if (m.status === 'due_soon') {
      const byKm =
        m.kmRemaining <=
        Math.min(1500, Math.max(500, Math.round(m.intervalKm * 0.15)));
      alerts.push({
        id: `maint-soon-${m.id}`,
        type: 'maintenance',
        severity: 'warning',
        title: `Manutenção próxima: ${m.title}`,
        description: byKm
          ? `Faltam ${formatKm(m.kmRemaining)} para atingir ${formatKm(m.nextDueKm)} (intervalo de ${formatKm(m.intervalKm)}).`
          : `Prevista para ${formatDateBR(m.nextDueDate || '')} (${m.daysRemaining} dia(s) restante(s)).`,
        metricLabel: byKm
          ? `Faltam ${formatKm(m.kmRemaining)}`
          : `${m.daysRemaining} dias`,
        targetTab: 'maintenance',
      });
    }
  }

  if (computed.length === 0) {
    alerts.push({
      id: 'no-records',
      type: 'reminder',
      severity: 'info',
      title: 'Primeiro abastecimento pendente',
      description: `Registre o primeiro abastecimento de ${vehicle.name} para iniciar o rastreamento de quilometragem e consumo médio.`,
      metricLabel: `Odômetro: ${formatKm(effectiveOdometer)}`,
    });
    return alerts;
  }

  const latest = computed[computed.length - 1];

  // 1. Consumo acima da média habitual (queda >= 8% em km/l)
  const validConsumptions = computed.filter(
    (r) =>
      r.consumptionKmPerL !== null &&
      r.consumptionKmPerL > 0 &&
      r.id !== latest.id &&
      !r.isEstimated
  );
  if (
    latest.consumptionKmPerL !== null &&
    latest.consumptionKmPerL > 0 &&
    validConsumptions.length >= 2
  ) {
    const historicalAvg =
      validConsumptions.reduce(
        (sum, r) => sum + (r.consumptionKmPerL || 0),
        0
      ) / validConsumptions.length;
    const dropRatio = (historicalAvg - latest.consumptionKmPerL) / historicalAvg;
    if (dropRatio >= 0.08) {
      const pct = Math.round(dropRatio * 100);
      alerts.push({
        id: 'high-consumption',
        type: 'consumption',
        severity: dropRatio >= 0.15 ? 'danger' : 'warning',
        title: 'Consumo acima da média habitual',
        description: `O último registro marcou ${formatDecimal(latest.consumptionKmPerL)} km/l, ${pct}% menos eficiente que sua média anterior de ${formatDecimal(historicalAvg)} km/l.`,
        metricLabel: `-${pct}% km/l`,
      });
    }
  }

  // 2. Aumento do preço do combustível (>= 4% acima da média anterior)
  const previousItems = computed.slice(0, -1);
  if (previousItems.length >= 1) {
    const recentSlice = previousItems.slice(-4);
    const avgRecentPrice =
      recentSlice.reduce((sum, r) => sum + r.pricePerLiter, 0) /
      recentSlice.length;
    const priceDiffRatio =
      (latest.pricePerLiter - avgRecentPrice) / avgRecentPrice;
    if (priceDiffRatio >= 0.04) {
      const pct = Math.round(priceDiffRatio * 100);
      alerts.push({
        id: 'price-increase',
        type: 'price',
        severity: priceDiffRatio >= 0.1 ? 'danger' : 'warning',
        title: 'Aumento no preço do combustível',
        description: `Você pagou ${formatCurrency(latest.pricePerLiter)}/L em ${formatDateBR(latest.date)}, alta de ${pct}% sobre a média recente de ${formatCurrency(avgRecentPrice)}/L.`,
        metricLabel: `+${pct}% no litro`,
      });
    }
  }

  // 3. Gastos mensais acima da média
  const buckets = buildMonthlyBuckets(computed);
  if (buckets.length >= 2) {
    const yyyy = referenceDate.getFullYear();
    const mm = String(referenceDate.getMonth() + 1).padStart(2, '0');
    const currentMonthKey = `${yyyy}-${mm}`;
    const currentBucket = buckets.find((b) => b.monthKey === currentMonthKey);
    const otherBuckets = buckets.filter((b) => b.monthKey !== currentMonthKey);

    if (currentBucket && otherBuckets.length > 0) {
      const avgMonthlySpend =
        otherBuckets.reduce((sum, b) => sum + b.totalSpent, 0) /
        otherBuckets.length;
      const spendDiffRatio =
        (currentBucket.totalSpent - avgMonthlySpend) / avgMonthlySpend;
      if (spendDiffRatio >= 0.12) {
        const pct = Math.round(spendDiffRatio * 100);
        alerts.push({
          id: 'monthly-spend-high',
          type: 'monthly_spend',
          severity: spendDiffRatio >= 0.25 ? 'danger' : 'warning',
          title: 'Gastos mensais acima da média',
          description: `O gasto acumulado em ${currentBucket.label} (${formatCurrency(currentBucket.totalSpent)}) está ${pct}% acima da média mensal de ${formatCurrency(avgMonthlySpend)}.`,
          metricLabel: `+${pct}% no mês`,
        });
      }
    }
  }

  // 4. Necessidade de registrar novo abastecimento
  const latestDate = new Date(`${latest.date}T12:00:00`);
  const diffDays = Math.floor(
    (referenceDate.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const kmSinceLast = effectiveOdometer - latest.odometerKm;

  if (diffDays >= 14 || kmSinceLast >= 350) {
    const reason =
      kmSinceLast >= 350
        ? `${formatKm(kmSinceLast)} rodados desde o último registro`
        : `${diffDays} dias desde o último abastecimento`;
    alerts.push({
      id: 'refuel-reminder',
      type: 'reminder',
      severity: 'info',
      title: 'Hora de registrar novo abastecimento',
      description: `Já se passaram ${reason} (${formatDateBR(latest.date)}). Mantenha o histórico atualizado para preservar a precisão das médias.`,
      metricLabel:
        kmSinceLast >= 350 ? `+${formatKm(kmSinceLast)}` : `${diffDays} dias`,
    });
  }

  return alerts;
}

export function filterByPeriod(
  computed: ComputedRefueling[],
  period: ReportPeriod,
  referenceDate: Date = new Date()
): ComputedRefueling[] {
  if (period === 'all') return computed;

  const monthsBack =
    period === 'month'
      ? 1
      : period === 'quarter'
        ? 3
        : period === 'semester'
          ? 6
          : 12;

  const cutoff = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() - (monthsBack - 1),
    1
  );
  const cutoffIso = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-01`;

  return computed.filter((r) => r.date >= cutoffIso);
}

export function buildMonthlyBuckets(
  computed: ComputedRefueling[]
): MonthlyBucket[] {
  const map = new Map<string, ComputedRefueling[]>();
  for (const r of computed) {
    const key = getMonthKey(r.date);
    const list = map.get(key) || [];
    list.push(r);
    map.set(key, list);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, items]) => {
      const totalSpent = items.reduce((s, r) => s + r.totalPaid, 0);
      const totalLiters = items.reduce((s, r) => s + r.liters, 0);
      const distanceKm = items.reduce(
        (s, r) => s + (r.distanceKm && r.distanceKm > 0 ? r.distanceKm : 0),
        0
      );

      const accurate = items.filter(
        (r) => r.distanceKm && r.distanceKm > 0 && r.liters > 0 && !r.isEstimated
      );
      const allValid = items.filter(
        (r) => r.distanceKm && r.distanceKm > 0 && r.liters > 0
      );

      const consumptionBase = accurate.length > 0 ? accurate : allValid;
      let avgConsumptionKmPerL: number | null = null;
      if (consumptionBase.length > 0) {
        const d = consumptionBase.reduce((s, r) => s + (r.distanceKm || 0), 0);
        const l = consumptionBase.reduce((s, r) => s + r.liters, 0);
        avgConsumptionKmPerL = l > 0 ? d / l : null;
      }

      let avgCostPerKm: number | null = null;
      if (allValid.length > 0) {
        const d = allValid.reduce((s, r) => s + (r.distanceKm || 0), 0);
        const p = allValid.reduce((s, r) => s + r.totalPaid, 0);
        avgCostPerKm = d > 0 ? p / d : null;
      }

      const avgPricePerLiter =
        totalLiters > 0 ? totalSpent / totalLiters : null;

      return {
        monthKey,
        label: formatMonthShort(monthKey),
        totalSpent,
        totalLiters,
        distanceKm,
        avgConsumptionKmPerL,
        avgPricePerLiter,
        avgCostPerKm,
        count: items.length,
      };
    });
}

export interface PeriodComparison {
  currentLabel: string;
  previousLabel: string;
  currentAvgConsumption: number | null;
  previousAvgConsumption: number | null;
  consumptionDeltaPct: number | null;
  currentTotalSpent: number;
  previousTotalSpent: number;
  spentDeltaPct: number | null;
  currentDistanceKm: number;
  previousDistanceKm: number;
  distanceDeltaPct: number | null;
  currentCostPerKm: number | null;
  previousCostPerKm: number | null;
}

function summarizeSlice(items: ComputedRefueling[]) {
  const totalSpent = items.reduce((s, r) => s + r.totalPaid, 0);
  const distanceKm = items.reduce(
    (s, r) => s + (r.distanceKm && r.distanceKm > 0 ? r.distanceKm : 0),
    0
  );
  const accurate = items.filter(
    (r) => r.distanceKm && r.distanceKm > 0 && r.liters > 0 && !r.isEstimated
  );
  const allValid = items.filter(
    (r) => r.distanceKm && r.distanceKm > 0 && r.liters > 0
  );
  const base = accurate.length > 0 ? accurate : allValid;
  let avgConsumption: number | null = null;
  if (base.length > 0) {
    const d = base.reduce((s, r) => s + (r.distanceKm || 0), 0);
    const l = base.reduce((s, r) => s + r.liters, 0);
    avgConsumption = l > 0 ? d / l : null;
  }
  let avgCostPerKm: number | null = null;
  if (allValid.length > 0) {
    const d = allValid.reduce((s, r) => s + (r.distanceKm || 0), 0);
    const p = allValid.reduce((s, r) => s + r.totalPaid, 0);
    avgCostPerKm = d > 0 ? p / d : null;
  }
  return { totalSpent, distanceKm, avgConsumption, avgCostPerKm };
}

export function computePeriodComparison(
  computed: ComputedRefueling[],
  period: ReportPeriod,
  referenceDate: Date = new Date()
): PeriodComparison | null {
  if (computed.length === 0) return null;

  const monthsCount =
    period === 'month'
      ? 1
      : period === 'quarter'
        ? 3
        : period === 'semester'
          ? 6
          : period === 'year'
            ? 12
            : 6;

  const currStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() - (monthsCount - 1),
    1
  );
  const prevStart = new Date(
    currStart.getFullYear(),
    currStart.getMonth() - monthsCount,
    1
  );

  const currIso = `${currStart.getFullYear()}-${String(currStart.getMonth() + 1).padStart(2, '0')}-01`;
  const prevIso = `${prevStart.getFullYear()}-${String(prevStart.getMonth() + 1).padStart(2, '0')}-01`;

  const currentItems = computed.filter((r) => r.date >= currIso);
  const previousItems = computed.filter(
    (r) => r.date >= prevIso && r.date < currIso
  );

  const curr = summarizeSlice(currentItems);
  const prev = summarizeSlice(previousItems);

  const periodNames: Record<ReportPeriod, [string, string]> = {
    month: ['Mês atual', 'Mês anterior'],
    quarter: ['Trimestre atual', 'Trimestre anterior'],
    semester: ['Semestre atual', 'Semestre anterior'],
    year: ['Últimos 12 meses', '12 meses anteriores'],
    all: ['Últimos 6 meses', '6 meses anteriores'],
  };

  const pctDelta = (c: number | null, p: number | null) =>
    c !== null && p !== null && p > 0 ? ((c - p) / p) * 100 : null;

  return {
    currentLabel: periodNames[period][0],
    previousLabel: periodNames[period][1],
    currentAvgConsumption: curr.avgConsumption,
    previousAvgConsumption: prev.avgConsumption,
    consumptionDeltaPct: pctDelta(curr.avgConsumption, prev.avgConsumption),
    currentTotalSpent: curr.totalSpent,
    previousTotalSpent: prev.totalSpent,
    spentDeltaPct: pctDelta(curr.totalSpent, prev.totalSpent),
    currentDistanceKm: curr.distanceKm,
    previousDistanceKm: prev.distanceKm,
    distanceDeltaPct: pctDelta(curr.distanceKm, prev.distanceKm),
    currentCostPerKm: curr.avgCostPerKm,
    previousCostPerKm: prev.avgCostPerKm,
  };
}

export function computeFuelComparison(
  computed: ComputedRefueling[]
): FuelComparisonItem[] {
  const byFuel = new Map<FuelType, ComputedRefueling[]>();
  for (const r of computed) {
    const arr = byFuel.get(r.fuelType) || [];
    arr.push(r);
    byFuel.set(r.fuelType, arr);
  }

  return Array.from(byFuel.entries()).map(([fuelType, items]) => {
    const totalSpent = items.reduce((s, r) => s + r.totalPaid, 0);
    const totalLiters = items.reduce((s, r) => s + r.liters, 0);
    const distanceKm = items.reduce(
      (s, r) => s + (r.distanceKm && r.distanceKm > 0 ? r.distanceKm : 0),
      0
    );

    const accurate = items.filter(
      (r) => r.distanceKm && r.distanceKm > 0 && r.liters > 0 && !r.isEstimated
    );
    const allValid = items.filter(
      (r) => r.distanceKm && r.distanceKm > 0 && r.liters > 0
    );
    const base = accurate.length > 0 ? accurate : allValid;

    let avgConsumptionKmPerL: number | null = null;
    if (base.length > 0) {
      const d = base.reduce((s, r) => s + (r.distanceKm || 0), 0);
      const l = base.reduce((s, r) => s + r.liters, 0);
      avgConsumptionKmPerL = l > 0 ? d / l : null;
    }

    let avgCostPerKm: number | null = null;
    if (allValid.length > 0) {
      const d = allValid.reduce((s, r) => s + (r.distanceKm || 0), 0);
      const p = allValid.reduce((s, r) => s + r.totalPaid, 0);
      avgCostPerKm = d > 0 ? p / d : null;
    }

    return {
      fuelType,
      count: items.length,
      totalSpent,
      totalLiters,
      distanceKm,
      avgConsumptionKmPerL,
      avgCostPerKm,
      avgPricePerLiter: totalLiters > 0 ? totalSpent / totalLiters : 0,
    };
  });
}

export function exportRefuelingsToCSV(
  vehicle: Vehicle,
  computed: ComputedRefueling[]
): void {
  const headers = [
    'Veículo',
    'Data',
    'KM Inicial',
    'KM Registrado',
    'Distância Percorrida (km)',
    'Combustível',
    'Litros (L)',
    'Preço por Litro (R$)',
    'Valor Total (R$)',
    'Consumo Médio (km/l)',
    'Custo por KM (R$/km)',
    'Tanque Completo',
    'Precisão',
    'Posto',
    'Observações',
  ];

  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;

  const rows = computed.map((r) => [
    escape(`${vehicle.brand} ${vehicle.name} (${vehicle.year})`),
    escape(formatDateBR(r.date)),
    r.previousOdometerKm !== null ? String(r.previousOdometerKm) : '',
    String(r.odometerKm),
    r.distanceKm !== null ? formatDecimal(r.distanceKm, 0) : '',
    escape(r.fuelType),
    formatDecimal(r.liters, 2),
    formatDecimal(r.pricePerLiter, 3),
    formatDecimal(r.totalPaid, 2),
    r.consumptionKmPerL !== null ? formatDecimal(r.consumptionKmPerL, 2) : '',
    r.costPerKm !== null ? formatDecimal(r.costPerKm, 2) : '',
    r.fullTank ? 'Sim' : 'Parcial',
    r.isFirstRecord
      ? 'Primeiro registro'
      : r.isEstimated
        ? 'Estimado (parcial)'
        : 'Preciso',
    escape(r.station || ''),
    escape(r.notes || ''),
  ]);

  const csvContent =
    '\uFEFF' +
    [headers.map(escape).join(';'), ...rows.map((row) => row.join(';'))].join(
      '\r\n'
    );

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const slug = `${vehicle.brand}-${vehicle.name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  const today = new Date().toISOString().slice(0, 10);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `fuel-control-${slug}-${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
