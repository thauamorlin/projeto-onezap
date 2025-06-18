import React, { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../../../components/ui/dialog";
import { toast } from "react-toastify";
import { requestPasswordReset, resetPassword } from "../../../api";

export const ForgotPasswordModal = ({ isOpen, onClose }) => {
	const [step, setStep] = useState(1);
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const handleRequestCode = async () => {
		if (!email.includes("@")) {
			toast.error("Digite um e-mail válido.");
			return;
		}

		setLoading(true);
		try {
			await requestPasswordReset(email);
			toast.success("Código enviado para seu e-mail!");
			setStep(2);
		} catch (error) {
			const errorMessage =
				error.response?.data?.message || "Erro ao redefinir senha.";
			toast.error(errorMessage);
			console.log("Erro ao redefinir senha:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleResetPassword = async () => {
		if (!code || newPassword.length < 4) {
			toast.error("Preencha todos os campos corretamente.");
			return;
		}
		if (newPassword !== confirmPassword) {
			toast.error("As senhas não coincidem.");
			return;
		}

		setLoading(true);
		try {
			await resetPassword({ email, code, newPassword });
			toast.success("Senha redefinida com sucesso!");
			onClose();
		} catch (error) {
			const errorMessage =
				error.response?.data?.message || "Erro ao redefinir senha.";
			toast.error(errorMessage);
			console.log("Erro ao redefinir senha:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-[500px] border border-primaryColor/20 bg-gradient-to-br from-[#1a202c]/95 to-[#182635]/95 backdrop-blur-md shadow-xl">
				<DialogHeader className="border-b border-primaryColor/10 pb-4">
					<DialogTitle className="text-xl font-bold text-left text-white">
						🔑 Recuperar Senha
					</DialogTitle>
				</DialogHeader>

				{step === 1 && (
					<div className="flex flex-col items-center">
						<p className="text-sm text-gray-300 text-left leading-relaxed mb-4">
							Digite seu e-mail para receber um código de redefinição.
						</p>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full px-4 py-2 border rounded-lg border-primaryColor/30 bg-[#1a202c] text-white focus:outline-none focus:ring-2 focus:ring-primaryColor/30 focus:border-primaryColor"
							placeholder="Digite seu e-mail"
							required
						/>
						<button
							onClick={handleRequestCode}
							type="button"
							className="mt-4 w-full rounded-lg bg-gradient-flowing bg-200% bg-pos-0 px-4 py-2 font-medium text-white transition hover:shadow-lg hover:bg-pos-100 transition-background-position duration-2000"
							disabled={loading}
						>
							{loading ? "Enviando..." : "Enviar Código"}
						</button>
					</div>
				)}

				{step === 2 && (
					<div className="flex flex-col items-center">
						<p className="text-sm text-gray-300 text-left leading-relaxed mb-4">
							Digite o código recebido no seu e-mail e escolha uma nova senha.
						</p>
						<input
							type="text"
							value={code}
							onChange={(e) => setCode(e.target.value)}
							className="w-full px-4 py-2 border rounded-lg border-primaryColor/30 bg-[#1a202c] text-white focus:outline-none focus:ring-2 focus:ring-primaryColor/30 focus:border-primaryColor"
							placeholder="Código de 6 dígitos"
							required
						/>
						<input
							type="password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							className="w-full mt-3 px-4 py-2 border rounded-lg border-primaryColor/30 bg-[#1a202c] text-white focus:outline-none focus:ring-2 focus:ring-primaryColor/30 focus:border-primaryColor"
							placeholder="Nova senha"
							required
						/>
						<input
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="w-full mt-3 px-4 py-2 border rounded-lg border-primaryColor/30 bg-[#1a202c] text-white focus:outline-none focus:ring-2 focus:ring-primaryColor/30 focus:border-primaryColor"
							placeholder="Confirme a nova senha"
							required
						/>
						<button
							onClick={handleResetPassword}
							type="button"
							className="mt-4 w-full rounded-lg bg-gradient-flowing bg-200% bg-pos-0 px-4 py-2 font-medium text-white transition hover:shadow-lg hover:bg-pos-100 transition-background-position duration-2000"
							disabled={loading}
						>
							{loading ? "Alterando..." : "Redefinir Senha"}
						</button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
};
