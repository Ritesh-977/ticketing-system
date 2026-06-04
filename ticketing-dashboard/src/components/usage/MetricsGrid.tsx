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
  const successRate = 99.7;
  const failedRequests = Math.round(totalRequests * (1 - successRate / 100));
  const avgLatency = 42;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard
        label="Total API Calls"
        value={totalRequests.toLocaleString()}
        trend="+12% this week"
        trendUp={true}
        icon={<Activity className="h-5 w-5 text-brand-600" />}
        iconBg="bg-brand-50"
      />
      <MetricCard
        label="Success Rate"
        value={`${successRate}%`}
        trend="+0.3% vs last mo"
        trendUp={true}
        icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        iconBg="bg-emerald-50"
      />
      <MetricCard
        label="Failed Requests"
        value={failedRequests.toLocaleString()}
        trend="-8% this week"
        trendUp={false}
        icon={<XCircle className="h-5 w-5 text-red-500" />}
        iconBg="bg-red-50"
      />
      <MetricCard
        label="Avg Latency"
        value={`${avgLatency}ms`}
        trend="-5ms vs last mo"
        trendUp={true}
        icon={<Clock className="h-5 w-5 text-amber-600" />}
        iconBg="bg-amber-50"
      />
    </div>
  );
}
