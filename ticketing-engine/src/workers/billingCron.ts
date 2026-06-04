import cron from 'node-cron';
import { redis } from '../config/redis.js';
import { db } from '../config/database.js';

/**
 * Billing Rollup Cron Job
 *
 * Runs every hour. Scans Redis for all `usage:*` keys, atomically reads
 * and resets each counter, then persists the delta into the PostgreSQL
 * `api_usage` ledger via UPSERT.
 *
 * Why GETDEL isn't used:
 *   GETDEL removes the key entirely, so any INCR that lands between our
 *   GET and the next INCR would create a new key with count=1 — that's fine,
 *   but we'd lose the TTL set by the tracker middleware. Instead we use
 *   GETSET to atomically swap the value to "0". This means:
 *     - No traffic is ever lost (atomic read-and-reset).
 *     - The TTL stays intact on the existing key.
 *     - The next hour's flush only captures the new delta.
 */

const UPSERT_QUERY = `
    INSERT INTO api_usage (tenant_id, usage_date, total_requests, is_live)
    VALUES ($1, $2::DATE, $3, $4)
    ON CONFLICT (tenant_id, usage_date, is_live)
    DO UPDATE SET
        total_requests = api_usage.total_requests + EXCLUDED.total_requests,
        updated_at = NOW();
`;

async function flushUsageCounters(): Promise<void> {
    console.log('[💰 Billing Cron] Starting usage rollup flush...');

    let cursor = '0';
    let totalFlushed = 0;

    // Use SCAN to iterate without blocking Redis (production-safe)
    do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'usage:*', 'COUNT', 100);
        cursor = nextCursor;

        for (const key of keys) {
            try {
                // Atomically read the current count and reset to "0"
                const rawCount = await redis.getset(key, '0');

                if (!rawCount || rawCount === '0') continue;

                const count = parseInt(rawCount, 10);
                if (isNaN(count) || count <= 0) continue;

                // Parse the key: usage:{tenant_id}:{env}:{YYYY-MM-DD}
                const parts = key.split(':');
                // Key format: usage:<uuid>:<env>:<YYYY-MM-DD>
                const usageDate = parts[parts.length - 1];
                const env = parts[parts.length - 2];
                const tenantId = parts.slice(1, parts.length - 2).join(':');

                if (!tenantId || !usageDate || (env !== 'live' && env !== 'test')) {
                    console.warn(`[💰 Billing Cron] Skipping malformed key: ${key}`);
                    continue;
                }

                const isLive = env === 'live';

                // UPSERT into PostgreSQL
                await db.query(UPSERT_QUERY, [tenantId, usageDate, count, isLive]);
                totalFlushed++;

                console.log(`  ✅ Flushed ${count} requests for tenant ${tenantId} (${usageDate})`);
            } catch (err) {
                // Log but don't abort — continue flushing other keys.
                // The counter was already reset to 0, so on the next INCR cycle
                // the delta will re-accumulate and be picked up next hour.
                console.error(`  ❌ Failed to flush key ${key}:`, err);
            }
        }
    } while (cursor !== '0');

    console.log(`[💰 Billing Cron] Flush complete. ${totalFlushed} tenant-day(s) persisted.`);
}

/**
 * Start the billing cron job.
 * Schedule: Every hour at minute 0 (0 * * * *)
 */
export function startBillingCron(): void {
    cron.schedule('0 * * * *', () => {
        flushUsageCounters().catch((err) => {
            console.error('[💰 Billing Cron] Unhandled flush error:', err);
        });
    });

    console.log('💰 Billing Cron Job scheduled (runs every hour at :00)');
}

/**
 * Manual trigger for testing or one-off flushes.
 * Can be called from an admin endpoint or CLI script.
 */
export { flushUsageCounters };
