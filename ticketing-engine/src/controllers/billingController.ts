import { type Request, type Response } from 'express';
import { db } from '../config/database.js';
import { redis } from '../config/redis.js';

// ─── Helper: format a Date as YYYY-MM-DD ─────────────────────────────────────

function toDateString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * GET /api/billing/usage
 *
 * Returns a 7-day rolling window of daily API usage for the authenticated
 * tenant. Merges historical data from PostgreSQL with the live Redis counter
 * for today, and backfills days with no traffic as 0 so the chart never
 * has missing gaps.
 *
 * Response shape:
 * {
 *   tenant_id: string,
 *   usage: [
 *     { usage_date: "2026-05-28", total_requests: 120 },
 *     ...
 *     { usage_date: "2026-06-03", total_requests: 45, live: true }
 *   ],
 *   chart_data: [
 *     { date: "May 28", requests: 120 },
 *     ...
 *     { date: "Jun 03", requests: 45 }
 *   ]
 * }
 */
export const getUsage = async (req: Request, res: Response): Promise<void> => {
    try {
        const tenantId = req.tenant?.id;

        if (!tenantId) {
            res.status(401).json({ error: 'Tenant identity not found on request.' });
            return;
        }

        // 1. Build the last 7 days date array (including today)
        const now = new Date();
        const today = toDateString(now);
        const last7Days: string[] = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            last7Days.push(toDateString(d));
        }

        const windowStart = last7Days[0]; // oldest day in the window

        // 2. Historical data from PostgreSQL (only the 7-day window)
        const pgResult = await db.query(
            `SELECT usage_date::TEXT AS usage_date, total_requests
             FROM api_usage
             WHERE tenant_id = $1
               AND usage_date >= $2::DATE
               AND is_live = $3
             ORDER BY usage_date ASC;`,
            [tenantId, windowStart, req.isLive ?? true]
        );

        // 3. Live Redis counter for today
        const env = (req.isLive ?? true) ? 'live' : 'test';
        const redisKey = `usage:${tenantId}:${env}:${today}`;

        let liveCount = 0;
        try {
            const raw = await redis.get(redisKey);
            liveCount = raw ? parseInt(raw, 10) : 0;
            if (isNaN(liveCount)) liveCount = 0;
        } catch (err) {
            // Redis read failure — degrade gracefully, return Postgres-only data
            console.error('⚠️ Could not read live usage from Redis:', err);
        }

        // 4. Index Postgres results by date for O(1) lookup
        const pgMap = new Map<string, number>();
        for (const row of pgResult.rows) {
            // Postgres returns usage_date as 'YYYY-MM-DD' (cast to TEXT above)
            pgMap.set(row.usage_date, Number(row.total_requests));
        }

        // 5. Build the 7-day response, backfilling 0 for empty days
        const usage = last7Days.map((dateStr) => {
            const pgCount = pgMap.get(dateStr) ?? 0;
            const isToday = dateStr === today;

            return {
                usage_date: dateStr,
                total_requests: isToday ? pgCount + liveCount : pgCount,
                ...(isToday && { live: true }),
            };
        });

        // 6. Build Recharts-compatible chart_data array
        const chart_data = usage.map((entry) => {
            const [year, month, day] = entry.usage_date.split('-');
            const d = new Date(Number(year), Number(month) - 1, Number(day));
            return {
                date: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
                requests: entry.total_requests,
            };
        });

        res.status(200).json({
            tenant_id: tenantId,
            usage,
            chart_data,
        });
    } catch (error) {
        console.error('Error fetching billing usage:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
