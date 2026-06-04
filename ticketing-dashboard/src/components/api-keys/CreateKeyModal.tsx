import { useState } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext.js';
import { SecretKeyReveal } from './SecretKeyReveal.js';
import type { ApiKey } from '../../types/index.js';

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateKeyModal() {
  const { closeModal, addKey, environment, pushToast } = useDashboard();

  const [keyName, setKeyName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [revealData, setRevealData] = useState<{
    secretKey: string;
    publishableKey: string;
  } | null>(null);

  // ── Generate Handler ─────────────────────────────────────────────────────

  const handleGenerate = async (): Promise<void> => {
    if (!keyName.trim()) return;
    setLoading(true);

    try {
      const response = await fetch('https://ticketing-system-0s90.onrender.com/api/tenants/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: keyName.trim() }),
      });

      if (response.status === 429) {
        pushToast('warning', 'Rate limited', 'Too many requests. Please wait before generating more keys.');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Server error (${response.status})`);
      }

      const data = await response.json();

      // Build the key object for the table
      const newKey: ApiKey = {
        id: data.api_key?.id ?? crypto.randomUUID(),
        name: keyName.trim(),
        prefix: environment === 'live' ? 'pk_live_' : 'pk_test_',
        maskedToken: (data.api_key?.publishable_key ?? `pk_${environment}_`).slice(0, 12) + '••••••••••••',
        environment,
        status: 'active',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        lastUsed: null,
      };

      addKey(newKey);

      setRevealData({
        secretKey: data.api_key?.secret_key ?? data.secret_key ?? 'sk_live_demo_key',
        publishableKey: data.api_key?.publishable_key ?? data.publishable_key ?? newKey.maskedToken,
      });

      pushToast('success', 'API key created', `"${keyName.trim()}" is now active.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      pushToast('error', 'Failed to create key', message);
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 animate-overlay-in"
        onClick={revealData ? undefined : closeModal}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-modal-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {revealData ? 'Your API Keys' : 'Create API Key'}
          </h2>
          {!revealData && (
            <button
              onClick={closeModal}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {revealData ? (
            <SecretKeyReveal
              secretKey={revealData.secretKey}
              publishableKey={revealData.publishableKey}
              keyName={keyName}
              onDone={closeModal}
            />
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Key Name
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder='e.g., "Production Vercel App"'
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && keyName.trim()) handleGenerate();
                  }}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Give this key a descriptive name to identify it later.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <span
                  className={`h-2 w-2 rounded-full ${
                    environment === 'live' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                This key will be created in{' '}
                <strong className="font-medium text-slate-700">
                  {environment === 'live' ? 'Live' : 'Test'}
                </strong>{' '}
                mode.
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || !keyName.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/30 focus:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Generate API Key</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
