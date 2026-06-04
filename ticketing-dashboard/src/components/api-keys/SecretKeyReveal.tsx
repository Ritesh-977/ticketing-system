import { useState } from 'react';
import { ShieldAlert, Copy, Check } from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SecretKeyRevealProps {
  secretKey: string;
  publishableKey: string;
  keyName: string;
  onDone: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SecretKeyReveal({
  secretKey,
  publishableKey,
  keyName,
  onDone,
}: SecretKeyRevealProps) {
  const [copied, setCopied] = useState<'sk' | 'pk' | null>(null);
  const [confirmed, setConfirmed] = useState<boolean>(false);

  const handleCopy = async (text: string, field: 'sk' | 'pk'): Promise<void> => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* ── Danger Banner ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100/60 p-5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          <h3 className="text-base font-semibold text-amber-900">
            Save your Secret Key for "{keyName}"
          </h3>
        </div>

        <p className="mt-1.5 text-sm leading-relaxed text-amber-700">
          This is the <strong className="font-semibold">only time</strong> your
          secret key will be displayed. Copy it now and store it in a secure
          location like a password manager or environment variable.
        </p>

        {/* Secret key */}
        <label className="mt-4 mb-1.5 block text-xs font-medium text-amber-800">
          Secret Key
        </label>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={secretKey}
            className="flex-1 rounded-lg border border-amber-300 bg-white/80 px-3.5 py-2.5 font-mono text-sm text-slate-800 shadow-inner outline-none"
          />
          <button
            onClick={() => handleCopy(secretKey, 'sk')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 ${
              copied === 'sk'
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-600 text-white hover:bg-amber-700 active:scale-[0.97]'
            }`}
          >
            {copied === 'sk' ? (
              <><Check className="h-4 w-4" /> Copied!</>
            ) : (
              <><Copy className="h-4 w-4" /> Copy</>
            )}
          </button>
        </div>

        {/* Publishable key */}
        <label className="mt-4 mb-1.5 block text-xs font-medium text-amber-800">
          Publishable Key
        </label>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={publishableKey}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-sm text-slate-600 outline-none"
          />
          <button
            onClick={() => handleCopy(publishableKey, 'pk')}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              copied === 'pk'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:scale-[0.97]'
            }`}
          >
            {copied === 'pk' ? (
              <><Check className="h-4 w-4" /> Copied!</>
            ) : (
              <><Copy className="h-4 w-4" /> Copy</>
            )}
          </button>
        </div>
      </div>

      {/* ── Confirmation Checkbox ─────────────────────────────────────── */}
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-slate-600">
          I have securely stored this secret key and understand it will not be
          shown again.
        </span>
      </label>

      {/* ── Done Button ───────────────────────────────────────────────── */}
      <button
        onClick={onDone}
        disabled={!confirmed}
        className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Done
      </button>
    </div>
  );
}
