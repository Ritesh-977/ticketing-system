import { db } from '../config/database.js';
import { publishWebhookEvent } from './webhookQueue.js';

// ─── Interface Definitions ───────────────────────────────────────────────────

/** Shape of a webhook row matched by tenant + event type. */
interface ActiveWebhook {
    id: string;
    endpoint_url: string;
    signing_secret: string;
}

/** Result of a single webhook dispatch to the queue. */
interface DispatchResult {
    webhookId: string;
    endpointUrl: string;
    enqueued: boolean;
    deliveryId?: string;
    error?: string;
}

// ─── Core Dispatcher ─────────────────────────────────────────────────────────

/**
 * Dispatches a webhook event to all active endpoints for a given tenant
 * that are subscribed to the specified event type by enqueuing them to RabbitMQ.
 *
 * @param tenantId  - UUID of the tenant whose webhooks should fire
 * @param eventType - The event identifier (e.g. 'ticket.purchased')
 * @param payload   - Arbitrary JSON-serializable data for the event body
 * @param isLive    - Whether this is a live or test event
 * @returns Array of dispatch results (for logging/debugging; callers may ignore)
 */
export async function dispatchWebhook(
    tenantId: string,
    eventType: string,
    payload: Record<string, unknown>,
    isLive: boolean
): Promise<DispatchResult[]> {
    try {
        // ── 1. Query matching webhooks ───────────────────────────────────
        const query = `
            SELECT id, endpoint_url, signing_secret
            FROM webhooks
            WHERE tenant_id = $1
              AND is_active = true
              AND is_live = $2
              AND events @> $3::jsonb;
        `;

        const result = await db.query<ActiveWebhook>(query, [
            tenantId,
            isLive,
            JSON.stringify([eventType]),
        ]);

        if (result.rows.length === 0) {
            return []; // No matching webhooks — nothing to dispatch
        }

        // ── 2. Build the canonical payload ───────────────────────────────
        const envelope = {
            event_type: eventType,
            tenant_id: tenantId,
            timestamp: new Date().toISOString(),
            data: payload,
        };

        const body = JSON.stringify(envelope);
        const results: DispatchResult[] = [];

        // ── 3. Enqueue to RabbitMQ concurrently ──────────────────────────
        const enqueuePromises = result.rows.map(async (webhook) => {
            try {
                // a. Insert the delivery record into PostgreSQL
                const insertQuery = `
                    INSERT INTO webhook_deliveries (tenant_id, endpoint_url, payload, status, attempts, is_live)
                    VALUES ($1, $2, $3, 'PENDING', 0, $4)
                    RETURNING id;
                `;
                
                const dbRes = await db.query(insertQuery, [
                    tenantId, 
                    webhook.endpoint_url, 
                    body,
                    isLive
                ]);
                
                const deliveryId = dbRes.rows[0].id;

                // b. Publish to RabbitMQ
                await publishWebhookEvent(
                    deliveryId,
                    tenantId,
                    webhook.endpoint_url,
                    body,
                    0,          // retryCount starts at 0
                    undefined,  // No TTL (main queue)
                    webhook.signing_secret,
                    isLive
                );

                results.push({
                    webhookId: webhook.id,
                    endpointUrl: webhook.endpoint_url,
                    enqueued: true,
                    deliveryId
                });
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                console.error(`[Webhook Dispatcher] Failed to enqueue for ${webhook.endpoint_url}:`, message);
                results.push({
                    webhookId: webhook.id,
                    endpointUrl: webhook.endpoint_url,
                    enqueued: false,
                    error: message
                });
            }
        });

        await Promise.all(enqueuePromises);

        return results;
    } catch (error: unknown) {
        // Top-level safety net — even a DB failure must not propagate.
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Webhook Dispatcher] Fatal error for tenant ${tenantId}:`, message);
        return [];
    }
}
