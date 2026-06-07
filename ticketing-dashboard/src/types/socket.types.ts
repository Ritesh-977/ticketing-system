/**
 * @file socket.types.ts
 * @description Frontend mirror of the backend Socket.io event type definitions.
 * Keep this in sync with ticketing-engine/src/types/socket.types.ts.
 *
 * In a monorepo with a shared package, you would import from a shared `@tes/types`
 * package instead of duplicating. This file is the pragmatic interim approach.
 */

// ─── Client → Server ──────────────────────────────────────────────────────────

export interface JoinEventPayload {
  eventId: string;
}

export interface LockSeatPayload {
  eventId: string;
  seatId: string;
  userId: string;
}

export interface UnlockSeatPayload {
  eventId: string;
  seatId: string;
  userId: string;
}

// ─── Server → Client ──────────────────────────────────────────────────────────

export interface LockSuccessPayload {
  seatId: string;
  userId: string;
  expiresAt: number;
}

export interface SeatLockedPayload {
  seatId: string;
  lockedBy: string;
  expiresAt: number;
}

export interface LockFailedPayload {
  seatId: string;
  reason: 'already_locked' | 'redis_error' | 'validation_error';
  message: string;
}

export interface SeatUnlockedPayload {
  seatId: string;
}

// ─── Typed event maps for socket.io-client generics ──────────────────────────

export interface ClientToServerEvents {
  join_event: (payload: JoinEventPayload) => void;
  lock_seat: (payload: LockSeatPayload) => void;
  unlock_seat: (payload: UnlockSeatPayload) => void;
}

export interface ServerToClientEvents {
  lock_success: (payload: LockSuccessPayload) => void;
  lock_failed: (payload: LockFailedPayload) => void;
  seat_locked: (payload: SeatLockedPayload) => void;
  seat_unlocked: (payload: SeatUnlockedPayload) => void;
}
