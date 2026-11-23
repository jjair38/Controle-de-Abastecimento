'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Minus,
} from 'lucide-react';
import {
  buildMonthlyBuckets,
  computeFuelComparison,
  computePeriodComparison,
  exportRefuelingsToCSV,
  filterByPeriod,
  formatCurrency,
  formatDateBR,
  formatDecimal,
  formatKm,
} from '@/lib/calculations';
import { ComputedRefueling, ReportPeriod, Vehicle } from '@/lib/types';
import { ColumnBarChart, TrendLineChart } from './Charts';

interface ReportsViewProps {
  vehicle: Vehicle | null;
  computed: ComputedRefueling[];
}

const PERIOD_OPTIONS: { id: ReportPeriod; label: string }[] = [
  { id: 'month', label: 'Mês' },
  { id: 'quarter', label: 'Trimestre' },
  { id: 'semester', label: 'Semestre' },
  { id: 'year', label: 'Ano' },
  { id: 'all', label: 'Tudo' },
];

export const ReportsView = React.memo(function ReportsView({
  vehicle,
  computed,
}: ReportsViewProps) {
  const [period, setPeriod] = useState<ReportPeriod>('semester');

  const filteredRefuelings = useMemo(
    () => filterByPeriod(computed, period, new Date()),
    [computed, period]
  );

  const monthlyBuckets = useMemo(
    () => buildMonthlyBuckets(filteredRefuelings),
    [filteredRefuelings]
  );

  const comparison = useMemo(
    () => computePeriodComparison(computed, period, new Date()),
    [computed, period]
  );

  const fuelComparison = useMemo(
    () => computeFuelComparison(filteredRefuelings),
    [filteredRefuelings]
  );

  // Chart 1: Evolução do consumo médio (por abastecimento no mês ou por mês nos demais períodos)
  const consumptionSeries = useMemo(() => {
    if (period === 'month') {
      return filteredRefuelings
        .filter((r) => r.consumptionKmPerL !== null && r.consumptionKmPerL > 0)
        .map((r) => ({
          key: r.id,
          label: formatDateBR(r.date).slice(0, 5),
          value: Number((r.consumptionKmPerL || 0).toFixed(2)),
          isEstimated: r.isEstimated,
        }));
    }
    return monthlyBuckets
      .filter((b) => b.avgConsumptionKmPerL !== null)
      .map((b) => ({
        key: b.monthKey,
        label: b.label,
        value: Number((b.avgConsumptionKmPerL || 0).toFixed(2)),
      }));
  }, [period, filteredRefuelings, monthlyBuckets]);

  // Chart 2: Evolução dos gastos mensais
  const monthlySpendSeries = useMemo(
    () =>
      monthlyBuckets.map((b) => ({
        key: b.monthKey,
        label: b.label,
        value: Number(b.totalSpent.toFixed(2)),
        subLabel: `${b.count} ${b.count === 1 ? 'abast.' : 'abasts.'}`,
      })),
    [monthlyBuckets]
  );

  // Chart 3: Evolução do preço do combustível (por registro no período filtrado)
  const fuelPriceSeries = useMemo(
    () =>
      filteredRefuelings.map((r) => ({
        key: r.id,
        label: formatDateBR(r.date).slice(0, 5),
        value: Number(r.pricePerLiter.toFixed(3)),
      })),
    [filteredRefuelings]
  );

  // Chart 4: Quilômetros percorridos por mês
  const monthlyDistanceSeries = useMemo(
    () =>
      monthlyBuckets.map((b) => ({
        key: b.monthKey,
        label: b.label,
        value: Math.round(b.distanceKm),
      })),
    [monthlyBuckets]
  );

  if (!vehicle) {
    return (
      <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-8 text-center">
        <p className="text-sm text-[#94A3B8]">
          Cadastre ou selecione um veículo para gerar relatórios e gráficos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Period Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F1F5F9]">
            Relatórios e desempenho
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            {vehicle.brand} {vehicle.name} · Análise histórica de consumo,
            custos e quilometragem
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#12161F] border border-[#232A3B] rounded-lg overflow-x-auto">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPeriod(opt.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  period === opt.id
                    ? 'bg-[#2563EB] text-white'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={filteredRefuelings.length === 0}
            onClick={() => exportRefuelingsToCSV(vehicle, filteredRefuelings)}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-[#12161F] border border-[#232A3B] hover:border-[#3B82F6] text-xs font-medium text-[#F1F5F9] disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Period Comparison Strip */}
      {comparison && (
        <section aria-label="Comparativo entre períodos">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-semibold text-[#F1F5F9]">
              Comparativo entre períodos
            </h2>
            <span className="text-xs text-[#94A3B8]">
              {comparison.currentLabel} vs {comparison.previousLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Consumo */}
            <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-4">
              <div className="text-xs text-[#94A3B8]">Consumo médio</div>
              <div className="font-mono text-xl font-bold text-[#38BDF8] tabular-nums mt-1.5">
                {comparison.currentAvgConsumption !== null
                  ? `${formatDecimal(comparison.currentAvgConsumption)} km/l`
                  : '—'}
              </div>
              <div className="flex items-center justify-between gap-2 mt-2 text-xs">
                <span className="text-[#64748B] font-mono tabular-nums">
                  Ant.:{' '}
                  {comparison.previousAvgConsumption !== null
                    ? `${formatDecimal(comparison.previousAvgConsumption)} km/l`
                    : '—'}
                </span>
                {comparison.consumptionDeltaPct !== null && (
                  <span
                    className={`inline-flex items-center gap-0.5 font-mono font-medium tabular-nums ${
                      comparison.consumptionDeltaPct >= 0
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {comparison.consumptionDeltaPct >= 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    {comparison.consumptionDeltaPct >= 0 ? '+' : ''}
                    {formatDecimal(comparison.consumptionDeltaPct, 1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Gasto total */}
            <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-4">
              <div className="text-xs text-[#94A3B8]">Gasto total</div>
              <div className="font-mono text-xl font-bold text-[#F1F5F9] tabular-nums mt-1.5">
                {formatCurrency(comparison.currentTotalSpent)}
              </div>
              <div className="flex items-center justify-between gap-2 mt-2 text-xs">
                <span className="text-[#64748B] font-mono tabular-nums">
                  Ant.: {formatCurrency(comparison.previousTotalSpent)}
                </span>
                {comparison.spentDeltaPct !== null && (
                  <span
                    className={`inline-flex items-center gap-0.5 font-mono font-medium tabular-nums ${
                      comparison.spentDeltaPct <= 0
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {comparison.spentDeltaPct > 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : comparison.spentDeltaPct < 0 ? (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                    {comparison.spentDeltaPct > 0 ? '+' : ''}
                    {formatDecimal(comparison.spentDeltaPct, 1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Distância percorrida */}
            <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-4">
              <div className="text-xs text-[#94A3B8]">Distância percorrida</div>
              <div className="font-mono text-xl font-bold text-[#F1F5F9] tabular-nums mt-1.5">
                {formatKm(comparison.currentDistanceKm)}
              </div>
              <div className="flex items-center justify-between gap-2 mt-2 text-xs">
                <span className="text-[#64748B] font-mono tabular-nums">
                  Ant.: {formatKm(comparison.previousDistanceKm)}
                </span>
                {comparison.distanceDeltaPct !== null && (
                  <span className="inline-flex items-center gap-0.5 font-mono font-medium text-[#CBD5E1] tabular-nums">
                    {comparison.distanceDeltaPct > 0 ? '+' : ''}
                    {formatDecimal(comparison.distanceDeltaPct, 1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Custo por km */}
            <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-4">
              <div className="text-xs text-[#94A3B8]">Custo médio por km</div>
              <div className="font-mono text-xl font-bold text-[#F1F5F9] tabular-nums mt-1.5">
                {comparison.currentCostPerKm !== null
                  ? `${formatCurrency(comparison.currentCostPerKm)}/km`
                  : '—'}
              </div>
              <div className="flex items-center justify-between gap-2 mt-2 text-xs">
                <span className="text-[#64748B] font-mono tabular-nums">
                  Ant.:{' '}
                  {comparison.previousCostPerKm !== null
                    ? `${formatCurrency(comparison.previousCostPerKm)}/km`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4 Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TrendLineChart
          title="Evolução do consumo médio"
          subtitle="Rendimento médio em quilômetros por litro (km/l)"
          data={consumptionSeries}
          unit="km/l"
          valueFormatter={(v) => `${formatDecimal(v)} km/l`}
          accentColor="#38BDF8"
        />

        <ColumnBarChart
          title="Evolução dos gastos mensais"
          subtitle="Total investido em combustível mês a mês (R$)"
          data={monthlySpendSeries}
          valueFormatter={(v) => formatCurrency(v)}
          axisFormatter={(v) => `R$${Math.round(v)}`}
          barColor="#2563EB"
        />

        <TrendLineChart
          title="Evolução do preço do combustível"
          subtitle="Valor pago por litro ao longo dos abastecimentos (R$/L)"
          data={fuelPriceSeries}
          unit="R$/L"
          valueFormatter={(v) => `${formatCurrency(v)}/L`}
          accentColor="#3B82F6"
        />

        <ColumnBarChart
          title="Quilômetros percorridos por mês"
          subtitle="Distância acumulada entre abastecimentos por mês (km)"
          data={monthlyDistanceSeries}
          valueFormatter={(v) => formatKm(v)}
          axisFormatter={(v) => `${Math.round(v)}`}
          barColor="#0EA5E9"
        />
      </div>

      {/* Fuel Type Breakdown */}
      {fuelComparison.length > 0 && (
        <section className="bg-[#12161F] border border-[#232A3B] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#232A3B]">
            <h2 className="font-display text-base font-semibold text-[#F1F5F9]">
              Desempenho por tipo de combustível
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Consolidado do período selecionado para comparar eficiência e
              custo por quilômetro.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#232A3B] bg-[#0E1118] text-xs font-medium text-[#94A3B8]">
                  <th className="py-3 px-5">Combustível</th>
                  <th className="py-3 px-4 text-right">Abastecimentos</th>
                  <th className="py-3 px-4 text-right">Litros</th>
                  <th className="py-3 px-4 text-right">Distância</th>
                  <th className="py-3 px-4 text-right">Preço médio/L</th>
                  <th className="py-3 px-4 text-right">Consumo médio</th>
                  <th className="py-3 px-5 text-right">Custo/km</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D2332] text-sm">
                {fuelComparison.map((row) => (
                  <tr key={row.fuelType} className="hover:bg-[#161B26]">
                    <td className="py-3 px-5 font-medium text-[#F1F5F9]">
                      {row.fuelType}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-[#CBD5E1] tabular-nums">
                      {row.count}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-[#CBD5E1] tabular-nums">
                      {formatDecimal(row.totalLiters)} L
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-[#CBD5E1] tabular-nums">
                      {formatKm(row.distanceKm)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-[#CBD5E1] tabular-nums">
                      {formatCurrency(row.avgPricePerLiter)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-[#38BDF8] tabular-nums">
                      {row.avgConsumptionKmPerL !== null
                        ? `${formatDecimal(row.avgConsumptionKmPerL)} km/l`
                        : '—'}
                    </td>
                    <td className="py-3 px-5 text-right font-mono text-xs text-[#F1F5F9] tabular-nums">
                      {row.avgCostPerKm !== null
                        ? `${formatCurrency(row.avgCostPerKm)}/km`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
});
