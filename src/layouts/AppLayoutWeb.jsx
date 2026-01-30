import React, { useState, useEffect } from "react";
import {
    LayoutDashboard,
    MessageSquare,
    LogOut,
    User,
    Settings,
    CreditCard,
    Wifi,
    WifiOff,
} from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate, Routes, Route, Navigate } from "react-router-dom";

import Logo from "../img/logo.png";
import { useAuth } from "../firebase";
import { APP_LOGO_ALT, APP_NAME } from "../config";
import { PLANS, PLAN_ORDER } from "../config/stripe";
import DashboardWeb from "../pages/DashboardWeb";
import Pricing from "../pages/Pricing";

/**
 * Layout principal para versão Web/SaaS do OneZap
 * Sem dependências do Electron
 */
function AppLayoutWeb() {
    const navigate = useNavigate();
    const { user, logout, userProfile } = useAuth();

    const [currentPage, setCurrentPage] = useState("dashboard");
    const [instances, setInstances] = useState([]);
    const [selectedInstance, setSelectedInstance] = useState(null);

    // Buscar instâncias do usuário
    useEffect(() => {
        // Instâncias são gerenciadas no DashboardWeb via Firestore
    }, [userProfile]);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success("Logout realizado com sucesso!");
            navigate("/login");
        } catch (error) {
            toast.error("Erro ao fazer logout");
        }
    };

    const getPlanName = () => {
        // Suporta tanto subscription.plan quanto plan direto
        const plan = userProfile?.subscription?.plan || userProfile?.plan;
        if (!plan) return "Free";
        return PLANS[plan]?.name || plan.charAt(0).toUpperCase() + plan.slice(1);
    };

    const getInstanceLimit = () => {
        const plan = userProfile?.subscription?.plan || userProfile?.plan;
        if (!plan) return 0;
        return userProfile?.instanceLimit || PLANS[plan]?.instanceLimit || 0;
    };

    return (
        <div className="flex flex-col h-screen bg-dashboardBg">
            {/* Header */}
            <header className="bg-navbarBg border-b border-menuBorder px-4 py-3">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={Logo} alt={APP_LOGO_ALT} className="h-10" />
                        <span className="text-white font-bold text-xl">{APP_NAME}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Plano atual */}
                        <div className="flex items-center gap-2 bg-primaryColor/20 px-3 py-1.5 rounded-full">
                            <CreditCard size={16} className="text-primaryColor" />
                            <span className="text-primaryColor text-sm font-medium">
                                {getPlanName()}
                            </span>
                        </div>

                        {/* User */}
                        <div className="flex items-center gap-2">
                            <User size={20} className="text-gray-400" />
                            <span className="text-gray-300 text-sm">
                                {user?.email}
                            </span>
                        </div>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav className="bg-menuBg border-b border-menuBorder">
                <div className="max-w-6xl mx-auto flex items-center gap-1 px-4 py-2">
                    <button
                        onClick={() => {
                            setCurrentPage("dashboard");
                            navigate("/dashboard");
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${currentPage === "dashboard"
                            ? "bg-primaryColor/20 text-primaryColor"
                            : "text-gray-400 hover:text-white hover:bg-menuItem"
                            }`}
                    >
                        <LayoutDashboard size={18} />
                        <span className="font-medium">Dashboard</span>
                    </button>

                    <button
                        onClick={() => {
                            setCurrentPage("pricing");
                            navigate("/pricing");
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${currentPage === "pricing"
                            ? "bg-primaryColor/20 text-primaryColor"
                            : "text-gray-400 hover:text-white hover:bg-menuItem"
                            }`}
                    >
                        <CreditCard size={18} />
                        <span className="font-medium">Planos</span>
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <Routes>
                    <Route path="/dashboard" element={<DashboardWeb />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </main>
        </div>
    );
}

export default AppLayoutWeb;
