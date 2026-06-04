import { useState, useEffect, useCallback } from 'react';
import {
  Webhook,
  Plus,
  Globe,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  CheckCheck,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext.js';
import api from '../../lib/axios.js';
import { WebhookLogs } from './WebhookLogs.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookEvent {
  id: string;
  label: string;
  description: string;
}

interface WebhookRecord {
  id: string;
  tenant_id: string;
  endpoint_url: string;
  signing_secret: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const availableEvents: WebhookEvent[] = [
  { id: 'ticket.purchased',  label: 'ticket.purchased',  description: 'Fires when a ticket is successfully purchased' },
  { id: 'ticket.refunded',   label: 'ticket.refunded',   description: 'Fires when a ticket refund is processed' },
  { id: 'event.created',     label: 'event.created',     description: 'Fires when a new event is published' },
  { id: 'event.updated',     label: 'event.updated',     description: 'Fires when event details are modified' },
  { id: 'order.completed',   label: 'order.completed',   description: 'Fires when an order is finalized' },
  { id: 'order.failed',      label: 'order.failed',      description: 'Fires when an order payment fails' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Masks a signing secret like Stripe: show prefix, blur the rest */
function maskSecret(secret: string): string {
  if (secret.length <= 10) return '•'.repeat(secret.length);
  return secret.slice(0, 6) + '•'.repeat(32);
}

/** Formats an ISO date string to a human-readable format */
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-5"
        >
          <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-slate-100 to-slate-200 animate-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/5 rounded bg-gradient-to-r from-slate-100 to-slate-200 animate-shimmer" />
            <div className="h-3 w-2/5 rounded bg-gradient-to-r from-slate-100 to-slate-200 animate-shimmer" />
          </div>
          <div className="h-6 w-16 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 animate-shimmer" />
        </div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WebhooksPage() {
  const { pushToast } = useDashboard();

  // ── State ─────────────────────────────────────────────────────────────────
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [url, setUrl] = useState<string>('');
  const [urlError, setUrlError] = useState<string>('');
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Fetch Webhooks ────────────────────────────────────────────────────────
  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get<{ webhooks: WebhookRecord[] }>('/webhooks');
      setWebhooks(data?.webhooks || []);
    } catch {
      pushToast('error', 'Failed to load webhooks', 'Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWebhooks();
  }, [fetchWebhooks]);

  // ── Validate URL ──────────────────────────────────────────────────────────
  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      setUrlError('Endpoint URL is required.');
      return false;
    }
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'https:') {
        setUrlError('Only HTTPS endpoints are accepted.');
        return false;
      }
    } catch {
      setUrlError('Please enter a valid URL.');
      return false;
    }
    setUrlError('');
    return true;
  };

  // ── Toggle Event Selection ────────────────────────────────────────────────
  const toggleEvent = (id: string): void => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Create Webhook ────────────────────────────────────────────────────────
  const handleCreate = async (): Promise<void> => {
    if (!validateUrl(url) || selectedEvents.size === 0) return;

    try {
      setCreating(true);
      const { data } = await api.post<{ webhook: WebhookRecord }>('/webhooks', {
        endpoint_url: url,
        events: [...selectedEvents],
      });

      if (data?.webhook) {
        setWebhooks((prev) => [data.webhook, ...(prev || [])]);
      }
      pushToast('success', 'Webhook created', 'Your endpoint is now receiving events.');
      handleCloseModal();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Failed to create webhook.';
      pushToast('error', 'Creation failed', message);
    } finally {
      setCreating(false);
    }
  };

  // ── Close Modal ───────────────────────────────────────────────────────────
  const handleCloseModal = (): void => {
    setShowModal(false);
    setUrl('');
    setUrlError('');
    setSelectedEvents(new Set());
  };

  // ── Toggle Secret Reveal ──────────────────────────────────────────────────
  const toggleReveal = (id: string): void => {
    setRevealedSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Copy Secret ───────────────────────────────────────────────────────────
  const copySecret = async (id: string, secret: string): Promise<void> => {
    await navigator.clipboard.writeText(secret);
    setCopiedId(id);
    pushToast('success', 'Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const hasWebhooks = webhooks && webhooks.length > 0;

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100">
            <Webhook className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Webhooks</h2>
            <p className="text-sm text-slate-400">
              Receive real-time notifications when events happen
            </p>
          </div>
        </div>

        <button
          id="btn-add-webhook"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Add Endpoint
        </button>
      </div>

      {/* ── Loading State ─────────────────────────────────────────────── */}
      {loading && <TableSkeleton />}

      {/* ── Empty State ───────────────────────────────────────────────── */}
      {!loading && !hasWebhooks && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white px-8 py-16 text-center animate-fade-in-up">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50">
            <Webhook className="h-8 w-8 text-sky-600" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-slate-900">
            No webhooks configured
          </h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Webhooks let your application receive real-time HTTP POST
            notifications whenever events occur in the Ticketing Engine.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            Add your first endpoint
          </button>
        </div>
      )}

      {/* ── Data Table ────────────────────────────────────────────────── */}
      {!loading && hasWebhooks && (
        <div className="space-y-3 animate-fade-in-up">
          {webhooks?.map((wh) => {
            const isRevealed = revealedSecrets.has(wh.id);
            const isCopied = copiedId === wh.id;

            return (
              <div
                key={wh.id}
                id={`webhook-row-${wh.id}`}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-slate-300"
              >
                {/* Top Row — URL + Status */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 border border-slate-100">
                      <ExternalLink className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-medium text-slate-800">
                        {wh.endpoint_url}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Created {formatDate(wh.created_at)}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shrink-0 ${
                      wh.is_active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        wh.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {wh.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Events Row */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(wh.events as string[]).map((evt) => (
                    <span
                      key={evt}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-100 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-500"
                    >
                      <Radio className="h-2.5 w-2.5 text-slate-400" />
                      {evt}
                    </span>
                  ))}
                </div>

                {/* Signing Secret Row */}
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                  <span className="text-xs font-medium text-slate-400 shrink-0">
                    Signing Secret
                  </span>
                  <code
                    className={`flex-1 font-mono text-xs transition-all duration-200 ${
                      isRevealed
                        ? 'text-slate-700'
                        : 'text-slate-400 select-none'
                    }`}
                    style={!isRevealed ? { filter: 'blur(4px)' } : undefined}
                  >
                    {isRevealed ? wh.signing_secret : maskSecret(wh.signing_secret)}
                  </code>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      id={`btn-reveal-${wh.id}`}
                      onClick={() => toggleReveal(wh.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-md transition"
                      title={isRevealed ? 'Hide secret' : 'Reveal secret'}
                    >
                      {isRevealed ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      id={`btn-copy-${wh.id}`}
                      onClick={() => copySecret(wh.id, wh.signing_secret)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-md transition"
                      title="Copy secret"
                    >
                      {isCopied ? (
                        <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Webhook Logs ──────────────────────────────────────────────── */}
      {!loading && hasWebhooks && <WebhookLogs />}

      {/* ── Creation Modal ────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-overlay-in"
            onClick={handleCloseModal}
          />

          {/* Modal Panel */}
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl animate-modal-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100">
                  <Webhook className="h-4 w-4 text-sky-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Add Webhook Endpoint
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-5 px-6 py-5">
              {/* URL Input */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Endpoint URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="input-endpoint-url"
                    type="url"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (urlError) validateUrl(e.target.value);
                    }}
                    onBlur={() => url && validateUrl(url)}
                    placeholder="https://api.yourapp.com/webhooks"
                    className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 ${
                      urlError
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
                    }`}
                  />
                </div>
                {urlError && (
                  <p className="mt-1.5 text-xs text-red-500">{urlError}</p>
                )}
              </div>

              {/* Event Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Listen to events
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {availableEvents.map((evt) => {
                    const isSelected = selectedEvents.has(evt.id);
                    return (
                      <button
                        key={evt.id}
                        id={`event-${evt.id}`}
                        onClick={() => toggleEvent(evt.id)}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                            isSelected
                              ? 'border-brand-500 bg-brand-600'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div>
                          <p className="font-mono text-xs font-medium">{evt.label}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{evt.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedEvents.size === 0 && (
                  <p className="mt-2 text-xs text-slate-400">
                    Select at least one event to subscribe to.
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={handleCloseModal}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                id="btn-create-webhook"
                disabled={!url.trim() || selectedEvents.size === 0 || creating}
                onClick={handleCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-40"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Webhook
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
