/**
 * Baileys Manager
 * Gerencia múltiplas conexões WhatsApp usando Baileys
 */

const makeWASocket = require('@whiskeysockets/baileys').default;
const {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

class BaileysManager {
    constructor(db, broadcast, logger) {
        this.db = db;
        this.broadcast = broadcast;
        this.logger = logger;
        this.connections = new Map();
        this.sessionsDir = process.env.SESSIONS_DIR || '/app/sessions';

        // Ensure sessions directory exists
        if (!fs.existsSync(this.sessionsDir)) {
            fs.mkdirSync(this.sessionsDir, { recursive: true });
        }
    }

    /**
     * Connect to WhatsApp
     */
    async connect(instanceId) {
        this.logger.info({ instanceId }, 'Starting WhatsApp connection');

        // Check if already connected
        if (this.connections.has(instanceId)) {
            const existing = this.connections.get(instanceId);
            if (existing.socket) {
                return {
                    status: 'already_connected',
                    phoneNumber: existing.phoneNumber
                };
            }
        }

        const sessionPath = path.join(this.sessionsDir, instanceId);
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        const socket = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, this.logger),
            },
            printQRInTerminal: false,
            logger: this.logger,
            browser: ['OneZap', 'Chrome', '120.0.0'],
            syncFullHistory: false,
            generateHighQualityLinkPreview: true,
        });

        // Store connection
        this.connections.set(instanceId, {
            socket,
            phoneNumber: null,
            status: 'connecting',
        });

        // Handle credentials update
        socket.ev.on('creds.update', saveCreds);

        // Handle connection updates
        socket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                // Generate QR code as data URL
                const qrDataUrl = await QRCode.toDataURL(qr);
                this.broadcast(instanceId, 'qr', { qr: qrDataUrl });

                // Update Firestore
                await this.db.collection('instances').doc(instanceId).update({
                    status: 'qr_pending',
                    qrCode: qrDataUrl,
                    updatedAt: new Date(),
                });
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                this.logger.info({ instanceId, statusCode, shouldReconnect }, 'Connection closed');

                if (shouldReconnect) {
                    // Reconnect after delay
                    setTimeout(() => this.connect(instanceId), 5000);
                } else {
                    // User logged out - clean up
                    this.connections.delete(instanceId);
                    await this.db.collection('instances').doc(instanceId).update({
                        status: 'disconnected',
                        phoneNumber: null,
                        qrCode: null,
                        updatedAt: new Date(),
                    });
                }

                this.broadcast(instanceId, 'connection', {
                    status: 'disconnected',
                    shouldReconnect
                });
            }

            if (connection === 'open') {
                const phoneNumber = socket.user?.id?.split(':')[0];

                this.connections.set(instanceId, {
                    ...this.connections.get(instanceId),
                    phoneNumber,
                    status: 'connected',
                });

                await this.db.collection('instances').doc(instanceId).update({
                    status: 'connected',
                    phoneNumber,
                    qrCode: null,
                    connectedAt: new Date(),
                    updatedAt: new Date(),
                });

                this.broadcast(instanceId, 'connection', {
                    status: 'connected',
                    phoneNumber
                });

                this.logger.info({ instanceId, phoneNumber }, 'Connected to WhatsApp');
            }
        });

        // Handle incoming messages
        socket.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;

            for (const message of messages) {
                if (message.key.fromMe) continue; // Skip outgoing messages

                const from = message.key.remoteJid;
                const text = message.message?.conversation ||
                    message.message?.extendedTextMessage?.text || '';

                if (!text) continue;

                this.logger.info({ instanceId, from, text }, 'Received message');

                // Broadcast to frontend
                this.broadcast(instanceId, 'message', {
                    from,
                    text,
                    timestamp: message.messageTimestamp,
                    messageId: message.key.id,
                });

                // Save to Firestore
                await this.saveMessage(instanceId, from, text, message);

                // Process with AI if enabled
                await this.processWithAI(instanceId, from, text, message);
            }
        });

        return { status: 'connecting', message: 'Aguardando QR Code...' };
    }

    /**
     * Disconnect from WhatsApp
     */
    async disconnect(instanceId) {
        const conn = this.connections.get(instanceId);
        if (conn?.socket) {
            await conn.socket.logout();
            this.connections.delete(instanceId);
        }

        // Clean up session files
        const sessionPath = path.join(this.sessionsDir, instanceId);
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }

        await this.db.collection('instances').doc(instanceId).update({
            status: 'disconnected',
            phoneNumber: null,
            qrCode: null,
            updatedAt: new Date(),
        });

        this.logger.info({ instanceId }, 'Disconnected from WhatsApp');
    }

    /**
     * Disconnect all connections (for graceful shutdown)
     */
    async disconnectAll() {
        for (const [instanceId, conn] of this.connections) {
            try {
                if (conn.socket) {
                    await conn.socket.end();
                }
            } catch (error) {
                this.logger.error({ instanceId, error }, 'Error disconnecting');
            }
        }
        this.connections.clear();
    }

    /**
     * Get connection status
     */
    getStatus(instanceId) {
        const conn = this.connections.get(instanceId);
        return {
            connected: conn?.status === 'connected',
            status: conn?.status || 'disconnected',
            phoneNumber: conn?.phoneNumber || null,
        };
    }

    /**
     * Get active connections count
     */
    getActiveCount() {
        return this.connections.size;
    }

    /**
     * Send message
     */
    async sendMessage(instanceId, to, message) {
        const conn = this.connections.get(instanceId);
        if (!conn?.socket) {
            throw new Error('Instância não conectada');
        }

        // Format phone number
        const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;

        await conn.socket.sendMessage(jid, { text: message });

        this.logger.info({ instanceId, to: jid }, 'Message sent');

        return { success: true, to: jid };
    }

    /**
     * Save message to Firestore
     */
    async saveMessage(instanceId, from, text, rawMessage) {
        const conversationId = from.replace('@s.whatsapp.net', '').replace('@g.us', '');

        const conversationRef = this.db
            .collection('instances')
            .doc(instanceId)
            .collection('conversations')
            .doc(conversationId);

        // Update or create conversation
        await conversationRef.set({
            lastMessage: text.substring(0, 100),
            lastMessageAt: new Date(),
            updatedAt: new Date(),
        }, { merge: true });

        // Add message
        await conversationRef.collection('messages').add({
            from,
            text,
            isFromMe: false,
            timestamp: new Date(rawMessage.messageTimestamp * 1000),
            createdAt: new Date(),
        });
    }

    /**
     * Process message with AI
     */
    async processWithAI(instanceId, from, text, rawMessage) {
        try {
            // Get instance settings
            const instanceDoc = await this.db.collection('instances').doc(instanceId).get();
            const instance = instanceDoc.data();

            if (!instance?.aiEnabled) return;

            // TODO: Call AI service and send response
            // This will be implemented when connecting to the AI Functions

            this.logger.info({ instanceId, from }, 'AI processing pending implementation');
        } catch (error) {
            this.logger.error({ instanceId, error }, 'Error processing with AI');
        }
    }
}

module.exports = BaileysManager;
