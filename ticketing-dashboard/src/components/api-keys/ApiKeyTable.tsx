import { useState } from 'react';
import { Copy, Check, MoreVertical, RefreshCw, Trash2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext.js';
import type { ApiKey } from '../../types/index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ApiKey['status'] }) {
  const styles = {
    active:  'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    rolling: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    revoked: 'bg-slate-100 text-slate-500 ring-slate-500/20',
  };

  const labels = { active: 'Active', rolling: 'Rolling', revoked: 'Revoked' };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

// ─── Action Menu ──────────────────────────────────────────────────────────────

function ActionMenu({ apiKey }: { apiKey: ApiKey }) {
  const { openModal } = useDashboard();
  const [open, setOpen] = useState<boolean>(false);

  if (apiKey.status === 'revoked') return <></>;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            <button
              onClick={() => {
                setOpen(false);
                openModal({ type: 'roll-key', keyId: apiKey.id, keyName: apiKey.name });
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4 text-slate-400" />
              Roll Key
            </button>
            <button
              onClick={() => {
                setOpen(false);
                openModal({ type: 'revoke-key', keyId: apiKey.id, keyName: apiKey.name });
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              Revoke Key
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Table Component ──────────────────────────────────────────────────────────

export function ApiKeyTable() {
  const { apiKeys, pushToast } = useDashboard();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    pushToast('success', 'Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/60">
            <th className="px-5 py-3 font-medium text-slate-500">Name</th>
            <th className="px-5 py-3 font-medium text-slate-500">Token</th>
            <th className="px-5 py-3 font-medium text-slate-500">Status</th>
            <th className="px-5 py-3 font-medium text-slate-500">Created</th>
            <th className="px-5 py-3 font-medium text-slate-500">Last Used</th>
            <th className="px-5 py-3 font-medium text-slate-500 w-12"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {apiKeys.map((key) => (
            <tr
              key={key.id}
              className={`transition hover:bg-slate-50/60 ${
                key.status === 'revoked' ? 'opacity-50' : ''
              }`}
            >
              {/* Name */}
              <td className="px-5 py-4">
                <p className="font-medium text-slate-900">{key.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {key.environment === 'live' ? 'Live' : 'Test'}
                  {key.expiresAt && (
                    <span className="ml-1.5 text-amber-600">
                      · Expires {formatDate(key.expiresAt)}
                    </span>
                  )}
                </p>
              </td>

              {/* Masked Token + Copy */}
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs text-slate-500">
                    {key.maskedToken}
                  </code>
                  <button
                    onClick={() => handleCopy(key.maskedToken, key.id)}
                    className={`rounded-md p-1 transition ${
                      copiedId === key.id
                        ? 'text-emerald-500'
                        : 'text-slate-300 hover:text-slate-500'
                    }`}
                    title="Copy token"
                  >
                    {copiedId === key.id ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </td>

              {/* Status */}
              <td className="px-5 py-4">
                <StatusBadge status={key.status} />
              </td>

              {/* Created */}
              <td className="px-5 py-4 text-slate-500">
                {formatDate(key.createdAt)}
              </td>

              {/* Last Used */}
              <td className="px-5 py-4 text-slate-500">
                {relativeTime(key.lastUsed)}
              </td>

              {/* Actions */}
              <td className="px-5 py-4">
                <ActionMenu apiKey={key} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
