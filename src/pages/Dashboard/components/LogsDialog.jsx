import React, { useEffect, useRef, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../../../components/ui/dialog";

export const LogsDialog = ({ isOpen, onClose, logs, handleCopyLogs }) => {
	const logContainerRef = useRef(null);
	const [isAtBottom, setIsAtBottom] = useState(true);

	const handleScroll = () => {
		if (logContainerRef.current) {
			const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
			setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
		}
	};

	useEffect(() => {
		if (isAtBottom && logContainerRef.current) {
			logContainerRef.current.scrollTo({
				top: logContainerRef.current.scrollHeight,
				behavior: "smooth",
			});
		}
	}, [logs]);

	// Função para verificar se uma linha de log contém um erro
	const isErrorLog = (log) => {
		const errorKeywords = [
			"Erro", "erro", "Error", "error",
			"falha", "Falha", "failed", "Failed",
			"exception", "Exception", "API_KEY_INVALID",
			"não válida", "UnhandledPromiseRejection"
		];

		return errorKeywords.some(keyword => log.includes(keyword));
	};

	// Função para verificar se é um erro de IA específico
	const isAIError = (log) => {
		const aiErrorKeywords = [
			"API key not valid",
			"GoogleGenerativeAIFetchError",
			"OpenAIError",
			"Erro ao configurar o modelo",
			"API_KEY_INVALID",
			"Erro na inicialização",
			"ChatGPTError",
			"Erro geral na inicialização",
			"[AI ERROR REPORT]"
		];

		return aiErrorKeywords.some(keyword => log.includes(keyword));
	};

	// Função para destacar partes específicas dos logs
	const renderLogLine = (log) => {
		if (isAIError(log)) {
			return (
				<div className="text-red-500 font-bold border-l-4 border-red-600 pl-2 bg-red-900/20">
					{log}
				</div>
			);
		}

		if (isErrorLog(log)) {
			return <div className="text-red-400">{log}</div>;
		}

		return <div>{log}</div>;
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<span className="text-dashboardAccent">📋</span> Zap GPT - Logs
					</DialogTitle>
					<p className="mt-1 text-sm text-muted-foreground">
						Registros técnicos do sistema
					</p>
				</DialogHeader>
				<div
					ref={logContainerRef}
					className="mt-4 max-h-[500px] overflow-y-auto bg-dashboardBg p-4 font-mono text-green-400 rounded-lg border border-dashboardAccent/20 shadow-inner scrollbar-thin scrollbar-thumb-dashboardAccent/30 scrollbar-track-dashboardBg"
					onScroll={handleScroll}
				>
					{logs.length > 0 ? (
						logs.map((log, index) => (
							<div key={`log-${log.substring(0, 10)}-${index}`} className="mb-2">
								{renderLogLine(log)}
							</div>
						))
					) : (
						<p className="text-navTextMuted">Nenhum log disponível.</p>
					)}
				</div>
				<div className="flex justify-center mt-4 gap-3">
					<button
						onClick={handleCopyLogs}
						type="button"
						className="rounded-lg bg-gradient-primary from-dashboardPrimary to-dashboardAccent px-4 py-2 font-medium text-white transition hover:shadow-lg hover:from-dashboardAccent hover:to-dashboardPrimary"
					>
						Copiar Logs
					</button>
					<button
						onClick={() => {
							if (logContainerRef.current) {
								logContainerRef.current.scrollTo({
									top: logContainerRef.current.scrollHeight,
									behavior: "smooth",
								});
							}
						}}
						type="button"
						className="rounded-lg border border-dashboardAccent/40 bg-transparent px-4 py-2 font-medium text-white transition hover:shadow-lg hover:bg-dashboardAccent/20"
					>
						Rolar para o Final
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
