/**
 * @file useSeatingSocket.ts
 * @description Custom React hook that manages the Socket.io connection and
 * all real-time seat state for a specific event.
 *
 * Responsibilities:
 *  - Creates and cleans up the socket connection lifecycle.
 *  - Joins the event room on mount / event change.
 *  - Manages `lockedSeats` map: seatId → userId (who holds the lock).
 *  - Exposes `lockSeat` and `unlockSeat` action functions with optimistic updates.
 *  - Tracks connection status for UI feedback.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  LockSuccessPayload,
  LockFailedPayload,
  SeatLockedPayload,
  SeatUnlockedPayload,
} from '../types/socket.types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Maps seatId → userId (the user who currently holds the lock). */
export type LockedSeatsMap = Record<string, string>;

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseSeatingSocketReturn {
  /** Current locked seats map: seatId → userId */
  lockedSeats: LockedSeatsMap;
  /** WebSocket connection status */
  connectionStatus: ConnectionStatus;
  /** Optimistically lock a seat and emit to the server */
  lockSeat: (seatId: string) => void;
  /** Release a seat lock */
  unlockSeat: (seatId: string) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param eventId - The event ID to subscribe to seat updates for.
 * @param userId  - The current authenticated user's ID.
 */
export function useSeatingSocket(
  eventId: string,
  userId: string,
): UseSeatingSocketReturn {
  const [lockedSeats, setLockedSeats] = useState<LockedSeatsMap>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  /**
   * Store the socket in a ref so that stable callbacks (lockSeat, unlockSeat)
   * can always access the latest socket without being recreated on every render.
   */
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  // ── Build WebSocket URL from Vite env var ─────────────────────────────────
  // Strip the "/api" suffix — Socket.io connects to the root server, not the REST API path.
  const socketUrl = (import.meta.env.VITE_API_URL as string ?? 'http://localhost:3000')
    .replace(/\/api$/, '');

  // ── Socket lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!eventId || !userId) return;

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(socketUrl, {
      transports: ['polling', 'websocket'],
      withCredentials: true,
      // Automatically reconnect up to 5 times before giving up
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // ── Connection lifecycle events ──────────────────────────────────────────
    socket.on('connect', () => {
      setConnectionStatus('connected');
      // Join the event-specific room after connecting
      socket.emit('join_event', { eventId });
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
      setConnectionStatus('error');
    });

    // ── Seat event listeners ─────────────────────────────────────────────────

    /**
     * `lock_success` — Server confirmed OUR optimistic lock.
     * The seat was already turned yellow optimistically in `lockSeat()`.
     * We update the map to record the canonical server state.
     */
    socket.on('lock_success', ({ seatId, userId: ownerId }: LockSuccessPayload) => {
      setLockedSeats((prev) => ({ ...prev, [seatId]: ownerId }));
    });

    /**
     * `lock_failed` — Our optimistic lock was rejected (seat taken).
     * Roll back the optimistic update.
     */
    socket.on('lock_failed', ({ seatId }: LockFailedPayload) => {
      setLockedSeats((prev) => {
        const next = { ...prev };
        // Only roll back if WE were the one who optimistically set it
        if (next[seatId] === userId) {
          delete next[seatId];
        }
        return next;
      });
    });

    /**
     * `seat_locked` — Broadcast from the server: another user locked a seat.
     * Mark that seat as locked in the local map.
     */
    socket.on('seat_locked', ({ seatId, lockedBy }: SeatLockedPayload) => {
      setLockedSeats((prev) => ({ ...prev, [seatId]: lockedBy }));
    });

    /**
     * `seat_unlocked` — Broadcast from the server: a seat was released.
     * Remove it from the locked map so it turns green again.
     */
    socket.on('seat_unlocked', ({ seatId }: SeatUnlockedPayload) => {
      setLockedSeats((prev) => {
        const next = { ...prev };
        delete next[seatId];
        return next;
      });
    });

    // ── Cleanup on unmount or eventId/userId change ──────────────────────────
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setLockedSeats({});
      setConnectionStatus('disconnected');
    };
  }, [eventId, userId, socketUrl]);

  // ── Action: lock a seat ──────────────────────────────────────────────────────
  const lockSeat = useCallback(
    (seatId: string) => {
      if (!socketRef.current?.connected) return;

      // ── Optimistic update ────────────────────────────────────────────────────
      // Immediately update local state to yellow. If the server rejects it,
      // the `lock_failed` listener will roll this back.
      setLockedSeats((prev) => ({ ...prev, [seatId]: userId }));

      // Emit to server for the real Redis NX lock attempt
      socketRef.current.emit('lock_seat', { eventId, seatId, userId });
    },
    [eventId, userId],
  );

  // ── Action: unlock a seat ────────────────────────────────────────────────────
  const unlockSeat = useCallback(
    (seatId: string) => {
      if (!socketRef.current?.connected) return;

      socketRef.current.emit('unlock_seat', { eventId, seatId, userId });

      // Optimistically remove from local state for instant UI feedback
      setLockedSeats((prev) => {
        const next = { ...prev };
        delete next[seatId];
        return next;
      });
    },
    [eventId, userId],
  );

  return { lockedSeats, connectionStatus, lockSeat, unlockSeat };
}
