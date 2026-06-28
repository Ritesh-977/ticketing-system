import { type Request, type Response } from 'express';
import { db } from '../config/database.js';

export const createTestEvent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { inventory } = req.body;
        
        // Grab the first active LIVE tenant key to use for testing
        const keyRes = await db.query(`SELECT tenant_id, is_live, publishable_key FROM api_keys WHERE status = 'active' AND is_live = true LIMIT 1`);
        if (keyRes.rows.length === 0) {
            res.status(400).json({ error: 'No active Live tenants found.' });
            return;
        }
        
        const { tenant_id, is_live, publishable_key } = keyRes.rows[0];

        const eventRes = await db.query(`
            INSERT INTO events (tenant_id, name, total_inventory, status, is_live) 
            VALUES ($1, 'Flash Sale Event', $2, 'UPCOMING', $3) 
            RETURNING id, total_inventory
        `, [tenant_id, inventory || 1, is_live]);

        res.status(200).json({
            message: 'Test event created',
            eventId: eventRes.rows[0].id,
            inventory: eventRes.rows[0].total_inventory,
            publishableKey: publishable_key
        });
    } catch (error) {
        console.error('Test Setup Error:', error);
        res.status(500).json({ error: 'Failed to create test event' });
    }
};
