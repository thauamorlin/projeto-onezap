import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../firebase/AuthContext';

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    // Show loading state while checking auth
    if (loading) {
        return (
            <div className="min-h-screen bg-dashboardBg flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primaryColor border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400">Carregando...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}
