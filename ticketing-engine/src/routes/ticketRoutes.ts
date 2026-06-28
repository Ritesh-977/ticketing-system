import express from 'express';
import { issueTicket } from '../controllers/ticketController.js';
import { requireSecretKey } from '../middleware/auth.js';
import { trackApiUsage } from '../middleware/usageTracker.js';

const router = express.Router();

// POST /api/v1/tickets/issue
router.post('/issue', requireSecretKey, trackApiUsage, issueTicket);

export default router;
