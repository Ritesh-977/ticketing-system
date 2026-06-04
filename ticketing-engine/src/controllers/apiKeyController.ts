import { type Request, type Response } from 'express';
import { db } from '../config/database.js';
import { generatePublishableKey, generateSecretKey, hashSecretKey } from '../utils/crypto.js';

// ─── Interface Definitions ───────────────────────────────────────────────────

/** Shape of a row returned from the api_keys table after INSERT. */
interface ApiKeyRow {
    id: string;
    tenant_id: string;
    name: string;
    publishable_key: string;
    environment: string;
    status: string;
    is_live: boolean;
    created_at: string;
}

interface KeyResponseData {
    id: string;
    tenant_id: string;
    name: string;
    publishable_key: string;
    secret_key: string;   // Raw — shown exactly once
    environment: string;
    status: string;
    is_live: boolean;
    created_at: string;
}

/** Shape of the success response sent back to the client. */
interface GenerateKeysResponse {
    message: string;
    api_key: KeyResponseData;
}

/** Shape of an error response. */
interface ErrorResponse {
    error: string;
}

// ─── Controller ──────────────────────────────────────────────────────────────

/**
 * POST /api/tenants/keys
 *
 * Generates both a test and a live API key pair for the authenticated tenant.
 * The secret keys are returned in plaintext **exactly once**; only their bcrypt
 * hashes are stored in PostgreSQL.
 *
 * The entire operation is wrapped in an explicit transaction so that a
 * failure at any step triggers a ROLLBACK — no orphaned rows.
 */
export const generateApiKeys = async (
    req: Request,
    res: Response<GenerateKeysResponse | ErrorResponse>
): Promise<void> => {
    // The requireSecretKey middleware guarantees req.tenant is populated.
    const tenantId: string | undefined = req.tenant?.id;

    if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized: Tenant identity not found on request.' });
        return;
    }

    const { name } = req.body;
    const keyName = name && name.trim() ? name.trim() : 'API Key';

    // The environment is determined by the req.isLive flag
    const isLive = req.isLive ?? true;
    const environment = isLive ? 'live' : 'test';

    // Acquire a dedicated client from the pool for the transaction.
    const client = await db.connect();

    try {
        // ── 1. Generate raw key material ─────────────────────────────────
        const publishableKey: string = generatePublishableKey(environment);
        const secretKey: string = generateSecretKey(environment);

        // ── 2. Hash the secret key (bcrypt, 12 rounds) ──────────────────
        const secretKeyHash: string = await hashSecretKey(secretKey);

        // ── 3. Persist inside a transaction ──────────────────────────────
        await client.query('BEGIN');

        const insertQuery: string = `
            INSERT INTO api_keys (tenant_id, name, publishable_key, secret_key_hash, environment, status, is_live)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, tenant_id, name, publishable_key, environment, status, is_live, created_at;
        `;

        const values: any[] = [tenantId, keyName, publishableKey, secretKeyHash, environment, 'active', isLive];
        
        const result = await client.query<ApiKeyRow>(insertQuery, values);

        await client.query('COMMIT');

        const row: ApiKeyRow | undefined = result.rows[0];

        if (!row) {
            throw new Error('Insert succeeded but returned no rows — unexpected state.');
        }

        // ── 4. Return the raw secret key (one-time disclosure) ───────────
        res.status(201).json({
            message: `${isLive ? 'Live' : 'Test'} API key generated successfully. Store your secret key securely — it will not be shown again.`,
            api_key: {
                id: row.id,
                tenant_id: row.tenant_id,
                name: row.name,
                publishable_key: row.publishable_key,
                secret_key: secretKey,
                environment: row.environment,
                status: row.status,
                is_live: row.is_live,
                created_at: row.created_at,
            }
        });

    } catch (error: unknown) {
        // Rollback the transaction on any failure.
        await client.query('ROLLBACK');

        const errorMessage: string = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error generating API key:', errorMessage);

        res.status(500).json({ error: 'Internal server error while generating API key.' });
    } finally {
        // Always release the client back to the pool.
        client.release();
    }
};

/**
 * GET /api/tenants/keys
 *
 * Lists all active API keys for the authenticated tenant.
 * Crucially omits the secret_key_hash.
 */
export const listApiKeys = async (
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
            SELECT id, name, publishable_key, environment, status, is_live, created_at
            FROM api_keys
            WHERE tenant_id = $1 AND status = 'active'
            ORDER BY created_at DESC;
        `;

        const result = await db.query(query, [tenantId]);

        res.status(200).json({ keys: result.rows });
    } catch (error: unknown) {
        const errorMessage: string = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching API keys:', errorMessage);

        res.status(500).json({ error: 'Internal server error while fetching API keys.' });
    }
};

/**
 * DELETE /api/tenants/keys/:keyId
 *
 * Soft-deletes an API key by setting its status to 'revoked'.
 * Ensures the key belongs to the authenticated tenant.
 */
export const revokeApiKey = async (
    req: Request,
    res: Response
): Promise<void> => {
    const tenantId: string | undefined = req.tenant?.id;
    const { keyId } = req.params;

    if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized: Tenant identity not found on request.' });
        return;
    }

    if (!keyId) {
        res.status(400).json({ error: 'Bad Request: keyId parameter is required.' });
        return;
    }

    try {
        const query = `
            UPDATE api_keys 
            SET status = 'revoked' 
            WHERE id = $1 AND tenant_id = $2
            RETURNING id;
        `;

        const result = await db.query(query, [keyId, tenantId]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Not Found: API key does not exist or does not belong to this tenant.' });
            return;
        }

        res.status(200).json({ message: 'API key successfully revoked.' });
    } catch (error: unknown) {
        const errorMessage: string = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error revoking API key:', errorMessage);

        res.status(500).json({ error: 'Internal server error while revoking API key.' });
    }
};
