import React, { useState, useEffect } from 'react';
import { Activity, ChevronDown, ChevronRight, Clock, RefreshCw, XCircle, CheckCircle2 } from 'lucide-react';
import api from '../../lib/axios.js';

interface WebhookDelivery {
  id: string;
  endpoint_url: string;
  payload: unknown;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  attempts: number;
  next_retry_at: string | null;
  created_at: string;
}

export function WebhookLogs() {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<{ deliveries: WebhookDelivery[] }>('/webhooks/deliveries');
      setDeliveries(data.deliveries || []);
    } catch (error) {
      console.error('Failed to fetch webhook deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDeliveries();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex animate-pulse space-x-4 border border-slate-100 rounded-xl p-6 bg-white mt-8">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 bg-slate-100 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-100 rounded"></div>
            <div className="h-4 bg-slate-100 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div className="mt-8 border border-slate-100 rounded-xl bg-white p-8 text-center animate-fade-in-up">
        <Activity className="mx-auto h-8 w-8 text-slate-300 mb-3" />
        <h3 className="text-sm font-medium text-slate-900">No deliveries yet</h3>
        <p className="mt-1 text-sm text-slate-500">Events triggered by your application will appear here.</p>
      </div>
    );
  }

  return (
    <div className="mt-10 animate-fade-in-up">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Activity className="h-5 w-5 text-slate-500" />
          Delivery Logs
        </h3>
        <button 
          onClick={fetchDeliveries}
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 transition cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[650px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="w-10 px-4 py-3"></th>
              <th className="px-4 py-3 font-medium text-slate-500">Date</th>
              <th className="px-4 py-3 font-medium text-slate-500">Endpoint</th>
              <th className="px-4 py-3 font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 font-medium text-slate-500">Attempts</th>
              <th className="px-4 py-3 font-medium text-slate-500">Next Retry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {deliveries.map((delivery) => {
              const isExpanded = expandedId === delivery.id;
              
              let StatusIcon = Clock;
              let statusClasses = 'bg-yellow-50 text-yellow-700 border-yellow-200';
              
              if (delivery.status === 'SUCCESS') {
                StatusIcon = CheckCircle2;
                statusClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              } else if (delivery.status === 'FAILED') {
                StatusIcon = XCircle;
                statusClasses = 'bg-red-50 text-red-700 border-red-200';
              }

              return (
                <React.Fragment key={delivery.id}>
                  <tr 
                    onClick={() => setExpandedId(isExpanded ? null : delivery.id)}
                    className="group cursor-pointer transition hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3 text-slate-400">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDate(delivery.created_at)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 truncate max-w-[200px]" title={delivery.endpoint_url}>
                      {delivery.endpoint_url}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClasses}`}>
                        <StatusIcon className="h-3 w-3" />
                        {delivery.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {delivery.attempts}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {delivery.status === 'PENDING' && delivery.next_retry_at ? formatDate(delivery.next_retry_at) : '-'}
                    </td>
                  </tr>
                  
                  {isExpanded && (
                    <tr className="bg-slate-50 border-t border-slate-100">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="rounded-lg bg-slate-900 p-4 shadow-inner overflow-x-auto">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payload</span>
                          </div>
                          <pre className="text-xs font-mono text-emerald-400">
                            {JSON.stringify(delivery.payload, null, 2)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
