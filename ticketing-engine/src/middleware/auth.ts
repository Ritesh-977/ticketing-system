import { type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../config/database.js';

/**
 * Middleware: requirePublishableKey
 * Purpose: Secures public-facing routes (e.g., checking inventory).
 */
export const requirePublishableKey = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const pubKey = req.headers['x-publishable-key'] as string;

        if (!pubKey || typeof pubKey !== 'string') {
            res.status(401).json({ error: 'Missing or invalid x-publishable-key header.' });
            return;
        }

        // Detect expected environment from the key prefix
        const isLiveRequest = pubKey.includes('_live_');
        const isTestRequest = pubKey.includes('_test_');

        if (!isLiveRequest && !isTestRequest) {
            res.status(401).json({ error: 'Invalid API key format.' });
            return;
        }

        const query = `
            SELECT tenant_id, is_live 
            FROM api_keys 
            WHERE publishable_key = $1 AND status = 'active';
        `;
        const result = await db.query(query, [pubKey]);

        if (result.rows.length === 0) {
            res.status(401).json({ error: 'Invalid or inactive Publishable Key.' });
            return;
        }

        const { tenant_id, is_live } = result.rows[0];

        // Security check: Ensure the database environment matches the key prefix
        if (isLiveRequest !== is_live) {
            res.status(401).json({ error: 'Key environment mismatch.' });
            return;
        }

        req.tenantId = tenant_id;
        req.tenant = { id: tenant_id };
        req.isLive = is_live;
        next();
    } catch (error) {
        console.error('requirePublishableKey error:', error);
        res.status(500).json({ error: 'Internal server error during public authentication.' });
    }
};

/**
 * Middleware: requireSecretKey
 * Purpose: Secures admin routes (e.g., creating events, revoking keys).
 * Extraction: x-publishable-key (username) + Authorization: Bearer sk_... (password)
 */
export const requireSecretKey = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const pubKey = req.headers['x-publishable-key'] as string;
        const authHeader = req.headers.authorization;

        if (!pubKey) {
            res.status(401).json({ error: 'Missing x-publishable-key header (username).' });
            return;
        }

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Missing or invalid Authorization header. Expected Bearer sk_...' });
            return;
        }

        const rawSecretKey = authHeader.split(' ')[1];

        if (!rawSecretKey || (!rawSecretKey.startsWith('sk_live_') && !rawSecretKey.startsWith('sk_test_'))) {
            res.status(401).json({ error: 'Invalid key format. Secret key required.' });
            return;
        }

        // Detect expected environment from the publishable key prefix
        const isLiveRequest = pubKey.includes('_live_');
        const isTestRequest = pubKey.includes('_test_');

        if (!isLiveRequest && !isTestRequest) {
            res.status(401).json({ error: 'Invalid API key format.' });
            return;
        }

        // Ensure both keys match the same environment
        const secretIsLive = rawSecretKey.includes('_live_');
        if (isLiveRequest !== secretIsLive) {
            res.status(401).json({ error: 'Publishable and Secret key environment mismatch.' });
            return;
        }

        // 1. Retrieve the secret_key_hash using the publishable_key
        const query = `
            SELECT tenant_id, secret_key_hash, is_live 
            FROM api_keys 
            WHERE publishable_key = $1 AND status = 'active';
        `;
        const result = await db.query(query, [pubKey]);

        if (result.rows.length === 0) {
            res.status(401).json({ error: 'Invalid credentials. Publishable key not found or inactive.' });
            return;
        }

        const { tenant_id, secret_key_hash, is_live } = result.rows[0];

        // Security check: Ensure the database environment matches the key prefix
        if (isLiveRequest !== is_live) {
            res.status(401).json({ error: 'Key environment mismatch.' });
            return;
        }

        // 2. Cryptographically verify the secret key
        const isValid = await bcrypt.compare(rawSecretKey, secret_key_hash);

        if (!isValid) {
            res.status(401).json({ error: 'Invalid credentials. Secret key mismatch.' });
            return;
        }

        req.tenantId = tenant_id;
        req.tenant = { id: tenant_id };
        req.isLive = is_live;
        next();
    } catch (error) {
        console.error('requireSecretKey error:', error);
        res.status(500).json({ error: 'Internal server error during admin authentication.' });
    }
};
