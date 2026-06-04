import express from 'express';
import { createWebhook, listWebhooks, listDeliveries } from '../controllers/webhookController.js';
import { requireAuth } from '../middleware/jwtMiddleware.js';

const router = express.Router();

// All webhook routes require JWT authentication
router.use(requireAuth);

/**
 * @openapi
 * /api/webhooks:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Register a new webhook endpoint
 *     description: |
 *       Creates a new webhook endpoint for the authenticated tenant.
 *       A unique signing secret (prefixed with `whsec_`) is automatically
 *       generated and returned in the response. Use this secret to verify
 *       incoming webhook payloads via HMAC-SHA256.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - endpoint_url
 *               - events
 *             properties:
 *               endpoint_url:
 *                 type: string
 *                 format: uri
 *                 example: "https://api.yourapp.com/webhooks"
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["ticket.purchased", "event.created"]
 *     responses:
 *       201:
 *         description: Webhook registered successfully
 *       400:
 *         description: Validation error (invalid URL or events)
 *       401:
 *         description: Unauthorized (missing or invalid JWT)
 *       500:
 *         description: Internal server error
 */
router.post('/', createWebhook);

/**
 * @openapi
 * /api/webhooks:
 *   get:
 *     tags:
 *       - Webhooks
 *     summary: List all webhook endpoints for the authenticated tenant
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved webhooks
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', listWebhooks);

/**
 * @openapi
 * /api/webhooks/deliveries:
 *   get:
 *     tags:
 *       - Webhooks
 *     summary: List webhook delivery logs
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved deliveries
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/deliveries', listDeliveries);

export default router;
