import { BarChart3, Zap, ArrowUpRight, Loader2 } from 'lucide-react';
import { useApiUsage } from '../../hooks/useApiUsage';
import { MetricsGrid } from './MetricsGrid';
import { UsageChart } from './UsageChart';
import { InvoiceHistory } from './InvoiceHistory';

// ─── Component ────────────────────────────────────────────────────────────────

export function UsagePage() {
  const { usage, chartData, totalRequests, loading, error } = useApiUsage();

  // Derive today's date string (YYYY-MM-DD) to match the API response
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Find today's usage from the API response
  const todayUsage = usage.find((u) => u.usage_date === todayStr);
  const used = todayUsage?.total_requests ?? 0;
  const limit = 50_000; // plan limit — would come from a billing/plan endpoint
  const pct = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;

  // Format a usage_date string like "2026-06-03" into "June 3, 2026"
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Current period display
  const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const periodEnd = now;

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Usage & Billing
            </h2>
            <p className="text-sm text-slate-400">
              Monitor API consumption and manage your plan
            </p>
          </div>
        </div>
        {todayUsage?.live && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live Data
          </span>
        )}
      </div>

      {/* ── Loading / Error States ─────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-500">Loading usage data…</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── Metric Cards Grid ──────────────────────────────────── */}
          <MetricsGrid totalRequests={totalRequests} />

          {/* ── Usage Progress + Chart ─────────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Progress Card (2/5 width) */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 lg:col-span-2">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Today's Usage
                </p>
                <p className="mt-1 text-3xl font-semibold text-slate-900">
                  {used.toLocaleString()}
                  <span className="text-lg font-normal text-slate-400">
                    {' '}/ {limit.toLocaleString()} monthly limit
                  </span>
                </p>
              </div>

              {/* Circular-style progress visualization */}
              <div className="flex items-center gap-5">
                <div className="relative h-24 w-24 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="10"
                    />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke={pct > 80 ? '#f59e0b' : '#10b981'}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${pct * 2.64} 264`}
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-slate-900">{pct}%</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-500">Today</span>
                    <span className="ml-auto font-medium text-slate-900">{used.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
                    <span className="text-slate-500">7-Day Total</span>
                    <span className="ml-auto font-medium text-slate-900">{totalRequests.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Resets on the 1st of each month. Overage billed at $0.002/req.
              </p>
            </div>

            {/* Bar Chart (3/5 width) */}
            <div className="lg:col-span-3">
              <UsageChart data={chartData} />
            </div>
          </div>

          {/* ── Usage History Table ─────────────────────────────────── */}
          {usage.length > 1 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Daily Usage History (Last 7 Days)</p>
                <p className="mt-0.5 text-xs text-slate-400">API consumption by day</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">Date</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">Usage</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 text-right">Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {[...usage].reverse().map((row) => {
                    const rowPct = Math.min(Math.round((row.total_requests / limit) * 100), 100);
                    return (
                      <tr
                        key={row.usage_date}
                        className="border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50/60"
                      >
                        <td className="px-6 py-3.5 text-slate-700">
                          {formatDate(row.usage_date)}
                          {row.live && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                              Today
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 w-48">
                          <div className="flex items-center gap-2.5">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${rowPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400 w-8 text-right">{rowPct}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-right font-medium text-slate-900">
                          {row.total_requests.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Plan Card ──────────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                  <Zap className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    Growth Plan
                  </p>
                  <p className="text-sm text-slate-500">
                    50,000 requests/mo · Unlimited keys · Priority support
                  </p>
                </div>
              </div>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                Upgrade
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="border-t border-slate-100 px-6 py-4">
              <div className="grid grid-cols-3 gap-6 text-sm">
                <div>
                  <p className="text-slate-400">Monthly cost</p>
                  <p className="mt-0.5 font-semibold text-slate-900">$49/mo</p>
                </div>
                <div>
                  <p className="text-slate-400">Viewing window</p>
                  <p className="mt-0.5 font-semibold text-slate-900">
                    {fmtDate(periodStart)} – {fmtDate(periodEnd)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">7-Day total</p>
                  <p className="mt-0.5 font-semibold text-slate-900">
                    {totalRequests.toLocaleString()} requests
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Invoice History ─────────────────────────────────────── */}
          <InvoiceHistory />
        </>
      )}
    </div>
  );
}
