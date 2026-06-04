import type React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext.js';
import type { ToastVariant } from '../../types/index.js';

// ─── Style Map ────────────────────────────────────────────────────────────────

const variantStyles: Record<ToastVariant, { container: string; icon: React.ReactNode; bar: string }> = {
  success: {
    container: 'border-emerald-200 bg-emerald-50',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    bar: 'bg-emerald-500',
  },
  error: {
    container: 'border-rose-200 bg-rose-50',
    icon: <XCircle className="h-5 w-5 text-rose-500" />,
    bar: 'bg-rose-500',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50',
    icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    bar: 'bg-amber-500',
  },
  info: {
    container: 'border-sky-200 bg-sky-50',
    icon: <Info className="h-5 w-5 text-sky-500" />,
    bar: 'bg-sky-500',
  },
};

// ─── Toast Container ──────────────────────────────────────────────────────────

export function ToastContainer() {
  const { toasts, dismissToast } = useDashboard();

  if (toasts.length === 0) return <></>;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-96">
      {toasts.map((toast) => {
        const style = variantStyles[toast.variant];
        return (
          <div
            key={toast.id}
            className={`relative overflow-hidden rounded-xl border shadow-lg animate-toast-slide-in ${style.container}`}
          >
            <div className="flex items-start gap-3 p-4">
              <div className="shrink-0 mt-0.5">{style.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
                {toast.message && (
                  <p className="mt-0.5 text-sm text-slate-600">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-white/60 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Auto-dismiss progress bar */}
            <div
              className={`absolute bottom-0 left-0 h-0.5 ${style.bar}`}
              style={{
                animation: `progress-shrink ${toast.duration}ms linear forwards`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
