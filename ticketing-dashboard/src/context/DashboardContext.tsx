/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  ActivePage,
  ApiKey,
  Environment,
  ModalState,
  Toast,
  ToastVariant,
} from '../types/index.js';

// ─── Context Shape ────────────────────────────────────────────────────────────

interface DashboardState {
  environment: Environment;
  toggleEnvironment: () => void;

  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;

  apiKeys: ApiKey[];
  addKey: (key: ApiKey) => void;
  removeKey: (id: string) => void;
  updateKey: (id: string, patch: Partial<ApiKey>) => void;

  activeModal: ModalState | null;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;

  toasts: Toast[];
  pushToast: (variant: ToastVariant, title: string, message?: string, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const DashboardContext = createContext<DashboardState | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [environment, setEnvironment] = useState<Environment>(() => {
    return (localStorage.getItem('env') as Environment) || 'live';
  });
  const [activePage, _setActivePage] = useState<ActivePage>(() => {
    return (localStorage.getItem('activePage') as ActivePage) || 'overview';
  });
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [activeModal, setActiveModal] = useState<ModalState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── Environment ──────────────────────────────────────────────────────────

  const toggleEnvironment = useCallback((): void => {
    setEnvironment((prev) => {
      const nextEnv = prev === 'live' ? 'test' : 'live';
      localStorage.setItem('env', nextEnv);
      return nextEnv;
    });
  }, []);
  const setActivePage = useCallback((page: ActivePage): void => {
    _setActivePage(page);
    localStorage.setItem('activePage', page);
  }, []);
  // ── API Keys ─────────────────────────────────────────────────────────────

  const addKey = useCallback((key: ApiKey): void => {
    setApiKeys((prev) => [key, ...prev]);
  }, []);

  const removeKey = useCallback((id: string): void => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  }, []);

  const updateKey = useCallback((id: string, patch: Partial<ApiKey>): void => {
    setApiKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, ...patch } : k)),
    );
  }, []);

  // ── Modals ───────────────────────────────────────────────────────────────

  const openModal = useCallback((modal: ModalState): void => {
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback((): void => {
    setActiveModal(null);
  }, []);

  // ── Toasts ───────────────────────────────────────────────────────────────

  const pushToast = useCallback(
    (variant: ToastVariant, title: string, message?: string, duration: number = 4000): void => {
      const id = crypto.randomUUID();
      const toast: Toast = { id, variant, title, message, duration };
      setToasts((prev) => [...prev, toast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    [],
  );

  const dismissToast = useCallback((id: string): void => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Value ────────────────────────────────────────────────────────────────

  const value = useMemo<DashboardState>(
    () => ({
      environment,
      toggleEnvironment,
      activePage,
      setActivePage,
      apiKeys,
      addKey,
      removeKey,
      updateKey,
      activeModal,
      openModal,
      closeModal,
      toasts,
      pushToast,
      dismissToast,
    }),
    [
      environment,
      toggleEnvironment,
      activePage,
      setActivePage,
      apiKeys,
      addKey,
      removeKey,
      updateKey,
      activeModal,
      openModal,
      closeModal,
      toasts,
      pushToast,
      dismissToast,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboard(): DashboardState {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error('useDashboard must be used within a <DashboardProvider>');
  }
  return ctx;
}
