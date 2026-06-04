import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext.js';

// ─── Props ────────────────────────────────────────────────────────────────────

interface RevokeKeyModalProps {
  keyId: string;
  keyName: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RevokeKeyModal({ keyId, keyName }: RevokeKeyModalProps) {
  const { closeModal, removeKey, pushToast } = useDashboard();
  const [confirmText, setConfirmText] = useState<string>('');

  const isConfirmed = confirmText === 'REVOKE';

  const handleRevoke = (): void => {
    if (!isConfirmed) return;
    removeKey(keyId);
    pushToast('success', 'Key revoked', `"${keyName}" has been permanently revoked.`);
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-overlay-in" onClick={closeModal} />

      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl animate-modal-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-rose-700">Revoke API Key</h2>
          <button
            onClick={closeModal}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
            <div>
              <p className="text-sm font-medium text-rose-900">
                This action is irreversible
              </p>
              <p className="mt-1 text-sm text-rose-700">
                Revoking <strong className="font-semibold">"{keyName}"</strong> will
                immediately invalidate it. Any application using this key will lose
                access instantly.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Type <span className="font-mono font-bold text-rose-600">REVOKE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="REVOKE"
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isConfirmed) handleRevoke();
              }}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={closeModal}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRevoke}
              disabled={!isConfirmed}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              Revoke Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
