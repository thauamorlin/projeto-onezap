/**
 * Hooks e funções para chamar as Firebase Cloud Functions
 */
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import app from './config';

const functions = getFunctions(app, 'southamerica-east1');

// Conectar ao emulador em desenvolvimento
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_EMULATOR === 'true') {
    connectFunctionsEmulator(functions, 'localhost', 5001);
}

// ==========================================
// INSTANCES API
// ==========================================

/**
 * Lista todas as instâncias do usuário
 */
export async function listInstances() {
    const fn = httpsCallable(functions, 'listInstances');
    const result = await fn();
    return result.data;
}

/**
 * Cria uma nova instância WhatsApp
 * @param {string} name - Nome da instância
 */
export async function createInstance(name) {
    const fn = httpsCallable(functions, 'createInstance');
    const result = await fn({ name });
    return result.data;
}

/**
 * Deleta uma instância
 * @param {string} instanceId - ID da instância
 */
export async function deleteInstance(instanceId) {
    const fn = httpsCallable(functions, 'deleteInstance');
    const result = await fn({ instanceId });
    return result.data;
}

/**
 * Atualiza configurações de uma instância
 * @param {string} instanceId - ID da instância
 * @param {object} settings - Configurações a atualizar
 */
export async function updateInstanceSettings(instanceId, settings) {
    const fn = httpsCallable(functions, 'updateInstanceSettings');
    const result = await fn({ instanceId, settings });
    return result.data;
}

// ==========================================
// AI API
// ==========================================

/**
 * Envia prompt para a IA
 * @param {string} provider - openai, gemini, deepseek
 * @param {string} prompt - Mensagem para a IA
 * @param {object} options - Opções adicionais
 */
export async function sendToAI(provider, prompt, options = {}) {
    const fn = httpsCallable(functions, 'aiProxy');
    const result = await fn({ provider, prompt, ...options });
    return result.data;
}

// ==========================================
// REACT HOOK
// ==========================================

import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar instâncias WhatsApp
 */
export function useInstances() {
    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchInstances = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await listInstances();
            setInstances(result.instances || []);
        } catch (err) {
            console.error('Error fetching instances:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const addInstance = useCallback(async (name) => {
        setLoading(true);
        setError(null);
        try {
            const result = await createInstance(name);
            await fetchInstances(); // Refresh list
            return result;
        } catch (err) {
            console.error('Error creating instance:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchInstances]);

    const removeInstance = useCallback(async (instanceId) => {
        setLoading(true);
        setError(null);
        try {
            await deleteInstance(instanceId);
            setInstances(prev => prev.filter(i => i.id !== instanceId));
        } catch (err) {
            console.error('Error deleting instance:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateSettings = useCallback(async (instanceId, settings) => {
        setError(null);
        try {
            await updateInstanceSettings(instanceId, settings);
            setInstances(prev => prev.map(i =>
                i.id === instanceId
                    ? { ...i, settings: { ...i.settings, ...settings } }
                    : i
            ));
        } catch (err) {
            console.error('Error updating settings:', err);
            setError(err.message);
            throw err;
        }
    }, []);

    return {
        instances,
        loading,
        error,
        fetchInstances,
        addInstance,
        removeInstance,
        updateSettings,
    };
}
