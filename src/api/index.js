import axios from "axios";
import { TENANT_ID } from "../config";

const api = axios.create({
	baseURL: "https://auth.ozapgpt.com.br",
	// baseURL: "http://localhost:3002",
	headers: {
		"Content-Type": "application/json",
		"X-Tenant-ID": TENANT_ID
	},
});

/**
 * Valida o token de autenticação do usuário
 * @returns {Promise<void>} - Uma promise que é resolvida quando o processo de validação é concluído.
 */
export const validateAuthToken = async () => {
	try {
		const token = localStorage.getItem("authToken");
		if (!token) {
			localStorage.removeItem("authToken");
			return;
		}

		const response = await api.get("/validate", {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (response.status === 200) {
			return;
		}

		if (response.status === 401 || response.status === 403) {
			localStorage.removeItem("authToken");
		}
	} catch (error) {
		/** @type any */
		const errorAny = error;
		if (
			errorAny.response &&
			(errorAny.response.status === 401 || errorAny.response.status === 403)
		) {
			localStorage.removeItem("authToken");
		} else {
			console.error("Erro ao verificar autenticação:", error);
		}
	}
};

/**
 * Realiza o login do usuário
 * @param {{ email: string, password: string, deviceId: string }} params - Parâmetros de login
 * @returns {Promise<any>} - Dados do usuário logado
 */
export const loginUser = async ({ email, password, deviceId }) => {
	try {
		const response = await api.post("/login", {
			email,
			password,
			deviceId,
		});
		return response.data;
	} catch (error) {
		console.error("Erro ao realizar login:", error);
		throw error;
	}
};

/**
 * Define a primeira senha do usuário
 * @param {string} newPassword - Nova senha a ser definida
 * @returns {Promise<any>} - Dados da operação
 */
export const setFirstPassword = async (newPassword) => {
	try {
		const token = localStorage.getItem("authToken");
		const response = await api.post(
			"/set-first-password",
			{ newPassword },
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);
		return response.data;
	} catch (error) {
		console.error("Erro ao alterar a senha:", error);
		throw error;
	}
};

/**
 * Solicita o reset de senha
 * @param {string} email - Email para recuperação de senha
 * @returns {Promise<any>} - Dados da operação
 */
export const requestPasswordReset = async (email) => {
	try {
		const response = await api.post("/request-password-reset", { email });
		return response.data;
	} catch (error) {
		console.error("Erro ao solicitar código de recuperação:", error);
		throw error;
	}
};

/**
 * Redefine a senha do usuário
 * @param {{ email: string, code: string, newPassword: string }} params - Parâmetros para redefinição de senha
 * @returns {Promise<any>} - Dados da operação
 */
export const resetPassword = async ({ email, code, newPassword }) => {
	try {
		const response = await api.post("/reset-password", {
			email,
			code,
			newPassword,
		});
		return response.data;
	} catch (error) {
		console.error("Erro ao redefinir senha:", error);
		throw error;
	}
};
