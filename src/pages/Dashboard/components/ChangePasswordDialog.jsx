import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "react-toastify";

import { setFirstPassword } from "../../../api";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogHeader,
} from "../../../components/ui/dialog";

export const ChangePasswordModal = ({ isOpen, onClose }) => {
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const handleChangePassword = async () => {
		if (!newPassword || newPassword.length < 4) {
			toast.error("A senha deve ter pelo menos 4 caracteres!");
			return;
		}

		if (newPassword !== confirmPassword) {
			toast.error("As senhas não correspondem!");
			return;
		}

		setLoading(true);

		try {
			await setFirstPassword(newPassword);
			toast.success("Senha alterada com sucesso!");
			onClose();
		} catch (error) {
			toast.error(error.response?.data?.message || "Erro ao alterar a senha.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<span className="text-dashboardAccent">🔒</span> Alterar Senha
					</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-6">
					<motion.div
						initial={{ opacity: 0, y: 50 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
					>
						<p className="text-lg text-muted-foreground">
							Por favor, insira uma nova senha para concluir o primeiro acesso.
						</p>
					</motion.div>
					<motion.div
						initial={{ opacity: 0, y: 50 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
					>
						<input
							type="password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							className="w-full rounded-lg border border-dashboardAccent/30 bg-dashboardBg px-4 py-3 text-white focus:border-dashboardAccent focus:outline-none focus:ring-2 focus:ring-dashboardAccent/30"
							placeholder="Nova senha"
						/>
					</motion.div>
					<motion.div
						initial={{ opacity: 0, y: 50 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.3 }}
					>
						<input
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="w-full rounded-lg border border-dashboardAccent/30 bg-dashboardBg px-4 py-3 text-white focus:border-dashboardAccent focus:outline-none focus:ring-2 focus:ring-dashboardAccent/30"
							placeholder="Repita a nova senha"
						/>
					</motion.div>
				</div>
				<motion.button
					onClick={handleChangePassword}
					className="mt-6 w-full rounded-lg bg-gradient-primary from-dashboardPrimary to-dashboardAccent px-6 py-3 text-lg font-medium text-white transition hover:from-dashboardAccent hover:to-dashboardPrimary hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-dashboardAccent/30 disabled:opacity-70"
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					disabled={loading}
				>
					{loading ? "Alterando..." : "Alterar Senha"}
				</motion.button>
			</DialogContent>
		</Dialog>
	);
};
