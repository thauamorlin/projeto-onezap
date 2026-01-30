import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../firebase/AuthContext';
import LogoImage from '../../img/logo.png';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signUp, signInWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validations
        if (password !== confirmPassword) {
            return setError('As senhas não coincidem');
        }

        if (password.length < 6) {
            return setError('A senha deve ter pelo menos 6 caracteres');
        }

        setLoading(true);

        try {
            await signUp(email, password, name);
            navigate('/dashboard');
        } catch (err) {
            console.error('Register error:', err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Este email já está em uso');
            } else if (err.code === 'auth/weak-password') {
                setError('A senha é muito fraca');
            } else if (err.code === 'auth/invalid-email') {
                setError('Email inválido');
            } else {
                setError('Erro ao criar conta. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);

        try {
            await signInWithGoogle();
            navigate('/dashboard');
        } catch (err) {
            console.error('Google sign in error:', err);
            setError('Erro ao fazer login com Google');
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
                    <h1 className="text-3xl font-bold text-white">Criar Conta</h1>
                    <p className="text-gray-400 mt-2">Comece seu trial gratuito de 7 dias</p>
                </div>

                {/* Card */}
                <div className="bg-dashboardCard rounded-2xl p-8 shadow-xl border border-gray-800">
                    {/* Google Sign In */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 py-3 px-4 rounded-xl font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Registrar com Google
                    </button>

                    <div className="flex items-center my-6">
                        <div className="flex-1 border-t border-gray-700"></div>
                        <span className="px-4 text-gray-500 text-sm">ou</span>
                        <div className="flex-1 border-t border-gray-700"></div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Register Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Nome</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-dashboardBg border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor transition-colors"
                                placeholder="Seu nome"
                                required
                            />
                        </div>

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

                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-dashboardBg border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor transition-colors"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Confirmar Senha</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-dashboardBg border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor transition-colors"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primaryColor text-white py-3 px-4 rounded-xl font-medium hover:bg-primaryColor/90 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Criando conta...' : 'Criar conta grátis'}
                        </button>
                    </form>

                    {/* Benefits */}
                    <div className="mt-6 pt-6 border-t border-gray-700">
                        <p className="text-gray-400 text-sm mb-3">✓ 7 dias de trial grátis</p>
                        <p className="text-gray-400 text-sm mb-3">✓ 1 conexão WhatsApp incluída</p>
                        <p className="text-gray-400 text-sm">✓ Suporte a todas as IAs</p>
                    </div>

                    {/* Login Link */}
                    <p className="text-center text-gray-400 mt-6 text-sm">
                        Já tem uma conta?{' '}
                        <Link to="/login" className="text-primaryColor hover:underline">
                            Fazer login
                        </Link>
                    </p>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-600 text-xs mt-6">
                    © 2026 OneZap. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
}
