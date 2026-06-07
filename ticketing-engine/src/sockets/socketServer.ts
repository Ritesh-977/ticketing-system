/**
 * @file socketServer.ts
 * @description Attaches a typed Socket.io Server to the existing Express HTTP
 * server and wires up all socket event handlers.
 *
 * Usage — call `initSocketServer(httpServer)` once in server.ts after
 * `httpServer` is created (but before `httpServer.listen()`).
 */

import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types/socket.types.js';
import { registerSeatHandlers } from './seatHandler.js';

// ─── Singleton ────────────────────────────────────────────────────────────────
// Export the io instance so it can be accessed from REST route handlers if
// needed (e.g., to push seat status from an HTTP purchase endpoint).
let io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

/**
 * Attaches Socket.io to the provided HTTP server with CORS settings mirrored
 * from the Express configuration, then registers all domain event handlers.
 *
 * @param httpServer - The raw `http.Server` created by Express.
 * @param allowedOrigins - Array of origins permitted to connect via WebSocket.
 * @returns The fully initialised Socket.io `Server` instance.
 */
export function initSocketServer(
  httpServer: HttpServer,
  allowedOrigins: string[],
): Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData> {
  io = new Server(httpServer, {
    // ── CORS: must match your Express CORS policy ────────────────────────────
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },

    // ── Transport configuration ──────────────────────────────────────────────
    // Start with polling for environments that block WebSocket upgrades,
    // then upgrade to WebSocket for lower latency.
    transports: ['polling', 'websocket'],

    // ── Ping/pong heartbeat ─────────────────────────────────────────────────
    // If a client misses 3 consecutive pings, it's considered disconnected.
    pingInterval: 10_000,  // 10 seconds between pings
    pingTimeout: 5_000,    // 5 second window to receive a pong

    // ── Connection state recovery ────────────────────────────────────────────
    // Allows clients that briefly disconnect to resume their session without
    // re-joining rooms or re-locking seats (Socket.io ≥ 4.6).
    connectionStateRecovery: {
      maxDisconnectionDuration: 30_000, // 30 seconds grace period
      skipMiddlewares: true,
    },
  });

  // ── Global connection handler ──────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id} (transport: ${socket.conn.transport.name})`);

    // Register all seat-related events on this socket
    registerSeatHandlers(io, socket);
  });

  console.log('🔌 Socket.io server initialised');
  return io;
}

/**
 * Returns the singleton Socket.io server instance.
 * Throws if called before `initSocketServer`.
 */
export function getIO(): Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData> {
  if (!io) {
    throw new Error('Socket.io server has not been initialised. Call initSocketServer() first.');
  }
  return io;
}
