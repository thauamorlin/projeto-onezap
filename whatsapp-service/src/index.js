/**
 * OneZap WhatsApp Service
 * Serviço que gerencia conexões WhatsApp usando Baileys
 * Roda como container Cloud Run ou VPS
 */

const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const admin = require('firebase-admin');
const pino = require('pino');
const BaileysManager = require('./baileys/manager');

// Logger
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty' }
        : undefined
});

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || 'onezap-saas'
    });
}

const db = admin.firestore();

// Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server, path: '/ws' });

// Store active connections
const wsClients = new Map();

wss.on('connection', (ws, req) => {
    const instanceId = req.url.split('instanceId=')[1];
    logger.info({ instanceId }, 'WebSocket client connected');

    if (instanceId) {
        wsClients.set(instanceId, ws);

        ws.on('close', () => {
            wsClients.delete(instanceId);
            logger.info({ instanceId }, 'WebSocket client disconnected');
        });
    }
});

// Broadcast to specific instance
function broadcastToInstance(instanceId, event, data) {
    const ws = wsClients.get(instanceId);
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ event, data }));
    }
}

// Baileys Manager
const baileysManager = new BaileysManager(db, broadcastToInstance, logger);

// ==========================================
// REST API ROUTES
// ==========================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        activeConnections: baileysManager.getActiveCount()
    });
});

// Start WhatsApp connection (returns QR code)
app.post('/instances/:instanceId/connect', async (req, res) => {
    try {
        const { instanceId } = req.params;
        const { userId } = req.body;

        // Verify instance ownership (subcollection: users/{userId}/instances/{instanceId})
        if (!userId) {
            return res.status(400).json({ error: 'userId é obrigatório' });
        }
        const instanceDoc = await db.collection('users').doc(userId).collection('instances').doc(instanceId).get();
        if (!instanceDoc.exists) {
            return res.status(403).json({ error: 'Instância não encontrada ou acesso negado' });
        }

        // Start connection
        const result = await baileysManager.connect(instanceId);
        res.json(result);
    } catch (error) {
        logger.error({ error }, 'Error connecting instance');
        res.status(500).json({ error: error.message });
    }
});

// Disconnect WhatsApp
app.post('/instances/:instanceId/disconnect', async (req, res) => {
    try {
        const { instanceId } = req.params;
        const { userId } = req.body;

        // Verify instance ownership (subcollection: users/{userId}/instances/{instanceId})
        if (!userId) {
            return res.status(400).json({ error: 'userId é obrigatório' });
        }
        const instanceDoc = await db.collection('users').doc(userId).collection('instances').doc(instanceId).get();
        if (!instanceDoc.exists) {
            return res.status(403).json({ error: 'Instância não encontrada ou acesso negado' });
        }

        await baileysManager.disconnect(instanceId);
        res.json({ success: true, message: 'Desconectado com sucesso' });
    } catch (error) {
        logger.error({ error }, 'Error disconnecting instance');
        res.status(500).json({ error: error.message });
    }
});

// Get connection status
app.get('/instances/:instanceId/status', async (req, res) => {
    try {
        const { instanceId } = req.params;
        const status = baileysManager.getStatus(instanceId);
        res.json(status);
    } catch (error) {
        logger.error({ error }, 'Error getting status');
        res.status(500).json({ error: error.message });
    }
});

// Send message
app.post('/instances/:instanceId/send', async (req, res) => {
    try {
        const { instanceId } = req.params;
        const { to, message, userId } = req.body;

        // Verify instance ownership (subcollection: users/{userId}/instances/{instanceId})
        if (!userId) {
            return res.status(400).json({ error: 'userId é obrigatório' });
        }
        const instanceDoc = await db.collection('users').doc(userId).collection('instances').doc(instanceId).get();
        if (!instanceDoc.exists) {
            return res.status(403).json({ error: 'Instância não encontrada ou acesso negado' });
        }

        const result = await baileysManager.sendMessage(instanceId, to, message);
        res.json(result);
    } catch (error) {
        logger.error({ error }, 'Error sending message');
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    logger.info({ port: PORT }, 'WhatsApp Service started');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down...');
    await baileysManager.disconnectAll();
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});
