import React from "react";
import { motion } from "framer-motion";
import { CircleCheckIcon } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../../../components/ui/dialog";

export const UpdateModal = ({ isOpen, onClose }) => {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-[850px] p-6 rounded-lg border border-primaryColor/20 bg-gradient-to-br from-[#1a202c]/95 to-[#182635]/95 backdrop-blur-md shadow-xl">
				<DialogHeader className="border-b border-primaryColor/10 pb-4">
					<DialogTitle className="text-2xl font-bold text-left flex items-center gap-2 text-white">
						<strong>🛠️ </strong>Últimas Atualizações
					</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-6">
					<motion.div
						initial={{ opacity: 0, y: 50 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
					>
						<h3 className="text-xl font-bold text-primaryColor">
							🚀 Em andamento:
						</h3>
						<ul className="list-disc mt-2 list-inside text-lg text-gray-300 space-y-3">
							{[
								{
									text: "Opção de usar o Zap GPT diretamente na <strong>nuvem</strong>",
								},
								{
									text: "Espelho do <strong>WhatsApp</strong> no aplicativo",
								},
								{
									text: "Novo editor de <strong>assistente</strong> integrado",
								},
							].map((item, index) => (
								<motion.li
									className="flex items-start gap-3"
									key={item.text}
									initial={{ opacity: 0, y: 50 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.4, delay: index * 0.2 }}
								>
									<span className="animate-spin border-2 border-t-primaryColor rounded-full h-5 w-5 mt-1" />
									{/* biome-ignore lint/security/noDangerouslySetInnerHtml: */}
									<p dangerouslySetInnerHTML={{ __html: item.text }} />
								</motion.li>
							))}
						</ul>
					</motion.div>
					<hr className="border-primaryColor/10" />
					<motion.div
						initial={{ opacity: 0, y: 50 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 1 }}
					>
						<h3 className="text-lg font-semibold text-dashboardAccent">
							🎯 Concluídas:
						</h3>
						<ul className="list-disc mt-2 list-inside text-base text-gray-300 space-y-3">
							<motion.li
								className="flex items-start gap-3"
								initial={{ opacity: 0, y: 50 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.4, delay: 0.2 }}
							>
								<CircleCheckIcon color="#4ade80" />
								<p>Autenticação no aplicativo</p>
							</motion.li>
							<motion.li
								className="flex items-start gap-3"
								initial={{ opacity: 0, y: 50 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.4, delay: 0.2 }}
							>
								<CircleCheckIcon color="#4ade80" />
								<p>
									Integração com o <strong className="text-white">Gemini</strong>, permitindo IA
									customizada
								</p>
							</motion.li>
						</ul>
					</motion.div>
				</div>
				<motion.button
					onClick={onClose}
					className="mt-6 w-full rounded-lg bg-gradient-flowing bg-200% bg-pos-0 px-6 py-3 font-medium text-white transition hover:shadow-lg hover:bg-pos-100 transition-background-position duration-2000"
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
				>
					Fechar
				</motion.button>
			</DialogContent>
		</Dialog>
	);
};
