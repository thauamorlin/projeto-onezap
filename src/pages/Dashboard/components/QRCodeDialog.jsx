import React, { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../../../components/ui/dialog";
import {
	Alert,
	AlertTitle,
	AlertDescription,
} from "../../../components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { channels } from "../../../shared/constants";

const { ipcRenderer } = window.require("electron");

export const QRCodeDialog = ({ isOpen, onClose, qrCode, instanceId }) => {
	const [loadingTime, setLoadingTime] = useState(0);

	useEffect(() => {
		let timer;

		if (isOpen && !qrCode) {
			// Iniciar um timer quando o diálogo estiver aberto mas sem QR code
			timer = setInterval(() => {
				setLoadingTime((prev) => prev + 1);
			}, 1000);
		} else {
			// Resetar o timer quando o QR code aparecer ou o diálogo for fechado
			setLoadingTime(0);
			clearInterval(timer);
		}

		return () => {
			clearInterval(timer);
		};
	}, [isOpen, qrCode]);

	const handleLogout = async () => {
		try {
			await ipcRenderer.invoke(channels.LOGOUT_INSTANCE, instanceId);
			setLoadingTime(0);
			// Não vamos fechar o modal, apenas resetar o timer
			// Em seguida o próprio electron vai reconectar e mostrar o novo QR code
		} catch (error) {
			console.error("Erro ao fazer logout:", error);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="flex flex-col items-center">
				<DialogHeader className="w-full">
					<DialogTitle>Conectar ao WhatsApp</DialogTitle>
				</DialogHeader>
				<div className="mt-4 flex w-full flex-col items-center justify-center">
					{qrCode ? (
						<>
							<p className="mb-6 mt-2 text-gray-300">
								Escaneie o QR Code abaixo para conectar ao WhatsApp:
							</p>
							<div className="rounded-lg overflow-hidden bg-white p-4 shadow-[0_0_15px_rgba(42,176,156,0.3)]">
								<img src={qrCode} alt="QR Code" className="size-64" />
							</div>
							<p className="mt-4 text-sm text-gray-400 italic text-center">
								Abra o WhatsApp no seu celular, vá em Configurações {">"}
								Dispositivos conectados {">"} Conectar um dispositivo e então
								escaneie este QR Code.
							</p>
						</>
					) : (
						<>
							<p className="text-gray-300 flex items-center mb-4">
								<span className="mr-2 animate-spin">⏳</span> Aguardando QR
								Code...
							</p>

							{loadingTime >= 10 && loadingTime < 30 && (
								<Alert
									variant="warning"
									className="mt-4 border-amber-500 bg-amber-500/10 text-amber-500"
								>
									<div className="flex items-start">
										<AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
										<div>
											<AlertTitle className="text-amber-500 font-medium">
												Está demorando mais que o normal
											</AlertTitle>
											<AlertDescription className="text-amber-400/90">
												Estamos tentando gerar o QR Code mas está demorando mais
												que o esperado.
											</AlertDescription>
										</div>
									</div>
								</Alert>
							)}

							{loadingTime >= 30 && (
								<Alert
									variant="destructive"
									className="mt-4 border-red-500 bg-red-500/10 text-red-500"
								>
									<div className="flex items-start">
										<AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
										<div>
											<AlertTitle className="text-red-500 font-medium">
												Problema na geração do QR Code
											</AlertTitle>
											<AlertDescription className="text-red-400/90 space-y-4">
												<p>
													Parece que estamos com problemas para gerar o QR Code.
													Tente fazer logout para reiniciar a conexão.
												</p>
												<button
													onClick={handleLogout}
													type="button"
													className="rounded-lg border border-red-500 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20 transition-colors"
												>
													Fazer Logout e Tentar Novamente
												</button>
											</AlertDescription>
										</div>
									</div>
								</Alert>
							)}
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
};
