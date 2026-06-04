// ─── Environment ──────────────────────────────────────────────────────────────

export type Environment = 'test' | 'live';

// ─── Navigation ───────────────────────────────────────────────────────────────

export type ActivePage =
  | 'overview'
  | 'api-keys'
  | 'webhooks'
  | 'usage';

// ─── API Key ──────────────────────────────────────────────────────────────────

export type ApiKeyStatus = 'active' | 'revoked' | 'rolling';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  maskedToken: string;
  environment: Environment;
  status: ApiKeyStatus;
  createdAt: string;
  expiresAt: string | null;
  lastUsed: string | null;
}

// ─── Modals ───────────────────────────────────────────────────────────────────

export type ModalState =
  | { type: 'create-key' }
  | { type: 'roll-key'; keyId: string; keyName: string }
  | { type: 'revoke-key'; keyId: string; keyName: string }
  | { type: 'secret-reveal'; secretKey: string; publishableKey: string; keyName: string };

// ─── Toast ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration: number; // ms
}
