import amqp from 'amqplib';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { db } from '../config/database.js';
import { dispatchWebhook } from '../services/webhookDispatcher.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const startTicketWorker = async () => {
    try {
        const amqpUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        const connection = await amqp.connect(amqpUrl);
        const channel = await connection.createChannel();
        const queue = 'ticket_fulfillment_queue';

        await channel.assertQueue(queue, { durable: true });
        
        // Process one message at a time
        channel.prefetch(1);

        console.log(`👷 Worker started. Listening for messages in ${queue}...`);

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                try {
                    const payload = JSON.parse(msg.content.toString());
                    const { ticketId, eventId, seatId, userId, userEmail } = payload;
                    
                    console.log(`Processing ticket fulfillment for Ticket ID: ${ticketId}`);

                    // 1. Generate QR Code containing mock validation URL
                    const validationUrl = `https://kampus-ticketing.com/validate/${ticketId}`;
                    const qrCodeDataUri = await QRCode.toDataURL(validationUrl);

                    // 2. Generate professional-looking digital ticket (PDF) in memory
                    const doc = new PDFDocument({ margin: 50 });
                    
                    // Temporarily save PDF to local file system for testing
                    const outputDir = path.join(__dirname, '../../temp_tickets');
                    if (!fs.existsSync(outputDir)) {
                        fs.mkdirSync(outputDir, { recursive: true });
                    }
                    const filePath = path.join(outputDir, `ticket_${ticketId}.pdf`);
                    const writeStream = fs.createWriteStream(filePath);

                    doc.pipe(writeStream);

                    // --- PDF Design ---
                    doc.fontSize(25).text('Kampus Ticketing System', { align: 'center' });
                    doc.moveDown();
                    
                    doc.fontSize(18).text(`Event Ticket`, { align: 'center' });
                    doc.moveDown();

                    doc.fontSize(14).text(`Ticket ID: ${ticketId}`);
                    doc.text(`Event ID: ${eventId}`);
                    doc.text(`Seat ID: ${seatId}`);
                    doc.text(`User ID: ${userId}`);
                    doc.text(`Email: ${userEmail}`);
                    doc.moveDown();

                    // Embed the generated QR Code image
                    // The qrCodeDataUri starts with "data:image/png;base64,", so we extract just the base64 part
                    const base64Data = qrCodeDataUri.replace(/^data:image\/png;base64,/, "");
                    const qrImageBuffer = Buffer.from(base64Data, 'base64');
                    
                    doc.image(qrImageBuffer, {
                        fit: [150, 150],
                        align: 'center',
                        valign: 'center'
                    });

                    doc.end();

                    writeStream.on('finish', async () => {
                        console.log(`✅ PDF Ticket generated locally at: ${filePath}`);
                        
                        // 3. Email Delivery Placeholder
                        // TODO: Implement email delivery here (e.g., AWS SES, Resend)
                        // Example: await emailService.sendTicketWithAttachment(userEmail, filePath);
                        console.log(`📧 (Placeholder) Email sent to ${userEmail} with ticket attachment.`);

                        // 4. Dispatch the Webhook Event
                        try {
                            // Find the tenant for this webhook to dispatch properly
                            const webhookRes = await db.query('SELECT tenant_id FROM webhooks LIMIT 1');
                            if (webhookRes.rows.length > 0) {
                                const tenantId = webhookRes.rows[0].tenant_id;
                                await dispatchWebhook(
                                    tenantId,
                                    'ticket.purchased',
                                    {
                                        ticketId,
                                        eventId,
                                        seatId,
                                        userId,
                                        userEmail,
                                        ticketUrl: validationUrl
                                    },
                                    true // isLive
                                );
                                console.log(`🚀 Webhook dispatched for ticket ${ticketId}`);
                            }
                        } catch (webhookErr) {
                            console.error('Error dispatching webhook:', webhookErr);
                        }

                        // 5. Acknowledge message after successful generation
                        channel.ack(msg);
                    });

                    writeStream.on('error', (err) => {
                        console.error('Error writing PDF to stream:', err);
                        // Requeue message if writing failed
                        channel.nack(msg);
                    });

                } catch (error) {
                    console.error('Error processing ticket message:', error);
                    // Nack and don't requeue to avoid infinite loops on bad payloads, or push to DLQ
                    channel.nack(msg, false, false); 
                }
            }
        }, {
            noAck: false // Manual acknowledgement
        });

    } catch (error) {
        console.error('Worker failed to start:', error);
    }
};
