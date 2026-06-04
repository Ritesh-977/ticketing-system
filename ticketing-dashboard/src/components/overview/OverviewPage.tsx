import {
  KeyRound,
  Webhook,
  BarChart3,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext.js';
import { useApiUsage } from '../../hooks/useApiUsage.js';

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function StatCard({ label, value, change, icon: Icon, color }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      {change && (
        <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
          <TrendingUp className="h-3 w-3" />
          {change}
        </div>
      )}
    </div>
  );
}

// ─── Quick Action ─────────────────────────────────────────────────────────────

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

function QuickAction({ title, description, icon: Icon, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 transition group-hover:bg-brand-50">
        <Icon className="h-5 w-5 text-slate-500 transition group-hover:text-brand-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OverviewPage() {
  const { apiKeys, setActivePage } = useDashboard();
  const { totalRequests } = useApiUsage();

  const activeKeys = apiKeys.filter((k) => k.status === 'active').length;

  return (
    <div className="space-y-8">
      {/* ── Stats Grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-5">
        <StatCard
          label="Active API Keys"
          value={String(activeKeys)}
          icon={KeyRound}
          color="bg-brand-50 text-brand-600"
        />
        <StatCard
          label="API Calls (all time)"
          value={totalRequests.toLocaleString()}
          icon={BarChart3}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Active Webhooks"
          value="3"
          icon={Webhook}
          color="bg-sky-50 text-sky-600"
        />
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <QuickAction
            title="Create API Key"
            description="Generate a new key pair for your application"
            icon={KeyRound}
            onClick={() => setActivePage('api-keys')}
          />
          <QuickAction
            title="Add Webhook"
            description="Configure real-time event notifications"
            icon={Webhook}
            onClick={() => setActivePage('webhooks')}
          />
          <QuickAction
            title="View Usage"
            description="Monitor your API consumption and limits"
            icon={BarChart3}
            onClick={() => setActivePage('usage')}
          />
          <QuickAction
            title="Security Audit"
            description="Review key usage and access patterns"
            icon={ShieldCheck}
            onClick={() => setActivePage('api-keys')}
          />
        </div>
      </div>
    </div>
  );
}
