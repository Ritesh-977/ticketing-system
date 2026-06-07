/**
 * @file socket.types.ts
 * @description Centralized TypeScript type definitions for all Socket.io
 * events used in the Real-Time Seat Booking feature. Import these on both
 * the backend (server) and can be shared to the frontend.
 */

// ─── Payloads sent FROM client TO server ─────────────────────────────────────

/** Payload for the `join_event` event. */
export interface JoinEventPayload {
  /** The event ID the client wants to subscribe to seat updates for. */
  eventId: string;
}

/** Payload for the `lock_seat` event. */
export interface LockSeatPayload {
  /** The event this seat belongs to. */
  eventId: string;
  /** The specific seat the user wants to lock. */
  seatId: string;
  /** The authenticated user attempting to lock the seat. */
  userId: string;
}

/** Payload for the `unlock_seat` event. */
export interface UnlockSeatPayload {
  /** The event this seat belongs to. */
  eventId: string;
  /** The specific seat the user wants to release. */
  seatId: string;
  /** The user releasing the seat (used for ownership validation). */
  userId: string;
}

// ─── Payloads sent FROM server TO client ─────────────────────────────────────

/** Emitted only to the requesting socket when a lock succeeds. */
export interface LockSuccessPayload {
  seatId: string;
  userId: string;
  /** Unix timestamp (ms) when the lock expires (TTL = 300s). */
  expiresAt: number;
}

/** Broadcast to the whole event room when any seat becomes locked. */
export interface SeatLockedPayload {
  seatId: string;
  /** The user who holds the lock — others use this to display "locked by". */
  lockedBy: string;
  expiresAt: number;
}

/** Emitted only to the requesting socket when a lock attempt fails. */
export interface LockFailedPayload {
  seatId: string;
  reason: 'already_locked' | 'redis_error' | 'validation_error';
  message: string;
}

/** Broadcast to the whole event room when a seat is released. */
export interface SeatUnlockedPayload {
  seatId: string;
}

// ─── Socket.io typed event maps ───────────────────────────────────────────────

/**
 * Events that the CLIENT emits and the SERVER listens to.
 */
export interface ClientToServerEvents {
  join_event: (payload: JoinEventPayload) => void;
  lock_seat: (payload: LockSeatPayload) => void;
  unlock_seat: (payload: UnlockSeatPayload) => void;
}

/**
 * Events that the SERVER emits and the CLIENT listens to.
 */
export interface ServerToClientEvents {
  lock_success: (payload: LockSuccessPayload) => void;
  lock_failed: (payload: LockFailedPayload) => void;
  seat_locked: (payload: SeatLockedPayload) => void;
  seat_unlocked: (payload: SeatUnlockedPayload) => void;
}

/**
 * Data attached to each Socket instance (per-connection state).
 */
export interface SocketData {
  /** The event room the socket has joined, if any. */
  currentEventId?: string;
  /** The user associated with this socket connection. */
  userId?: string;
  /** Track which seats this socket has locked (seatId[]) for cleanup on disconnect. */
  lockedSeats: string[];
}
