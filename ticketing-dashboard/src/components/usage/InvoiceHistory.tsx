import { FileText, Download } from 'lucide-react';

// ─── Mock Invoice Data ────────────────────────────────────────────────────────

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: 'paid' | 'pending' | 'failed';
  plan: string;
}

function getRecentInvoices(): Invoice[] {
  const now = new Date();
  return [
    {
      id: 'INV-2026-05',
      date: new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      amount: '$49.00',
      status: 'paid',
      plan: 'Growth Plan',
    },
    {
      id: 'INV-2026-04',
      date: new Date(now.getFullYear(), now.getMonth() - 2, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      amount: '$49.00',
      status: 'paid',
      plan: 'Growth Plan',
    },
    {
      id: 'INV-2026-03',
      date: new Date(now.getFullYear(), now.getMonth() - 3, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      amount: '$49.00',
      status: 'paid',
      plan: 'Growth Plan',
    },
    {
      id: 'INV-2026-02',
      date: new Date(now.getFullYear(), now.getMonth() - 4, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      amount: '$29.00',
      status: 'paid',
      plan: 'Starter Plan',
    },
  ];
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Invoice['status'] }) {
  const styles = {
    paid: 'bg-emerald-50 text-emerald-600',
    pending: 'bg-amber-50 text-amber-600',
    failed: 'bg-red-50 text-red-500',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

// ─── Invoice History Table ────────────────────────────────────────────────────

export function InvoiceHistory() {
  const invoices = getRecentInvoices();

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <FileText className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Invoice History</p>
            <p className="text-xs text-slate-400">Download past invoices and receipts</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left">
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
              Invoice
            </th>
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
              Period
            </th>
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
              Plan
            </th>
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 text-right">
              Amount
            </th>
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 text-center">
              Status
            </th>
            <th className="px-6 py-3" />
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              className="border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50/60"
            >
              <td className="px-6 py-3.5">
                <span className="font-medium text-slate-900">{inv.id}</span>
              </td>
              <td className="px-6 py-3.5 text-slate-600">{inv.date}</td>
              <td className="px-6 py-3.5 text-slate-600">{inv.plan}</td>
              <td className="px-6 py-3.5 text-right font-medium text-slate-900">
                {inv.amount}
              </td>
              <td className="px-6 py-3.5 text-center">
                <StatusBadge status={inv.status} />
              </td>
              <td className="px-6 py-3.5 text-right">
                <button
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  title="Download invoice"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
