import { type Request, type Response, type NextFunction } from 'express';
import { redis } from '../config/redis.js';

// ─── TTL: 14 days in seconds (daily keys are short-lived) ────────────────────
const KEY_TTL_SECONDS = 60 * 60 * 24 * 14;

/**
 * trackUsage (standalone helper)
 *
 * Increments a per-tenant, per-day Redis counter. This is the single source
 * of truth for usage metering — called by the Express middleware for HTTP
 * requests and directly by the webhook dispatcher for outbound deliveries.
 *
 * Fire-and-forget: callers should NOT await this. A Redis blip should never
 * block or fail a customer's API request or webhook delivery.
 *
 * Redis Key Format: usage:{tenant_id}:{env}:{YYYY-MM-DD}
 *
 * @param tenantId - UUID of the tenant to bill
 * @param isLive - boolean indicating environment
 */
export function trackUsage(tenantId: string, isLive: boolean): void {
    const now = new Date();
    const usageDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const env = isLive ? 'live' : 'test';
    const redisKey = `usage:${tenantId}:${env}:${usageDate}`;

    redis
        .incr(redisKey)
        .then((count) => {
            // Set TTL only when the key was just created (INCR returns 1).
            // This avoids a redundant EXPIRE call on every single request.
            if (count === 1) {
                redis.expire(redisKey, KEY_TTL_SECONDS).catch(() => {});
            }
        })
        .catch((err) => {
            console.error(`⚠️ Usage tracking Redis error for tenant ${tenantId}:`, err.message);
        });
}

/**
 * Middleware: trackApiUsage
 *
 * Express middleware wrapper around trackUsage(). Attach this AFTER auth
 * middleware (so req.tenant.id is populated) and BEFORE controllers (so we
 * bill for the compute even if the controller returns a 4xx).
 *
 * Only applied to metered (billable) routes — never to dashboard/meta
 * endpoints like key management, webhook CRUD, or billing lookups.
 */
export const trackApiUsage = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    const tenantId = req.tenant?.id;

    if (tenantId) {
        trackUsage(tenantId, req.isLive ?? true);
    }

    // Always continue — never block the request
    next();
};
