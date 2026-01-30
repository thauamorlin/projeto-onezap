import React from "react";
import { motion } from "framer-motion";
import YouTube from "react-youtube";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../../../components/ui/dialog";

const { shell } = window.require("electron");

export const InitialWarningModal = ({ isOpen, onClose }) => {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-[850px] p-6 rounded-lg border border-primaryColor/20 bg-gradient-to-br from-[#1a202c]/95 to-[#182635]/95 backdrop-blur-md shadow-xl">
				<DialogHeader className="border-b border-primaryColor/10 pb-4">
					<DialogTitle className="text-2xl font-bold text-left flex items-center gap-2 text-white">
						<span className="text-red-500">🚨</span> Aviso Importante
					</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col items-center">
					<motion.div
						className="mb-6"
						initial={{ opacity: 0, y: 50 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
					>
						<p className="text-lg font-bold text-center text-white">
							✅ Estamos com novidades no OneZap!
						</p>
						<p className="text-sm text-gray-300 text-center mt-2 leading-relaxed">
							Assista ao vídeo abaixo para saber mais sobre as{" "}
							<strong className="text-primaryColor">atualizações</strong> e{" "}
							<strong className="text-primaryColor">novas funcionalidades</strong> 🚀
						</p>
					</motion.div>

					<motion.div
						className="overflow-hidden rounded-lg shadow-lg border border-primaryColor/10"
						initial={{ opacity: 0, y: 50 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
					>
						<YouTube
							videoId="wirHf0XcaC4"
							opts={{
								height: "450",
								width: "800",
								playerVars: {
									autoplay: 1,
									modestbranding: 1,
									fs: 0,
									rel: 0,
									cc_load_policy: 0,
								},
							}}
						/>
					</motion.div>

					<motion.div
						className="mt-6 flex w-full max-w-[500px] justify-between"
						initial={{ opacity: 0, y: 50 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.7 }}
					>
						<button
							type="button"
							className="flex-1 py-3 mx-2 rounded-lg bg-gradient-flowing bg-200% bg-pos-0 text-white font-semibold text-sm transition-all hover:shadow-lg hover:bg-pos-100 transition-background-position duration-2000"
							onClick={onClose}
						>
							Já tem acesso? Faça login
						</button>
						<button
							type="button"
							className="flex-1 py-3 mx-2 border-2 border-red-500 text-red-400 rounded-lg font-semibold text-sm shadow-md hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-all"
							onClick={() => {
								shell.openExternal("https://payfast.greenn.com.br/77547");
							}}
						>
							Adquira o OneZap Oficial
						</button>
					</motion.div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
