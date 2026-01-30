import React, { useState, useEffect } from "react";
import {
    Wifi,
    WifiOff,
    Plus,
    Trash2,
    RefreshCw,
    QrCode,
    MessageSquare,
    Settings,
    CreditCard,
} from "lucide-react";
import { toast } from "react-toastify";
import { QRCodeSVG } from "qrcode.react";

import { useAuth } from "../../firebase";
import { PLANS } from "../../config/stripe";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";

// URL do WhatsApp Service
const WHATSAPP_SERVICE_URL = "https://n1p-onezap.e53bkp.easypanel.host";

/**
 * Dashboard para versão Web/SaaS
 */
function DashboardWeb() {
    const { user, userProfile } = useAuth();

    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(null);
    const [qrCode, setQrCode] = useState(null);
    const [newInstanceName, setNewInstanceName] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Limite de instâncias baseado no plano
    const plan = userProfile?.subscription?.plan || userProfile?.plan;
    const instanceLimit = userProfile?.instanceLimit || (plan ? (PLANS[plan]?.instanceLimit || 0) : 0);

    // Buscar instâncias do usuário
    useEffect(() => {
        if (!user) return;

        const instancesRef = collection(db, "users", user.uid, "instances");
        const unsubscribe = onSnapshot(instancesRef, (snapshot) => {
            const instancesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setInstances(instancesData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Conectar instância via WebSocket
    const connectInstance = async (instanceId) => {
        setConnecting(instanceId);
        setQrCode(null);

        try {
            // Criar WebSocket para receber QR Code
            // Formato: /ws?instanceId=xxx
            const ws = new WebSocket(`${WHATSAPP_SERVICE_URL.replace('https', 'wss')}/ws?instanceId=${instanceId}`);

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.event === "qr") {
                    setQrCode(data.data.qr);
                } else if (data.event === "connected" || data.event === "ready") {
                    setQrCode(null);
                    setConnecting(null);
                    toast.success("WhatsApp conectado com sucesso!");

                    // Atualizar status no Firestore
                    setDoc(doc(db, "users", user.uid, "instances", instanceId), {
                        connected: true,
                        connectedAt: new Date().toISOString()
                    }, { merge: true });
                } else if (data.event === "error") {
                    toast.error(data.data?.message || "Erro ao conectar");
                    setConnecting(null);
                }
            };

            ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                toast.error("Erro de conexão com o servidor");
                setConnecting(null);
            };

            ws.onclose = () => {
                console.log("WebSocket closed");
            };

            // Iniciar conexão via API REST
            // Formato: /instances/:instanceId/connect
            const response = await fetch(`${WHATSAPP_SERVICE_URL}/instances/${instanceId}/connect`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.uid })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Erro ao iniciar conexão");
            }
        } catch (error) {
            console.error("Erro ao conectar:", error);
            toast.error("Erro ao conectar instância");
            setConnecting(null);
        }
    };

    // Criar nova instância
    const createInstance = async () => {
        if (!newInstanceName.trim()) {
            toast.error("Digite um nome para a instância");
            return;
        }

        if (instances.length >= instanceLimit) {
            toast.error(`Você atingiu o limite de ${instanceLimit} instância(s). Faça upgrade do seu plano.`);
            return;
        }

        try {
            const instanceId = newInstanceName.trim().toLowerCase().replace(/\s+/g, "-");

            await setDoc(doc(db, "users", user.uid, "instances", instanceId), {
                name: newInstanceName.trim(),
                createdAt: new Date().toISOString(),
                connected: false
            });

            toast.success("Instância criada com sucesso!");
            setNewInstanceName("");
            setShowCreateModal(false);
        } catch (error) {
            console.error("Erro ao criar instância:", error);
            toast.error("Erro ao criar instância");
        }
    };

    // Deletar instância
    const deleteInstance = async (instanceId) => {
        if (!window.confirm("Tem certeza que deseja excluir esta instância?")) return;

        try {
            await deleteDoc(doc(db, "users", user.uid, "instances", instanceId));
            toast.success("Instância excluída com sucesso!");
        } catch (error) {
            console.error("Erro ao excluir instância:", error);
            toast.error("Erro ao excluir instância");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-8 h-8 animate-spin text-primaryColor" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Suas Instâncias</h1>
                    <p className="text-gray-400 mt-1">
                        {instances.length} de {instanceLimit} instâncias utilizadas
                    </p>
                </div>

                {instances.length < instanceLimit && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-primaryColor hover:bg-primaryColor/80 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus size={20} />
                        Nova Instância
                    </button>
                )}
            </div>

            {/* Sem plano ativo */}
            {instanceLimit === 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 text-center">
                    <CreditCard className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-amber-300 mb-2">
                        Você ainda não tem um plano ativo
                    </h3>
                    <p className="text-amber-200/80 mb-4">
                        Escolha um plano para começar a usar o OneZap
                    </p>
                    <a
                        href="/pricing"
                        className="inline-block bg-primaryColor hover:bg-primaryColor/80 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                        Ver Planos
                    </a>
                </div>
            )}

            {/* Lista de instâncias */}
            {instanceLimit > 0 && (
                <div className="grid gap-4">
                    {instances.length === 0 ? (
                        <div className="bg-dashboardCard border border-menuBorder rounded-lg p-8 text-center">
                            <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-300 mb-2">
                                Nenhuma instância criada
                            </h3>
                            <p className="text-gray-500 mb-4">
                                Crie sua primeira instância para conectar seu WhatsApp
                            </p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-2 bg-primaryColor hover:bg-primaryColor/80 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                <Plus size={20} />
                                Criar Instância
                            </button>
                        </div>
                    ) : (
                        instances.map((instance) => (
                            <div
                                key={instance.id}
                                className="bg-dashboardCard border border-menuBorder rounded-lg p-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {/* Status */}
                                        <div className={`w-3 h-3 rounded-full ${instance.connected ? "bg-green-500" : "bg-red-500"}`} />

                                        <div>
                                            <h3 className="text-lg font-semibold text-white">
                                                {instance.name}
                                            </h3>
                                            <p className="text-sm text-gray-400 flex items-center gap-2">
                                                {instance.connected ? (
                                                    <>
                                                        <Wifi size={14} className="text-green-400" />
                                                        Conectado
                                                    </>
                                                ) : (
                                                    <>
                                                        <WifiOff size={14} className="text-red-400" />
                                                        Desconectado
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {!instance.connected && (
                                            <button
                                                onClick={() => connectInstance(instance.id)}
                                                disabled={connecting === instance.id}
                                                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {connecting === instance.id ? (
                                                    <RefreshCw size={18} className="animate-spin" />
                                                ) : (
                                                    <QrCode size={18} />
                                                )}
                                                Conectar
                                            </button>
                                        )}

                                        <button
                                            onClick={() => deleteInstance(instance.id)}
                                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* QR Code */}
                                {connecting === instance.id && qrCode && (
                                    <div className="mt-4 p-4 bg-white rounded-lg w-fit mx-auto">
                                        <QRCodeSVG value={qrCode} size={256} />
                                        <p className="text-center text-gray-800 mt-2 text-sm">
                                            Escaneie com seu WhatsApp
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modal Criar Instância */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-dashboardCard border border-menuBorder rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-white mb-4">
                            Nova Instância
                        </h2>

                        <input
                            type="text"
                            value={newInstanceName}
                            onChange={(e) => setNewInstanceName(e.target.value)}
                            placeholder="Nome da instância"
                            className="w-full bg-dashboardBg border border-menuBorder rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-primaryColor focus:outline-none"
                        />

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={createInstance}
                                className="flex-1 bg-primaryColor hover:bg-primaryColor/80 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                Criar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DashboardWeb;
