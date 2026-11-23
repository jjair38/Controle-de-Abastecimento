'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { formatDecimal } from '@/lib/calculations';

export interface ChartPoint {
  key: string;
  label: string;
  value: number;
  subLabel?: string;
  isEstimated?: boolean;
}

interface TrendLineChartProps {
  title: string;
  subtitle: string;
  data: ChartPoint[];
  unit: string;
  valueFormatter: (val: number) => string;
  accentColor?: string;
  emptyMessage?: string;
}

export const TrendLineChart = React.memo(function TrendLineChart({
  title,
  subtitle,
  data,
  unit,
  valueFormatter,
  accentColor = '#3B82F6',
  emptyMessage = 'Sem dados suficientes no período selecionado.',
}: TrendLineChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const handleMouseLeave = useCallback(() => setHoveredIdx(null), []);

  const chartGeom = useMemo(() => {
    if (data.length === 0) return null;

    const width = 620;
    const height = 240;
    const padLeft = 56;
    const padRight = 24;
    const padTop = 24;
    const padBottom = 38;
    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;

    const values = data.map((d) => d.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const spread = rawMax - rawMin || Math.max(rawMax * 0.2, 1);
    const minVal = Math.max(0, rawMin - spread * 0.22);
    const maxVal = rawMax + spread * 0.22;
    const range = maxVal - minVal || 1;

    const coords = data.map((d, idx) => {
      const x =
        data.length === 1
          ? padLeft + innerW / 2
          : padLeft + (idx / (data.length - 1)) * innerW;
      const y = padTop + innerH - ((d.value - minVal) / range) * innerH;
      return { ...d, x, y, idx };
    });

    const linePath = coords
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(' ');

    const areaPath =
      coords.length > 1
        ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`
        : '';

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const val = minVal + (1 - t) * range;
      const y = padTop + t * innerH;
      return { val, y };
    });

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      innerW,
      innerH,
      coords,
      linePath,
      areaPath,
      ticks,
    };
  }, [data]);

  const activePoint =
    hoveredIdx !== null && chartGeom ? chartGeom.coords[hoveredIdx] : null;
  const gradientId = useMemo(
    () => `grad-${title.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    [title]
  );

  return (
    <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-[#F1F5F9] truncate">
            {title}
          </h3>
          <p className="text-xs text-[#94A3B8] mt-0.5">{subtitle}</p>
        </div>
        {activePoint ? (
          <div className="text-right shrink-0">
            <div className="font-mono text-sm font-semibold text-[#38BDF8] tabular-nums">
              {valueFormatter(activePoint.value)}
            </div>
            <div className="text-xs text-[#94A3B8] tabular-nums">
              {activePoint.label}
              {activePoint.isEstimated ? ' · Est.' : ''}
            </div>
          </div>
        ) : data.length > 0 ? (
          <div className="text-right shrink-0">
            <div className="font-mono text-sm font-semibold text-[#F1F5F9] tabular-nums">
              {valueFormatter(data[data.length - 1].value)}
            </div>
            <div className="text-xs text-[#94A3B8]">
              Último ({data[data.length - 1].label})
            </div>
          </div>
        ) : null}
      </div>

      {!chartGeom || data.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center border border-dashed border-[#232A3B] rounded-lg px-4 text-center">
          <p className="text-sm text-[#64748B]">{emptyMessage}</p>
        </div>
      ) : (
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${chartGeom.width} ${chartGeom.height}`}
            className="w-full h-auto overflow-visible select-none"
            role="img"
            aria-label={title}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity="0.28" />
                <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {chartGeom.ticks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={chartGeom.padLeft}
                  x2={chartGeom.width - chartGeom.padRight}
                  y1={tick.y}
                  y2={tick.y}
                  stroke="#1E2534"
                  strokeWidth="1"
                  strokeDasharray={i === 4 ? undefined : '3 3'}
                />
                <text
                  x={chartGeom.padLeft - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="11"
                  className="font-mono tabular-nums"
                >
                  {formatDecimal(tick.val, unit === 'km/l' ? 1 : 2)}
                </text>
              </g>
            ))}

            {chartGeom.areaPath && (
              <path d={chartGeom.areaPath} fill={`url(#${gradientId})`} />
            )}

            {chartGeom.coords.length > 1 && (
              <path
                d={chartGeom.linePath}
                fill="none"
                stroke={accentColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {activePoint && (
              <line
                x1={activePoint.x}
                x2={activePoint.x}
                y1={chartGeom.padTop}
                y2={chartGeom.padTop + chartGeom.innerH}
                stroke="#38BDF8"
                strokeOpacity="0.35"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            )}

            {chartGeom.coords.map((pt, idx) => {
              const isHovered = hoveredIdx === idx;
              const showLabel =
                chartGeom.coords.length <= 8 ||
                idx === 0 ||
                idx === chartGeom.coords.length - 1 ||
                idx % Math.ceil(chartGeom.coords.length / 6) === 0;

              return (
                <g
                  key={pt.key}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onClick={() => setHoveredIdx(idx)}
                  className="cursor-pointer"
                >
                  <rect
                    x={pt.x - 18}
                    y={chartGeom.padTop}
                    width={36}
                    height={chartGeom.innerH + 24}
                    fill="transparent"
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6 : 4}
                    fill={pt.isEstimated ? '#12161F' : accentColor}
                    stroke={isHovered ? '#F1F5F9' : accentColor}
                    strokeWidth={pt.isEstimated ? 2.5 : 2}
                  />
                  {showLabel && (
                    <text
                      x={pt.x}
                      y={chartGeom.height - 10}
                      textAnchor="middle"
                      fill={isHovered ? '#F1F5F9' : '#64748B'}
                      fontSize="11"
                      className="font-mono tabular-nums"
                    >
                      {pt.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
});

interface ColumnBarChartProps {
  title: string;
  subtitle: string;
  data: ChartPoint[];
  valueFormatter: (val: number) => string;
  axisFormatter: (val: number) => string;
  barColor?: string;
  emptyMessage?: string;
}

export const ColumnBarChart = React.memo(function ColumnBarChart({
  title,
  subtitle,
  data,
  valueFormatter,
  axisFormatter,
  barColor = '#2563EB',
  emptyMessage = 'Sem dados suficientes no período selecionado.',
}: ColumnBarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const handleMouseLeave = useCallback(() => setHoveredIdx(null), []);

  const chartGeom = useMemo(() => {
    if (data.length === 0) return null;

    const width = 620;
    const height = 240;
    const padLeft = 60;
    const padRight = 20;
    const padTop = 24;
    const padBottom = 38;
    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;

    const maxVal = Math.max(...data.map((d) => d.value), 1) * 1.15;
    const slotW = innerW / data.length;
    const barW = Math.min(44, Math.max(14, slotW * 0.54));

    const bars = data.map((d, idx) => {
      const barH = (d.value / maxVal) * innerH;
      const x = padLeft + idx * slotW + (slotW - barW) / 2;
      const y = padTop + innerH - barH;
      return { ...d, x, y, barW, barH, centerX: x + barW / 2, idx };
    });

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const val = (1 - t) * maxVal;
      const y = padTop + t * innerH;
      return { val, y };
    });

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      innerW,
      innerH,
      bars,
      ticks,
    };
  }, [data]);

  const activeBar =
    hoveredIdx !== null && chartGeom ? chartGeom.bars[hoveredIdx] : null;
  const totalSum = useMemo(
    () => data.reduce((acc, d) => acc + d.value, 0),
    [data]
  );

  return (
    <div className="bg-[#12161F] border border-[#232A3B] rounded-xl p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-[#F1F5F9] truncate">
            {title}
          </h3>
          <p className="text-xs text-[#94A3B8] mt-0.5">{subtitle}</p>
        </div>
        {activeBar ? (
          <div className="text-right shrink-0">
            <div className="font-mono text-sm font-semibold text-[#38BDF8] tabular-nums">
              {valueFormatter(activeBar.value)}
            </div>
            <div className="text-xs text-[#94A3B8] tabular-nums">
              {activeBar.label}
              {activeBar.subLabel ? ` · ${activeBar.subLabel}` : ''}
            </div>
          </div>
        ) : data.length > 0 ? (
          <div className="text-right shrink-0">
            <div className="font-mono text-sm font-semibold text-[#F1F5F9] tabular-nums">
              {valueFormatter(totalSum)}
            </div>
            <div className="text-xs text-[#94A3B8]">Total no período</div>
          </div>
        ) : null}
      </div>

      {!chartGeom || data.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center border border-dashed border-[#232A3B] rounded-lg px-4 text-center">
          <p className="text-sm text-[#64748B]">{emptyMessage}</p>
        </div>
      ) : (
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${chartGeom.width} ${chartGeom.height}`}
            className="w-full h-auto overflow-visible select-none"
            role="img"
            aria-label={title}
            onMouseLeave={handleMouseLeave}
          >
            {chartGeom.ticks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={chartGeom.padLeft}
                  x2={chartGeom.width - chartGeom.padRight}
                  y1={tick.y}
                  y2={tick.y}
                  stroke="#1E2534"
                  strokeWidth="1"
                  strokeDasharray={i === 4 ? undefined : '3 3'}
                />
                <text
                  x={chartGeom.padLeft - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="11"
                  className="font-mono tabular-nums"
                >
                  {axisFormatter(tick.val)}
                </text>
              </g>
            ))}

            {chartGeom.bars.map((b, idx) => {
              const isHovered = hoveredIdx === idx;
              const showLabel =
                chartGeom.bars.length <= 10 ||
                idx === 0 ||
                idx === chartGeom.bars.length - 1 ||
                idx % Math.ceil(chartGeom.bars.length / 6) === 0;

              return (
                <g
                  key={b.key}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onClick={() => setHoveredIdx(idx)}
                  className="cursor-pointer"
                >
                  <rect
                    x={b.x - 6}
                    y={chartGeom.padTop}
                    width={b.barW + 12}
                    height={chartGeom.innerH + 24}
                    fill="transparent"
                  />
                  <rect
                    x={b.x}
                    y={b.y}
                    width={b.barW}
                    height={Math.max(b.barH, 3)}
                    rx={5}
                    fill={isHovered ? '#38BDF8' : barColor}
                    fillOpacity={hoveredIdx !== null && !isHovered ? 0.45 : 0.92}
                  />
                  {showLabel && (
                    <text
                      x={b.centerX}
                      y={chartGeom.height - 10}
                      textAnchor="middle"
                      fill={isHovered ? '#F1F5F9' : '#64748B'}
                      fontSize="11"
                      className="font-mono tabular-nums"
                    >
                      {b.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
});
