import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../firebase/AuthContext';
import LogoImage from '../../img/logo.png';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const { resetPassword } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setLoading(true);

        try {
            await resetPassword(email);
            setSuccess(true);
        } catch (err) {
            console.error('Reset password error:', err);
            if (err.code === 'auth/user-not-found') {
                setError('Nenhuma conta encontrada com este email');
            } else if (err.code === 'auth/invalid-email') {
                setError('Email inválido');
            } else {
                setError('Erro ao enviar email. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dashboardBg flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <img
                        src={LogoImage}
                        alt="OneZap Logo"
                        className="h-16 mx-auto mb-4"
                    />
                    <h1 className="text-3xl font-bold text-white">Recuperar Senha</h1>
                    <p className="text-gray-400 mt-2">
                        {success
                            ? 'Verifique seu email'
                            : 'Digite seu email para receber um link de recuperação'}
                    </p>
                </div>

                {/* Card */}
                <div className="bg-dashboardCard rounded-2xl p-8 shadow-xl border border-gray-800">
                    {success ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-gray-300 mb-6">
                                Enviamos um email para <strong className="text-white">{email}</strong> com instruções para redefinir sua senha.
                            </p>
                            <Link
                                to="/login"
                                className="text-primaryColor hover:underline"
                            >
                                Voltar para o login
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-dashboardBg border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor transition-colors"
                                        placeholder="seu@email.com"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primaryColor text-white py-3 px-4 rounded-xl font-medium hover:bg-primaryColor/90 transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                                </button>
                            </form>

                            {/* Back to Login */}
                            <p className="text-center text-gray-400 mt-6 text-sm">
                                Lembrou a senha?{' '}
                                <Link to="/login" className="text-primaryColor hover:underline">
                                    Fazer login
                                </Link>
                            </p>
                        </>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-gray-600 text-xs mt-6">
                    © 2026 OneZap. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
}
