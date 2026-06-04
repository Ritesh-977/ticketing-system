import { type Request, type Response } from 'express';
import { db } from '../config/database.js';

// 1. Create a new Flash Sale Event
export const createEvent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, total_inventory } = req.body;

        // The Tenant ID is securely provided by our Auth Middleware, not the user!
        const tenantId = req.tenant?.id;

        // Basic validation
        if (!name || typeof total_inventory !== 'number' || total_inventory < 0) {
            res.status(400).json({ error: 'Valid name and positive total_inventory are required.' });
            return;
        }

        // Insert into PostgreSQL
        const insertQuery = `
      INSERT INTO events (tenant_id, name, total_inventory, status, is_live)
      VALUES ($1, $2, $3, 'DRAFT', $4)
      RETURNING id, name, total_inventory, status, created_at;
    `;

        const result = await db.query(insertQuery, [tenantId, name, total_inventory, req.isLive]);

        res.status(201).json({
            message: 'Event created successfully',
            event: result.rows[0]
        });

    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 2. Get all Events for the authenticated Tenant
export const getEvents = async (req: Request, res: Response): Promise<void> => {
    try {
        const tenantId = req.tenant?.id;

        // MUST filter by tenant_id AND is_live to ensure strict isolation
        const query = `
      SELECT id, name, total_inventory, status, created_at 
      FROM events 
      WHERE tenant_id = $1 AND is_live = $2
      ORDER BY created_at DESC;
    `;

        const result = await db.query(query, [tenantId, req.isLive]);

        res.status(200).json({
            events: result.rows
        });

    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

//Public Route - Get Single Event Inventory
export const getEventInventory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId } = req.params;
        const tenantId = req.tenant?.id;

        // We must check event_id, tenant_id, AND is_live to ensure a developer 
        // isn't using their key to peek at another developer's event or mix environments.
        const query = `
      SELECT id, name, total_inventory, status 
      FROM events 
      WHERE id = $1 AND tenant_id = $2 AND is_live = $3;
    `;

        const result = await db.query(query, [eventId, tenantId, req.isLive]);

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Event not found or does not belong to this tenant.' });
            return;
        }

        res.status(200).json({
            event: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};