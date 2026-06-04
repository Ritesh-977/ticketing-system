import express from 'express';
import { getUsage } from '../controllers/billingController.js';
import { requireAuth } from '../middleware/jwtMiddleware.js';

const router = express.Router();

// All billing routes require JWT authentication
// NOTE: No trackApiUsage here — billing/meta endpoints should not
// count toward a tenant's billable API usage.
router.use(requireAuth);

/**
 * @openapi
 * /api/billing/usage:
 *   get:
 *     tags:
 *       - Billing
 *     summary: Get daily API usage data (last 7 days) for the authenticated tenant
 *     description: |
 *       Returns a 7-day rolling window of daily usage from PostgreSQL merged
 *       with the live Redis counter for today. Days with no traffic are
 *       backfilled as 0 so the chart never has gaps.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Usage data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tenant_id:
 *                   type: string
 *                   format: uuid
 *                 usage:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       usage_date:
 *                         type: string
 *                         format: date
 *                         example: "2026-06-03"
 *                       total_requests:
 *                         type: integer
 *                         example: 245
 *                       live:
 *                         type: boolean
 *                         description: Present and true only for today with un-flushed Redis data
 *       401:
 *         description: Unauthorized (missing or invalid JWT)
 *       500:
 *         description: Internal server error
 */
router.get('/usage', getUsage);

export default router;
