/**
 * @file SeatingChart.tsx
 * @description Real-time seating chart component with optimistic UI updates.
 *
 * Seat state colour legend (Tailwind v4):
 *   🟢 Green  — available     (no lock held)
 *   🟡 Yellow — locked by ME  (optimistic + confirmed)
 *   ⚫ Gray   — locked by another user (disabled)
 *
 * Architecture:
 *   - All WebSocket logic is encapsulated in `useSeatingSocket` hook.
 *   - This component is purely a rendering layer — no socket calls inline.
 *   - Clicking an available seat triggers an optimistic lock instantly.
 *   - Clicking a yellow (my) seat releases the lock.
 *   - Gray seats are fully disabled and non-interactive.
 */

import { useState, useCallback } from 'react';
import { useSeatingSocket } from '../hooks/useSeatingSocket';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Seat {
  id: string;
  label: string;
  row: string;
  number: number;
}

interface SeatingChartProps {
  /** The event ID to subscribe seat updates for. */
  eventId: string;
  /** The currently authenticated user's ID. */
  currentUserId: string;
}

// ─── Seat grid generation ─────────────────────────────────────────────────────

/** Generates a 4×4 grid of seats (rows A–D, numbers 1–4). */
function generateSeats(): Seat[] {
  const rows = ['A', 'B', 'C', 'D'];
  return rows.flatMap((row) =>
    Array.from({ length: 4 }, (_, i) => ({
      id: `${row}${i + 1}`,
      label: `${row}${i + 1}`,
      row,
      number: i + 1,
    })),
  );
}

const SEATS: Seat[] = generateSeats();

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Coloured badge showing the current WebSocket connection status. */
function ConnectionBadge({ status }: { status: string }) {
  const config: Record<string, { dot: string; text: string; label: string }> = {
    connected:    { dot: 'bg-emerald-400',  text: 'text-emerald-700',  label: 'Live' },
    connecting:   { dot: 'bg-amber-400 animate-pulse', text: 'text-amber-700', label: 'Connecting…' },
    disconnected: { dot: 'bg-slate-400',    text: 'text-slate-600',    label: 'Offline' },
    error:        { dot: 'bg-red-400',      text: 'text-red-700',      label: 'Error' },
  };
  const c = config[status] ?? config.disconnected;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white shadow-sm border border-slate-100 text-xs font-medium ${c.text}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

/** Legend item for the colour guide. */
function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-4 h-4 rounded-sm ${color} shadow-sm`} />
      <span className="text-xs text-slate-600">{label}</span>
    </div>
  );
}

// ─── Seat Button ──────────────────────────────────────────────────────────────

type SeatStatus = 'available' | 'mine' | 'taken';

interface SeatButtonProps {
  seat: Seat;
  status: SeatStatus;
  onSelect: (seatId: string) => void;
  onRelease: (seatId: string) => void;
}

function SeatButton({ seat, status, onSelect, onRelease }: SeatButtonProps) {
  const isTaken = status === 'taken';
  const isMine  = status === 'mine';

  const handleClick = () => {
    if (isTaken) return;
    if (isMine) {
      onRelease(seat.id);
    } else {
      onSelect(seat.id);
    }
  };

  // ── Tailwind classes per state ─────────────────────────────────────────────
  const baseClasses =
    'relative w-14 h-14 rounded-xl font-semibold text-sm flex flex-col items-center justify-center gap-0.5 ' +
    'transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ';

  const stateClasses: Record<SeatStatus, string> = {
    available:
      'bg-emerald-100 border-2 border-emerald-300 text-emerald-800 ' +
      'hover:bg-emerald-200 hover:border-emerald-400 hover:scale-105 hover:shadow-md ' +
      'active:scale-95 focus-visible:ring-emerald-400 cursor-pointer',
    mine:
      'bg-amber-300 border-2 border-amber-500 text-amber-900 ' +
      'hover:bg-amber-400 hover:border-amber-600 hover:scale-105 hover:shadow-md ' +
      'active:scale-95 focus-visible:ring-amber-400 cursor-pointer shadow-amber-200 shadow-lg',
    taken:
      'bg-slate-200 border-2 border-slate-300 text-slate-400 ' +
      'cursor-not-allowed opacity-60',
  };

  const tooltip: Record<SeatStatus, string> = {
    available: `Click to select seat ${seat.label}`,
    mine: `Click to release seat ${seat.label}`,
    taken: `Seat ${seat.label} is taken`,
  };

  return (
    <button
      id={`seat-${seat.id}`}
      type="button"
      onClick={handleClick}
      disabled={isTaken}
      title={tooltip[status]}
      aria-label={tooltip[status]}
      aria-pressed={isMine}
      className={`${baseClasses} ${stateClasses[status]}`}
    >
      {/* Seat icon */}
      <span className="text-lg leading-none" aria-hidden="true">
        {isMine ? '⭐' : isTaken ? '🔒' : '🪑'}
      </span>
      <span className="text-[11px] font-bold tracking-wide">{seat.label}</span>

      {/* "Mine" pulse ring */}
      {isMine && (
        <span
          className="absolute inset-0 rounded-xl ring-2 ring-amber-400 animate-ping opacity-40 pointer-events-none"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * SeatingChart
 * 
 * Drop this into any page that needs real-time seat selection. Pass the
 * event ID and the current user's ID. The component handles all WebSocket
 * communication and state management internally via `useSeatingSocket`.
 *
 * @example
 * <SeatingChart eventId="evt_abc123" currentUserId={user.id} />
 */
export function SeatingChart({ eventId, currentUserId }: SeatingChartProps) {
  const { lockedSeats, connectionStatus, lockSeat, unlockSeat } = useSeatingSocket(
    eventId,
    currentUserId,
  );

  /** Track optimistically locked seats by this user (before server confirms). */
  const [optimisticPending, setOptimisticPending] = useState<Set<string>>(new Set());

  const handleSeatSelect = useCallback(
    (seatId: string) => {
      setOptimisticPending((prev) => new Set(prev).add(seatId));
      lockSeat(seatId);
      // The pending flag is cleared once lock_success or lock_failed fires
      // via the lockedSeats map update in the hook
    },
    [lockSeat],
  );

  const handleSeatRelease = useCallback(
    (seatId: string) => {
      unlockSeat(seatId);
    },
    [unlockSeat],
  );

  /** Determine the visual state for a given seat. */
  const getSeatStatus = useCallback(
    (seatId: string): SeatStatus => {
      const owner = lockedSeats[seatId];
      if (!owner) return 'available';
      if (owner === currentUserId) return 'mine';
      return 'taken';
    },
    [lockedSeats, currentUserId],
  );

  // Count stats for the summary bar
  const myCount        = Object.values(lockedSeats).filter((u) => u === currentUserId).length;
  const takenCount     = Object.values(lockedSeats).filter((u) => u !== currentUserId).length;
  const availableCount = SEATS.length - myCount - takenCount;

  // Group seats by row for the grid layout
  const rows = ['A', 'B', 'C', 'D'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">

        {/* ── Card ── */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

          {/* ── Header ── */}
          <div className="px-8 pt-8 pb-6 border-b border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Seat Selection
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  Event <code className="text-amber-400 font-mono text-xs">{eventId}</code>
                </p>
              </div>
              <ConnectionBadge status={connectionStatus} />
            </div>

            {/* ── Stats bar ── */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { count: availableCount, label: 'Available', color: 'text-emerald-400' },
                { count: myCount,        label: 'Selected',  color: 'text-amber-400'   },
                { count: takenCount,     label: 'Taken',     color: 'text-slate-400'   },
              ].map(({ count, label, color }) => (
                <div key={label} className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                  <div className={`text-2xl font-bold ${color}`}>{count}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Stage indicator ── */}
          <div className="px-8 pt-6">
            <div className="relative h-10 flex items-center justify-center">
              <div className="w-full max-w-xs h-1.5 bg-gradient-to-r from-transparent via-slate-500 to-transparent rounded-full opacity-50" />
              <span className="absolute text-xs text-slate-500 font-medium tracking-widest uppercase">
                ── STAGE ──
              </span>
            </div>
          </div>

          {/* ── Seat grid ── */}
          <div className="px-8 pb-8 space-y-3">
            {rows.map((row) => (
              <div key={row} className="flex items-center gap-3">
                {/* Row label */}
                <span className="w-5 text-center text-xs font-bold text-slate-500 shrink-0">
                  {row}
                </span>

                {/* Seats in this row */}
                <div className="flex gap-3 flex-1 justify-center">
                  {SEATS.filter((s) => s.row === row).map((seat) => (
                    <SeatButton
                      key={seat.id}
                      seat={seat}
                      status={getSeatStatus(seat.id)}
                      onSelect={handleSeatSelect}
                      onRelease={handleSeatRelease}
                    />
                  ))}
                </div>

                {/* Mirror label for symmetry */}
                <span className="w-5 text-center text-xs font-bold text-slate-500 shrink-0">
                  {row}
                </span>
              </div>
            ))}

            {/* Column numbers */}
            <div className="flex items-center gap-3 mt-1">
              <span className="w-5 shrink-0" />
              <div className="flex gap-3 flex-1 justify-center">
                {[1, 2, 3, 4].map((n) => (
                  <span key={n} className="w-14 text-center text-xs text-slate-600">
                    {n}
                  </span>
                ))}
              </div>
              <span className="w-5 shrink-0" />
            </div>
          </div>

          {/* ── Legend ── */}
          <div className="px-8 pb-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Legend
              </p>
              <div className="flex flex-wrap gap-4">
                <LegendItem color="bg-emerald-200 border border-emerald-300" label="Available — click to select" />
                <LegendItem color="bg-amber-300  border border-amber-500"    label="Your selection — click to release" />
                <LegendItem color="bg-slate-300  border border-slate-400"    label="Taken by another user" />
              </div>
            </div>
          </div>

          {/* ── Active selection summary ── */}
          {myCount > 0 && (
            <div className="px-8 pb-8">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4">
                <p className="text-sm font-semibold text-amber-300">
                  🎟️ You have selected {myCount} seat{myCount > 1 ? 's' : ''}:
                  <span className="ml-2 font-mono text-amber-400">
                    {Object.entries(lockedSeats)
                      .filter(([, owner]) => owner === currentUserId)
                      .map(([id]) => id)
                      .join(', ')}
                  </span>
                </p>
                <p className="text-xs text-amber-400/70 mt-1">
                  Seats are held for 5 minutes. Complete your purchase to confirm.
                </p>
              </div>
            </div>
          )}

          {/* ── User info footer ── */}
          <div className="px-8 pb-8">
            <p className="text-center text-xs text-slate-600">
              Browsing as <span className="text-slate-400 font-mono">{currentUserId}</span>
            </p>
          </div>
        </div>

        {/* ── Optimistic pending indicator ── */}
        {optimisticPending.size > 0 && (
          <p className="mt-3 text-center text-xs text-slate-500 animate-pulse">
            Confirming with server…
          </p>
        )}
      </div>
    </div>
  );
}

export default SeatingChart;
