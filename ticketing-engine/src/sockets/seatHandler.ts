/**
 * @file seatHandler.ts
 * @description Socket.io event handler for real-time seat locking/unlocking.
 *
 * Architecture:
 *  - Each event has its own Socket.io room: `event_${eventId}`
 *  - Redis stores seat locks as keys: `seat_lock:${eventId}:${seatId}`
 *  - NX flag ensures atomic "set only if not exists" — the core of optimistic locking
 *  - EX 300 gives a 5-minute TTL so locks auto-expire if a client disconnects
 *    before explicitly unlocking (handled by the `disconnect` event as well).
 *
 * Redis Key Convention:
 *  seat_lock:<eventId>:<seatId>  →  value = userId (owner of the lock)
 */

import type { Server, Socket } from 'socket.io';
import { redis } from '../config/redis.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  JoinEventPayload,
  LockSeatPayload,
  UnlockSeatPayload,
} from '../types/socket.types.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Redis TTL for a seat lock in seconds (5 minutes). */
const LOCK_TTL_SECONDS = 300;

/** Builds the canonical Redis key for a seat lock. */
const buildLockKey = (eventId: string, seatId: string): string =>
  `seat_lock:${eventId}:${seatId}`;

// ─── Handler Registration ─────────────────────────────────────────────────────

/**
 * Registers all seat-related Socket.io event handlers on the given socket.
 * Call this inside the `io.on('connection', ...)` callback.
 *
 * @param io     - The root Socket.io Server instance (for room-wide broadcasts).
 * @param socket - The individual connected socket.
 */
export function registerSeatHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
): void {
  // Initialize per-socket state
  socket.data.lockedSeats = [];

  // ─── join_event ────────────────────────────────────────────────────────────
  /**
   * Places the socket into a specific event room so it receives broadcasts
   * scoped to that event's seat activity.
   *
   * Client emits: { eventId: string }
   */
  socket.on('join_event', async ({ eventId }: JoinEventPayload) => {
    if (!eventId || typeof eventId !== 'string') {
      console.warn(`[WS] join_event rejected — invalid eventId from socket ${socket.id}`);
      return;
    }

    // Leave any previous event room to prevent cross-event bleed
    if (socket.data.currentEventId) {
      await socket.leave(`event_${socket.data.currentEventId}`);
    }

    const room = `event_${eventId}`;
    await socket.join(room);
    socket.data.currentEventId = eventId;

    console.log(`[WS] Socket ${socket.id} joined room "${room}"`);
  });

  // ─── lock_seat ─────────────────────────────────────────────────────────────
  /**
   * Attempts to acquire a Redis lock for the given seat using NX (set-if-not-exists).
   *
   * Flow:
   *   1. Validate payload.
   *   2. redis.set(key, userId, 'EX', 300, 'NX')
   *      → Returns "OK" on success, null if key already exists.
   *   3a. Success  → emit `lock_success` to this socket,
   *                  broadcast `seat_locked` to the entire event room.
   *   3b. Fail     → emit `lock_failed` back to this socket only.
   *
   * Client emits: { eventId, seatId, userId }
   */
  socket.on('lock_seat', async ({ eventId, seatId, userId }: LockSeatPayload) => {
    // ── Input validation ──────────────────────────────────────────────────
    if (
      !eventId || typeof eventId !== 'string' ||
      !seatId  || typeof seatId  !== 'string' ||
      !userId  || typeof userId  !== 'string'
    ) {
      socket.emit('lock_failed', {
        seatId: seatId ?? 'unknown',
        reason: 'validation_error',
        message: 'Invalid payload: eventId, seatId, and userId are required strings.',
      });
      return;
    }

    const lockKey = buildLockKey(eventId, seatId);
    const expiresAt = Date.now() + LOCK_TTL_SECONDS * 1000;

    try {
      // Atomic NX (Not eXists) + EX (EXpiry) — the heart of optimistic locking.
      // Returns "OK" if the key was SET, null if it already existed.
      const result = await redis.set(lockKey, userId, 'EX', LOCK_TTL_SECONDS, 'NX');

      if (result === 'OK') {
        // ── Lock acquired ──────────────────────────────────────────────────
        // Track this seat on the socket so we can clean up on disconnect
        socket.data.lockedSeats.push(seatId);
        socket.data.userId = userId;

        // Notify the requesting client that their optimistic lock is confirmed
        socket.emit('lock_success', { seatId, userId, expiresAt });

        // Broadcast to everyone else in the room that this seat is now taken
        const room = `event_${eventId}`;
        socket.to(room).emit('seat_locked', {
          seatId,
          lockedBy: userId,
          expiresAt,
        });

        console.log(`[WS] Seat "${seatId}" locked by user "${userId}" in event "${eventId}" (TTL: ${LOCK_TTL_SECONDS}s)`);
      } else {
        // ── Seat already locked by someone else ───────────────────────────
        // Optionally, retrieve who holds the lock for a richer error message
        const currentOwner = await redis.get(lockKey);
        socket.emit('lock_failed', {
          seatId,
          reason: 'already_locked',
          message: `Seat "${seatId}" is already locked${currentOwner ? ` by user "${currentOwner}"` : ''}.`,
        });

        console.log(`[WS] lock_seat FAILED — seat "${seatId}" already locked in event "${eventId}"`);
      }
    } catch (error) {
      console.error(`[WS] Redis error during lock_seat for seat "${seatId}":`, error);
      socket.emit('lock_failed', {
        seatId,
        reason: 'redis_error',
        message: 'Internal server error: could not acquire seat lock. Please try again.',
      });
    }
  });

  // ─── unlock_seat ───────────────────────────────────────────────────────────
  /**
   * Releases a seat lock from Redis after verifying the requesting user
   * is the actual lock owner (prevents users from unlocking others' seats).
   *
   * Client emits: { eventId, seatId, userId }
   */
  socket.on('unlock_seat', async ({ eventId, seatId, userId }: UnlockSeatPayload) => {
    if (
      !eventId || typeof eventId !== 'string' ||
      !seatId  || typeof seatId  !== 'string' ||
      !userId  || typeof userId  !== 'string'
    ) {
      console.warn(`[WS] unlock_seat rejected — invalid payload from socket ${socket.id}`);
      return;
    }

    const lockKey = buildLockKey(eventId, seatId);

    try {
      // Verify ownership before deleting — avoids a race-condition where
      // user A could unlock user B's seat by guessing the key.
      const currentOwner = await redis.get(lockKey);

      if (currentOwner === null) {
        // Lock already expired or was never set — safe to no-op
        console.log(`[WS] unlock_seat: key "${lockKey}" not found (already expired?)`);
        return;
      }

      if (currentOwner !== userId) {
        // Ownership mismatch — refuse silently (or emit error if needed)
        console.warn(
          `[WS] unlock_seat ownership mismatch: user "${userId}" tried to unlock seat owned by "${currentOwner}"`,
        );
        return;
      }

      await redis.del(lockKey);

      // Remove from per-socket tracking
      socket.data.lockedSeats = socket.data.lockedSeats.filter((s) => s !== seatId);

      // Broadcast release to the room so others' UIs turn the seat green again
      const room = `event_${eventId}`;
      io.to(room).emit('seat_unlocked', { seatId });

      console.log(`[WS] Seat "${seatId}" unlocked by user "${userId}" in event "${eventId}"`);
    } catch (error) {
      console.error(`[WS] Redis error during unlock_seat for seat "${seatId}":`, error);
    }
  });

  // ─── disconnect ────────────────────────────────────────────────────────────
  /**
   * Cleanup handler: when a socket drops (browser closed, network lost, etc.),
   * all seats locked by that socket are automatically released from Redis.
   * This prevents seats being stuck in a "locked" state for the full TTL.
   *
   * Note: Redis TTL (300s) is the ultimate safety net; this handler gives
   * near-instant cleanup on clean disconnects.
   */
  socket.on('disconnect', async (reason) => {
    const { currentEventId, lockedSeats, userId } = socket.data;

    console.log(
      `[WS] Socket ${socket.id} disconnected (reason: ${reason}). ` +
      `User: "${userId ?? 'unknown'}", locked seats: [${lockedSeats.join(', ')}]`,
    );

    if (!currentEventId || lockedSeats.length === 0) return;

    const room = `event_${currentEventId}`;

    // Release every seat this socket held in parallel
    await Promise.allSettled(
      lockedSeats.map(async (seatId) => {
        const lockKey = buildLockKey(currentEventId, seatId);
        try {
          // Only delete if this socket's user is still the owner
          // (handles edge case where lock was re-acquired by another user)
          const currentOwner = await redis.get(lockKey);
          if (currentOwner === userId) {
            await redis.del(lockKey);
            // Broadcast the release so connected clients update their UI
            io.to(room).emit('seat_unlocked', { seatId });
            console.log(`[WS] Auto-released seat "${seatId}" on disconnect of user "${userId}"`);
          }
        } catch (err) {
          console.error(`[WS] Failed to auto-release seat "${seatId}" on disconnect:`, err);
        }
      }),
    );
  });
}
