import { type Request, type Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database.js';

// ─── Interface Definitions ───────────────────────────────────────────────────

/** Shape of a row returned from the webhooks table after INSERT. */
interface WebhookRow {
    id: string;
    tenant_id: string;
    endpoint_url: string;
    signing_secret: string;
    events: string[];
    is_active: boolean;
    is_live: boolean;
    created_at: string;
}

/** Shape of the success response for webhook creation. */
interface CreateWebhookResponse {
    message: string;
    webhook: WebhookRow;
}

/** Shape of the list response. */
interface ListWebhooksResponse {
    webhooks: WebhookRow[];
}

/** Shape of an error response. */
interface ErrorResponse {
    error: string;
}

// ─── Allowed Event Types ─────────────────────────────────────────────────────

const ALLOWED_EVENTS = new Set([
    'ticket.purchased',
    'ticket.refunded',
    'event.created',
    'event.updated',
    'order.completed',
    'order.failed',
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generates a cryptographically random webhook signing secret.
 * Format: `whsec_<48-char hex>` (24 random bytes as hex)
 */
const generateSigningSecret = (): string => {
    const randomString: string = crypto.randomBytes(24).toString('hex');
    return `whsec_${randomString}`;
};

// ─── Controller ──────────────────────────────────────────────────────────────

/**
 * POST /api/webhooks
 *
 * Registers a new webhook endpoint for the authenticated tenant.
 * Accepts `endpoint_url` (must be HTTPS) and `events` (array of event type strings).
 * Auto-generates a `whsec_`-prefixed signing secret using crypto.randomBytes.
 */
export const createWebhook = async (
    req: Request,
    res: Response<CreateWebhookResponse | ErrorResponse>
): Promise<void> => {
    const tenantId: string | undefined = req.tenant?.id;

    if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized: Tenant identity not found on request.' });
        return;
    }

    const { endpoint_url, events } = req.body;

    // ── Validation ───────────────────────────────────────────────────────────

    if (!endpoint_url || typeof endpoint_url !== 'string') {
        res.status(400).json({ error: 'endpoint_url is required and must be a string.' });
        return;
    }

    // Enforce HTTPS-only endpoints
    try {
        const parsed = new URL(endpoint_url);
        if (parsed.protocol !== 'https:') {
            res.status(400).json({ error: 'endpoint_url must use HTTPS.' });
            return;
        }
    } catch {
        res.status(400).json({ error: 'endpoint_url must be a valid URL.' });
        return;
    }

    if (!Array.isArray(events) || events.length === 0) {
        res.status(400).json({ error: 'events must be a non-empty array of event type strings.' });
        return;
    }

    // Validate each event type against the allow-list
    for (const event of events) {
        if (typeof event !== 'string' || !ALLOWED_EVENTS.has(event)) {
            res.status(400).json({
                error: `Invalid event type: "${event}". Allowed types: ${[...ALLOWED_EVENTS].join(', ')}`,
            });
            return;
        }
    }

    // ── Persist ──────────────────────────────────────────────────────────────

    const client = await db.connect();

    try {
        const signingSecret: string = generateSigningSecret();

        await client.query('BEGIN');

        const insertQuery: string = `
            INSERT INTO webhooks (tenant_id, endpoint_url, signing_secret, events, is_active, is_live)
            VALUES ($1, $2, $3, $4::jsonb, true, $5)
            RETURNING id, tenant_id, endpoint_url, signing_secret, events, is_active, is_live, created_at;
        `;

        const values = [tenantId, endpoint_url, signingSecret, JSON.stringify(events), req.isLive];
        const result = await client.query<WebhookRow>(insertQuery, values);

        await client.query('COMMIT');

        const insertedRow: WebhookRow | undefined = result.rows[0];

        if (!insertedRow) {
            throw new Error('Insert succeeded but returned no rows — unexpected state.');
        }

        res.status(201).json({
            message: 'Webhook registered successfully. Store the signing secret securely.',
            webhook: insertedRow,
        });
    } catch (error: unknown) {
        await client.query('ROLLBACK');

        const errorMessage: string = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error creating webhook:', errorMessage);

        res.status(500).json({ error: 'Internal server error while creating webhook.' });
    } finally {
        client.release();
    }
};

/**
 * GET /api/webhooks
 *
 * Lists all webhook endpoints for the authenticated tenant.
 * Returns the full webhook objects including signing secrets
 * (the frontend handles masking them in the UI).
 */
export const listWebhooks = async (
    req: Request,
    res: Response<ListWebhooksResponse | ErrorResponse>
): Promise<void> => {
    const tenantId: string | undefined = req.tenant?.id;

    if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized: Tenant identity not found on request.' });
        return;
    }

    try {
        const query = `
            SELECT id, tenant_id, endpoint_url, signing_secret, events, is_active, is_live, created_at
            FROM webhooks
            WHERE tenant_id = $1 AND is_live = $2
            ORDER BY created_at DESC;
        `;

        const result = await db.query<WebhookRow>(query, [tenantId, req.isLive]);

        res.status(200).json({ webhooks: result.rows });
    } catch (error: unknown) {
        const errorMessage: string = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching webhooks:', errorMessage);

        res.status(500).json({ error: 'Internal server error while fetching webhooks.' });
    }
};

/**
 * GET /api/webhooks/deliveries
 *
 * Lists all webhook deliveries for the authenticated tenant.
 */
export const listDeliveries = async (
    req: Request,
    res: Response
): Promise<void> => {
    const tenantId: string | undefined = req.tenant?.id;

    if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized: Tenant identity not found on request.' });
        return;
    }

    try {
        const query = `
            SELECT id, tenant_id, endpoint_url, payload, status, attempts, next_retry_at, is_live, created_at, updated_at
            FROM webhook_deliveries
            WHERE tenant_id = $1 AND is_live = $2
            ORDER BY created_at DESC
            LIMIT 50;
        `;

        const result = await db.query(query, [tenantId, req.isLive]);

        res.status(200).json({ deliveries: result.rows });
    } catch (error: unknown) {
        const errorMessage: string = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching webhook deliveries:', errorMessage);

        res.status(500).json({ error: 'Internal server error while fetching webhook deliveries.' });
    }
};

/**
 * DELETE /api/webhooks/:id
 *
 * Deletes a webhook endpoint for the authenticated tenant.
 */
export const deleteWebhook = async (
    req: Request,
    res: Response<{ message: string } | ErrorResponse>
): Promise<void> => {
    const tenantId: string | undefined = req.tenant?.id;
    const { id } = req.params;

    if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized: Tenant identity not found on request.' });
        return;
    }

    if (!id) {
        res.status(400).json({ error: 'Webhook ID is required.' });
        return;
    }

    try {
        const query = `
            DELETE FROM webhooks
            WHERE id = $1 AND tenant_id = $2 AND is_live = $3
            RETURNING id;
        `;

        const result = await db.query(query, [id, tenantId, req.isLive]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Webhook not found.' });
            return;
        }

        res.status(200).json({ message: 'Webhook deleted successfully.' });
    } catch (error: unknown) {
        const errorMessage: string = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error deleting webhook:', errorMessage);

        res.status(500).json({ error: 'Internal server error while deleting webhook.' });
    }
};
