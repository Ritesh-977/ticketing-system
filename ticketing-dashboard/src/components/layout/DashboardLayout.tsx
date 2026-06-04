import { Sidebar } from './Sidebar.js';
import { Header } from './Header.js';
import { useDashboard } from '../../context/DashboardContext.js';

import { OverviewPage } from '../overview/OverviewPage.js';
import { ApiKeysPage } from '../api-keys/ApiKeysPage.js';
import { WebhooksPage } from '../webhooks/WebhooksPage.js';
import { UsagePage } from '../usage/UsagePage.js';

import type { ActivePage } from '../../types/index.js';

// ─── Page Router ──────────────────────────────────────────────────────────────

const pageComponents: Record<ActivePage, React.ComponentType> = {
  overview:   OverviewPage,
  'api-keys': ApiKeysPage,
  webhooks:   WebhooksPage,
  usage:      UsagePage,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardLayout() {
  const { activePage } = useDashboard();
  const PageComponent = pageComponents[activePage];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Fixed sidebar */}
      <Sidebar />

      {/* Main content area — offset by sidebar width */}
      <div className="pl-64">
        <Header />

        <main className="px-8 py-8">
          <div className="mx-auto max-w-5xl animate-fade-in-up">
            <PageComponent />
          </div>
        </main>
      </div>
    </div>
  );
}
