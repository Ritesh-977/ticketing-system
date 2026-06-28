import http from 'http';
import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initSocketServer } from './sockets/socketServer.js';

import './config/database.js';
import './config/redis.js';

// Import routes
import tenantRoutes from './routes/tenantRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import authRoutes from './routes/authRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import { setupSwagger } from './config/swagger.js';
import { mq } from './config/rabbitmq.js';
import { startNotificationWorker } from './workers/notificationWorker.js';
import { startBillingCron } from './workers/billingCron.js';
import { initRabbitMQ } from './services/webhookQueue.js';
import { startWebhookWorker } from './workers/webhookWorker.js';
import { startTicketWorker } from './workers/ticketWorker.js';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Create a raw HTTP server so that Socket.io can share the same port as Express
const httpServer = http.createServer(app);

// Security and Parsing Middleware
app.use(helmet()); // Secures HTTP headers
const allowedOrigins = process.env.FRONTEND_URLS ? process.env.FRONTEND_URLS.split(',').map(o => o.trim()) : ['https://ticketing-system-virid.vercel.app', 'http://localhost:5173'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
})); // Allows cross-origin requests

// Attach Socket.io to the shared HTTP server (must be after CORS is configured)
initSocketServer(httpServer, allowedOrigins);
app.use(express.json()); // Parses incoming JSON payloads

import { createTestEvent } from './controllers/testController.js';

// Register API Routes
app.post('/api/test-setup', createTestEvent);
app.use('/api/tenants', tenantRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/v1/tickets', ticketRoutes);

// Health Check Endpoint (To verify the server is alive)
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'success',
        message: 'Ticketing Engine API is running',
        timestamp: new Date().toISOString()
    });
});

// Initialize Swagger Documentation UI
setupSwagger(app);

// Start the HTTP server (Express + Socket.io share the same port)
httpServer.listen(PORT, async () => {
    console.log(`🚀 API Gateway is running on http://localhost:${PORT}`);
    console.log(`📚 Swagger Docs available at http://localhost:${PORT}/api-docs`);
    console.log(`🔌 WebSocket server is available on ws://localhost:${PORT}`);

    // Initialize RabbitMQ and start the background worker
    await mq.connect();
    await initRabbitMQ(); // New Webhooks RabbitMQ
    startNotificationWorker();
    startWebhookWorker(); // New Webhook Worker
    startTicketWorker(); // Ticket fulfillment worker
    startBillingCron();
});