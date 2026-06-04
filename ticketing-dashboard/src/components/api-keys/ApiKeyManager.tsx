import { useState, useEffect } from 'react';
import { KeyRound, Plus, ShieldCheck, Copy, Check, MoreVertical, RefreshCw, Trash2, ShieldAlert, Loader2, X, AlertOctagon } from 'lucide-react';
import api from '../../lib/axios.js';
import { useDashboard } from '../../context/DashboardContext.js';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  name: string;
  publishableKey: string;
  is_live: boolean;
  createdAt: string;
  lastUsed: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ApiKeyManager() {
  const { environment } = useDashboard();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // New key form state
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [hasSavedSecret, setHasSavedSecret] = useState(false);
  
  // Revoke modal state
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revokeKey, setRevokeKey] = useState<ApiKey | null>(null);
  const [revokeInput, setRevokeInput] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  
  // Action states
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const response = await api.get('/tenants/keys');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedKeys = response.data.keys.map((k: any) => ({
          id: k.id,
          name: k.name || 'API Key',
          publishableKey: k.publishable_key,
          is_live: k.is_live,
          createdAt: new Date(k.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          lastUsed: k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('en-US') : null,
        }));
        setKeys(formattedKeys);
      } catch (err) {
        console.error('Failed to fetch keys:', err);
      }
    };
    fetchKeys();
  }, []);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleCopy = async (text: string, fieldId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) return;
    
    setIsGenerating(true);
    
    try {
      const response = await api.post('/tenants/keys', { name: newKeyName.trim() });
      const newBackendKey = response.data.api_key;
      
      const newKey: ApiKey = {
        id: newBackendKey.id,
        name: newBackendKey.name,
        publishableKey: newBackendKey.publishable_key,
        is_live: newBackendKey.is_live,
        createdAt: new Date(newBackendKey.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        lastUsed: null,
      };
      
      setGeneratedSecret(newBackendKey.secret_key);
      setKeys([newKey, ...keys]);
      setModalStep(2); // Move to danger zone reveal
    } catch (err) {
      console.error('Error generating key:', err);
      alert('Failed to generate API key');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setTimeout(() => {
      setModalStep(1);
      setNewKeyName('');
      setGeneratedSecret(null);
      setHasSavedSecret(false);
    }, 200);
  };

  const handleOpenRevokeModal = (key: ApiKey) => {
    setActiveDropdownId(null);
    setRevokeKey(key);
    setIsRevokeModalOpen(true);
    setRevokeInput('');
  };

  const handleRevokeConfirm = async () => {
    if (!revokeKey || revokeInput !== 'REVOKE') return;
    
    setIsRevoking(true);
    
    try {
      await api.delete(`/tenants/keys/${revokeKey.id}`);
      setKeys(keys.filter(k => k.id !== revokeKey.id));
      setIsRevokeModalOpen(false);
      setRevokeKey(null);
      alert('API key successfully revoked');
    } catch (err) {
      console.error('Error revoking key:', err);
      alert('Failed to revoke API key');
    } finally {
      setIsRevoking(false);
    }
  };

  // ─── Sub-components ─────────────────────────────────────────────────────────

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white px-8 py-16 text-center animate-fade-in-up">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
        <ShieldCheck className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-slate-900">No API keys yet</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Create your first API key pair to authenticate your applications with our platform.
      </p>
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
      >
        <Plus className="h-4 w-4" />
        Create API key
      </button>
    </div>
  );

  const renderKeyTable = ({ keys, title, isTest = false }: { keys: ApiKey[], title: string, isTest?: boolean }) => {
    if (keys.length === 0) return null;

    const bgHeader = isTest ? 'bg-orange-50/60' : 'bg-slate-50/60';
    const textColor = isTest ? 'text-orange-900' : 'text-slate-900';
    const borderColor = isTest ? 'border-orange-100' : 'border-slate-200';

    return (
      <div className={`overflow-hidden rounded-xl border ${borderColor} bg-white shadow-sm animate-fade-in-up mb-8`}>
        <div className={`px-5 py-4 border-b ${borderColor} ${bgHeader}`}>
          <h3 className={`font-semibold ${textColor}`}>{title}</h3>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-5 py-3 font-medium text-slate-500">NAME</th>
              <th className="px-5 py-3 font-medium text-slate-500">TOKEN</th>
              <th className="px-5 py-3 font-medium text-slate-500">CREATED</th>
              <th className="px-5 py-3 font-medium text-slate-500">LAST USED</th>
              <th className="px-5 py-3 font-medium text-slate-500 w-12">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {keys.map((key) => (
              <tr key={key.id} className="transition hover:bg-slate-50/60">
                <td className="px-5 py-4 font-medium text-slate-900">{key.name}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs text-slate-600">{key.publishableKey}</code>
                    <button
                      onClick={() => handleCopy(key.publishableKey, key.id)}
                      className="text-slate-400 hover:text-slate-600 transition"
                    >
                      {copiedField === key.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-500">{key.createdAt}</td>
                <td className="px-5 py-4 text-slate-500">{key.lastUsed || 'Never'}</td>
                <td className="px-5 py-4 relative">
                  <button
                    onClick={() => setActiveDropdownId(activeDropdownId === key.id ? null : key.id)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  
                  {activeDropdownId === key.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setActiveDropdownId(null)} />
                      <div className="absolute right-5 top-10 z-20 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-modal-slide-up">
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          <RefreshCw className="h-4 w-4 text-slate-400" />
                          Roll Key...
                        </button>
                        <button 
                          onClick={() => handleOpenRevokeModal(key)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Revoke Key...
                        </button>
                      </div>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    );
  };

  const liveKeys = keys.filter(k => k.is_live);
  const testKeys = keys.filter(k => !k.is_live);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
            <KeyRound className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">API Keys</h2>
            <p className="text-sm text-slate-500">Manage authentication keys for your applications</p>
          </div>
        </div>
        {keys.length > 0 && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Create new key
          </button>
        )}
      </div>

      {/* Content */}
      {keys.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {renderKeyTable({ keys: liveKeys, title: "Live Keys" })}
          {renderKeyTable({ keys: testKeys, title: "Test Keys", isTest: true })}
        </>
      )}

      {/* Create Key Modal Overlay */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 animate-overlay-in" onClick={modalStep === 1 ? handleCloseModal : undefined} />
          
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl animate-modal-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {modalStep === 1 ? `Create ${environment === 'live' ? 'Live' : 'Test'} API Key` : `${environment === 'live' ? 'Live' : 'Test'} API Key Generated`}
              </h2>
              {modalStep === 1 && (
                <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="px-6 py-5">
              {modalStep === 1 ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">
                    This will instantly generate a {environment === 'live' ? 'Live' : 'Test'} key for your environment.
                  </p>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Key Name</label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., Production Vercel App"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={handleCloseModal} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerateKey}
                      disabled={isGenerating || !newKeyName.trim()}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Key'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-center gap-2 text-amber-800 mb-2">
                      <ShieldAlert className="h-5 w-5" />
                      <h3 className="font-semibold text-sm">Save your Secret Key safely</h3>
                    </div>
                    <p className="text-xs text-amber-700 mb-4">
                      This is the only time your secret key will be visible. Please copy it now.
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1 block">{environment === 'live' ? 'Live' : 'Test'} Secret Key</label>
                        <div className="flex items-center gap-2">
                          <input
                            readOnly
                            value={generatedSecret!}
                            className="flex-1 rounded-md border border-amber-300 bg-white/60 px-3 py-2 font-mono text-sm text-slate-800 outline-none"
                          />
                          <button
                            onClick={() => handleCopy(generatedSecret!, 'secret')}
                            className="rounded-md bg-amber-600 px-3 py-2 text-white hover:bg-amber-700 transition"
                          >
                            {copiedField === 'secret' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasSavedSecret}
                      onChange={(e) => setHasSavedSecret(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-600">
                      I have saved this secret key securely
                    </span>
                  </label>

                  <button
                    onClick={handleCloseModal}
                    disabled={!hasSavedSecret}
                    className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revoke Key Modal */}
      {isRevokeModalOpen && revokeKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 animate-overlay-in" onClick={() => !isRevoking && setIsRevokeModalOpen(false)} />
          
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl animate-modal-slide-up overflow-hidden border-t-4 border-t-rose-600">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertOctagon className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Revoke API Key</h2>
              </div>
              <button onClick={() => !isRevoking && setIsRevokeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-600">
                You are about to revoke the {revokeKey.is_live ? 'Live' : 'Test'} key <strong className="font-semibold text-slate-900">"{revokeKey.name}"</strong>. 
                Any application using this key will immediately lose access. This action cannot be undone.
              </p>
              
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Type <span className="font-mono font-bold text-rose-600">REVOKE</span> to confirm
                </label>
                <input
                  type="text"
                  value={revokeInput}
                  onChange={(e) => setRevokeInput(e.target.value)}
                  placeholder="REVOKE"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsRevokeModalOpen(false)} 
                  disabled={isRevoking}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevokeConfirm}
                  disabled={isRevoking || revokeInput !== 'REVOKE'}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isRevoking ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <><Trash2 className="h-4 w-4" /> Revoke Key</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
