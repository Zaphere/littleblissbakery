import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Report charts, drawn as plain SVG.
 *
 * They are hand-drawn rather than pulled from a charting library on purpose: this
 * app ships a deliberately small bundle and every kilobyte is paid for on a phone in
 * a bakery, and a charting library would have to become a production dependency to
 * be used from app source. SVG also prints exactly as drawn, which matters because
 * these charts are printed in the report PDFs.
 *
 * Every chart takes its data from the helpers in @/lib/store and renders nothing at
 * all when that data is empty — an empty chart would be a decorative graphic, not a
 * report.
 *
 * The five series colours are the --chart-* tokens the app already ships in both
 * themes, so a chart follows light/dark with the rest of the page.
 */
export const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
] as const;

export type ChartDatum = { label: string; value: number; secondary?: number };
export type ChartFormatter = (value: number) => string;

const compact = (value: number) =>
  Math.abs(value) >= 1000 ? `${Math.round(value / 100) / 10}k` : String(Math.round(value * 10) / 10);

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Round a maximum up to a readable axis top: 1, 2, 2.5 or 5 times a power of ten. */
const niceMax = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const scaled = value / power;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
  return step * power;
};

const hasSecondary = (data: ChartDatum[]) => data.some(point => typeof point.secondary === 'number');

/**
 * Measure the container so the SVG can be drawn at real pixel size — an SVG scaled
 * with a viewBox would scale its labels too, and 10px type becomes 6px on a phone.
 * A chart heading for print is given a fixed width instead, since a print box has
 * no resize events to wait for.
 */
function useChartWidth(fixed?: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [measured, setMeasured] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node || fixed) return;
    const read = () => setMeasured(Math.round(node.getBoundingClientRect().width));
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, [fixed]);
  return { ref, width: fixed || Math.max(240, measured) };
}

type Hover = { index: number; x: number; y: number };

/** The hover readout. Positioned over the chart, kept inside its edges. */
function ChartTooltip({ point, at, width, format, secondaryLabel }: { point: ChartDatum; at: Hover; width: number; format: ChartFormatter; secondaryLabel?: string }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border bg-card px-2.5 py-1.5 text-[11px] text-card-foreground shadow-md"
      style={{ left: Math.min(Math.max(at.x, 62), Math.max(width - 62, 62)), top: Math.max(at.y, 34) }}
    >
      <p className="font-semibold">{point.label}</p>
      <p className="mono">{format(point.value)}</p>
      {typeof point.secondary === 'number' && <p className="mono text-muted-foreground">{format(point.secondary)} {secondaryLabel || 'secondary'}</p>}
    </div>
  );
}

function ChartShell({ label, width, height, children }: { label: string; width: number; height: number; children: ReactNode }) {
  return <div role="img" aria-label={label} style={{ width, height }}>{children}</div>;
}

/** Horizontal grid lines with value labels down the left edge. */
function ValueAxis({ width, top, bottom, max }: { width: number; top: number; bottom: number; max: number }) {
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <g aria-hidden="true">
      {ticks.map(tick => {
        const y = bottom - tick * (bottom - top);
        return (
          <g key={tick}>
            <line x1={44} x2={width - 6} y1={y} y2={y} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <text x={38} y={y + 3} textAnchor="end" fontSize={9} fill="hsl(var(--muted-foreground))">{compact(max * tick)}</text>
          </g>
        );
      })}
    </g>
  );
}

/** X labels, thinned out so they never overlap each other. */
function ColumnLabels({ data, width, top, bottom }: { data: ChartDatum[]; width: number; top: number; bottom: number }) {
  const slot = (width - 50) / data.length;
  const longest = Math.max(...data.map(point => point.label.length));
  const perLabel = Math.max(1, Math.ceil((longest * 5.4) / slot));
  return (
    <g aria-hidden="true">
      {data.map((point, index) => index % perLabel === 0 && (
        <text key={point.label + index} x={50 + slot * (index + 0.5)} y={bottom + 13} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">
          {truncate(point.label, Math.max(4, Math.floor(slot / 5.6)))}
        </text>
      ))}
    </g>
  );
}

/** One measure per bar. Use for "sales by product", "revenue by category", quantities. */
export function BarReportChart({
  data, height = 220, width, format = compact, horizontal = false, label,
}: {
  data: ChartDatum[]; height?: number; width?: number; format?: ChartFormatter; horizontal?: boolean; label: string;
}) {
  const { ref, width: boxWidth } = useChartWidth(width);
  const [hover, setHover] = useState<Hover | null>(null);
  if (!data.length) return null;

  const max = niceMax(Math.max(...data.map(point => Math.abs(point.value))));

  if (horizontal) {
    const left = Math.min(132, Math.max(76, boxWidth * 0.34));
    const right = boxWidth - 8;
    const top = 6;
    const row = (height - top - 4) / data.length;
    const barHeight = Math.min(16, row * 0.58);
    const scale = (value: number) => (Math.abs(value) / max) * (right - left - 8);
    return (
      <div ref={ref} className="relative" style={{ width: '100%' }}>
        <ChartShell label={label} width={boxWidth} height={height}>
          <svg width={boxWidth} height={height}>
            {data.map((point, index) => {
              const y = top + row * index + (row - barHeight) / 2;
              const barWidth = Math.max(1, scale(point.value));
              const centre = left + barWidth;
              return (
                <g key={point.label + index}
                  onMouseEnter={() => setHover({ index, x: Math.min(centre + 8, boxWidth - 70), y })}
                  onMouseLeave={() => setHover(null)}
                >
                  <rect x={left} y={top + row * index} width={right - left} height={row} fill="transparent" />
                  <text x={left - 8} y={y + barHeight / 2 + 3} textAnchor="end" fontSize={10} fill="hsl(var(--muted-foreground))">{truncate(point.label, 18)}</text>
                  <rect x={left} y={y} width={barWidth} height={barHeight} rx={4} fill={CHART_COLORS[0]} />
                </g>
              );
            })}
          </svg>
        </ChartShell>
        {hover && <ChartTooltip point={data[hover.index]} at={hover} width={boxWidth} format={format} />}
      </div>
    );
  }

  const top = 8;
  const bottom = height - 20;
  const slot = (boxWidth - 50) / data.length;
  const barWidth = Math.min(44, slot * 0.6);
  return (
    <div ref={ref} className="relative" style={{ width: '100%' }}>
      <ChartShell label={label} width={boxWidth} height={height}>
        <svg width={boxWidth} height={height}>
          <ValueAxis width={boxWidth} top={top} bottom={bottom} max={max} />
          {data.map((point, index) => {
            const barHeight = Math.max(1, (Math.abs(point.value) / max) * (bottom - top));
            const x = 50 + slot * index + (slot - barWidth) / 2;
            const y = bottom - barHeight;
            return (
              <g key={point.label + index}
                onMouseEnter={() => setHover({ index, x: x + barWidth / 2, y })}
                onMouseLeave={() => setHover(null)}
              >
                <rect x={50 + slot * index} y={top} width={slot} height={bottom - top} fill="transparent" />
                <rect x={x} y={y} width={barWidth} height={barHeight} rx={4} fill={CHART_COLORS[0]} />
              </g>
            );
          })}
          <ColumnLabels data={data} width={boxWidth} top={top} bottom={bottom} />
        </svg>
      </ChartShell>
      {hover && <ChartTooltip point={data[hover.index]} at={hover} width={boxWidth} format={format} />}
    </div>
  );
}

/** Two measures side by side on one scale — revenue against expenses, sales against dozens. */
export function GroupedBarReportChart({
  data, height = 240, width, format = compact, secondaryLabel = 'Secondary', label,
}: {
  data: ChartDatum[]; height?: number; width?: number; format?: ChartFormatter; secondaryLabel?: string; label: string;
}) {
  const { ref, width: boxWidth } = useChartWidth(width);
  const [hover, setHover] = useState<Hover | null>(null);
  if (!data.length) return null;

  const values = data.flatMap(point => [Math.abs(point.value), Math.abs(point.secondary ?? 0)]);
  const max = niceMax(Math.max(...values));
  const top = 8;
  const bottom = height - 20;
  const slot = (boxWidth - 50) / data.length;
  const barWidth = Math.min(26, slot * 0.32);
  const scale = (value: number) => Math.max(1, (Math.abs(value) / max) * (bottom - top));

  return (
    <div ref={ref} className="relative" style={{ width: '100%' }}>
      <ChartShell label={label} width={boxWidth} height={height}>
        <svg width={boxWidth} height={height}>
          <ValueAxis width={boxWidth} top={top} bottom={bottom} max={max} />
          {data.map((point, index) => {
            const groupX = 50 + slot * index + (slot - barWidth * 2 - 3) / 2;
            const first = scale(point.value);
            const second = scale(point.secondary ?? 0);
            return (
              <g key={point.label + index}
                onMouseEnter={() => setHover({ index, x: groupX + barWidth, y: Math.min(bottom - first, bottom - second) })}
                onMouseLeave={() => setHover(null)}
              >
                <rect x={50 + slot * index} y={top} width={slot} height={bottom - top} fill="transparent" />
                <rect x={groupX} y={bottom - first} width={barWidth} height={first} rx={3} fill={CHART_COLORS[0]} />
                <rect x={groupX + barWidth + 3} y={bottom - second} width={barWidth} height={second} rx={3} fill={CHART_COLORS[2]} />
              </g>
            );
          })}
          <ColumnLabels data={data} width={boxWidth} top={top} bottom={bottom} />
        </svg>
      </ChartShell>
      {hover && <ChartTooltip point={data[hover.index]} at={hover} width={boxWidth} format={format} secondaryLabel={secondaryLabel} />}
    </div>
  );
}

/** A measure over time — revenue, order count or profit. */
export function TrendReportChart({
  data, height = 240, width, format = compact, secondaryLabel = 'Secondary', label,
}: {
  data: ChartDatum[]; height?: number; width?: number; format?: ChartFormatter; secondaryLabel?: string; label: string;
}) {
  const { ref, width: boxWidth } = useChartWidth(width);
  const [hover, setHover] = useState<Hover | null>(null);
  if (!data.length) return null;

  const second = hasSecondary(data);
  const values = data.flatMap(point => [Math.abs(point.value), second ? Math.abs(point.secondary ?? 0) : 0]);
  const max = niceMax(Math.max(...values));
  const top = 8;
  const bottom = height - 20;
  const slot = (width || boxWidth) ? (boxWidth - 50) / data.length : 1;
  const centre = (index: number) => 50 + slot * (index + 0.5);
  const yOf = (value: number) => bottom - (Math.abs(value) / max) * (bottom - top);
  const line = (key: 'value' | 'secondary') => data
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${centre(index).toFixed(1)} ${yOf((point[key] as number) || 0).toFixed(1)}`)
    .join(' ');

  return (
    <div ref={ref} className="relative" style={{ width: '100%' }}>
      <ChartShell label={label} width={boxWidth} height={height}>
        <svg width={boxWidth} height={height}>
          <ValueAxis width={boxWidth} top={top} bottom={bottom} max={max} />
          <path d={line('value')} fill="none" stroke={CHART_COLORS[0]} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {second && <path d={line('secondary')} fill="none" stroke={CHART_COLORS[2]} strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />}
          {data.map((point, index) => (
            <circle key={point.label + index} cx={centre(index)} cy={yOf(point.value)} r={2.5} fill={CHART_COLORS[0]} />
          ))}
          {data.map((point, index) => (
            <g key={`hit-${index}`}
              onMouseEnter={() => setHover({ index, x: centre(index), y: Math.min(yOf(point.value), second ? yOf(point.secondary ?? 0) : bottom) })}
              onMouseLeave={() => setHover(null)}
            >
              <rect x={50 + slot * index} y={top} width={slot} height={bottom - top} fill="transparent" />
              <rect x={50 + slot * index} y={top} width={slot} height={bottom - top} fill={hover?.index === index ? 'hsl(var(--muted))' : 'transparent'} fillOpacity={0.5} />
            </g>
          ))}
          <ColumnLabels data={data} width={boxWidth} top={top} bottom={bottom} />
        </svg>
      </ChartShell>
      {hover && <ChartTooltip point={data[hover.index]} at={hover} width={boxWidth} format={format} secondaryLabel={secondaryLabel} />}
    </div>
  );
}

const polar = (cx: number, cy: number, r: number, angle: number): [number, number] => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];

/** One donut slice, drawn as an annular sector. */
function slicePath(cx: number, cy: number, outer: number, inner: number, from: number, to: number) {
  if (to - from >= Math.PI * 2 - 0.0001) {
    const [x, y] = polar(cx, cy, (outer + inner) / 2, -Math.PI / 2);
    return `M${x - (outer - inner) / 2} ${y} a${(outer - inner) / 2} ${(outer - inner) / 2} 0 1 0 ${outer - inner} 0 a${(outer - inner) / 2} ${(outer - inner) / 2} 0 1 0 ${-(outer - inner)} 0`;
  }
  const [x1, y1] = polar(cx, cy, outer, from);
  const [x2, y2] = polar(cx, cy, outer, to);
  const [x3, y3] = polar(cx, cy, inner, to);
  const [x4, y4] = polar(cx, cy, inner, from);
  const large = to - from > Math.PI ? 1 : 0;
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${outer} ${outer} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${x3.toFixed(2)} ${y3.toFixed(2)} A${inner} ${inner} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
}

/** Parts of a whole. Capped at eight slices — past that it stops being readable. */
export function DonutReportChart({
  data, height = 200, width, format = compact, label, legend = true,
}: {
  data: ChartDatum[]; height?: number; width?: number; format?: ChartFormatter; label: string; legend?: boolean;
}) {
  const { ref, width: boxWidth } = useChartWidth(width);
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return null;

  const slices = data.filter(slice => slice.value > 0).slice(0, 8);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (!slices.length) return null;

  const size = Math.min(height - 8, boxWidth - 8);
  const cx = boxWidth / 2;
  const cy = height / 2;
  const outer = size / 2;
  const inner = outer * 0.58;
  let cursor = -Math.PI / 2;
  const arcs = slices.map((slice, index) => {
    const sweep = total > 0 ? (slice.value / total) * Math.PI * 2 : 0;
    const arc = { slice, index, path: slicePath(cx, cy, outer, inner, cursor, cursor + Math.max(sweep, 0.0001)) };
    cursor += sweep;
    return arc;
  });

  return (
    <div ref={ref} className="relative">
      <ChartShell label={label} width={boxWidth} height={height}>
        <svg width={boxWidth} height={height}>
          {arcs.map(arc => (
            <path
              key={arc.slice.label}
              d={arc.path}
              fill={CHART_COLORS[arc.index % CHART_COLORS.length]}
              stroke="hsl(var(--card))"
              strokeWidth={2}
              opacity={hover === null || hover === arc.index ? 1 : 0.45}
              onMouseEnter={() => setHover(arc.index)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
          {total > 0 && (
            <text x={cx} y={cy - 2} textAnchor="middle" fontSize={13} fontWeight={600} fill="hsl(var(--foreground))">{format(total)}</text>
          )}
          <text x={cx} y={cy + 13} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">total</text>
        </svg>
      </ChartShell>
      {legend && (
        <ul className="mt-3 space-y-1.5">
          {slices.map((slice, index) => (
            <li key={slice.label} className="flex items-center justify-between gap-3 text-xs" onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)}>
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                <span className="truncate">{slice.label}</span>
              </span>
              <span className="mono shrink-0 font-semibold">{format(slice.value)}</span>
              <span className="mono w-11 shrink-0 text-right text-[10px] text-muted-foreground">{total > 0 ? `${Math.round((slice.value / total) * 100)}%` : '—'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The chart panel: title, subtitle, then either the chart or an honest empty
 * state. Reports use this instead of hand-rolling the panel so every chart on a
 * page looks the same and stacks the same way on a phone.
 */
export function ChartCard({
  title, subtitle, action, children, empty, emptyTitle = 'No data available for this period.', emptyDetail, className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  empty?: boolean;
  emptyTitle?: string;
  emptyDetail?: string;
  className?: string;
}) {
  return (
    <section className={cn('overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">
        {empty ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center">
            <p className="text-sm font-semibold">{emptyTitle}</p>
            {emptyDetail && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{emptyDetail}</p>}
          </div>
        ) : children}
      </div>
    </section>
  );
}