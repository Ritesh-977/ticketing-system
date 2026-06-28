import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ChartDataPoint } from '../../hooks/useApiUsage';

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 shadow-lg shadow-slate-200/60">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">
        {payload[0].value?.toLocaleString()} <span className="font-normal text-slate-400">requests</span>
      </p>
    </div>
  );
}

// ─── Chart Component ──────────────────────────────────────────────────────────

interface UsageChartProps {
  data: ChartDataPoint[];
}

export function UsageChart({ data }: UsageChartProps) {
  const chartData = data;
  const hasData = chartData.length > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Last 7 Days API Traffic</p>
          <p className="mt-0.5 text-xs text-slate-400">Daily requests by date</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
          {chartData.length} {chartData.length === 1 ? 'day' : 'days'}
        </span>
      </div>

      <div className="h-56 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="25%">
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                width={40}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                }
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              />
              <Bar
                dataKey="requests"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No usage data recorded yet. Make some API calls to see traffic here.
          </div>
        )}
      </div>
    </div>
  );
}
