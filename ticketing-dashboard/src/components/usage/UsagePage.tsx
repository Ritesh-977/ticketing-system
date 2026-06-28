import type { ReactNode } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Calendar,
  Loader2,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useApiUsage } from '../../hooks/useApiUsage';

// ─── Plan Configuration ───────────────────────────────────────────────────────
// TODO: Replace with values from your billing/subscription hook.
const PLAN = {
  name: 'Pro',
  dailyLimit: 1000,
  monthlyLimit: 20000,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseUsageDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const fmtNum = (n: number) => n.toLocaleString('en-US');

const fmtCompactDate = (s: string) =>
  parseUsageDate(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const fmtFullDate = (s: string) =>
  parseUsageDate(s).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

type Status = 'healthy' | 'warning' | 'critical';

const getStatus = (pct: number): Status => {
  if (pct >= 90) return 'critical';
  if (pct >= 75) return 'warning';
  return 'healthy';
};

const STATUS_STYLES: Record<Status, {
  bar: string;
  text: string;
  bg: string;
  border: string;
}> = {
  healthy: {
    bar: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  warning: {
    bar: 'bg-amber-500',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  critical: {
    bar: 'bg-red-500',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function UsagePage() {
  const { usage, loading, error } = useApiUsage();

  const now = new Date();
  const todayStr = toDateStr(now);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Today's usage
  const todayUsage = usage.find((u) => u.usage_date === todayStr);
  const usedToday = todayUsage?.total_requests ?? 0;

  // Monthly usage — sum of all entries in the current month.
  // NOTE: If your hook returns < 1 month of history, this will be partial.
  // Consider returning a monthly aggregate from the API for accuracy.
  const monthlyUsage = usage
    .filter((u) => {
      const d = parseUsageDate(u.usage_date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((sum, u) => sum + u.total_requests, 0);

  // 7-day total
  const total7Day = usage.reduce((sum, u) => sum + u.total_requests, 0);

  // Daily average over completed days (excludes today since it's partial)
  const completedDays = usage.filter((u) => u.usage_date !== todayStr);
  const avgDaily =
    completedDays.length > 0
      ? Math.round(
        completedDays.reduce((s, u) => s + u.total_requests, 0) / completedDays.length
      )
      : 0;

  // Peak day in the window
  const peakDay = usage.reduce<{ date: string; value: number } | null>(
    (peak, u) =>
      !peak || u.total_requests > peak.value
        ? { date: u.usage_date, value: u.total_requests }
        : peak,
    null
  );

  // Percentages
  const dailyPct = Math.min(100, (usedToday / PLAN.dailyLimit) * 100);
  const monthlyPct = Math.min(100, (monthlyUsage / PLAN.monthlyLimit) * 100);

  const dailyStatus = getStatus(dailyPct);
  const monthlyStatus = getStatus(monthlyPct);

  // Reset countdowns
  const tomorrow = new Date(currentYear, currentMonth, now.getDate() + 1);
  const hoursUntilDailyReset = Math.max(
    1,
    Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60))
  );

  const firstOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
  const daysUntilMonthlyReset = Math.max(
    1,
    Math.ceil((firstOfNextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  const maxRequests = Math.max(...usage.map((u) => u.total_requests), 1);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Usage & Billing
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Monitor your API consumption across daily and monthly cycles
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
            <Zap className="h-3 w-3 text-slate-500" />
            {PLAN.name} Plan
          </span>
          {todayUsage?.live && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          )}
        </div>
      </header>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-16 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          <span className="text-sm text-slate-500">Loading usage data…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
          <div>
            <p className="font-medium text-red-700">Unable to load usage data</p>
            <p className="mt-0.5 text-red-600">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Limit cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <LimitCard
              icon={<Activity className="h-4 w-4" />}
              label="Daily Usage"
              used={usedToday}
              limit={PLAN.dailyLimit}
              percentage={dailyPct}
              status={dailyStatus}
              resetLabel={`Resets in ${hoursUntilDailyReset}h`}
            />
            <LimitCard
              icon={<Calendar className="h-4 w-4" />}
              label="Monthly Usage"
              used={monthlyUsage}
              limit={PLAN.monthlyLimit}
              percentage={monthlyPct}
              status={monthlyStatus}
              resetLabel={`Resets in ${daysUntilMonthlyReset} day${daysUntilMonthlyReset === 1 ? '' : 's'
                }`}
            />
          </div>

          {/* Quick stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Today" value={usedToday} sublabel="requests" />
            <StatCard label="This month" value={monthlyUsage} sublabel="requests" />
            <StatCard label="7-day total" value={total7Day} sublabel="requests" />
            <StatCard label="Daily average" value={avgDaily} sublabel="requests / day" />
          </div>

          {/* History */}
          {usage.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex flex-col gap-2 px-6 py-4 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Daily history
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    API consumption over the last {usage.length} day
                    {usage.length === 1 ? '' : 's'}
                  </p>
                </div>
                {peakDay && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Peak:</span>
                    <span className="font-medium text-slate-700 tabular-nums">
                      {fmtNum(peakDay.value)}
                    </span>
                    <span className="text-slate-400">
                      on {fmtCompactDate(peakDay.date)}
                    </span>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-left">
                      <th className="px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                        Date
                      </th>
                      <th className="px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                        Distribution
                      </th>
                      <th className="px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-slate-500 text-right">
                        Requests
                      </th>
                      <th className="px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-slate-500 text-right">
                        % of peak
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...usage].reverse().map((row) => {
                      const rowPct = Math.round(
                        (row.total_requests / maxRequests) * 100
                      );
                      const isToday = row.usage_date === todayStr;
                      return (
                        <tr
                          key={row.usage_date}
                          className="border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50/60"
                        >
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700">
                                {fmtFullDate(row.usage_date)}
                              </span>
                              {isToday && (
                                <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                                  Today
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3.5 w-[40%]">
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${isToday ? 'bg-emerald-500' : 'bg-slate-400'
                                  }`}
                                style={{ width: `${rowPct}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-right tabular-nums font-medium text-slate-900">
                            {fmtNum(row.total_requests)}
                          </td>
                          <td className="px-6 py-3.5 text-right tabular-nums text-slate-500">
                            {rowPct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function LimitCard({
  icon,
  label,
  used,
  limit,
  percentage,
  status,
  resetLabel,
}: {
  icon: ReactNode;
  label: string;
  used: number;
  limit: number;
  percentage: number;
  status: Status;
  resetLabel: string;
}) {
  const s = STATUS_STYLES[status];
  const remaining = Math.max(0, limit - used);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-slate-600">
          <span className="text-slate-400">{icon}</span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums ${s.bg} ${s.text} ${s.border}`}
        >
          {Math.round(percentage)}%
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {fmtNum(used)}
        </span>
        <span className="text-sm text-slate-400 tabular-nums">
          / {fmtNum(limit)}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${s.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-slate-500 tabular-nums">
          {fmtNum(remaining)} remaining
        </span>
        <span className="text-slate-400">{resetLabel}</span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: number;
  sublabel: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {fmtNum(value)}
      </p>
      <p className="mt-0.5 text-xs text-slate-400">{sublabel}</p>
    </div>
  );
}