'use client';

import React, { useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Droplets,
  Fuel,
  Gauge,
  MapPin,
  Plus,
  Route,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  buildMonthlyBuckets,
  computeAlerts,
  computeDashboardMetrics,
  formatCurrency,
  formatDateBR,
  formatDecimal,
  formatKm,
} from '@/lib/calculations';
import {
  ActiveTab,
  ComputedMaintenanceItem,
  ComputedRefueling,
  Vehicle,
} from '@/lib/types';
import { TrendLineChart } from './Charts';

interface DashboardViewProps {
  vehicle: Vehicle | null;
  vehicles: Vehicle[];
  effectiveOdometerKm: number;
  computed: ComputedRefueling[];
  computedMaintenances: ComputedMaintenanceItem[];
  onSelectVehicle: (id: string) => void;
  onAddRefueling: () => void;
  onAddVehicle: () => void;
  onNavigate: (tab: ActiveTab) => void;
}

export const DashboardView = React.memo(function DashboardView({
  vehicle,
  vehicles,
  effectiveOdometerKm,
  computed,
  computedMaintenances,
  onSelectVehicle,
  onAddRefueling,
  onAddVehicle,
  onNavigate,
}: DashboardViewProps) {
  const metrics = useMemo(
    () => computeDashboardMetrics(computed, new Date()),
    [computed]
  );

  const alerts = useMemo(() => {
    if (!vehicle) return [];
    return computeAlerts(vehicle, computed, new Date(), computedMaintenances);
  }, [vehicle, computed, computedMaintenances]);

  const recentConsumptionChart = useMemo(() => {
    const withConsumption = computed.filter(
      (r) => r.consumptionKmPerL !== null && r.consumptionKmPerL > 0
    );
    return withConsumption.slice(-8).map((r) => ({
      key: r.id,
      label: formatDateBR(r.date).slice(0, 5),
      value: Number((r.consumptionKmPerL || 0).toFixed(2)),
      isEstimated: r.isEstimated,
    }));
  }, [computed]);

  const monthlySpendChart = useMemo(() => {
    const buckets = buildMonthlyBuckets(computed).slice(-6);
    return buckets.map((b) => ({
      key: b.monthKey,
      label: b.label,
      value: Number(b.totalSpent.toFixed(2)),
    }));
  }, [computed]);

  if (!vehicle) {
    return (
      <div className="bg-[#12161F] border border-[#232A3B] rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-8">
        <div className="w-12 h-12 rounded-xl bg-[#2563EB]/15 text-[#38BDF8] flex items-center justify-center mx-auto mb-4">
          <Fuel className="w-6 h-6" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-[#F1F5F9]">
          Cadastre seu primeiro veículo
        </h2>
        <p className="text-sm text-[#94A3B8] mt-2 max-w-md mx-auto leading-relaxed">
          Para começar a acompanhar consumo em km/l, gastos mensais e custo por
          quilômetro, adicione um veículo à sua garagem.
        </p>
        <button
          type="button"
          onClick={onAddVehicle}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-sm font-semibold text-white transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Cadastrar veículo
        </button>
      </div>
    );
  }

  const displayConsumption =
    metrics.monthAvgConsumption ?? metrics.overallAvgConsumption;
  const displayCostPerKm =
    metrics.monthAvgCostPerKm ?? metrics.overallAvgCostPerKm;
  const displayPricePerLiter =
    metrics.monthAvgPricePerLiter ??
    (metrics.latestRefueling ? metrics.latestRefueling.pricePerLiter : null);

  return (
    <div className="space-y-6">
      {/* Vehicle Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[#12161F] border border-[#232A3B] rounded-xl p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#94A3B8]">
            <span>Veículo ativo</span>
            <span aria-hidden="true">·</span>
            <span>{vehicle.defaultFuel}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Odômetro: {formatKm(effectiveOdometerKm)}
            </span>
            {vehicle.tankCapacity && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Tanque: {vehicle.tankCapacity} L
                </span>
              </>
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F1F5F9] mt-1 tracking-tight text-balance">
            {vehicle.brand} {vehicle.name} ({vehicle.year})
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {vehicles.length > 1 && (
            <select
              aria-label="Selecionar veículo"
              value={vehicle.id}
              onChange={(e) => onSelectVehicle(e.target.value)}
              className="h-10 px-3.5 rounded-lg bg-[#0B0D12] border border-[#232A3B] text-sm text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.name} ({v.year})
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={onAddRefueling}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Registrar abastecimento
          </button>
        </div>
      </div>

      {/* 6 Primary KPI Cards */}
      <section aria-label="Indicadores principais">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-semibold text-[#F1F5F9]">
            Painel do mês ({metrics.monthLabel})
          </h2>
          <span className="text-xs text-[#94A3B8] font-mono tabular-nums">
            {metrics.monthCount}{' '}
            {metrics.monthCount === 1 ? 'abastecimento' : 'abastecimentos'} no mês
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Total gasto no mês */}
          <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-5">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Total gasto no mês</span>
              <Wallet className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <div className="font-mono text-2xl font-bold text-[#F1F5F9] tabular-nums mt-2">
              {formatCurrency(metrics.monthTotalSpent)}
            </div>
            <p className="text-xs text-[#64748B] mt-2 font-mono tabular-nums">
              Acumulado geral: {formatCurrency(metrics.overallTotalSpent)}
            </p>
          </div>

          {/* Card 2: Total de litros no mês */}
          <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-5">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Litros abastecidos no mês</span>
              <Droplets className="w-4 h-4 text-[#38BDF8]" />
            </div>
            <div className="font-mono text-2xl font-bold text-[#F1F5F9] tabular-nums mt-2">
              {formatDecimal(metrics.monthTotalLiters)} L
            </div>
            <p className="text-xs text-[#64748B] mt-2 font-mono tabular-nums">
              {metrics.monthCount}{' '}
              {metrics.monthCount === 1 ? 'registro em' : 'registros em'}{' '}
              {metrics.monthLabel}
            </p>
          </div>

          {/* Card 3: Quilômetros rodados no mês */}
          <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-5">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Quilômetros rodados no mês</span>
              <Route className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <div className="font-mono text-2xl font-bold text-[#F1F5F9] tabular-nums mt-2">
              {formatKm(metrics.monthDistanceKm)}
            </div>
            <p className="text-xs text-[#64748B] mt-2 font-mono tabular-nums">
              Total rastreado: {formatKm(metrics.overallDistanceKm)}
            </p>
          </div>

          {/* Card 4: Consumo médio (km/l) */}
          <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-5">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Consumo médio</span>
              <Gauge className="w-4 h-4 text-[#38BDF8]" />
            </div>
            <div className="font-mono text-2xl font-bold text-[#38BDF8] tabular-nums mt-2">
              {displayConsumption !== null
                ? `${formatDecimal(displayConsumption)} km/l`
                : '—'}
            </div>
            <p className="text-xs text-[#64748B] mt-2 font-mono tabular-nums">
              {metrics.monthAvgConsumption !== null
                ? metrics.monthConsumptionIsEstimated
                  ? 'Estimado no mês (abast. parcial)'
                  : `Média do mês · Geral: ${formatDecimal(metrics.overallAvgConsumption)} km/l`
                : metrics.overallAvgConsumption !== null
                  ? 'Média histórica (sem trecho no mês)'
                  : 'Requer ao menos 2 abastecimentos'}
            </p>
          </div>

          {/* Card 5: Custo médio por quilômetro */}
          <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-5">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Custo médio por quilômetro</span>
              <TrendingUp className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <div className="font-mono text-2xl font-bold text-[#F1F5F9] tabular-nums mt-2">
              {displayCostPerKm !== null
                ? `${formatCurrency(displayCostPerKm)}/km`
                : '—'}
            </div>
            <p className="text-xs text-[#64748B] mt-2 font-mono tabular-nums">
              {metrics.monthAvgCostPerKm !== null
                ? `Média geral: ${formatCurrency(metrics.overallAvgCostPerKm)}/km`
                : metrics.overallAvgCostPerKm !== null
                  ? 'Base histórica do veículo'
                  : 'Calculado após 2º abastecimento'}
            </p>
          </div>

          {/* Card 6: Preço médio por litro */}
          <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-5">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Preço médio por litro</span>
              <Fuel className="w-4 h-4 text-[#38BDF8]" />
            </div>
            <div className="font-mono text-2xl font-bold text-[#F1F5F9] tabular-nums mt-2">
              {displayPricePerLiter !== null
                ? `${formatCurrency(displayPricePerLiter)}/L`
                : '—'}
            </div>
            <p className="text-xs text-[#64748B] mt-2 font-mono tabular-nums">
              {metrics.monthAvgPricePerLiter !== null
                ? `Média paga em ${metrics.monthLabel}`
                : metrics.latestRefueling
                  ? `Último registro em ${formatDateBR(metrics.latestRefueling.date)}`
                  : 'Nenhum abastecimento registrado'}
            </p>
          </div>
        </div>
      </section>

      {/* Último Abastecimento + Consumo Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Último abastecimento */}
        <div className="lg:col-span-5 bg-[#12161F] border border-[#232A3B] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-display text-base font-semibold text-[#F1F5F9]">
                Último abastecimento
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#38BDF8] hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                Ver histórico
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {!metrics.latestRefueling ? (
              <div className="py-10 text-center border border-dashed border-[#232A3B] rounded-lg px-4">
                <p className="text-sm text-[#94A3B8]">
                  Nenhum abastecimento registrado para este veículo ainda.
                </p>
                <button
                  type="button"
                  onClick={onAddRefueling}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Registrar 1º abastecimento
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#1E2534]">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#F1F5F9] truncate">
                      {metrics.latestRefueling.station || 'Posto não informado'}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#94A3B8] mt-1">
                      <span className="font-mono tabular-nums">
                        {formatDateBR(metrics.latestRefueling.date)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{metrics.latestRefueling.fuelType}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {metrics.latestRefueling.fullTank
                          ? 'Tanque completo'
                          : 'Abastecimento parcial'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-lg font-bold text-[#F1F5F9] tabular-nums">
                      {formatCurrency(metrics.latestRefueling.totalPaid)}
                    </div>
                    <div className="font-mono text-xs text-[#94A3B8] tabular-nums">
                      {formatDecimal(metrics.latestRefueling.liters)} L ·{' '}
                      {formatCurrency(metrics.latestRefueling.pricePerLiter)}/L
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#1E2534]">
                    <div className="text-xs text-[#94A3B8]">Quilometragem</div>
                    <div className="font-mono text-sm font-semibold text-[#F1F5F9] tabular-nums mt-1">
                      {formatKm(metrics.latestRefueling.odometerKm)}
                    </div>
                    {metrics.latestRefueling.previousOdometerKm !== null && (
                      <div className="font-mono text-xs text-[#64748B] tabular-nums mt-0.5">
                        Anterior:{' '}
                        {formatKm(metrics.latestRefueling.previousOdometerKm)}
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#1E2534]">
                    <div className="text-xs text-[#94A3B8]">
                      Distância percorrida
                    </div>
                    <div className="font-mono text-sm font-semibold text-[#F1F5F9] tabular-nums mt-1">
                      {metrics.latestRefueling.distanceKm !== null
                        ? formatKm(metrics.latestRefueling.distanceKm)
                        : 'Primeiro registro'}
                    </div>
                    <div className="font-mono text-xs text-[#64748B] tabular-nums mt-0.5">
                      {metrics.latestRefueling.costPerKm !== null
                        ? `${formatCurrency(metrics.latestRefueling.costPerKm)}/km`
                        : 'Aguardando próximo'}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#161C29] border border-[#2563EB]/30 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-[#94A3B8]">
                      Consumo obtido no trecho
                    </div>
                    <div className="text-xs text-[#64748B] mt-0.5">
                      {metrics.latestRefueling.isFirstRecord
                        ? 'Sem histórico anterior para cálculo'
                        : metrics.latestRefueling.isEstimated
                          ? 'Estimado (envolve abastecimento parcial)'
                          : 'Medição precisa (tanque completo)'}
                    </div>
                  </div>
                  <div className="font-mono text-xl font-bold text-[#38BDF8] tabular-nums shrink-0">
                    {metrics.latestRefueling.consumptionKmPerL !== null
                      ? `${formatDecimal(metrics.latestRefueling.consumptionKmPerL)} km/l`
                      : '—'}
                  </div>
                </div>

                {metrics.latestRefueling.notes && (
                  <p className="text-xs text-[#94A3B8] flex items-start gap-2 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#64748B] shrink-0 mt-0.5" />
                    <span>{metrics.latestRefueling.notes}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mini Chart */}
        <div className="lg:col-span-7 flex flex-col">
          <TrendLineChart
            title="Evolução recente do consumo"
            subtitle="Últimos trechos medidos em km/l (pontos vazados indicam estimativa parcial)"
            data={recentConsumptionChart}
            unit="km/l"
            valueFormatter={(v) => `${formatDecimal(v)} km/l`}
            emptyMessage="Registre pelo menos 2 abastecimentos para visualizar a curva de consumo."
          />
          {monthlySpendChart.length > 0 && (
            <div className="mt-3 flex items-center justify-between px-1">
              <span className="text-xs text-[#64748B]">
                Gráficos completos com filtros por mês, trimestre, semestre e
                ano estão disponíveis na aba Relatórios.
              </span>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#38BDF8] hover:text-white transition-colors whitespace-nowrap shrink-0 ml-3"
              >
                Abrir relatórios
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alertas e Indicadores */}
      <section aria-label="Alertas e indicadores">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-semibold text-[#F1F5F9] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#3B82F6]" />
            Alertas e indicadores
          </h2>
          <span className="text-xs text-[#94A3B8] font-mono tabular-nums">
            {alerts.length}{' '}
            {alerts.length === 1 ? 'alerta ativo' : 'alertas ativos'}
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#F1F5F9]">
                Desempenho dentro do padrão esperado
              </p>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Consumo, preço do combustível, gasto mensal e frequência de
                abastecimento estão normais para {vehicle.name}.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((alert) => {
              const Icon =
                alert.severity === 'danger'
                  ? AlertCircle
                  : alert.severity === 'warning'
                    ? AlertTriangle
                    : Bell;
              const toneClass =
                alert.severity === 'danger'
                  ? 'border-red-500/35 bg-red-500/[0.06]'
                  : alert.severity === 'warning'
                    ? 'border-amber-500/35 bg-amber-500/[0.06]'
                    : 'border-[#2563EB]/35 bg-[#2563EB]/[0.06]';
              const iconColor =
                alert.severity === 'danger'
                  ? 'text-red-400'
                  : alert.severity === 'warning'
                    ? 'text-amber-400'
                    : 'text-[#38BDF8]';

              return (
                <div
                  key={alert.id}
                  className={`rounded-xl border p-4 flex items-start justify-between gap-4 ${toneClass}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[#F1F5F9]">
                        {alert.title}
                      </h3>
                      <p className="text-xs text-[#CBD5E1] mt-1 leading-relaxed">
                        {alert.description}
                      </p>
                      {alert.targetTab && (
                        <button
                          type="button"
                          onClick={() => onNavigate(alert.targetTab!)}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#38BDF8] hover:text-white transition-colors"
                        >
                          Abrir manutenções
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <span
                    className={`font-mono text-xs font-semibold tabular-nums shrink-0 ${iconColor}`}
                  >
                    {alert.metricLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
});
