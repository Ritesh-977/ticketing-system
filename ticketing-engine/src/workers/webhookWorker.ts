import crypto from 'crypto';
import { db } from '../config/database.js';
import { getChannel, publishWebhookEvent } from '../services/webhookQueue.js';
import { trackUsage } from '../middleware/usageTracker.js';

const MAIN_QUEUE = 'webhook_main_queue';
const DELIVERY_TIMEOUT_MS = 10_000;
const USER_AGENT = 'TicketingEngine-Webhooks/1.0';

// Calculate exponential backoff (retry 1: 1m, retry 2: 5m, retry 3: 15m, retry 4: 1h, retry 5: 6h)
const getBackoffTTL = (attempt: number): number => {
    switch (attempt) {
        case 0: return 60_000; // 1 minute
        case 1: return 300_000; // 5 minutes
        case 2: return 900_000; // 15 minutes
        case 3: return 3_600_000; // 1 hour
        default: return 21_600_000; // 6 hours
    }
};

/**
 * Starts consuming messages from the main webhook queue.
 */
export async function startWebhookWorker(): Promise<void> {
    const channel = getChannel();
    
    // Process 10 webhooks concurrently at maximum
    channel.prefetch(10);

    console.log('[Worker] Webhook worker started, listening for deliveries...');

    channel.consume(MAIN_QUEUE, async (msg: any) => {
        if (!msg) return;

        try {
            const data = JSON.parse(msg.content.toString());
            const { deliveryId, tenantId, endpointUrl, payload, retryCount, signingSecret, isLive } = data;

            console.log(`[Worker] Processing delivery ${deliveryId} (Attempt ${retryCount + 1}) to ${endpointUrl}`);

            // 1. Send the HTTP POST request
            const result = await deliverWebhook(deliveryId, endpointUrl, payload, signingSecret);

            if (result.success) {
                // 2a. Update DB to SUCCESS
                await db.query(`UPDATE webhook_deliveries SET status = 'SUCCESS', updated_at = NOW() WHERE id = $1`, [deliveryId]);
                
                // Track usage (billing) only on success
                if (tenantId) {
                    trackUsage(tenantId, isLive);
                }
                
                console.log(`[Worker] Delivery ${deliveryId} SUCCESS`);
            } else {
                // 2b. Handle Failure
                const newAttemptCount = retryCount + 1;
                
                if (newAttemptCount >= 5) {
                    // Fail permanently
                    await db.query(`UPDATE webhook_deliveries SET status = 'FAILED', attempts = $2, updated_at = NOW() WHERE id = $1`, [deliveryId, newAttemptCount]);
                    console.log(`[Worker] Delivery ${deliveryId} FAILED permanently after 5 attempts`);
                } else {
                    // Schedule Retry via Dead Letter Queue
                    const ttl = getBackoffTTL(retryCount);
                    const nextRetryAt = new Date(Date.now() + ttl);
                    
                    await db.query(`UPDATE webhook_deliveries SET attempts = $2, next_retry_at = $3, updated_at = NOW() WHERE id = $1`, 
                        [deliveryId, newAttemptCount, nextRetryAt]
                    );
                    
                    // Publish to DLQ (it will flow back to main queue after TTL)
                    await publishWebhookEvent(deliveryId, tenantId, endpointUrl, payload, newAttemptCount, ttl, signingSecret, isLive);
                    
                    console.log(`[Worker] Delivery ${deliveryId} scheduled for retry ${newAttemptCount} in ${ttl}ms`);
                }
            }

            // Always ACK the original message from the main queue so it doesn't block
            channel.ack(msg);

        } catch (error) {
            console.error('[Worker] Fatal error processing message:', error);
            // If the message is completely unparseable or crashes the worker logic, we don't requeue it natively (avoid infinite poison message loops).
            // We ack it to remove it from the queue, since we use the DLQ for application-level retries.
            channel.ack(msg);
        }
    });
}

/**
 * Delivers a signed payload to a single webhook endpoint.
 */
async function deliverWebhook(
    deliveryId: string,
    endpointUrl: string,
    body: string, // stringified JSON
    signingSecret: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    try {
        const signature = crypto
            .createHmac('sha256', signingSecret)
            .update(body)
            .digest('hex');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': USER_AGENT,
                'x-signature': `sha256=${signature}`,
                'x-webhook-delivery-id': deliveryId,
                'x-webhook-timestamp': new Date().toISOString(),
            },
            body,
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
            return { success: true, statusCode: response.status };
        } else {
            return { success: false, statusCode: response.status, error: `HTTP ${response.status}` };
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
    }
}
