import { ArrowUpRight, ArrowDownRight, Activity, CheckCircle2, XCircle, Clock } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: React.ReactNode;
  iconBg: string;
}

// ─── Single Metric Card ──────────────────────────────────────────────────────

function MetricCard({ label, value, trend, trendUp, icon, iconBg }: MetricCardProps) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              trendUp
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-red-50 text-red-500'
            }`}
          >
            {trendUp ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {trend}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-sm text-slate-400">{label}</p>
    </div>
  );
}

// ─── Metrics Grid ─────────────────────────────────────────────────────────────

interface MetricsGridProps {
  totalRequests: number;
}

export function MetricsGrid({ totalRequests }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Total API Calls (7 Days)"
        value={totalRequests.toLocaleString()}
        trend=""
        trendUp={true}
        icon={<Activity className="h-5 w-5 text-brand-600" />}
        iconBg="bg-brand-50"
      />
    </div>
  );
}
