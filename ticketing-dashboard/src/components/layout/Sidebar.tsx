import {
  LayoutDashboard,
  KeyRound,
  Webhook,
  BarChart3,
  Users,
  Zap,
  LogOut,
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext.js';
import { useAuth } from '../../context/AuthContext.js';
import type { ActivePage } from '../../types/index.js';

// ─── Nav Items ────────────────────────────────────────────────────────────────

interface NavItem {
  id: ActivePage;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'overview',  label: 'Overview',         icon: LayoutDashboard },
  { id: 'api-keys',  label: 'API Keys',         icon: KeyRound },
  { id: 'webhooks',  label: 'Webhooks',          icon: Webhook },
  { id: 'usage',     label: 'Usage & Billing',   icon: BarChart3 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { activePage, setActivePage, environment, toggleEnvironment } = useDashboard();
  const { logout, tenant } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white">
      {/* ── Brand ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 leading-tight">
            Ticketing Engine
          </p>
          <p className="text-xs text-slate-400">Developer Portal</p>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] ${
                  isActive ? 'text-brand-600' : 'text-slate-400'
                }`}
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* ── Environment Toggle ─────────────────────────────────────────── */}
      <div className="border-t border-slate-100 px-4 py-4 space-y-3">
        <button
          onClick={toggleEnvironment}
          className={`group flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
            environment === 'live'
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full transition-colors ${
                environment === 'live' ? 'bg-emerald-500' : 'bg-orange-500'
              }`}
            />
            {environment === 'live' ? 'Live Mode' : 'Test Data'}
          </div>
          
          <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            environment === 'live' ? 'bg-emerald-500 focus:ring-emerald-500' : 'bg-orange-500 focus:ring-orange-500'
          }`}>
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                environment === 'live' ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </div>
        </button>
        
        <div className="flex items-center justify-between px-1">
          <div className="flex flex-col truncate">
            <span className="text-xs font-semibold text-slate-700 truncate">{tenant?.name}</span>
            <span className="text-[10px] text-slate-400">Admin</span>
          </div>
          <button 
            onClick={logout}
            className="cursor-pointer p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
