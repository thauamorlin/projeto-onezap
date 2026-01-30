import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../firebase/AuthContext';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app from '../../firebase/config';
import { PLANS, PLAN_ORDER } from '../../config/stripe';
import LogoImage from '../../img/logo.png';

const functions = getFunctions(app, 'southamerica-east1');

export default function PricingPage() {
    const { user, userProfile } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = React.useState(null);

    const handleSelectPlan = async (planId) => {
        if (!user) {
            navigate('/register');
            return;
        }

        setLoading(planId);

        try {
            const createCheckout = httpsCallable(functions, 'createCheckoutSession');
            const result = await createCheckout({
                priceId: PLANS[planId].priceId,
                successUrl: window.location.origin + '/dashboard?success=true',
                cancelUrl: window.location.origin + '/pricing',
            });

            // Redirect to Stripe Checkout
            window.location.href = result.data.url;
        } catch (error) {
            console.error('Error creating checkout:', error);
            alert('Erro ao iniciar pagamento. Tente novamente.');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-dashboardBg py-16 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <img src={LogoImage} alt="OneZap" className="h-12 mx-auto mb-4" />
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Escolha seu plano
                    </h1>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Automatize seu WhatsApp com inteligência artificial.
                        Cancele quando quiser, sem fidelidade.
                    </p>
                </div>

                {/* Plans Grid */}
                <div className="grid md:grid-cols-3 gap-8">
                    {PLAN_ORDER.map((planId) => {
                        const plan = PLANS[planId];
                        const isCurrentPlan = userProfile?.plan === planId;

                        return (
                            <div
                                key={plan.id}
                                className={`relative bg-dashboardCard rounded-2xl p-8 border ${plan.popular
                                        ? 'border-primaryColor ring-2 ring-primaryColor/20'
                                        : 'border-gray-800'
                                    }`}
                            >
                                {/* Popular Badge */}
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="bg-primaryColor text-white text-xs font-bold px-4 py-1 rounded-full">
                                            MAIS POPULAR
                                        </span>
                                    </div>
                                )}

                                {/* Plan Name */}
                                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>

                                {/* Price */}
                                <div className="mb-6">
                                    <span className="text-4xl font-bold text-white">
                                        R${plan.price.toFixed(2).replace('.', ',')}
                                    </span>
                                    <span className="text-gray-400">/mês</span>
                                </div>

                                {/* Features */}
                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2 text-gray-300">
                                            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                <button
                                    onClick={() => handleSelectPlan(plan.id)}
                                    disabled={loading || isCurrentPlan}
                                    className={`w-full py-3 px-4 rounded-xl font-medium transition-colors ${isCurrentPlan
                                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                            : plan.popular
                                                ? 'bg-primaryColor text-white hover:bg-primaryColor/90'
                                                : 'bg-gray-700 text-white hover:bg-gray-600'
                                        }`}
                                >
                                    {loading === plan.id ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Processando...
                                        </span>
                                    ) : isCurrentPlan ? (
                                        'Plano Atual'
                                    ) : (
                                        'Começar agora'
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* FAQ / Trust */}
                <div className="mt-16 text-center">
                    <p className="text-gray-500 text-sm">
                        ✓ Pagamento seguro via Stripe &nbsp;•&nbsp;
                        ✓ Cancele a qualquer momento &nbsp;•&nbsp;
                        ✓ Garantia de 7 dias
                    </p>
                </div>
            </div>
        </div>
    );
}
