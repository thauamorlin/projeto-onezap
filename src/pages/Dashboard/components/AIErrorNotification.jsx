import React, { useEffect, useState } from "react";
import { AlertCircle, X, Info } from "lucide-react";
import { toast } from "react-toastify";
import { channels } from "../../../shared/constants";

const { ipcRenderer } = window.require("electron");

export const AIErrorNotification = ({ instanceId, onToastClick }) => {
	const [aiErrors, setAiErrors] = useState([]);
	const [showErrorDetails, setShowErrorDetails] = useState({});

	useEffect(() => {
		const loadStoredErrors = async () => {
			try {
				const storedErrors = await ipcRenderer.invoke(
					channels.GET_STORED_AI_ERRORS,
					instanceId,
				);
				if (storedErrors && storedErrors.length > 0) {
					setAiErrors(storedErrors);
				}
			} catch (error) {
				console.error("Erro ao carregar erros armazenados:", error);
			}
		};

		loadStoredErrors();
	}, [instanceId]);

	useEffect(() => {
		const handleAIError = (_, errorInfo) => {
			if (errorInfo.instanceId === instanceId) {
				const errorWithId = {
					...errorInfo,
					id:
						errorInfo.id ||
						`ai-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					count: errorInfo.count || 1,
					timestamp: errorInfo.timestamp || new Date().toISOString(),
				};

				setAiErrors((prev) => {
					const similarErrorIndex = prev.findIndex(
						(err) =>
							err.errorType === errorInfo.errorType &&
							err.aiType === errorInfo.aiType,
					);

					if (similarErrorIndex >= 0) {
						const updatedErrors = [...prev];
						updatedErrors[similarErrorIndex] = {
							...updatedErrors[similarErrorIndex],
							count: updatedErrors[similarErrorIndex].count + 1,
							timestamp: new Date().toISOString(),
							errorMessage: errorInfo.errorMessage,
							errorDetails: errorInfo.errorDetails,
							errorSolution: errorInfo.errorSolution,
							originalError: errorInfo.originalError,
							stack: errorInfo.stack,
						};
						return updatedErrors;
					}

					return [errorWithId, ...prev].slice(0, 3);
				});

				if (
					!aiErrors.some((err) => err.errorType === errorInfo.errorType) ||
					aiErrors.find((err) => err.errorType === errorInfo.errorType)?.count %
						5 ===
						0
				) {
					toast.error(
						`Erro na IA ${errorInfo.aiType}: ${errorInfo.errorType}`,
						{
							position: "top-right",
							autoClose: 8000,
							hideProgressBar: false,
							closeOnClick: true,
							pauseOnHover: true,
							draggable: true,
							onClick: () => {
								if (onToastClick) onToastClick();
							},
						},
					);
				}
			}
		};

		ipcRenderer.on(channels.AI_ERROR, handleAIError);

		return () => {
			ipcRenderer.removeListener(channels.AI_ERROR, handleAIError);
		};
	}, [instanceId, aiErrors, onToastClick]);

	if (aiErrors.length === 0) return null;

	const toggleErrorDetails = (errorId) => {
		setShowErrorDetails((prev) => ({
			...prev,
			[errorId]: !prev[errorId],
		}));
	};

	const dismissError = (errorId) => {
		setAiErrors((prev) => prev.filter((err) => err.id !== errorId));

		ipcRenderer.send(channels.CLEAR_AI_ERROR, { instanceId, errorId });
	};

	const clearAllErrors = () => {
		setAiErrors([]);

		ipcRenderer.send(channels.CLEAR_ALL_AI_ERRORS, instanceId);
	};

	return (
		<div className="w-full flex justify-center mt-6">
			<div className="w-full max-w-5xl px-4">
				{aiErrors.length > 1 && (
					<div className="flex justify-end mb-2">
						<button
							type="button"
							onClick={clearAllErrors}
							className="text-xs rounded-md bg-gray-800 px-2 py-1 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
						>
							Limpar todos os erros
						</button>
					</div>
				)}

				{aiErrors.map((error) => (
					<div
						key={error.id}
						className="mb-3 rounded-lg border border-red-500 bg-red-900/20 p-4 shadow-md"
					>
						<div className="flex items-start justify-between">
							<div className="flex items-start">
								<AlertCircle className="h-6 w-6 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
								<div>
									<h3 className="font-semibold text-white flex items-center">
										<span>
											Erro na {error.aiType}: {error.errorType}
										</span>
										{error.count > 1 && (
											<span className="ml-2 text-xs rounded-full bg-red-900 px-2 py-0.5">
												{error.count}x
											</span>
										)}
									</h3>
									<p className="mt-1 text-gray-300">{error.errorDetails}</p>

									<div className="mt-2">
										<h4 className="text-red-300 text-sm font-medium">Solução:</h4>
										<p className="text-gray-300">{error.errorSolution}</p>
									</div>

									<button
										type="button"
										onClick={() => toggleErrorDetails(error.id)}
										className="mt-2 flex items-center text-xs text-blue-300 hover:text-blue-200 bg-blue-900/20 px-2 py-1 rounded-md"
									>
										<Info className="h-3 w-3 mr-1" />
										{showErrorDetails[error.id]
											? "Ocultar detalhes técnicos"
											: "Ver detalhes técnicos"}
									</button>

									{showErrorDetails[error.id] && (
										<div className="mt-2 p-2 bg-black/40 rounded border border-gray-700 overflow-x-auto">
											<pre className="text-xs text-gray-400 whitespace-pre-wrap break-all">
												<code>
													{error.originalError}
													{error.stack && `\n\n${error.stack}`}
												</code>
											</pre>
										</div>
									)}
								</div>
							</div>
							<button
								type="button"
								onClick={() => dismissError(error.id)}
								className="text-gray-400 hover:text-white ml-2 bg-gray-800/40 p-1 rounded-full hover:bg-gray-700/40"
								aria-label="Descartar notificação"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<div className="mt-1 text-xs text-gray-500">
							Ocorreu em: {new Date(error.timestamp).toLocaleString()}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
