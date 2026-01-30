import { ToastContainer } from "react-toastify";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import "./styles/base.css";
import "./styles/global.css";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider } from "./firebase";
import { LoginPage, RegisterPage, ForgotPasswordPage, ProtectedRoute } from "./pages/Auth";
import AppLayout from "./layouts/AppLayout";

/**
 * Componente principal para a versão WEB/SaaS do OneZap
 * Usa Firebase Auth em vez de autenticação local do Electron
 */
function AppWeb() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <ToastContainer />
                <Routes>
                    {/* Auth Routes - Públicas */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                    {/* App Routes - Protegidas */}
                    <Route
                        path="/*"
                        element={
                            <ProtectedRoute>
                                <AppLayout />
                            </ProtectedRoute>
                        }
                    />

                    {/* Redirect root to dashboard */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default AppWeb;
