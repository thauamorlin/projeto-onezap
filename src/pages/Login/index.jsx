import React, { useState } from "react";
import { toast } from "react-toastify";
const { ipcRenderer, shell } = window.require("electron");

import Logo from "../../img/logo.png";
import { InitialWarningModal } from "./components/WarningModal";
import { UpdateModal } from "./components/UpdateModal";
import { LoginHelpModal } from "./components/LoginHelpModal";
import { loginUser } from "../../api";
import { ForgotPasswordModal } from "./components/ForgotPasswordModal";
import { TutorialModal } from "./components/TutorialModal";
import {
	APP_NAME,
	APP_LOGO_ALT,
	SUPPORT_WHATSAPP,
	INSTAGRAM_URL,
	PRICING_URL
} from "../../config";

const initialWarningKey = "hasSeenInitialWarning-1";

export const Login = ({ onLoginSuccess }) => {
	const [email, setEmail] = useState("");
	const [emailError, setEmailError] = useState("");

	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [loginHelpOpen, setLoginHelpOpen] = useState(false);

	const [initialWarningOpen, setInitialWarningOpen] = useState(false);
	const [updateModalIsOpen, setUpdateModalIsOpen] = useState(false);
	const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
	const [tutorialModalOpen, setTutorialModalOpen] = useState(false);

	const handleLogin = async () => {
		if (!email || !password) {
			toast.error("Preencha todos os campos!");
			return;
		}

		if (!validateEmail(email)) {
			setEmailError("Por favor, insira um e-mail válido.");
			return;
		}
		setEmailError("");
		setLoading(true);

		try {
			const deviceId = await ipcRenderer.invoke("get-deviceId");
			const response = await loginUser({ email, password, deviceId });

			if (response.is_temporary_password) {
				localStorage.setItem("isTemporaryPassword", true);
			}

			toast.success("Login realizado com sucesso!");

			localStorage.setItem("accessUntil", response.access_until);
			onLoginSuccess(response.token);
		} catch (error) {
			console.error("Erro no login:", error);
			toast.error(
				error.response?.data?.message || "Erro ao conectar-se ao servidor.",
			);
		} finally {
			setLoading(false);
		}
	};

	const handleCloseWarning = () => {
		setInitialWarningOpen(false);
		localStorage.setItem(initialWarningKey, true);
	};

	const validateEmail = (email) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	};

	return (
		<>
			<InitialWarningModal
				isOpen={initialWarningOpen}
				onClose={handleCloseWarning}
			/>
			<UpdateModal
				isOpen={updateModalIsOpen}
				onClose={() => setUpdateModalIsOpen(false)}
			/>
			<LoginHelpModal
				isOpen={loginHelpOpen}
				onClose={() => setLoginHelpOpen(false)}
			/>
			<ForgotPasswordModal
				isOpen={forgotPasswordOpen}
				onClose={() => setForgotPasswordOpen(false)}
			/>
			<TutorialModal
				isOpen={tutorialModalOpen}
				onClose={() => setTutorialModalOpen(false)}
			/>

			<div className="flex items-center flex-col justify-start min-h-screen bg-dashboardBg py-2">
				<div className="mb-1 py-14">
					<img src={Logo} alt={APP_LOGO_ALT} className="w-48" />
				</div>
				<div className="w-full max-w-md rounded-xl overflow-hidden border border-primaryColor/20 bg-login-gradient from-loginGradientFrom via-loginGradientVia to-loginGradientTo p-6 shadow-2xl">
					<h2 className="text-2xl font-bold text-primaryColor text-center mb-4">
						Bem-vindo ao {APP_NAME}!
					</h2>
					<p className="text-gray-300 text-center mb-6">
						Faça login para continuar
					</p>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							handleLogin();
						}}
					>
						<div className="mb-4">
							<label
								htmlFor="email"
								className="block text-sm font-medium text-gray-300 mb-1"
							>
								Email
							</label>
							<input
								type="email"
								id="email"
								value={email}
								onChange={(e) => {
									setEmail(e.target.value);
									setEmailError("");
								}}
								className={`w-full px-4 py-3 rounded-lg border ${
									emailError
										? "border-red-500 focus:ring-red-500"
										: "border-primaryColor/30 focus:border-primaryColor focus:ring-primaryColor/30"
								} bg-dashboardBg text-white focus:outline-none focus:ring-2`}
								placeholder="Digite seu email"
								required
							/>
							{emailError && (
								<p className="text-red-500 text-sm mt-1">{emailError}</p>
							)}
						</div>
						<div className="mb-5">
							<label
								htmlFor="password"
								className="block text-sm font-medium text-gray-300 mb-1"
							>
								Senha
							</label>
							<input
								type="password"
								id="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full rounded-lg border border-primaryColor/30 bg-dashboardBg px-4 py-3 text-white focus:border-primaryColor focus:ring-2 focus:ring-primaryColor/30 focus:outline-none"
								placeholder="Digite sua senha"
								required
							/>
							<div className="flex mt-2 justify-between">
								<button
									type="button"
									className="text-primaryColor bg-transparent hover:text-dashboardAccent transition-colors text-sm"
									onClick={() => setLoginHelpOpen(true)}
								>
									Primeiro acesso?
								</button>
								<button
									type="button"
									className="text-primaryColor bg-transparent hover:text-dashboardAccent transition-colors text-sm"
									onClick={() => setForgotPasswordOpen(true)}
								>
									Esqueceu sua senha?
								</button>
							</div>
						</div>
						<button
							type="submit"
							className="w-full rounded-lg text-actionButtonText py-3 px-4 transition-all duration-300 transform hover:scale-[1.02] bg-gradient-to-r from-actionButton via-actionButtonHover to-actionButton bg-[length:200%_100%] bg-left hover:bg-right shadow-lg cursor-pointer"
							disabled={loading}
						>
							{loading ? "Entrando..." : "Entrar"}
						</button>
					</form>
					<p className="text-center text-sm text-gray-400 mt-6">
						Não comprou o {APP_NAME} oficial ainda?{" "}
						<button
							className="text-primaryColor hover:text-dashboardAccent bg-transparent transition-colors"
							type="button"
							onClick={() => {
								shell.openExternal(PRICING_URL);
							}}
						>
							Compre aqui
						</button>
					</p>
				</div>
				<div className="mt-8 flex flex-col items-center gap-3">
					<div className="flex gap-3 flex-wrap justify-center">
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								shell.openExternal(SUPPORT_WHATSAPP);
							}}
							className="bg-slate-200/10 backdrop-blur-sm rounded-lg px-4 py-2 text-sm font-medium text-green-400 flex items-center space-x-1 border border-green-500/20 hover:bg-slate-200/15 transition-all duration-300"
						>
							<span className="flex items-center">💬 Suporte via WhatsApp</span>
						</button>

						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								shell.openExternal(INSTAGRAM_URL);
							}}
							className="bg-slate-200/10 backdrop-blur-sm rounded-lg px-4 py-2 text-sm font-medium text-purple-400 flex items-center space-x-1 border border-purple-500/20 hover:bg-slate-200/15 transition-all duration-300"
						>
							<span className="flex items-center">🚀 Instagram @ozapgpt</span>
						</button>

						<button
							type="button"
							onClick={() => setTutorialModalOpen(true)}
							className="bg-slate-200/10 backdrop-blur-sm rounded-lg px-4 py-2 text-sm font-medium text-blue-400 flex items-center space-x-1 border border-blue-500/20 hover:bg-slate-200/15 transition-all duration-300"
						>
							<span className="flex items-center">📹 Ver Tutoriais</span>
						</button>
					</div>
				</div>
			</div>
		</>
	);
};

export default Login;
