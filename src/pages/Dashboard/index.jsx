import { useEffect, useState } from "react";
import { channels } from "../../shared/constants";
import {
	CheckCircleIcon,
	Info,
	TrashIcon,
	XCircleIcon,
	MessageSquareText,
	Clock,
	Filter,
	ChevronDown,
	Settings2,
	Bell,
	Wand2,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../../components/ui/dialog";
import { toast } from "react-toastify";

import { validateAuthToken } from "../../api";
import { QRCodeDialog } from "./components/QRCodeDialog";
import { ChangePasswordModal } from "./components/ChangePasswordDialog";
import { GeminiSettingsDialog } from "./components/GeminiSettingsDialog";
import { GPTSettingsDialog } from "./components/GPTSettingsDialog";
import { RefreshCwIcon } from "lucide-react";
import { DeepSeekSettingsDialog } from "./components/DeepSeekSettingsDialog";
import { MessageTimerDialog } from "./components/MessageTimerDialog";
import { FollowUpPromptDialog } from "./components/FollowUpPromptDialog";

const { ipcRenderer } = window.require("electron");

/**
 * @param {Object} props - The component props.
 */
export const Dashboard = ({ setInstanceName, instanceId }) => {
	const [instances, setInstances] = useState({});
	const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false);

	// Estados de abertura das abas - agora fora do objeto settings
	const [showQuickSettings, setShowQuickSettings] = useState(() => {
		return localStorage.getItem("showQuickSettings") !== "false";
	});
	const [showTimingSettings, setShowTimingSettings] = useState(() => {
		return localStorage.getItem("showTimingSettings") === "true";
	});
	const [showNumberFilters, setShowNumberFilters] = useState(() => {
		return localStorage.getItem("showNumberFilters") === "true";
	});
	const [showFollowUpSettings, setShowFollowUpSettings] = useState(() => {
		return localStorage.getItem("showFollowUpSettings") === "true";
	});

	const [settings, setSettings] = useState({
		AI_SELECTED: "GPT",
		OPENAI_KEY: "",
		OPENAI_ASSISTANT: "",
		GEMINI_KEY: "",
		GEMINI_PROMPT: "",
		GEMINI_MODEL: "gemini-1.5-flash",
		GEMINI_TEMPERATURE: 1.0,
		MENSAGEM_PARA_ENVIAR_QUANDO_RECEBER_TIPO_DESCONHECIDO:
			"Desculpe! Eu ainda não sou capaz de entender esse tipo de mensagem",
		HORAS_PARA_REATIVAR_IA: "24",
		SOMENTE_RESPONDER: [],
		NAO_RESPONDER: [],
		SEGUNDOS_PARA_ESPERAR_ANTES_DE_GERAR_RESPOSTA: "10",
		VISUALIZAR_MENSAGENS: false,
		ENVIO_EM_BLOCO: false,
		INCLUIR_NOME_CONTATO: true,
		MESSAGE_TIMER_PRESET: "rapido",
		MESSAGE_DELAY_FACTOR: 50,
		MESSAGE_DELAY_MAX: 2000,
		DEEPSEEK_KEY: "",
		DEEPSEEK_PROMPT: "",
		DEEPSEEK_MODEL: "deepseek-chat",
		ASSISTANT_PROMPT: "",
		TEMPERATURE: 0.7,
		TOP_P: 1,
		INTERVENCAO_HUMANA_IMEDIATA: false,
		FOLLOW_UP_ATIVO: false,
		FOLLOW_UP_TEMPO_VERIFICACAO: "10",
		FOLLOW_UP_GERAR_IA: false,
		FOLLOW_UP_INTERVALO_HORAS: "24",
		FOLLOW_UP_QUANTIDADE_MENSAGENS: "1",
		FOLLOW_UP_MENSAGEM_1: "Olá! Notei que não recebemos resposta. Posso ajudar com mais alguma coisa?",
		FOLLOW_UP_MENSAGEM_2: "",
		FOLLOW_UP_MENSAGEM_3: "",
		FOLLOW_UP_PROMPT: "",
	});

	const [newSomenteResponder, setNewSomenteResponder] = useState("");
	const [newNaoResponder, setNewNaoResponder] = useState("");
	const [existingInstances, setExistingInstances] = useState([]);
	const [instanceCopyDialogOpen, setInstanceCopyDialogOpen] = useState(false);
	const [selectedInstanceToCopy, setSelectedInstanceToCopy] = useState("");
	const [initialSettings, setInitialSettings] = useState(settings);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
	const [geminiPromptModalOpen, setGeminiPromptModalOpen] = useState(false);
	const [gptPromptModalOpen, setGptPromptModalOpen] = useState(false);
	const [deepseekPromptModalOpen, setDeepseekPromptModalOpen] = useState(false);
	const [showMessageTimerModal, setShowMessageTimerModal] = useState(false);
	const [showFollowUpPromptModal, setShowFollowUpPromptModal] = useState(false);

	const handleSaveDeepSeekSettings = ({
		deepseekKey,
		deepseekPrompt,
		openaiKey,
		deepseekModel,
	}) => {
		setSettings((prev) => ({
			...prev,
			DEEPSEEK_PROMPT: deepseekPrompt,
			DEEPSEEK_KEY: deepseekKey,
			OPENAI_KEY: openaiKey,
			DEEPSEEK_MODEL: deepseekModel,
		}));
		setDeepseekPromptModalOpen(false);
	};

	const handleSaveGeminiSettings = ({
		prompt,
		geminiKey,
		geminiModel,
		temperature,
	}) => {
		setSettings((prev) => ({
			...prev,
			GEMINI_PROMPT: prompt,
			GEMINI_KEY: geminiKey,
			GEMINI_MODEL: geminiModel,
			GEMINI_TEMPERATURE: temperature,
		}));
		setGeminiPromptModalOpen(false);
	};

	const handleSaveGPTSettings = ({
		openaiKey,
		openaiAssistant,
		assistantPrompt,
		temperature,
		topP,
	}) => {
		setSettings((prev) => ({
			...prev,
			OPENAI_KEY: openaiKey,
			OPENAI_ASSISTANT: openaiAssistant,
			ASSISTANT_PROMPT: assistantPrompt,
			TEMPERATURE: temperature,
			TOP_P: topP,
		}));
		setGptPromptModalOpen(false);
	};

	const handleSettingsChange = (e) => {
		const { name, value, type, checked } = e.target;
		const newValue = type === 'checkbox' ? checked : value;
		
		// Se está desativando o follow-up, cancela todos os follow-ups ativos
		if (name === 'FOLLOW_UP_ATIVO' && !newValue && settings.FOLLOW_UP_ATIVO) {
			console.log('🚫 Follow-up sendo desativado. Cancelando todos os follow-ups ativos...');
			
			// Cancela todos os follow-ups da instância
			ipcRenderer.invoke('cancel-all-follow-ups', { instanceId })
				.then((result) => {
					if (result.success) {
						console.log(`✅ ${result.cancelledCount} follow-ups cancelados com sucesso`);
						toast.success(`Follow-up desativado. ${result.cancelledCount} mensagens agendadas foram canceladas.`);
					} else {
						console.error('❌ Erro ao cancelar follow-ups:', result.message);
						toast.error('Erro ao cancelar follow-ups: ' + result.message);
					}
				})
				.catch((error) => {
					console.error('❌ Erro ao cancelar follow-ups:', error);
					toast.error('Erro ao cancelar follow-ups');
				});
		}
		
		setSettings((prevSettings) => ({
			...prevSettings,
			[name]: newValue,
		}));
	};

	const handleSaveSettings = () => {
		ipcRenderer.send(channels.SAVE_SETTINGS, {
			newSettings: settings,
			instanceId,
		});
		setInitialSettings(settings);
		setHasUnsavedChanges(false);
	};

	const handleCopySettings = () => {
		if (selectedInstanceToCopy) {
			// Remover qualquer listener existente para evitar duplicação
			ipcRenderer.removeAllListeners(channels.COPY_SETTINGS_REPLY);

			// Adicionar o listener antes de enviar a requisição
			ipcRenderer.once(channels.COPY_SETTINGS_REPLY, (_, loadedSettings) => {
				console.log({ loadedSettings });
				if (loadedSettings) {
					setSettings(loadedSettings);
					setInitialSettings(loadedSettings);
					toast.success("Configurações copiadas com sucesso!");
				} else {
					toast.error(
						"Erro ao copiar configurações. Dados recebidos inválidos.",
					);
				}
			});

			// Enviar a requisição
			ipcRenderer.send(channels.COPY_SETTINGS, selectedInstanceToCopy);
			setInstanceCopyDialogOpen(false);
		} else {
			toast.warn("Por favor, selecione uma instância para copiar.");
		}
	};

	// Função para verificar o status atual da conexão
	const checkConnectionStatus = async () => {
		try {
			console.log(
				`[UI] Verificando status de conexão para instância: ${instanceId}`,
			);

			const status = await ipcRenderer.invoke(
				"get-connection-status",
				instanceId,
			);
			console.log(`[UI] Status recebido: ${JSON.stringify(status)}`);

			setInstances((prevInstances) => ({
				...prevInstances,
				[instanceId]: {
					...prevInstances[instanceId],
					connected: status.connected,
				},
			}));
			return status;
		} catch (error) {
			console.error("[UI] Erro ao obter status de conexão:", error);
			// Em caso de erro, assumimos desconectado
			const errorStatus = { connected: false };
			setInstances((prevInstances) => ({
				...prevInstances,
				[instanceId]: {
					...prevInstances[instanceId],
					connected: false,
				},
			}));
			return errorStatus;
		}
	};

	useEffect(() => {
		ipcRenderer.send(channels.SET_INSTANCE_ID, instanceId);
		if (setInstanceName) {
			setInstanceName(instanceId === "default" ? "Padrão" : instanceId);
		}

		setInstances((prevInstances) => ({
			...prevInstances,
			[instanceId]: {
				...prevInstances[instanceId],
				connected: false,
			},
		}));

		checkConnectionStatus();

		const initialCheckTimeout = setTimeout(() => {
			checkConnectionStatus();
		}, 1000);

		const statusCheckInterval = setInterval(checkConnectionStatus, 10000);

		return () => {
			clearInterval(statusCheckInterval);
			clearTimeout(initialCheckTimeout);
		};
	}, [instanceId, setInstanceName]);

	useEffect(() => {
		const TOAST_ID = "unsaved-changes";
		const hasChanges =
			JSON.stringify(settings) !== JSON.stringify(initialSettings);

		console.log({ settings, initialSettings });

		setHasUnsavedChanges(hasChanges);

		if (hasChanges && !toast.isActive(TOAST_ID)) {
			toast.warning("Alterações não salvas. Lembre-se de salvar!", {
				position: "top-right",
				autoClose: false,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				toastId: TOAST_ID,
			});
		} else if (!hasChanges && toast.isActive(TOAST_ID)) {
			toast.dismiss(TOAST_ID);
		}
	}, [settings, initialSettings]);

	useEffect(() => {
		const interval = setInterval(() => {
			validateAuthToken();
		}, 300000); // 300.000 milissegundos = 5 minutos

		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		const isTemporaryPassword = localStorage.getItem("isTemporaryPassword");

		if (isTemporaryPassword) {
			setShowChangePasswordModal(true);
		}
	}, []);

	// useEffect para desativar follow-up automaticamente quando DeepSeek for selecionado
	useEffect(() => {
		if (settings.AI_SELECTED === "DEEPSEEK" && settings.FOLLOW_UP_ATIVO) {
			setSettings((prev) => ({
				...prev,
				FOLLOW_UP_ATIVO: false,
			}));
		}
	}, [settings.AI_SELECTED]);

	const showCopyKeyButton =
		(((!settings.OPENAI_KEY || !settings.OPENAI_ASSISTANT) &&
			settings.AI_SELECTED === "GPT") ||
			(!settings.GEMINI_KEY && settings.AI_SELECTED === "GEMINI") ||
			(!settings.DEEPSEEK_KEY && settings.AI_SELECTED === "DEEPSEEK")) &&
		instanceId !== "default";

	// Atualizando os manipuladores de abertura/fechamento das abas para usar o localStorage
	const toggleQuickSettings = () => {
		const newValue = !showQuickSettings;
		setShowQuickSettings(newValue);
		localStorage.setItem("showQuickSettings", newValue.toString());
	};

	const toggleTimingSettings = () => {
		const newValue = !showTimingSettings;
		setShowTimingSettings(newValue);
		localStorage.setItem("showTimingSettings", newValue.toString());
	};

	const toggleNumberFilters = () => {
		const newValue = !showNumberFilters;
		setShowNumberFilters(newValue);
		localStorage.setItem("showNumberFilters", newValue.toString());
	};

	const toggleFollowUpSettings = () => {
		const newValue = !showFollowUpSettings;
		setShowFollowUpSettings(newValue);
		localStorage.setItem("showFollowUpSettings", newValue.toString());
	};

	// Carregar configurações e instâncias
	useEffect(() => {
		ipcRenderer.send(channels.LOAD_SETTINGS, instanceId);

		ipcRenderer.on(channels.LOAD_SETTINGS_REPLY, (_, loadedSettings) => {
			if (loadedSettings) {
				setSettings(loadedSettings);
				setInitialSettings(loadedSettings);
			}
		});

		ipcRenderer.send(channels.GET_INSTANCE_LIST);

		ipcRenderer.on(channels.GET_INSTANCE_LIST_REPLY, (_, instances) => {
			setExistingInstances(instances);
		});

		ipcRenderer.on(channels.log, (_, arg) => {
			console.log(arg);
		});

		ipcRenderer.on(channels.SAVE_SETTINGS_REPLY, (_, response) => {
			if (response.success) {
				toast.success("Configurações salvas com sucesso!");
			} else {
				toast.error("Erro ao salvar configurações!");
			}
		});

		ipcRenderer.on(channels.START_WHATS, (_, arg) => {
			const { qrCodeBase64, instanceId: incomingInstanceId } = arg;
			setInstances((prevInstances) => ({
				...prevInstances,
				[incomingInstanceId]: {
					...prevInstances[incomingInstanceId],
					qrCode: qrCodeBase64,
				},
			}));
		});

		ipcRenderer.on(channels.STATUS_UPDATE, (_, arg) => {
			const { status, instanceId: incomingInstanceId, reason } = arg;
			const isConnected = status === "open";
			const isCloseByUser = status === "close-by-user";
			const isDisconnectedByValidation =
				status === "disconnected-by-validation";
			const isDisconnectedByError = status === "disconnected-by-error";

			setInstances((prevInstances) => {
				const updatedInstance = {
					...prevInstances[incomingInstanceId],
					connected: isConnected,
					connectionReason:
						reason || prevInstances[incomingInstanceId]?.connectionReason,
				};

				if (isConnected) {
					updatedInstance.qrCode = null;
					setQrCodeDialogOpen(false);
					toast.success("WhatsApp conectado com sucesso!");
				}

				if (isCloseByUser) {
					updatedInstance.qrCode = null;
					setQrCodeDialogOpen(false);
					toast.warning(
						"Conexão encerrada pelo usuário. Escaneie o QR Code novamente.",
					);
				}

				if (isDisconnectedByValidation || isDisconnectedByError) {
					updatedInstance.qrCode = null;
					updatedInstance.connected = false;
					toast.error(
						`WhatsApp desconectado: ${reason || "Erro de validação"}`,
						{
							autoClose: false,
						},
					);
				}

				return {
					...prevInstances,
					[incomingInstanceId]: updatedInstance,
				};
			});
		});

		return () => {
			ipcRenderer.removeAllListeners();
		};
	}, [instanceId, setQrCodeDialogOpen]);

	return (
		<div className="flex min-h-screen flex-col items-center bg-dashboardBg py-8 text-white">
			<QRCodeDialog
				isOpen={qrCodeDialogOpen}
				onClose={setQrCodeDialogOpen}
				qrCode={instances[instanceId]?.qrCode}
				instanceId={instanceId}
			/>
			<ChangePasswordModal
				isOpen={showChangePasswordModal}
				onClose={() => {
					setShowChangePasswordModal(false);
					localStorage.removeItem("isTemporaryPassword");
				}}
			/>

			<DeepSeekSettingsDialog
				isOpen={deepseekPromptModalOpen}
				onClose={() => setDeepseekPromptModalOpen(false)}
				deepseekPrompt={settings.DEEPSEEK_PROMPT}
				deepseekKey={settings.DEEPSEEK_KEY}
				openaiKey={settings.OPENAI_KEY}
				onSave={handleSaveDeepSeekSettings}
				deepseekModel={settings.DEEPSEEK_MODEL}
			/>

			<GeminiSettingsDialog
				isOpen={geminiPromptModalOpen}
				onClose={() => {
					setGeminiPromptModalOpen(false);
				}}
				geminiPrompt={settings.GEMINI_PROMPT}
				geminiKey={settings.GEMINI_KEY}
				geminiModel={settings.GEMINI_MODEL}
				temperature={settings.GEMINI_TEMPERATURE}
				onSave={handleSaveGeminiSettings}
			/>
			<GPTSettingsDialog
				isOpen={gptPromptModalOpen}
				onClose={() => setGptPromptModalOpen(false)}
				onSave={handleSaveGPTSettings}
				openaiAssistant={settings.OPENAI_ASSISTANT}
				openaiKey={settings.OPENAI_KEY}
				assistantPrompt={settings.ASSISTANT_PROMPT}
				temperature={settings.TEMPERATURE}
				topP={settings.TOP_P}
			/>
			<Dialog
				open={instanceCopyDialogOpen}
				onOpenChange={setInstanceCopyDialogOpen}
			>
				<DialogContent className="max-w-2xl border border-primaryColor/20 bg-gradient-to-br from-dashboardBg to-dashboardCard">
					<DialogHeader className="border-b border-primaryColor/10 pb-4">
						<DialogTitle className="text-primaryColor">
							Selecionar Instância para Copiar Configurações
						</DialogTitle>
						<p className="text-sm text-gray-300">
							Escolha uma instância existente para copiar todas as suas
							configurações.
						</p>
					</DialogHeader>
					<div className="mt-4 space-y-4">
						<select
							className="w-full rounded-lg border border-primaryColor/30 bg-dashboardBg px-4 py-3 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30"
							value={selectedInstanceToCopy}
							onChange={(e) => setSelectedInstanceToCopy(e.target.value)}
						>
							<option value="">Escolha uma instância</option>
							{existingInstances
								.filter((instance) => instance !== instanceId)
								.map((instance) => (
									<option key={instance} value={instance}>
										{instance === "default" ? "Padrão" : instance}
									</option>
								))}
						</select>
						<div className="flex justify-end space-x-2">
							<button
								onClick={handleCopySettings}
								type="button"
								className="rounded-lg bg-gradient-to-r from-primaryColor to-dashboardAccent px-4 py-2 font-medium text-white transition hover:shadow-lg hover:from-dashboardAccent hover:to-primaryColor"
							>
								Copiar Configurações
							</button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<MessageTimerDialog
				open={showMessageTimerModal}
				onClose={() => setShowMessageTimerModal(false)}
				settings={settings}
				setSettings={setSettings}
			/>

			<FollowUpPromptDialog
				isOpen={showFollowUpPromptModal}
				onClose={() => setShowFollowUpPromptModal(false)}
				currentPrompt={settings.FOLLOW_UP_PROMPT}
				onSave={(newPrompt) => {
					setSettings((prev) => ({
						...prev,
						FOLLOW_UP_PROMPT: newPrompt,
					}));
				}}
			/>

			<div className="mb-8 w-full max-w-md mx-auto rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-[#1e293b] via-dashboardBg to-dashboardCard border border-primaryColor/20">
				<div className="flex flex-col items-center p-6 space-y-6">
					{instances[instanceId]?.connected === true ? (
						<div className="flex flex-col items-center space-y-4 w-full">
							<div className="flex items-center text-[#4ade80] bg-[#4ade80]/10 px-4 py-2 rounded-full w-full justify-center">
								<CheckCircleIcon className="mr-2 h-6 w-6" />
								<span className="text-lg font-medium">
									Conectado ao WhatsApp
								</span>
							</div>
							<div className="flex w-full space-x-3 mt-2">
								<div className="group relative w-1/2">
									<button
										className="w-full relative rounded-lg text-primaryColor px-4 py-3 transition-all duration-300 transform hover:scale-[1.02] border-2 border-primaryColor bg-transparent hover:bg-gradient-to-r hover:from-primaryColor/20 hover:to-transparent bg-[length:200%_100%] bg-left hover:bg-right hover:shadow-lg cursor-pointer"
										onClick={async () => {
											try {
												const response = await ipcRenderer.invoke(
													channels.DISCONNECT_INSTANCE,
													instanceId,
												);
												if (response.success) {
													setInstances((prevInstances) => ({
														...prevInstances,
														[instanceId]: {
															...prevInstances[instanceId],
															connected: false,
														},
													}));
													toast.info(response.message);
													setTimeout(checkConnectionStatus, 1000);
												} else {
													toast.error(response.message);
												}
											} catch (error) {
												toast.error("Erro ao desconectar. Tente novamente.");
												console.error(error);
											}
										}}
										type="button"
									>
										<span className="relative z-10">Desconectar</span>
									</button>
									<div className="absolute bottom-full left-1/2 mb-2 hidden w-64 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
										Desconecta o bot temporariamente. Ao clicar em "Conectar
										WhatsApp" ele irá reativá-lo.
									</div>
								</div>

								<div className="group relative w-1/2">
									<button
										className="w-full relative rounded-lg text-red-500 px-4 py-3 transition-all duration-300 transform hover:scale-[1.02] border-2 border-red-500 bg-transparent hover:bg-gradient-to-r hover:from-red-500/20 hover:to-transparent bg-[length:200%_100%] bg-left hover:bg-right hover:shadow-lg cursor-pointer"
										onClick={async () => {
											if (
												window.confirm(
													"Tem certeza que deseja apagar a autenticação? Você precisará escanear o QR Code novamente e perderá todas as conversas.",
												)
											) {
												try {
													const response = await ipcRenderer.invoke(
														channels.LOGOUT_INSTANCE,
														instanceId,
													);
													if (response.success) {
														setInstances((prevInstances) => ({
															...prevInstances,
															[instanceId]: {
																...prevInstances[instanceId],
																connected: false,
															},
														}));
														toast.warn(response.message);
														setTimeout(checkConnectionStatus, 1000);
													} else {
														toast.error(response.message);
													}
												} catch (error) {
													toast.error(
														"Erro ao realizar logout. Tente novamente.",
													);
													console.error(error);
												}
											}
										}}
										type="button"
									>
										<span className="relative z-10">Logout</span>
									</button>
									<div className="absolute bottom-full left-1/2 mb-2 hidden w-64 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
										Remove a autenticação atual. Será necessário escanear o QR
										Code novamente. Muito útil para resolver erros de conexão.
									</div>
								</div>
							</div>
						</div>
					) : (
						<div className="flex flex-col items-center w-full space-y-4">
							<div className="flex items-center text-red-500 bg-red-500/10 px-4 py-2 rounded-full w-full justify-center">
								<XCircleIcon className="mr-2 h-6 w-6" />
								<span className="text-lg font-medium">
									Desconectado do WhatsApp
								</span>
							</div>
							<button
								type="button"
								onClick={async () => {
									try {
										const status = await checkConnectionStatus();
										if (status.connected) {
											toast.info("WhatsApp já está conectado!");
										} else {
											ipcRenderer.send(channels.START_WHATS, instanceId);
											setQrCodeDialogOpen(true);
										}
									} catch (error) {
										console.error("Erro ao verificar conexão:", error);
										ipcRenderer.send(channels.START_WHATS, instanceId);
										setQrCodeDialogOpen(true);
									}
								}}
								className="w-full relative rounded-lg text-white px-4 py-3 transition-all duration-300 transform hover:scale-[1.01] bg-gradient-to-r from-primaryColor via-dashboardAccent to-primaryColor bg-[length:200%_100%] bg-left hover:bg-right hover:shadow-lg cursor-pointer"
								style={{ cursor: "pointer", pointerEvents: "auto" }}
								disabled={!instanceId}
							>
								<span className="relative z-10">Conectar WhatsApp</span>
							</button>
						</div>
					)}
				</div>
			</div>

			<div className="w-full max-w-5xl rounded-xl overflow-hidden border border-primaryColor/20 bg-gradient-to-br from-dashboardBg to-dashboardCard p-6 pb-4 shadow-2xl">
				{showCopyKeyButton && (
					<div className="group relative flex items-center justify-center mb-4">
						<button
							type="button"
							className="rounded-full border border-primaryColor bg-primaryColor/10 px-4 py-2 text-sm text-primaryColor transition hover:bg-primaryColor hover:text-white"
							onClick={() => {
								setInstanceCopyDialogOpen(true);
							}}
						>
							Importar Configurações
						</button>
					</div>
				)}

				<form>
					<div className="mb-8 bg-dashboardCard/50 rounded-xl p-6 border border-white/5 shadow-inner">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-xl font-semibold text-primaryColor">
								Modelo IA
							</h2>
							<button
								type="button"
								onClick={async () => {
									await ipcRenderer.invoke(channels.RESET_CHATS, instanceId);
									toast.success(
										"Modelo atualizado com sucesso! Teste agora suas modificações.",
									);
									toast.info(
										"As conversas foram reiniciadas. A IA perdeu a memória das interações anteriores.",
									);
								}}
								className="ml-1 bg-transparent rounded-full border border-primaryColor/30 p-2 text-primaryColor hover:bg-primaryColor/20 transition-all"
								title="Recarregar instâncias"
							>
								<RefreshCwIcon className="size-5" />
							</button>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="ai-selected"
									className="mb-1 block font-medium text-gray-300"
								>
									IA Selecionada
								</label>
								<select
									id="ai-selected"
									name="AI_SELECTED"
									value={settings.AI_SELECTED}
									onChange={handleSettingsChange}
									className="w-full rounded-lg border border-primaryColor/30 bg-dashboardBg px-4 py-3 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30"
								>
									<option value="GPT">GPT</option>
									<option value="GEMINI">GEMINI</option>
									<option value="DEEPSEEK">DEEPSEEK</option>
								</select>
							</div>

							{settings.AI_SELECTED === "GEMINI" && (
								<>
									<div>
										<span
											htmlFor="gemini-prompt"
											className="mb-1 block opacity-0 invisible font-medium text-gray-300"
										>
											GEMINI Prompt
										</span>

										<button
											onClick={() => setGeminiPromptModalOpen(true)}
											type="button"
											className="w-full relative rounded-lg text-white px-4 py-3 transition-all duration-300 transform hover:scale-[1.01] bg-gradient-to-r from-primaryColor via-dashboardAccent to-primaryColor bg-[length:200%_100%] bg-left hover:bg-right hover:shadow-lg cursor-pointer"
											style={{ cursor: "pointer", pointerEvents: "auto" }}
										>
											<span className="relative z-10">Configurações da IA</span>
										</button>
									</div>
								</>
							)}

							{settings.AI_SELECTED === "GPT" && (
								<>
									<div>
										<span
											htmlFor="gemini-prompt"
											className="mb-1 block opacity-0 invisible font-medium text-gray-300"
										>
											GPT Prompt
										</span>
										<button
											onClick={() => setGptPromptModalOpen(true)}
											type="button"
											className="w-full relative rounded-lg text-white px-4 py-3 transition-all duration-300 transform hover:scale-[1.01] bg-gradient-to-r from-primaryColor via-dashboardAccent to-primaryColor bg-[length:200%_100%] bg-left hover:bg-right hover:shadow-lg cursor-pointer"
											style={{ cursor: "pointer", pointerEvents: "auto" }}
										>
											<span className="relative z-10">Configurações da IA</span>
										</button>
									</div>
								</>
							)}

							{settings.AI_SELECTED === "DEEPSEEK" && (
								<>
									<div>
										<span
											htmlFor="gemini-prompt"
											className="mb-1 block opacity-0 invisible font-medium text-gray-300"
										>
											DEEPSEEK Prompt
										</span>
										<button
											onClick={() => setDeepseekPromptModalOpen(true)}
											type="button"
											className="w-full relative rounded-lg text-white px-4 py-3 transition-all duration-300 transform hover:scale-[1.01] bg-gradient-to-r from-primaryColor via-dashboardAccent to-primaryColor bg-[length:200%_100%] bg-left hover:bg-right hover:shadow-lg cursor-pointer"
											style={{ cursor: "pointer", pointerEvents: "auto" }}
										>
											<span className="relative z-10">Configurações da IA</span>
										</button>
									</div>
								</>
							)}
						</div>
					</div>

					<div className="mb-8 bg-dashboardCard/50 rounded-xl p-6 border border-white/5 shadow-inner">
						<h2 className="mb-6 text-xl font-semibold text-primaryColor flex items-center">
							<MessageSquareText className="mr-2 h-5 w-5" />
							Conversas
						</h2>

						<div className="space-y-5">
							<div className="rounded-xl border border-primaryColor/20 bg-dashboardBg/70 overflow-hidden transition-all duration-300 hover:border-primaryColor/40 shadow-sm">
								<button
									type="button"
									className="flex w-full items-center justify-between p-4 cursor-pointer bg-transparent text-left"
									onClick={toggleQuickSettings}
									aria-expanded={showQuickSettings}
								>
									<h3 className="font-medium text-primaryColor/90 flex items-center">
										<Settings2 className="h-4 w-4 mr-2 text-primaryColor/90" />
										<span className="text-white">
											Configurações de Resposta
										</span>
									</h3>
									<div
										className={`transform transition-transform duration-300 ${showQuickSettings ? "rotate-180" : ""}`}
									>
										<ChevronDown
											className="h-5 w-5 text-white"
											aria-hidden="true"
										/>
									</div>
								</button>

								<div
									className={`transition-all duration-300 ease-in-out ${showQuickSettings ? "max-h-96 opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}
								>
									<div className="px-4 pb-4">
										<div className="bg-dashboardCard/50 rounded-lg p-5 space-y-5 shadow-inner border border-white/5">
											<label className="flex items-center justify-between gap-3 text-gray-300 text-sm font-medium relative group cursor-pointer hover:text-white transition-colors duration-200">
												<div className="flex items-center">
													<span>Manter não lida ao responder</span>
													<div className="group relative ml-1">
														<Info className="size-4 cursor-pointer text-gray-400" />
														<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
															A IA responde automaticamente às mensagens sem
															desmarcá-las como 'visualizadas'. Isso permite que
															você mantenha o controle de quem entrou em
															contato, garantindo que as mensagens ainda
															apareçam como não lidas para você.
														</div>
													</div>
												</div>
												<div className="relative">
													<input
														type="checkbox"
														checked={!settings.VISUALIZAR_MENSAGENS}
														onChange={(e) => {
															setSettings((prev) => ({
																...prev,
																VISUALIZAR_MENSAGENS: !e.target.checked,
															}));
														}}
														className="sr-only"
													/>
													<div
														className={`w-12 h-6 rounded-full transition-all duration-300 shadow-inner ${!settings.VISUALIZAR_MENSAGENS ? "bg-gradient-to-r from-primaryColor to-dashboardAccent" : "bg-gray-700"}`}
													>
														<div
															className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${!settings.VISUALIZAR_MENSAGENS ? "translate-x-6" : "translate-x-0"}`}
														/>
													</div>
												</div>
											</label>

											<label className="flex items-center justify-between gap-3 text-gray-300 text-sm font-medium relative group cursor-pointer hover:text-white transition-colors duration-200">
												<div className="flex items-center">
													<span>Enviar resposta em uma mensagem</span>
													<div className="group relative ml-1">
														<Info className="size-4 cursor-pointer text-gray-400" />
														<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
															Se ativado, a IA enviará a resposta completa de
															uma vez. Se desativado, enviará a resposta em
															partes para simular digitação humana.
														</div>
													</div>
												</div>
												<div className="relative">
													<input
														type="checkbox"
														checked={settings.ENVIO_EM_BLOCO}
														onChange={(e) =>
															setSettings((prev) => ({
																...prev,
																ENVIO_EM_BLOCO: e.target.checked,
															}))
														}
														className="sr-only"
													/>
													<div
														className={`w-12 h-6 rounded-full transition-all duration-300 shadow-inner ${settings.ENVIO_EM_BLOCO ? "bg-gradient-to-r from-primaryColor to-dashboardAccent" : "bg-gray-700"}`}
													>
														<div
															className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${settings.ENVIO_EM_BLOCO ? "translate-x-6" : "translate-x-0"}`}
														/>
													</div>
												</div>
											</label>

											<label className="flex items-center justify-between gap-3 text-gray-300 text-sm font-medium relative group cursor-pointer hover:text-white transition-colors duration-200">
												<div className="flex items-center">
													<span>Incluir nome do contato na resposta</span>
													<div className="group relative ml-1">
														<Info className="size-4 cursor-pointer text-gray-400" />
														<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
															Se ativado, a IA incluirá o nome do contato na
															resposta. Se desativado, apenas a mensagem será
															enviada, sem referência ao nome do usuário.
														</div>
													</div>
												</div>
												<div className="relative">
													<input
														type="checkbox"
														checked={settings.INCLUIR_NOME_CONTATO}
														onChange={(e) =>
															setSettings((prev) => ({
																...prev,
																INCLUIR_NOME_CONTATO: e.target.checked,
															}))
														}
														className="sr-only"
													/>
													<div
														className={`w-12 h-6 rounded-full transition-all duration-300 shadow-inner ${settings.INCLUIR_NOME_CONTATO ? "bg-gradient-to-r from-primaryColor to-dashboardAccent" : "bg-gray-700"}`}
													>
														<div
															className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${settings.INCLUIR_NOME_CONTATO ? "translate-x-6" : "translate-x-0"}`}
														/>
													</div>
												</div>
											</label>

											<label className="flex items-center justify-between gap-3 text-gray-300 text-sm font-medium relative group cursor-pointer hover:text-white transition-colors duration-200">
												<div className="flex items-center">
													<span>Não responder após mensagem manual</span>
													<div className="group relative ml-1">
														<Info className="size-4 cursor-pointer text-gray-400" />
														<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
															Se ativado: A primeira mensagem manual enviada para um contato fará a IA parar de responder naquele chat. Se desativado: A IA responderá a primeira mensagem de cada novo contato antes de parar. <br /><br />  NÃO recomendado para quem faz disparos de campanhas em massa, pois a IA não continuará as conversas com leads.
														</div>
													</div>
												</div>
												<div className="relative">
													<input
														type="checkbox"
														checked={settings.INTERVENCAO_HUMANA_IMEDIATA}
														onChange={(e) =>
															setSettings((prev) => ({
																...prev,
																INTERVENCAO_HUMANA_IMEDIATA: e.target.checked,
															}))
														}
														className="sr-only"
													/>
													<div
														className={`w-12 h-6 rounded-full transition-all duration-300 shadow-inner ${settings.INTERVENCAO_HUMANA_IMEDIATA ? "bg-gradient-to-r from-primaryColor to-dashboardAccent" : "bg-gray-700"}`}
													>
														<div
															className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${settings.INTERVENCAO_HUMANA_IMEDIATA ? "translate-x-6" : "translate-x-0"}`}
														/>
													</div>
												</div>
											</label>
										</div>
									</div>
								</div>
							</div>

							<div className="rounded-xl border border-primaryColor/20 bg-dashboardBg/70 overflow-hidden transition-all duration-300 hover:border-primaryColor/40 shadow-sm">
								<button
									type="button"
									className="flex w-full items-center justify-between p-4 cursor-pointer bg-transparent text-left"
									onClick={toggleTimingSettings}
									aria-expanded={showTimingSettings}
								>
									<h3 className="font-medium text-primaryColor/90 flex items-center">
										<Clock className="h-4 w-4 mr-2 text-primaryColor/90" />
										<span className="text-white">Tempo e Mensagens</span>
									</h3>
									<div
										className={`transform transition-transform duration-300 ${showTimingSettings ? "rotate-180" : ""}`}
									>
										<ChevronDown
											className="h-5 w-5 text-white"
											aria-hidden="true"
										/>
									</div>
								</button>

								<div
									className={`transition-all duration-300 ease-in-out ${showTimingSettings ? "max-h-96 opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}
								>
									<div className="px-4 pb-4">
										<div className="bg-dashboardCard/50 rounded-lg p-5 space-y-5 shadow-inner border border-white/5">
											<div className="flex justify-between items-center">
												<button
													onClick={() => setShowMessageTimerModal(true)}
													type="button"
													className="rounded-lg bg-gradient-to-r from-primaryColor to-dashboardAccent px-4 py-2 text-sm font-medium text-white transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md"
												>
													Configurar Tempo de Mensagens
												</button>

												<div className="flex flex-col">
													<label
														className="flex items-center font-medium text-gray-300 text-sm mb-1"
														htmlFor="HORAS_PARA_REATIVAR_IA"
													>
														Reativação (hrs)
														<div className="group relative ml-1">
															<Info className="size-4 cursor-pointer text-gray-400" />
															<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
																Define após quantas horas o bot pode voltar a
																responder a um contato que ele já ignorou.
															</div>
														</div>
													</label>
													<input
														type="number"
														name="HORAS_PARA_REATIVAR_IA"
														value={settings.HORAS_PARA_REATIVAR_IA}
														onChange={handleSettingsChange}
														className="w-24 rounded-lg border border-primaryColor/30 bg-dashboardBg px-4 py-2 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30 text-center"
													/>
												</div>
											</div>

											<div>
												<label
													className="mb-2 flex items-center font-medium text-gray-300 text-sm"
													htmlFor="MENSAGEM_PARA_ENVIAR_QUANDO_RECEBER_TIPO_DESCONHECIDO"
												>
													Mensagem para tipos desconhecidos
													<div className="group relative ml-1">
														<Info className="size-4 cursor-pointer text-gray-400" />
														<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
															Se o bot receber uma mensagem que não sabe como
															responder, ele usará essa resposta padrão.
														</div>
													</div>
												</label>
												<input
													type="text"
													name="MENSAGEM_PARA_ENVIAR_QUANDO_RECEBER_TIPO_DESCONHECIDO"
													value={
														settings.MENSAGEM_PARA_ENVIAR_QUANDO_RECEBER_TIPO_DESCONHECIDO
													}
													onChange={handleSettingsChange}
													className="w-full rounded-lg border border-primaryColor/30 bg-dashboardBg px-4 py-2 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30"
												/>
											</div>
										</div>
									</div>
								</div>
							</div>

							<div className="rounded-xl border border-primaryColor/20 bg-dashboardBg/70 overflow-hidden transition-all duration-300 hover:border-primaryColor/40 shadow-sm">
								<button
									type="button"
									className="flex w-full items-center justify-between p-4 cursor-pointer bg-transparent text-left"
									onClick={toggleNumberFilters}
									aria-expanded={showNumberFilters}
								>
									<h3 className="font-medium text-primaryColor/90 flex items-center">
										<Filter className="h-4 w-4 mr-2 text-primaryColor/90" />
										<span className="text-white">Filtros de Número</span>
									</h3>
									<div
										className={`transform transition-transform duration-300 ${showNumberFilters ? "rotate-180" : ""}`}
									>
										<ChevronDown
											className="h-5 w-5 text-white"
											aria-hidden="true"
										/>
									</div>
								</button>

								{/* Conteúdo do painel - Filtros de Números */}
								<div
									className={`transition-all duration-300 ease-in-out ${showNumberFilters ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}
								>
									<div className="px-4 pb-4">
										<div className="bg-dashboardCard/50 rounded-lg p-5 shadow-inner border border-white/5">
											<div className="flex w-full gap-5">
												<div className="w-1/2">
													<label
														htmlFor="only-respond-to"
														className="mb-2 flex items-center font-medium text-gray-300 text-sm"
													>
														Somente Responder
														<div className="group relative ml-1">
															<Info className="size-4 cursor-pointer text-gray-400" />
															<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
																Se você deseja que a IA responda apenas a
																contatos específicos, insira aqui os números
																neste formato: (por exemplo: "555181995600").
															</div>
														</div>
													</label>
													<div className="w-full rounded-lg border border-primaryColor/30 bg-dashboardBg/80 px-4 py-3 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-primaryColor/30 scrollbar-track-dashboardBg/50">
														{settings.SOMENTE_RESPONDER.length === 0 && (
															<div className="text-gray-500 text-center text-sm py-2">
																Nenhum número adicionado
															</div>
														)}
														{settings.SOMENTE_RESPONDER.map((number, index) => (
															<div
																key={number}
																className="flex items-center justify-between mb-2 px-3 py-2 bg-dashboardCard rounded-lg border border-primaryColor/10 hover:border-primaryColor/30 transition-colors"
															>
																<span>{number}</span>
																<button
																	type="button"
																	onClick={() => {
																		setSettings((prevSettings) => ({
																			...prevSettings,
																			SOMENTE_RESPONDER:
																				prevSettings.SOMENTE_RESPONDER.filter(
																					(_, i) => i !== index,
																				),
																		}));
																	}}
																	className="ml-4 bg-transparent rounded-full border border-red-500/50 p-1 text-red-400 hover:bg-red-500/20 transition-all"
																>
																	<TrashIcon className="h-4 w-4" />
																</button>
															</div>
														))}
														<div className="mt-3 flex">
															<input
																id="add-only-respond-to"
																type="text"
																value={newSomenteResponder}
																onChange={(e) => {
																	const value = e.target.value;
																	if (/^\d*$/.test(value)) {
																		setNewSomenteResponder(value);
																	}
																}}
																className="grow rounded-l-lg border border-primaryColor/30 bg-dashboardBg px-4 py-2 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30"
																placeholder="Adicionar número"
															/>
															<button
																type="button"
																onClick={() => {
																	if (newSomenteResponder.trim() !== "") {
																		setSettings((prevSettings) => ({
																			...prevSettings,
																			SOMENTE_RESPONDER: [
																				...prevSettings.SOMENTE_RESPONDER,
																				newSomenteResponder.trim(),
																			],
																		}));
																		setNewSomenteResponder("");
																	}
																}}
																className="rounded-r-lg bg-gradient-to-r from-primaryColor to-dashboardAccent px-4 py-2 text-white transition hover:shadow-md"
															>
																Adicionar
															</button>
														</div>
													</div>
												</div>

												<div className="w-1/2">
													<label
														htmlFor="dont-respond-to"
														className="mb-2 flex items-center font-medium text-gray-300 text-sm"
													>
														Não Responder
														<div className="group relative ml-1">
															<Info className="size-4 cursor-pointer text-gray-400" />
															<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
																Se você deseja que a IA não responda a certos
																contatos, insira aqui os números separados por
																vírgula (por exemplo: "555181995600").
															</div>
														</div>
													</label>
													<div className="w-full rounded-lg border border-primaryColor/30 bg-dashboardBg/80 px-4 py-3 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-primaryColor/30 scrollbar-track-dashboardBg/50">
														{settings.NAO_RESPONDER.length === 0 && (
															<div className="text-gray-500 text-center text-sm py-2">
																Nenhum número adicionado
															</div>
														)}
														{settings.NAO_RESPONDER.map((number, index) => (
															<div
																key={number}
																className="flex items-center justify-between mb-2 px-3 py-2 bg-dashboardCard rounded-lg border border-primaryColor/10 hover:border-primaryColor/30 transition-colors"
															>
																<span>{number}</span>
																<button
																	type="button"
																	onClick={() => {
																		setSettings((prevSettings) => ({
																			...prevSettings,
																			NAO_RESPONDER:
																				prevSettings.NAO_RESPONDER.filter(
																					(_, i) => i !== index,
																				),
																		}));
																	}}
																	className="ml-4 rounded-full bg-transparent border border-red-500/50 p-1 text-red-400 hover:bg-red-500/20 transition-all"
																>
																	<TrashIcon className="h-4 w-4" />
																</button>
															</div>
														))}
														<div className="mt-3 flex">
															<input
																id="add-dont-respond-to"
																type="text"
																value={newNaoResponder}
																onChange={(e) =>
																	setNewNaoResponder(e.target.value)
																}
																className="grow rounded-l-lg border border-primaryColor/30 bg-dashboardBg px-4 py-2 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30"
																placeholder="Adicionar número"
															/>
															<button
																type="button"
																onClick={() => {
																	if (newNaoResponder.trim() !== "") {
																		setSettings((prevSettings) => ({
																			...prevSettings,
																			NAO_RESPONDER: [
																				...prevSettings.NAO_RESPONDER,
																				newNaoResponder.trim(),
																			],
																		}));
																		setNewNaoResponder("");
																	}
																}}
																className="rounded-r-lg bg-gradient-to-r from-primaryColor to-dashboardAccent px-4 py-2 text-white transition hover:shadow-md"
															>
																Adicionar
															</button>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Nova seção de Follow-Up */}
							<div className="rounded-xl border border-primaryColor/20 bg-dashboardBg/70 overflow-hidden transition-all duration-300 hover:border-primaryColor/40 shadow-sm">
								<button
									type="button"
									className="flex w-full items-center justify-between p-4 cursor-pointer bg-transparent text-left"
									onClick={toggleFollowUpSettings}
									aria-expanded={showFollowUpSettings}
								>
									<h3 className="font-medium text-primaryColor/90 flex items-center">
										<Bell className="h-4 w-4 mr-2 text-primaryColor/90" />
										<span className="text-white">Mensagens de Follow-Up</span>
									</h3>
									<div
										className={`transform transition-transform duration-300 ${showFollowUpSettings ? "rotate-180" : ""}`}
									>
										<ChevronDown
											className="h-5 w-5 text-white"
											aria-hidden="true"
										/>
									</div>
								</button>

								{/* Conteúdo do painel - Follow-Up */}
								<div
									className={`transition-all duration-300 ease-in-out ${showFollowUpSettings ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}
								>
									<div className="px-4 pb-4">
										{/* Aviso para DeepSeek */}
										{settings.AI_SELECTED === "DEEPSEEK" && (
											<div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
												<div className="flex items-center text-yellow-400 mb-2">
													<Info className="h-5 w-5 mr-2" />
													<span className="font-medium">Funcionalidade não disponível</span>
												</div>
												<p className="text-yellow-300/80 text-sm">
													O sistema de Follow-Up ainda não tem suporte para a IA DeepSeek.
													Esta funcionalidade está disponível apenas para GPT e Gemini.
												</p>
											</div>
										)}

										<div className={`bg-dashboardCard/50 rounded-lg p-5 space-y-5 shadow-inner border border-white/5 ${settings.AI_SELECTED === "DEEPSEEK" ? "opacity-50 pointer-events-none" : ""}`}>
											{/* Ativar Follow-Up */}
											<label className="flex items-center justify-between cursor-pointer">
												<div className="flex items-center">
													<span className="text-white font-medium mr-2">Ativar Follow-Up</span>
													<div className="group relative">
														<Info className="size-4 cursor-pointer text-gray-400" />
														<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
															Sistema enviará automaticamente mensagens de follow-up para leads que pararam de responder.
														</div>
													</div>
												</div>
												<div className="relative">
													<input
														type="checkbox"
														checked={settings.FOLLOW_UP_ATIVO}
														onChange={(e) =>
															setSettings((prev) => ({
																...prev,
																FOLLOW_UP_ATIVO: e.target.checked,
															}))
														}
														className="sr-only"
													/>
													<div
														className={`w-12 h-6 rounded-full transition-all duration-300 shadow-inner ${settings.FOLLOW_UP_ATIVO ? "bg-gradient-to-r from-primaryColor to-dashboardAccent" : "bg-gray-700"}`}
													>
														<div
															className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${settings.FOLLOW_UP_ATIVO ? "translate-x-6" : "translate-x-0"}`}
														/>
													</div>
												</div>
											</label>

											{/* Gerar por IA */}
											<label className="flex items-center justify-between cursor-pointer">
												<div className="flex items-center">
													<span className="text-white font-medium mr-2">Gerar mensagens por IA</span>
													<div className="group relative">
														<Info className="size-4 cursor-pointer text-gray-400" />
														<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
															IA analisará cada conversa e gerará mensagens personalizadas baseadas no contexto.
														</div>
													</div>
												</div>
												<div className="relative">
													<input
														type="checkbox"
														checked={settings.FOLLOW_UP_GERAR_IA}
														onChange={(e) =>
															setSettings((prev) => ({
																...prev,
																FOLLOW_UP_GERAR_IA: e.target.checked,
															}))
														}
														className="sr-only"
													/>
													<div
														className={`w-12 h-6 rounded-full transition-all duration-300 shadow-inner ${settings.FOLLOW_UP_GERAR_IA ? "bg-gradient-to-r from-primaryColor to-dashboardAccent" : "bg-gray-700"}`}
													>
														<div
															className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${settings.FOLLOW_UP_GERAR_IA ? "translate-x-6" : "translate-x-0"}`}
														/>
													</div>
												</div>
											</label>

											{/* Botão para editar prompt - só aparece quando Gerar por IA está ativo */}
											{settings.FOLLOW_UP_GERAR_IA && (
												<div className="flex items-center justify-between">
													<div className="flex items-center">
														<span className="text-gray-400 text-sm">Personalizar prompt da IA</span>
														<div className="group relative ml-1">
															<Info className="size-4 cursor-pointer text-gray-400" />
															<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
																O prompt padrão já está otimizado para gerar excelentes mensagens de follow-up.
																Só modifique se souber exatamente o que está fazendo ou quiser adaptar ao seu negócio específico.
															</div>
														</div>
													</div>
													<button
														type="button"
														onClick={() => setShowFollowUpPromptModal(true)}
														className="px-3 py-1.5 bg-transparent text-sm rounded-lg border border-primaryColor/30 text-primaryColor hover:bg-primaryColor/10 transition-colors flex items-center"
													>
														<Wand2 className="w-4 h-4 mr-1.5" />
														Editar Prompt
													</button>
												</div>
											)}

											{/* Configurações de tempo */}
											<div className="grid grid-cols-3 gap-4">
												<div className="flex flex-col">
													<label
														className="flex items-center font-medium text-gray-300 text-sm mb-1"
														htmlFor="FOLLOW_UP_QUANTIDADE_MENSAGENS"
													>
														Qtd mensagens
														<div className="group relative ml-1">
															<Info className="size-4 cursor-pointer text-gray-400" />
															<div className="absolute bottom-full left-1/2 mb-2 hidden w-64 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
																Quantas mensagens de follow-up enviar (máximo 3).
															</div>
														</div>
													</label>
													<select
														name="FOLLOW_UP_QUANTIDADE_MENSAGENS"
														id="FOLLOW_UP_QUANTIDADE_MENSAGENS"
														value={settings.FOLLOW_UP_QUANTIDADE_MENSAGENS}
														onChange={handleSettingsChange}
														className="rounded-lg border border-primaryColor/30 bg-dashboardBg px-4 py-2 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30"
													>
														<option value="1">1 mensagem</option>
														<option value="2">2 mensagens</option>
														<option value="3">3 mensagens</option>
													</select>
												</div>

												<div className="flex flex-col">
													<label
														className="flex items-center font-medium text-gray-300 text-sm mb-1"
														htmlFor="FOLLOW_UP_TEMPO_VERIFICACAO"
													>
														Verificação (min)
														<div className="group relative ml-1">
															<Info className="size-4 cursor-pointer text-gray-400" />
															<div className="absolute bottom-full left-1/2 mb-2 hidden w-64 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
																Tempo para verificar se precisa de follow-up após receber mensagem.
															</div>
														</div>
													</label>
													<input
														type="number"
														name="FOLLOW_UP_TEMPO_VERIFICACAO"
														id="FOLLOW_UP_TEMPO_VERIFICACAO"
														min="1"
														max="120"
														value={settings.FOLLOW_UP_TEMPO_VERIFICACAO}
														onChange={handleSettingsChange}
														className="rounded-lg border border-primaryColor/30 bg-dashboardBg px-4 py-2 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30"
													/>
												</div>

												<div className="flex flex-col">
													<label
														className="flex items-center font-medium text-gray-300 text-sm mb-1"
														htmlFor="FOLLOW_UP_INTERVALO_HORAS"
													>
														Intervalo entre mensagens (hrs)
														<div className="group relative ml-1">
															<Info className="size-4 cursor-pointer text-gray-400" />
															<div className="absolute bottom-full left-1/2 mb-2 hidden w-64 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
																Tempo entre o envio de cada mensagem dentro do mesmo ciclo de follow-up.
																Exemplo: com 24h e 3 mensagens = 1ª após 10min, 2ª após 24h, 3ª após 48h.
															</div>
														</div>
													</label>
													<input
														type="number"
														name="FOLLOW_UP_INTERVALO_HORAS"
														id="FOLLOW_UP_INTERVALO_HORAS"
														min="1"
														max="168"
														value={settings.FOLLOW_UP_INTERVALO_HORAS}
														onChange={handleSettingsChange}
														className="rounded-lg border border-primaryColor/30 bg-dashboardBg px-4 py-2 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30"
													/>
												</div>
											</div>

											{/* Mensagens pré-definidas (só aparece se IA não estiver ativa) */}
											{!settings.FOLLOW_UP_GERAR_IA && (
												<div className="space-y-3">
													<div className="text-gray-300 text-sm font-medium">
														Mensagens de Follow-Up
													</div>

													{/* Mensagem 1 - sempre aparece */}
													<div className="flex flex-col">
														<label className="text-xs text-gray-400 mb-1" htmlFor="FOLLOW_UP_MENSAGEM_1">Mensagem 1</label>
														<textarea
															id="FOLLOW_UP_MENSAGEM_1"
															name="FOLLOW_UP_MENSAGEM_1"
															value={settings.FOLLOW_UP_MENSAGEM_1}
															onChange={handleSettingsChange}
															rows="2"
															placeholder="Olá! Notei que não recebemos resposta. Posso ajudar com mais alguma coisa?"
															className="w-full rounded-lg border border-primaryColor/30 bg-dashboardBg px-4 py-2 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30"
														/>
													</div>

													{/* Mensagem 2 - só aparece se quantidade >= 2 */}
													{Number.parseInt(settings.FOLLOW_UP_QUANTIDADE_MENSAGENS) >= 2 && (
														<div className="flex flex-col">
															<label className="text-xs text-gray-400 mb-1" htmlFor="FOLLOW_UP_MENSAGEM_2">Mensagem 2</label>
															<textarea
																id="FOLLOW_UP_MENSAGEM_2"
																name="FOLLOW_UP_MENSAGEM_2"
																value={settings.FOLLOW_UP_MENSAGEM_2}
																onChange={handleSettingsChange}
																rows="2"
																placeholder="Olá novamente! Estou disponível caso precise de alguma informação adicional."
																className="w-full rounded-lg border border-primaryColor/30 bg-dashboardBg px-4 py-2 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30"
															/>
														</div>
													)}

													{/* Mensagem 3 - só aparece se quantidade = 3 */}
													{Number.parseInt(settings.FOLLOW_UP_QUANTIDADE_MENSAGENS) === 3 && (
														<div className="flex flex-col">
															<label className="text-xs text-gray-400 mb-1" htmlFor="FOLLOW_UP_MENSAGEM_3">Mensagem 3</label>
															<textarea
																id="FOLLOW_UP_MENSAGEM_3"
																name="FOLLOW_UP_MENSAGEM_3"
																value={settings.FOLLOW_UP_MENSAGEM_3}
																onChange={handleSettingsChange}
																rows="2"
																placeholder="Só passando para ver se está tudo bem. Estou à disposição para ajudar!"
																className="w-full rounded-lg border border-primaryColor/30 bg-dashboardBg px-4 py-2 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30"
															/>
														</div>
													)}
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="mt-6 flex flex-col items-center justify-center">
						<button
							type="button"
							onClick={() => {
								handleSaveSettings();
							}}
							className={`rounded-full px-8 py-3 font-medium transition-all duration-300 ${hasUnsavedChanges
								? "bg-gradient-to-r from-primaryColor via-dashboardAccent to-primaryColor bg-[length:200%_100%] bg-left hover:bg-right transform hover:scale-[1.03] hover:shadow-lg cursor-pointer"
								: "cursor-not-allowed bg-gray-700 text-gray-400"
								}`}
							style={{
								cursor: hasUnsavedChanges ? "pointer" : "not-allowed",
								pointerEvents: "auto",
							}}
							disabled={!hasUnsavedChanges}
						>
							Salvar Configurações
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

