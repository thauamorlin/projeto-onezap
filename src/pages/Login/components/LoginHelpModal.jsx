import React from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../../../components/ui/dialog";

export const LoginHelpModal = ({ isOpen, onClose }) => {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-[600px] border border-primaryColor/20 bg-gradient-to-br from-[#1a202c]/95 to-[#182635]/95 backdrop-blur-md shadow-xl">
				<DialogHeader className="border-b border-primaryColor/10 pb-4">
					<DialogTitle className="text-xl font-bold text-left text-white">
						🔑 Como entrar no Zap GPT
					</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col items-center">
					<p className="text-sm text-gray-300 text-left leading-relaxed mb-4">
						Utilize o <strong className="text-white">email de compra</strong> como email e siga o
						formato abaixo para criar sua senha:
					</p>
					<ul className="list-disc list-inside text-sm text-gray-300 mb-4">
						<li>
							A senha é formada pela <strong className="text-white">parte inicial do email</strong> até
							o <strong className="text-white">@</strong> +<strong className="text-white"> últimos 4 dígitos</strong> do
							telefone cadastrado.
						</li>
					</ul>
					<div className="w-full p-4 rounded-lg bg-[dashboardCard]/50 border border-primaryColor/10 mb-4">
						<p className="text-sm text-gray-300">
							<strong className="text-primaryColor">Exemplo:</strong> Para o email{" "}
							<strong className="text-white">joao@gmail.com</strong> e telefone{" "}
							<strong className="text-white">(51) 99999-1234</strong>, sua senha será{" "}
							<strong className="text-primaryColor">joao1234</strong>.
						</p>
					</div>
					<button
						onClick={onClose}
						type="button"
						className="mt-4 w-full rounded-lg bg-gradient-flowing bg-200% bg-pos-0 px-4 py-2 font-medium text-white transition hover:shadow-lg hover:bg-pos-100 transition-background-position duration-2000"
					>
						Fechar
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
