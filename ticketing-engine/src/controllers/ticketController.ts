import { type Request, type Response } from 'express';
import { redis } from '../config/redis.js';
import { db } from '../config/database.js';
import { mq } from '../config/rabbitmq.js';

export const issueTicket = async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId, seatId, userId, userEmail } = req.body;

        if (!eventId || !seatId || !userId || !userEmail) {
            res.status(400).json({ error: 'Missing required fields: eventId, seatId, userId, userEmail' });
            return;
        }

        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // 1. Delete the temporary Redis seat lock
            const lockKey = `seat_lock:${eventId}:${seatId}`;
            await redis.del(lockKey);

            // 2. Permanent assignment in PostgreSQL
            const insertQuery = `
                INSERT INTO tickets (event_id, seat_id, user_id, user_email, status, created_at)
                VALUES ($1, $2, $3, $4, 'ISSUED', NOW())
                RETURNING id;
            `;
            const result = await client.query(insertQuery, [eventId, seatId, userId, userEmail]);
            const ticketId = result.rows[0].id;

            await client.query('COMMIT');

            // 3. Publish to RabbitMQ for background fulfillment
            const fulfillmentPayload = {
                ticketId,
                eventId,
                seatId,
                userId,
                userEmail,
                timestamp: new Date().toISOString()
            };

            // Ensure queue exists before publishing (if not done globally)
            if (mq.channel) {
                await mq.channel.assertQueue('ticket_fulfillment_queue', { durable: true });
                mq.channel.sendToQueue('ticket_fulfillment_queue', Buffer.from(JSON.stringify(fulfillmentPayload)), {
                    persistent: true
                });
            } else {
                console.warn('RabbitMQ channel not available. Ticket fulfillment message skipped.');
            }

            // 4. Return immediately - "Fire and Forget"
            res.status(200).json({
                message: 'Ticket issuance initiated successfully',
                ticketId
            });
            return;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error issuing ticket:', error);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
    }
};
