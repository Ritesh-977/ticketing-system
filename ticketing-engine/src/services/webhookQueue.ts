import amqp from 'amqplib';
import type { Connection, Channel } from 'amqplib';

// Configuration
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE_NAME = 'webhook_exchange';
const MAIN_QUEUE = 'webhook_main_queue';
const RETRY_DLQ = 'webhook_retry_dlq';
const MAIN_ROUTING_KEY = 'main';
const RETRY_ROUTING_KEY = 'retry';

let connection: any = null;
let channel: any = null;

/**
 * Initialize RabbitMQ connection and topologies.
 */
export async function initRabbitMQ(): Promise<void> {
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();

        // 1. Create the Exchange
        await channel!.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });

        // 2. Create the Main Queue
        await channel!.assertQueue(MAIN_QUEUE, { durable: true });
        await channel!.bindQueue(MAIN_QUEUE, EXCHANGE_NAME, MAIN_ROUTING_KEY);

        // 3. Create the Dead Letter Queue (DLQ) for retries
        // Messages in this queue will have a TTL. When they expire, RabbitMQ routes them back to the MAIN_QUEUE!
        await channel!.assertQueue(RETRY_DLQ, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': EXCHANGE_NAME,
                'x-dead-letter-routing-key': MAIN_ROUTING_KEY,
            },
        });
        await channel!.bindQueue(RETRY_DLQ, EXCHANGE_NAME, RETRY_ROUTING_KEY);

        console.log('RabbitMQ topology initialized successfully.');
    } catch (error) {
        console.error('Failed to initialize RabbitMQ:', error);
        throw error;
    }
}

export function getChannel(): any {
    if (!channel) throw new Error('RabbitMQ channel not initialized');
    return channel;
}

/**
 * Publishes a webhook delivery event to RabbitMQ.
 * 
 * @param deliveryId The ID of the `webhook_deliveries` record.
 * @param tenantId The tenant ID.
 * @param endpointUrl The webhook URL.
 * @param payload The JSON payload.
 * @param retryCount The current retry attempt (starts at 0).
 * @param ttl Optional Time-To-Live in milliseconds. If provided, sends to the DLQ for delayed processing.
 * @param signingSecret The secret used to sign the webhook payload.
 * @param isLive Boolean indicating if this is a live environment event.
 */
export async function publishWebhookEvent(
    deliveryId: string,
    tenantId: string,
    endpointUrl: string,
    payload: any,
    retryCount: number = 0,
    ttl?: number,
    signingSecret?: string,
    isLive: boolean = true
): Promise<void> {
    if (!channel) throw new Error('RabbitMQ channel not initialized');

    const message = JSON.stringify({
        deliveryId,
        tenantId,
        endpointUrl,
        payload,
        retryCount,
        signingSecret,
        isLive
    });

    if (ttl !== undefined && ttl > 0) {
        // Publish to DLQ (retry queue) with an expiration. Once expired, it routes back to main.
        channel.publish(EXCHANGE_NAME, RETRY_ROUTING_KEY, Buffer.from(message), {
            persistent: true,
            expiration: ttl.toString() // e.g. "60000" for 1 minute
        });
        console.log(`[RabbitMQ] Published delivery ${deliveryId} to RETRY queue (TTL: ${ttl}ms)`);
    } else {
        // Publish directly to main queue for immediate processing
        channel.publish(EXCHANGE_NAME, MAIN_ROUTING_KEY, Buffer.from(message), {
            persistent: true
        });
        console.log(`[RabbitMQ] Published delivery ${deliveryId} to MAIN queue`);
    }
}
