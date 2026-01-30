/**
 * OneZap SaaS - Firebase Cloud Functions
 * Backend API para gerenciamento de instâncias WhatsApp e IA
 */

const { onRequest } = require("firebase-functions/v2/https");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const cors = require("cors");
const express = require("express");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// CORS configuration
const corsHandler = cors({ origin: true });

// ==========================================
// INSTANCES API - Gerenciamento de WhatsApp
// ==========================================

/**
 * Lista todas as instâncias do usuário autenticado
 */
exports.listInstances = onCall({ region: "southamerica-east1" }, async (request) => {
    // Verificar autenticação
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Usuário não autenticado");
    }

    const userId = request.auth.uid;

    try {
        const snapshot = await db
            .collection("instances")
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .get();

        const instances = [];
        snapshot.forEach((doc) => {
            instances.push({ id: doc.id, ...doc.data() });
        });

        return { instances };
    } catch (error) {
        console.error("Error listing instances:", error);
        throw new HttpsError("internal", "Erro ao listar instâncias");
    }
});

/**
 * Cria uma nova instância WhatsApp
 */
exports.createInstance = onCall({ region: "southamerica-east1" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Usuário não autenticado");
    }

    const userId = request.auth.uid;
    const { name } = request.data;

    if (!name || name.trim() === "") {
        throw new HttpsError("invalid-argument", "Nome da instância é obrigatório");
    }

    try {
        // Verificar limite de instâncias do plano
        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.data() || {};
        const instanceLimit = userData.instanceLimit || 1;

        const existingInstances = await db
            .collection("instances")
            .where("userId", "==", userId)
            .count()
            .get();

        if (existingInstances.data().count >= instanceLimit) {
            throw new HttpsError(
                "resource-exhausted",
                `Limite de ${instanceLimit} instância(s) atingido. Faça upgrade do plano.`
            );
        }

        // Criar instância
        const instanceRef = await db.collection("instances").add({
            userId,
            name: name.trim(),
            status: "disconnected",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            phoneNumber: null,
            aiEnabled: true,
            aiProvider: "openai", // openai, gemini, deepseek
            settings: {
                responseDelay: 2000,
                includeContactName: true,
                typingSimulation: true,
            },
        });

        return {
            success: true,
            instanceId: instanceRef.id,
            message: "Instância criada com sucesso"
        };
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        console.error("Error creating instance:", error);
        throw new HttpsError("internal", "Erro ao criar instância");
    }
});

/**
 * Deleta uma instância WhatsApp
 */
exports.deleteInstance = onCall({ region: "southamerica-east1" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Usuário não autenticado");
    }

    const userId = request.auth.uid;
    const { instanceId } = request.data;

    if (!instanceId) {
        throw new HttpsError("invalid-argument", "ID da instância é obrigatório");
    }

    try {
        const instanceRef = db.collection("instances").doc(instanceId);
        const instanceDoc = await instanceRef.get();

        if (!instanceDoc.exists) {
            throw new HttpsError("not-found", "Instância não encontrada");
        }

        if (instanceDoc.data().userId !== userId) {
            throw new HttpsError("permission-denied", "Sem permissão para deletar esta instância");
        }

        // TODO: Desconectar do WhatsApp Service antes de deletar

        // Deletar subcoleções (conversations, messages)
        const conversations = await instanceRef.collection("conversations").get();
        const batch = db.batch();
        conversations.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        // Deletar instância
        await instanceRef.delete();

        return { success: true, message: "Instância deletada com sucesso" };
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        console.error("Error deleting instance:", error);
        throw new HttpsError("internal", "Erro ao deletar instância");
    }
});

/**
 * Atualiza configurações de uma instância
 */
exports.updateInstanceSettings = onCall({ region: "southamerica-east1" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Usuário não autenticado");
    }

    const userId = request.auth.uid;
    const { instanceId, settings } = request.data;

    if (!instanceId) {
        throw new HttpsError("invalid-argument", "ID da instância é obrigatório");
    }

    try {
        const instanceRef = db.collection("instances").doc(instanceId);
        const instanceDoc = await instanceRef.get();

        if (!instanceDoc.exists) {
            throw new HttpsError("not-found", "Instância não encontrada");
        }

        if (instanceDoc.data().userId !== userId) {
            throw new HttpsError("permission-denied", "Sem permissão para editar esta instância");
        }

        await instanceRef.update({
            settings: { ...instanceDoc.data().settings, ...settings },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, message: "Configurações atualizadas" };
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        console.error("Error updating settings:", error);
        throw new HttpsError("internal", "Erro ao atualizar configurações");
    }
});

// ==========================================
// AI PROXY API - Chamadas para OpenAI/Gemini
// ==========================================

/**
 * Proxy para chamadas de IA
 * NOTA: As chaves de IA são fornecidas pelo usuário final, não pelo sistema
 */
exports.aiProxy = onCall({
    region: "southamerica-east1"
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Usuário não autenticado");
    }

    const { provider, prompt, apiKey, assistantId, threadId } = request.data;

    if (!provider || !prompt || !apiKey) {
        throw new HttpsError("invalid-argument", "Provider, prompt e apiKey são obrigatórios");
    }

    try {
        // As chamadas de IA são feitas pelo WhatsApp Service usando a chave do usuário
        // Esta função é placeholder para futuras integrações centralizadas
        return {
            success: true,
            message: "IA processada pelo WhatsApp Service",
            provider,
        };
    } catch (error) {
        console.error("AI Proxy error:", error);
        throw new HttpsError("internal", "Erro ao processar IA");
    }
});

// ==========================================
// STRIPE - Checkout & Webhook
// ==========================================

// Plan configuration
const PLANS = {
    'price_1SvM30E2XdlqoMJxl4mxssTZ': { name: 'starter', instanceLimit: 1 },
    'price_1SvM30E2XdlqoMJxtYVMRMSH': { name: 'pro', instanceLimit: 3 },
    'price_1SvM31E2XdlqoMJxr00bdLXv': { name: 'business', instanceLimit: 10 },
};

/**
 * Create Stripe Checkout Session
 */
exports.createCheckoutSession = onCall({
    region: "southamerica-east1",
    secrets: ["STRIPE_SECRET_KEY"]
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Usuário não autenticado");
    }

    const { priceId, successUrl, cancelUrl } = request.data;

    if (!priceId || !PLANS[priceId]) {
        throw new HttpsError("invalid-argument", "Plano inválido");
    }

    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const userId = request.auth.uid;
        const userEmail = request.auth.token.email;

        // Check if user already has a Stripe customer
        const userDoc = await db.collection("users").doc(userId).get();
        let customerId = userDoc.data()?.stripeCustomerId;

        if (!customerId) {
            // Create Stripe customer
            const customer = await stripe.customers.create({
                email: userEmail,
                metadata: { firebaseUserId: userId }
            });
            customerId = customer.id;

            // Save customer ID
            await db.collection("users").doc(userId).update({
                stripeCustomerId: customerId
            });
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { userId, priceId }
        });

        return { url: session.url, sessionId: session.id };
    } catch (error) {
        console.error("Checkout error:", error);
        throw new HttpsError("internal", "Erro ao criar checkout");
    }
});

/**
 * Stripe Webhook Handler
 */
const stripeWebhookApp = express();
stripeWebhookApp.use(express.raw({ type: "application/json" }));

stripeWebhookApp.post("/", async (req, res) => {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        const sig = req.headers['stripe-signature'];
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const { userId, priceId } = session.metadata;
                const plan = PLANS[priceId];

                if (userId && plan) {
                    await db.collection("users").doc(userId).update({
                        plan: plan.name,
                        instanceLimit: plan.instanceLimit,
                        subscriptionId: session.subscription,
                        subscriptionStatus: 'active',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`User ${userId} upgraded to ${plan.name}`);
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const customerId = subscription.customer;

                // Find user by customer ID
                const usersSnapshot = await db.collection("users")
                    .where("stripeCustomerId", "==", customerId)
                    .limit(1)
                    .get();

                if (!usersSnapshot.empty) {
                    const userDoc = usersSnapshot.docs[0];
                    await userDoc.ref.update({
                        subscriptionStatus: subscription.status,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customerId = subscription.customer;

                const usersSnapshot = await db.collection("users")
                    .where("stripeCustomerId", "==", customerId)
                    .limit(1)
                    .get();

                if (!usersSnapshot.empty) {
                    const userDoc = usersSnapshot.docs[0];
                    await userDoc.ref.update({
                        plan: 'free',
                        instanceLimit: 1,
                        subscriptionStatus: 'canceled',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                break;
            }
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error("Webhook processing error:", error);
        res.status(500).json({ error: "Webhook processing failed" });
    }
});

exports.stripeWebhook = onRequest({
    region: "southamerica-east1",
    secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]
}, stripeWebhookApp);

// ==========================================
// HEALTH CHECK
// ==========================================

exports.healthCheck = onRequest({ region: "southamerica-east1" }, (req, res) => {
    corsHandler(req, res, () => {
        res.status(200).json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            version: "1.0.0",
        });
    });
});

