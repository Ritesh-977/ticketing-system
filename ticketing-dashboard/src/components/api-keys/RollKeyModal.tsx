import { X, AlertTriangle } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext.js';

// ─── Props ────────────────────────────────────────────────────────────────────

interface RollKeyModalProps {
  keyId: string;
  keyName: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RollKeyModal({ keyId, keyName }: RollKeyModalProps) {
  const { closeModal, updateKey, pushToast } = useDashboard();

  const handleRoll = (): void => {
    // Mark the old key as "rolling" — in production this would call the backend
    updateKey(keyId, { status: 'rolling', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() });
    pushToast('warning', 'Key is rolling', `"${keyName}" will expire in 24 hours. Generate a replacement key.`);
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-overlay-in" onClick={closeModal} />

      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl animate-modal-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Roll API Key</h2>
          <button
            onClick={closeModal}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                This will schedule key expiry
              </p>
              <p className="mt-1 text-sm text-amber-700">
                The current key <strong className="font-semibold">"{keyName}"</strong> will
                remain active for <strong className="font-semibold">24 hours</strong> to
                ensure zero downtime. After that, it will be automatically revoked.
              </p>
              <p className="mt-2 text-sm text-amber-700">
                Generate a new key and update your applications within this window.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={closeModal}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRoll}
              className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 active:scale-[0.97]"
            >
              Roll Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
