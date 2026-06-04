import { useDashboard } from '../../context/DashboardContext.js';
import type { ActivePage } from '../../types/index.js';

// ─── Page Titles ──────────────────────────────────────────────────────────────

const pageTitles: Record<ActivePage, { title: string; subtitle: string }> = {
  overview:  { title: 'Overview',         subtitle: 'Your developer dashboard at a glance' },
  'api-keys': { title: 'API Keys',       subtitle: 'Manage authentication keys for your applications' },
  webhooks:  { title: 'Webhooks',         subtitle: 'Configure real-time event notifications' },
  usage:     { title: 'Usage & Billing',  subtitle: 'Monitor API consumption and plan limits' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Header() {
  const { activePage, environment, toggleEnvironment } = useDashboard();
  const page = pageTitles[activePage];

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
      <div className="flex items-center justify-between px-8 py-5">
        {/* ── Title ─────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {page.title}
          </h1>
          <p className="text-sm text-slate-400">{page.subtitle}</p>
        </div>

        {/* ── Environment Toggle ────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-medium transition-colors ${
              environment === 'test' ? 'text-amber-600' : 'text-slate-400'
            }`}
          >
            Test
          </span>

          <button
            onClick={toggleEnvironment}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              environment === 'live'
                ? 'bg-emerald-500 focus:ring-emerald-500'
                : 'bg-amber-500 focus:ring-amber-500'
            }`}
            role="switch"
            aria-checked={environment === 'live'}
            aria-label="Toggle environment"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
                environment === 'live' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>

          <span
            className={`text-xs font-medium transition-colors ${
              environment === 'live' ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            Live
          </span>
        </div>
      </div>
    </header>
  );
}
