/**
 * Configuração Stripe para OneZap
 */

// Stripe Public Key
export const STRIPE_PUBLIC_KEY = 'pk_live_51SvLzIGX6ZGwgDW9FnLrhzV3InEfspzkZ8bB5gyRicPvT1Bubdk3i80w9djCrDlhJA2FEHqNEjLEpJN57G3Zynyg00yj1R9iDc';

// Planos disponíveis
export const PLANS = {
    starter: {
        id: 'starter',
        name: 'Starter',
        priceId: 'price_1SvM30E2XdlqoMJxl4mxssTZ',
        price: 49.90,
        currency: 'BRL',
        features: [
            '1 conexão WhatsApp',
            'Respostas ilimitadas com IA',
            'OpenAI, Gemini, DeepSeek',
            'Suporte por email',
        ],
        instanceLimit: 1,
        popular: false,
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        priceId: 'price_1SvM30E2XdlqoMJxtYVMRMSH',
        price: 99.90,
        currency: 'BRL',
        features: [
            '3 conexões WhatsApp',
            'Respostas ilimitadas com IA',
            'OpenAI, Gemini, DeepSeek',
            'Suporte prioritário',
            'Relatórios avançados',
        ],
        instanceLimit: 3,
        popular: true,
    },
    business: {
        id: 'business',
        name: 'Business',
        priceId: 'price_1SvM31E2XdlqoMJxr00bdLXv',
        price: 199.90,
        currency: 'BRL',
        features: [
            '10 conexões WhatsApp',
            'Respostas ilimitadas com IA',
            'OpenAI, Gemini, DeepSeek',
            'Suporte 24/7',
            'API access',
            'White label',
        ],
        instanceLimit: 10,
        popular: false,
    },
};

export const PLAN_ORDER = ['starter', 'pro', 'business'];
