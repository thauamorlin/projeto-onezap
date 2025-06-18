import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { channels } from "../../shared/constants";
import { BotIcon, UserIcon, Clock, Bell, SendIcon, XIcon, Trash2 } from "lucide-react";
import { validateAuthToken } from "../../api";
import { toast } from "react-toastify";
import { format, isValid, fromUnixTime, isToday, isYesterday, differenceInDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
/**
 * @typedef {import('../types/chat').MediaInfo} MediaInfo
 * @typedef {import('../types/chat').MediaMessageProps} MediaMessageProps
 * @typedef {import('../types/chat').MessageKey} MessageKey
 * @typedef {import('../types/chat').MediaContent} MediaContent
 * @typedef {import('../types/chat').MessageContent} MessageContent
 * @typedef {import('../types/chat').Message} Message
 * @typedef {import('../types/chat').ChatInfo} ChatInfo
 */

const { ipcRenderer } = window.require("electron");

/**
 * Componente para renderizar mensagens de mídia com ícones e estilo apropriados
 * @param {MediaMessageProps} props - Propriedades do componente
 * @returns {JSX.Element} Elemento React renderizado
 */
const MediaMessage = ({ type, caption }) => {
	const getMediaInfo = () => {
		switch (type) {
			case "image":
				return {
					icon: "🖼️",
					label: "Imagem",
					bgColor: "bg-blue-500/20",
					borderColor: "border-blue-500/30",
				};
			case "video":
				return {
					icon: "🎥",
					label: "Vídeo",
					bgColor: "bg-red-500/20",
					borderColor: "border-red-500/30",
				};
			case "audio":
				return {
					icon: "🎵",
					label: "Áudio",
					bgColor: "bg-orange-500/20",
					borderColor: "border-orange-500/30",
				};
			case "document":
				return {
					icon: "📄",
					label: "Documento",
					bgColor: "bg-yellow-500/20",
					borderColor: "border-yellow-500/30",
				};
			case "sticker":
				return {
					icon: "🏷️",
					label: "Sticker",
					bgColor: "bg-green-500/20",
					borderColor: "border-green-500/30",
				};
			case "contact":
				return {
					icon: "👤",
					label: "Contato",
					bgColor: "bg-purple-500/20",
					borderColor: "border-purple-500/30",
				};
			case "location":
				return {
					icon: "📍",
					label: "Localização",
					bgColor: "bg-red-500/20",
					borderColor: "border-red-500/30",
				};
			case "reaction":
				return {
					icon: "👍",
					label: "Reação",
					bgColor: "bg-yellow-500/20",
					borderColor: "border-yellow-500/30",
				};
			case "interactive":
				return {
					icon: "🔘",
					label: "Mensagem Interativa",
					bgColor: "bg-blue-500/20",
					borderColor: "border-blue-500/30",
				};
			case "poll":
				return {
					icon: "📊",
					label: "Enquete",
					bgColor: "bg-indigo-500/20",
					borderColor: "border-indigo-500/30",
				};
			default:
				return {
					icon: "💬",
					label: "Mensagem não suportada",
					bgColor: "bg-gray-500/20",
					borderColor: "border-gray-500/30",
				};
		}
	};

	const { icon, label, bgColor, borderColor } = getMediaInfo();

	return (
		<div
			className={`flex items-center p-2 rounded-md ${bgColor} border ${borderColor}`}
		>
			<span className="text-2xl mr-2">{icon}</span>
			<div className="flex flex-col">
				<span className="font-medium">{label}</span>
				{caption && <span className="text-xs mt-1 opacity-80">{caption}</span>}
			</div>
		</div>
	);
};

/**
 * Componente para mostrar um alerta de conexão
 * @param {Object} props - Propriedades do componente
 * @param {boolean} props.connected - Status de conexão
 * @returns {JSX.Element|null} Elemento React ou null se conectado
 */
const ConnectionAlert = ({ connected }) => {
	if (connected) return null;

	return (
		<div className="w-full px-4 py-3 bg-red-500/80 text-white shadow-md">
			<div className="flex items-center">
				<div className="flex-shrink-0">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fillRule="evenodd"
							d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
							clipRule="evenodd"
						/>
					</svg>
				</div>
				<div className="ml-3">
					<p className="font-medium">WhatsApp desconectado</p>
					<p className="text-sm opacity-90">
						Conecte-se ao WhatsApp para visualizar e receber suas mensagens.
					</p>
				</div>
			</div>
		</div>
	);
};

/**
 * Componente para mostrar um toggle de modo IA em cada chat
 * @param {Object} props - Propriedades do componente
 * @param {string} props.chatId - ID do chat
 * @param {string} props.instanceId - ID da instância
 * @param {Function} props.onStatusChange - Função para notificar mudanças de status
 * @returns {JSX.Element} Elemento React
 */
const AIModeToggle = ({ chatId, instanceId, onStatusChange }) => {
	const [aiModeStatus, setAiModeStatus] = useState(null);
	const [isToggling, setIsToggling] = useState(false);

	// Carrega o status inicial do modo IA
	useEffect(() => {
		const loadAIModeStatus = async () => {
			try {
				const result = await ipcRenderer.invoke("get-ai-mode-status", {
					instanceId,
					chatId
				});

				if (result.success) {
					setAiModeStatus(result.status);
					onStatusChange?.(chatId, result.status);
				}
			} catch (error) {
				console.error("Erro ao carregar status do modo IA:", error);
			}
		};

		loadAIModeStatus();
	}, [instanceId, chatId]); // Removido onStatusChange das dependências

	const handleToggle = async (e) => {
		e.stopPropagation(); // Evita que o clique selecione o chat

		if (isToggling) return;

		// Se não pode alterar, mostra toast explicativo
		if (!aiModeStatus?.canToggle) {
			const toastId = `toggle-restriction-${chatId}`;
			if (!toast.isActive(toastId)) {
				toast.info(aiModeStatus.reason, {
					position: "top-right",
					autoClose: 6000,
					toastId: toastId
				});
			}
			return;
		}

		setIsToggling(true);

		try {
			const result = await ipcRenderer.invoke("set-ai-mode", {
				instanceId,
				chatId,
				active: !aiModeStatus.active
			});

			if (result.success) {
				setAiModeStatus(result.status);
				onStatusChange?.(chatId, result.status);
				toast.success(result.message);
			} else {
				// Mostra toast explicativo sobre por que não pode alterar
				toast.info(result.message, {
					position: "top-right",
					autoClose: 6000
				});
			}
		} catch (error) {
			console.error("Erro ao alternar modo IA:", error);
			toast.error("Erro ao alterar modo IA");
		} finally {
			setIsToggling(false);
		}
	};

	if (!aiModeStatus) {
		return (
			<div className="ml-2 flex items-center">
				<div className="h-6 w-12 bg-gray-600 rounded-full animate-pulse" />
			</div>
		);
	}

	const isGroup = aiModeStatus.isGroup;
	const canToggle = aiModeStatus.canToggle;
	const isActive = aiModeStatus.active;

	return (
		<div className="ml-2 flex items-center" title={aiModeStatus.reason}>
			{/* Switch Estilizado */}
			<button
				type="button"
				onClick={handleToggle}
				disabled={isToggling}
				className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${isToggling ? "opacity-50" : ""
					} ${!canToggle
						? "bg-gray-600 cursor-not-allowed"
						: isActive
							? "bg-green-600"
							: "bg-purple-600"
					}`}
			>
				{/* Ícone do Bot (Modo IA) - À esquerda */}
				<span
					className={`absolute left-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full transition-all text-white ${isActive ? "opacity-100" : "opacity-40"
						}`}
				>
					<BotIcon size={12} />
				</span>

				{/* Bolinha do Switch */}
				<span
					className={`absolute top-0.5 flex h-5 w-5 transform items-center justify-center rounded-full bg-white transition-transform ${isActive ? "translate-x-6" : "translate-x-0.5"
						} ${isToggling ? "animate-pulse" : ""}`}
				>
					{isToggling && (
						<div
							className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin"
							style={{ color: isActive ? "#16a34a" : "#9333ea" }}
						/>
					)}
				</span>

				{/* Ícone do Usuário (Modo Manual) - À direita */}
				<span
					className={`absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full transition-all text-white ${!isActive ? "opacity-100" : "opacity-40"
						}`}
				>
					<UserIcon size={12} />
				</span>
			</button>

			{/* Indicador especial para grupos */}
			{isGroup && (
				<span className="ml-1 text-xs text-gray-400" title="IA desativada para grupos">
					👥
				</span>
			)}
		</div>
	);
};

/**
 * Componente para exibir o timer de envio de follow-up (com suporte a múltiplas mensagens)
 * @param {Object} props - Propriedades do componente
 * @param {any[]} props.followUps - Array de follow-ups agendados
 * @param {Function} props.formatTime - Função para formatar o tempo
 * @returns {JSX.Element} Componente React renderizado
 */
const FollowUpSendTimer = ({ followUps, formatTime }) => {
	if (!followUps || followUps.length === 0) return null;

	// Ordena os follow-ups por tempo de envio
	const sortedFollowUps = [...followUps].sort((a, b) => a.scheduledTime - b.scheduledTime);
	const nextFollowUp = sortedFollowUps[0];
	const [timeLeft, setTimeLeft] = useState(nextFollowUp.scheduledTime - Date.now());
	const scheduledTimeRef = useRef(nextFollowUp.scheduledTime);

	useEffect(() => {
		// Atualiza a referência quando o scheduledTime mudar
		scheduledTimeRef.current = nextFollowUp.scheduledTime;

		// Atualiza o tempo inicial
		setTimeLeft(nextFollowUp.scheduledTime - Date.now());

		// Atualiza a cada segundo
		const timer = setInterval(() => {
			const newTimeLeft = scheduledTimeRef.current - Date.now();
			setTimeLeft(newTimeLeft);

			// Se o tempo acabou, limpa o timer
			if (newTimeLeft <= 0) {
				clearInterval(timer);
			}
		}, 1000);

		// Limpa o timer ao desmontar
		return () => clearInterval(timer);
	}, [nextFollowUp.scheduledTime]);

	return (
		<div className="flex flex-col gap-2">
			{/* Timer da próxima mensagem */}
			<div className="flex items-center bg-yellow-900/40 px-3 py-1 rounded-md border border-yellow-700/30">
				<Clock size={14} className="text-yellow-400 mr-2" />
				<span className="text-sm text-yellow-300">
					{timeLeft <= 0 ? "Enviando em breve..." : `Próxima em ${formatTime(timeLeft)}`}
				</span>
				{sortedFollowUps.length > 1 && (
					<span className="ml-2 text-xs text-yellow-400 font-medium">
						({nextFollowUp.sequenceIndex || 1}/{nextFollowUp.totalInSequence || sortedFollowUps.length})
					</span>
				)}
			</div>

			{/* Lista de todas as mensagens agendadas */}
			{sortedFollowUps.length > 1 && (
				<div className="text-xs text-yellow-300 bg-yellow-900/20 px-2 py-1 rounded border border-yellow-700/20">
					<div className="font-medium mb-1">Sequência completa:</div>
					{sortedFollowUps.map((followUp, index) => {
						const delay = followUp.scheduledTime - Date.now();
						const isNext = index === 0;
						return (
							<div key={followUp.scheduledTime} className={`flex justify-between ${isNext ? "font-medium" : "opacity-75"}`}>
								<span>Msg {index + 1}:</span>
								<span>
									{delay <= 0 ? "Enviando..." : formatTime(delay)}
								</span>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

/**
 * Componente principal de chat que gerencia conversas e mensagens
 * @returns {JSX.Element} Componente React renderizado
 */
export function Chat({ instanceId }) {
	/** @type {[ChatInfo[], React.Dispatch<React.SetStateAction<ChatInfo[]>>]} */
	const [chats, setChats] = useState([]);

	/** @type {[ChatInfo|null, React.Dispatch<React.SetStateAction<ChatInfo|null>>]} */
	const [selectedChat, setSelectedChat] = useState(null);

	/** @type {[Message[], React.Dispatch<React.SetStateAction<Message[]>>]} */
	const [messages, setMessages] = useState([]);

	/** @type {[ConnectionStatus, React.Dispatch<React.SetStateAction<ConnectionStatus>>]} */
	const [connectionStatus, setConnectionStatus] = useState({
		connected: false,
		lastUpdate: 0,
		reason: "Iniciando aplicação...",
		reconnectAttempts: 0,
	});

	/** @type {[string[], React.Dispatch<React.SetStateAction<string[]>>]} */
	const [newMessageIds, setNewMessageIds] = useState([]);

	/** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
	const [messageInput, setMessageInput] = useState("");

	/** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
	const [isSending, setIsSending] = useState(false);

	/** @type {[Object, React.Dispatch<React.SetStateAction<Object>>]} */
	const [allInterventions, setAllInterventions] = useState({});

	/** @type {[Object, React.Dispatch<React.SetStateAction<Object>>]} */
	const [activeFollowUps, setActiveFollowUps] = useState({});

	/** @type {[Object, React.Dispatch<React.SetStateAction<Object>>]} */
	const [followUpChecks, setFollowUpChecks] = useState({});

	/** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
	const [isCheckingFollowUp, setIsCheckingFollowUp] = useState(false);

	/** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
	const [isClearingChat, setIsClearingChat] = useState(false);

	/** @type {[Object, React.Dispatch<React.SetStateAction<Object>>]} */
	const [aiModeStatuses, setAiModeStatuses] = useState({});

	/** @type {React.RefObject<number>} */
	const interventionTimerRef = useRef(null);

	/** @type {React.RefObject<HTMLDivElement>} */
	const messagesEndRef = useRef(null);

	/** @type {React.RefObject<HTMLTextAreaElement>} */
	const messageInputRef = useRef(null);

	/** @type {React.RefObject<string|null>} */
	const prevInstanceIdRef = useRef(null);

	// Memoização estável das condições de follow-up para evitar re-renders
	const followUpConditions = useMemo(() => {
		if (!selectedChat) {
			return {
				shouldShowBlueSection: false,
				shouldShowYellowSection: false,
				hasFollowUp: false
			};
		}

		const chatId = selectedChat.id;
		const aiModeStatus = aiModeStatuses[chatId];
		const followUps = activeFollowUps[chatId] || [];
		const hasFollowUp = followUps.length > 0;

		const shouldShowBlueSection = aiModeStatus?.active && !hasFollowUp;
		const shouldShowYellowSection = aiModeStatus?.active && hasFollowUp;

		return {
			shouldShowBlueSection,
			shouldShowYellowSection,
			hasFollowUp
		};
	}, [selectedChat?.id, aiModeStatuses, activeFollowUps]);

	/**
	 * Função para rolar para o final das mensagens
	 */
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	// Rola para o final quando as mensagens forem atualizadas
	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	useEffect(() => {
		const interval = setInterval(() => {
			validateAuthToken();
		}, 300000); // 300.000 milissegundos = 5 minutos

		return () => clearInterval(interval);
	}, []);

	// Limpa os IDs de novas mensagens após 2 segundos
	useEffect(() => {
		if (newMessageIds.length > 0) {
			const timer = setTimeout(() => {
				setNewMessageIds([]);
			}, 2000);
			return () => clearTimeout(timer);
		}
	}, [newMessageIds]);

	// Carrega a lista de chats para a instância selecionada
	useEffect(() => {
		if (!instanceId) return;

		// Limpa os estados relacionados ao chat quando mudamos de instância

		// Somente limpa o chat selecionado quando a instância realmente mudar
		if (prevInstanceIdRef.current && prevInstanceIdRef.current !== instanceId) {
			setSelectedChat(null);
			setMessages([]);
		}

		// Atualiza a referência para a instância atual
		prevInstanceIdRef.current = instanceId;

		const loadChats = () => {
			ipcRenderer
				.invoke("get-chats", instanceId)
				.then((chatsInfo) => {
					console.log("chatsInfo", chatsInfo);
					const filteredChats = chatsInfo.filter((chat) => {
						const hasValidMessage =
							chat.lastMessage && chat.lastMessage.trim() !== "";
						const hasValidTimestamp = chat.timestamp && chat.timestamp > 0;
						return hasValidMessage && hasValidTimestamp;
					});
					setChats(filteredChats);
				})
				.catch((error) => {
					console.error("Erro ao obter chats:", error);
				});
		};

		// Carrega os follow-ups ativos
		const loadActiveFollowUps = () => {
			ipcRenderer
				.invoke("get-active-follow-ups", instanceId)
				.then((followUps) => {
					console.log("Follow-ups ativos:", followUps);
					setActiveFollowUps(followUps || {});
				})
				.catch((error) => {
					console.error("Erro ao obter follow-ups ativos:", error);
				});
		};

		loadChats();
		loadActiveFollowUps();

		// Também carrega a lista de intervenções humanas ativas
		ipcRenderer
			.invoke("get-all-human-interventions")
			.then((interventions) => {
				setAllInterventions(interventions || {});
			})
			.catch((error) => {
				console.error("Erro ao obter lista de intervenções humanas:", error);
			});

		// Configura timer para atualizar os tempos restantes a cada 30s
		interventionTimerRef.current = setInterval(() => {
			ipcRenderer
				.invoke("get-all-human-interventions")
				.then((interventions) => {
					setAllInterventions(interventions || {});
				})
				.catch((error) => {
					console.error("Erro ao atualizar lista de intervenções:", error);
				});

			// Também atualiza os follow-ups ativos
			loadActiveFollowUps();
		}, 30000);

		/**
		 * Listener para novas mensagens
		 * @param {Event} _ - Evento
		 * @param {Object} data - Dados da mensagem
		 * @param {string} data.instanceId - ID da instância
		 * @param {string} data.chatId - ID do chat
		 * @param {Message} data.message - Conteúdo da mensagem
		 */
		const newMessageListener = (
			_,
			{ instanceId: msgInstanceId, chatId, message },
		) => {
			console.log(
				`[NEW_MESSAGE] Recebido evento para chatId: ${chatId}`,
				message?.key?.id || "",
			);

			if (msgInstanceId === instanceId) {
				// Atualiza a lista de chats quando uma nova mensagem chegar
				loadChats();

				// Atualiza a lista de follow-ups ativos
				loadActiveFollowUps();

				// Atualiza a lista de intervenções
				ipcRenderer
					.invoke("get-all-human-interventions")
					.then((interventions) => {
						setAllInterventions(interventions || {});
					})
					.catch((error) => {
						console.error("Erro ao atualizar lista de intervenções:", error);
					});

				// Se o chat atual for o que recebeu a mensagem, atualiza as mensagens E as informações de follow-up check
				if (selectedChat && selectedChat.id === chatId) {
					console.log(
						`[NEW_MESSAGE] Atualizando mensagens para chat atual: ${chatId}`,
					);

					ipcRenderer
						.invoke("get-chat-messages", { instanceId, chatId })
						.then((chatMessages) => {
							console.log({ chatMessages });
							setMessages(chatMessages);

							// Adiciona o ID da nova mensagem para destaque
							if (message?.key?.id) {
								setNewMessageIds((prev) => [...prev, message.key.id]);
								console.log(
									`[NEW_MESSAGE] Destacando mensagem: ${message.key.id}`,
								);
							}
						})
						.catch((error) => {
							console.error("Erro ao atualizar mensagens:", error);
						});

					// Atualiza informações de follow-up check para o chat atual
					ipcRenderer
						.invoke("get-follow-up-check-info", { instanceId, chatId })
						.then((info) => {
							if (info.hasScheduledCheck) {
								setFollowUpChecks(prev => ({
									...prev,
									[chatId]: info.checkTime
								}));
								console.log(`[NEW_MESSAGE] Timer de follow-up atualizado para ${chatId}: ${new Date(info.checkTime).toLocaleString()}`);
							} else {
								setFollowUpChecks(prev => {
									const newChecks = { ...prev };
									delete newChecks[chatId];
									return newChecks;
								});
								setFollowUpCheckTimeLeft(0);
								console.log(`[NEW_MESSAGE] Timer de follow-up removido para ${chatId}`);
							}
						})
						.catch((error) => {
							console.error("Erro ao atualizar informações de follow-up check:", error);
						});
				} else {
					console.log(
						`[NEW_MESSAGE] Chat atual diferente (${selectedChat?.id || "nenhum"}) do chat da mensagem (${chatId})`,
					);
				}
			} else {
				console.log(
					`[NEW_MESSAGE] Instância diferente: recebido=${msgInstanceId}, atual=${instanceId}`,
				);
			}
		};

		/**
		 * Listener para resultados de verificação automática de follow-up
		 * (Este listener é responsável por toasts de verificações automáticas da IA)
		 * @param {Event} _ - Evento
		 * @param {Object} data - Dados do resultado da verificação
		 */
		const followUpCheckResultListener = (
			_,
			{ instanceId: checkInstanceId, chatId, success, hasFollowUp, message, reason, isAutomaticCheck }
		) => {
			console.log(`[FOLLOW_UP_CHECK] Recebido resultado para chatId: ${chatId}`, { success, hasFollowUp, isAutomaticCheck });

			if (checkInstanceId !== instanceId) return;

			// Atualiza a lista de follow-ups
			loadActiveFollowUps();

			// ✅ CORREÇÃO: Só exibe toasts se NÃO for verificação automática
			if (!isAutomaticCheck && success) {
				// Usar IDs únicos específicos para verificações manuais
				const baseToastId = `manual-follow-up-${chatId}`;

				if (hasFollowUp) {
					// Toast de sucesso para follow-up agendado manualmente
					if (!toast.isActive(`${baseToastId}-success`)) {
						toast.success(message, {
							position: "top-right",
							autoClose: 5000,
							toastId: `${baseToastId}-success`
						});
					}
				} else {
					// Toast informativo para quando não há follow-up necessário
					if (!toast.isActive(`${baseToastId}-info`)) {
						toast.info(message, {
							position: "top-right",
							autoClose: 5000,
							toastId: `${baseToastId}-info`
						});
					}
				}

				// Toast adicional com razão da IA (apenas se tiver razão)
				if (reason && !toast.isActive(`${baseToastId}-reason`)) {
					toast.info(reason, {
						position: "top-right",
						autoClose: 8000,
						delay: 1000,
						toastId: `${baseToastId}-reason`
					});
				}
			}
		};

		// Primeiro remova quaisquer listeners antigos para evitar duplicação
		ipcRenderer.removeListener(channels.NEW_MESSAGE, newMessageListener);

		// Agora registre os listeners
		ipcRenderer.on(channels.NEW_MESSAGE, newMessageListener);
		// Registra o listener para resultados de verificação de follow-up
		ipcRenderer.on('follow-up-check-result', followUpCheckResultListener);

		return () => {
			ipcRenderer.removeListener(channels.NEW_MESSAGE, newMessageListener);
			ipcRenderer.removeListener('follow-up-check-result', followUpCheckResultListener);
			// Limpa o timer ao desmontar
			if (interventionTimerRef.current) {
				clearInterval(interventionTimerRef.current);
			}
		};
	}, [instanceId, selectedChat]);

	// Verificar o estado de intervenção humana para o chat selecionado
	useEffect(() => {
		if (!selectedChat || !instanceId) return;

		// Consulta os detalhes da intervenção humana para o chat
		ipcRenderer
			.invoke("get-human-intervention-details", {
				chatId: selectedChat.id,
			})
			.then((details) => {
				// Atualiza o estado global de intervenções
				setAllInterventions((prev) => {
					const newInterventions = { ...prev };

					if (details) {
						// Adicionando nova intervenção
						newInterventions[selectedChat.id] = details;
					} else {
						// Removendo intervenção
						delete newInterventions[selectedChat.id];
					}

					return newInterventions;
				});
			})
			.catch((error) => {
				console.error("Erro ao obter detalhes de intervenção humana:", error);
			});
	}, [selectedChat, instanceId]);

	// Carrega as mensagens para o chat selecionado
	useEffect(() => {
		if (!selectedChat || !instanceId) return;

		ipcRenderer
			.invoke("get-chat-messages", { instanceId, chatId: selectedChat.id })
			.then((chatMessages) => {
				setMessages(chatMessages);
				setNewMessageIds([]); // Limpa os destaques ao mudar de chat
			})
			.catch((error) => {
				console.error("Erro ao obter mensagens:", error);
			});
	}, [selectedChat, instanceId]);

	// Carrega o status de conexão e monitora mudanças
	useEffect(() => {
		if (!instanceId) return;


		ipcRenderer
			.invoke("get-connection-status", instanceId)
			.then((status) => {
				console.log("Status de conexão:", status);
				setConnectionStatus(prev => ({
					...prev,
					connected: status.connected,
					lastUpdate: Date.now()
				}));
			})
			.catch((error) => {
				console.error("Erro ao obter status de conexão:", error);
				setConnectionStatus((prev) => ({
					...prev,
					connected: false,
					lastUpdate: Date.now()
				}));
			});

		const statusUpdateListener = (
			_,
			{ status, instanceId: msgInstanceId, reason },
		) => {
			if (instanceId !== msgInstanceId) return;

			const isConnected = status === "open";
			const isDisconnectedByValidation =
				status === "disconnected-by-validation";
			const isDisconnectedByError = status === "disconnected-by-error";

			setConnectionStatus((prev) => ({
				...prev,
				connected: isConnected,
				lastUpdate: Date.now()
			}));

			if (isConnected) {
				console.log(`[CHAT UI] Conexão aberta para instância ${instanceId}`);
				toast.success("WhatsApp conectado com sucesso!");
			}

			if (isDisconnectedByValidation || isDisconnectedByError) {
				console.log(
					`[CHAT UI] Desconexão detectada para instância ${instanceId}: ${reason}`,
				);
				toast.error(`WhatsApp desconectado: ${reason || "Erro de validação"}`, {
					autoClose: false,
				});

				setConnectionStatus((prev) => ({
					...prev,
					connected: false,
					lastUpdate: Date.now()
				}));
			}
		};

		ipcRenderer.on(channels.STATUS_UPDATE, statusUpdateListener);

		return () => {
			ipcRenderer.removeListener(channels.STATUS_UPDATE, statusUpdateListener);
		};
	}, [instanceId]);

	/**
	 */
	const handleInterventionToggle = (chatId, newState, details) => {
		setAllInterventions((prev) => {
			const newInterventions = { ...prev };

			if (newState && details) {
				newInterventions[chatId] = details;
			} else {
				delete newInterventions[chatId];
			}

			return newInterventions;
		});
	};

	/**
	 */
	const handleAIModeStatusChange = useCallback((chatId, status) => {
		console.log(`Status do modo IA alterado para ${chatId}:`, status);
		setAiModeStatuses(prev => ({
			...prev,
			[chatId]: status
		}));
	}, []);

	// Carrega o status do modo IA para o chat selecionado
	useEffect(() => {
		if (!selectedChat || !instanceId) return;

		const loadAIModeStatus = async () => {
			try {
				const result = await ipcRenderer.invoke("get-ai-mode-status", {
					instanceId,
					chatId: selectedChat.id
				});

				if (result.success) {
					setAiModeStatuses(prev => ({
						...prev,
						[selectedChat.id]: result.status
					}));
				}
			} catch (error) {
				console.error("Erro ao carregar status do modo IA:", error);
			}
		};

		loadAIModeStatus();
	}, [selectedChat?.id, instanceId]);

	/**
	 * Formata timestamp usando date-fns para melhor compatibilidade
	 * @param {number|string} timestamp - Timestamp da mensagem
	 * @returns {string} Horário formatado
	 */
	const formatMessageDate = (timestamp) => {
		if (!timestamp) return "";

		try {
			let date;
		const timestampNum = Number(timestamp);
			
			if (Number.isNaN(timestampNum) || timestampNum <= 0) {
				return "";
			}

			// Se o timestamp está em segundos (< 10 bilhões), converte para milissegundos
			if (timestampNum < 10000000000) {
				date = fromUnixTime(timestampNum);
			} else {
				// Timestamp já está em milissegundos
				date = new Date(timestampNum);
			}

			// Verifica se a data é válida
			if (!isValid(date)) {
				return "";
			}

			// Formata usando date-fns
			return format(date, "HH:mm", { locale: ptBR });
		} catch (error) {
			console.error("Erro ao formatar timestamp:", error, "timestamp:", timestamp);
			return "";
		}
	};

	/**
	 * @param {number} timestamp - Timestamp da mensagem
	 * @returns {string} Data formatada
	 */
	const formatHeaderDate = (timestamp) => {
		if (!timestamp) return "";

		try {
			let date;
			const timestampNum = Number(timestamp);
			
			if (Number.isNaN(timestampNum) || timestampNum <= 0) {
				return "";
			}

			// Se o timestamp está em segundos (< 10 bilhões), converte para milissegundos
			if (timestampNum < 10000000000) {
				date = fromUnixTime(timestampNum);
			} else {
				// Timestamp já está em milissegundos
				date = new Date(timestampNum);
			}

			// Verifica se a data é válida
			if (!isValid(date)) {
				return "";
			}

			// Usa as funções do date-fns para verificar hoje e ontem
			if (isToday(date)) {
				// Para hoje: mostra apenas a hora
				return format(date, "HH:mm");
			}

			if (isYesterday(date)) {
				// Para ontem: mostra "Ontem"
				return "Ontem";
			}

			// Calcula a diferença em dias usando date-fns
			const daysDiff = differenceInDays(startOfDay(new Date()), startOfDay(date));

			// Últimos 7 dias (mas não ontem nem hoje): mostra o dia da semana
			if (daysDiff >= 2 && daysDiff <= 7) {
				return format(date, "EEEE", { locale: ptBR });
			}

			// Mais de 7 dias: mostra a data completa
			return format(date, "dd/MM/yyyy", { locale: ptBR });
		} catch (error) {
			console.error("Erro ao formatar data do header:", error, "timestamp:", timestamp);
			return "";
		}
	};

	/**
	 * @param {ChatInfo} chat - Informações do chat
	 */
	const handleChatSelect = (chat) => {
		setSelectedChat(chat);
	};

	/**
	 * @param {React.KeyboardEvent} event - Evento de teclado
	 * @param {ChatInfo} chat - Informações do chat
	 */
	const handleKeyboardSelect = (event, chat) => {
		if (event.key === "Enter" || event.key === " ") {
			setSelectedChat(chat);
		}
	};

	/**
	 * @param {string} messageId - ID da mensagem
	 * @returns {boolean} Verdadeiro se a mensagem for nova
	 */
	const isNewMessage = (messageId) => {
		return newMessageIds.includes(messageId);
	};

	/**
	 * Handler para envio de mensagem
	 * @param {React.FormEvent} e - Evento de formulário
	 */
	const handleSendMessage = async (e) => {
		e.preventDefault();

		if (!messageInput.trim() || !selectedChat || !instanceId || isSending) {
			return;
		}

		setIsSending(true);

		try {
			const result = await ipcRenderer.invoke("send-message", {
				instanceId,
				chatId: selectedChat.id,
				message: messageInput,
			});

			if (!result.success) {
				console.error("Erro ao enviar mensagem:", result.error);
			}

			setMessageInput("");

			setTimeout(() => {
				if (messageInputRef.current) {
					messageInputRef.current.focus();
				}
			}, 50);
		} catch (error) {
			console.error("Erro ao enviar mensagem:", error);
		} finally {
			setIsSending(false);

			// Adiciona um foco adicional após o término do envio para maior garantia
			setTimeout(() => {
				if (messageInputRef.current) {
					messageInputRef.current.focus();
				}
			}, 100);
		}
	};

	/**
	 * Handler para pressionar Enter no campo de mensagem
	 * @param {React.KeyboardEvent} e - Evento de teclado
	 */
	const handleKeyPress = (e) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage(e);
		}
	};

	/**
	 * @param {Message} msg - Mensagem a verificar
	 * @returns {boolean} Verdadeiro se for mensagem da IA
	 */
	const isAIMessage = (msg) => {
		return !!msg.isAIMessage;
	};

	/**
	 * @param {Message} msg - Mensagem a verificar
	 * @returns {boolean} Verdadeiro se for mensagem de follow-up
	 */
	const isFollowUpMessage = (msg) => {
		return !!msg.isFollowUp;
	};

	/**
	 * @param {Message} msg - Objeto da mensagem
	 * @returns {JSX.Element|null} Elemento React ou null se o tipo não for suportado
	 */
	const renderMessageContent = (msg) => {
		const msgContent = msg.message;

		if (!msgContent) return null;

		if (msgContent.conversation) {
			return (
				<div className="text-sm whitespace-pre-wrap break-words">
					{msgContent.conversation}
				</div>
			);
		}

		if (msgContent.extendedTextMessage?.text) {
			return (
				<div className="text-sm whitespace-pre-wrap break-words">
					{msgContent.extendedTextMessage.text}
				</div>
			);
		}

		if (msgContent.imageMessage) {
			return (
				<MediaMessage type="image" caption={msgContent.imageMessage.caption} />
			);
		}

		if (msgContent.videoMessage) {
			return (
				<MediaMessage type="video" caption={msgContent.videoMessage.caption} />
			);
		}

		if (msgContent.audioMessage) {
			return <MediaMessage type="audio" />;
		}

		if (msgContent.documentMessage) {
			return (
				<MediaMessage
					type="document"
					caption={msgContent.documentMessage.fileName}
				/>
			);
		}

		if (msgContent.stickerMessage) {
			return <MediaMessage type="sticker" />;
		}

		if (msgContent.contactMessage || msgContent.contactsArrayMessage) {
			return <MediaMessage type="contact" caption="Contato compartilhado" />;
		}

		if (msgContent.locationMessage) {
			return (
				<MediaMessage type="location" caption="Localização compartilhada" />
			);
		}

		if (msgContent.buttonsMessage || msgContent.templateMessage) {
			return <MediaMessage type="interactive" caption="Mensagem interativa" />;
		}

		if (msgContent.pollCreationMessage || msgContent.pollUpdateMessage) {
			return <MediaMessage type="poll" caption="Enquete" />;
		}

		return null;
	};

	/** @type {[number, React.Dispatch<React.SetStateAction<number>>]} */
	const [followUpCheckTimeLeft, setFollowUpCheckTimeLeft] = useState(0);

	useEffect(() => {
		if (!selectedChat || !instanceId) return;

		const loadFollowUpCheckInfo = () => {
			ipcRenderer
				.invoke("get-follow-up-check-info", { instanceId, chatId: selectedChat.id })
				.then((info) => {
					if (info.hasScheduledCheck) {
						setFollowUpChecks(prev => {
							if (prev[selectedChat.id] === info.checkTime) {
								return prev;
							}

							return {
								...prev,
								[selectedChat.id]: info.checkTime
							};
						});
					} else {
						setFollowUpChecks(prev => {
							if (!prev[selectedChat.id]) {
								return prev;
							}

							const newChecks = { ...prev };
							delete newChecks[selectedChat.id];
							return newChecks;
						});

						setFollowUpCheckTimeLeft(0);
					}
				})
				.catch((error) => {
					console.error("Erro ao obter informações de verificação de follow-up:", error);
				});
		};

		loadFollowUpCheckInfo();

		const checkInterval = setInterval(loadFollowUpCheckInfo, 30000);

		return () => clearInterval(checkInterval);
	}, [selectedChat?.id, instanceId]);

	const currentFollowUpCheck = useMemo(() => {
		return selectedChat ? followUpChecks[selectedChat.id] : null;
	}, [followUpChecks, selectedChat?.id]);

	useEffect(() => {
		if (!selectedChat || !currentFollowUpCheck) {
			setFollowUpCheckTimeLeft(0);
			return;
		}

		const initialTimeLeft = currentFollowUpCheck - Date.now();

		if (initialTimeLeft <= 0) {
			setFollowUpChecks(prev => {
				const newChecks = { ...prev };
				delete newChecks[selectedChat.id];
				return newChecks;
			});
			setFollowUpCheckTimeLeft(0);
			return;
		}

		setFollowUpCheckTimeLeft(Math.max(0, initialTimeLeft));

		const timer = setInterval(() => {
			setFollowUpCheckTimeLeft(prev => {
				const newTimeLeft = Math.max(0, prev - 1000);

				if (newTimeLeft <= 0) {
					setFollowUpChecks(current => {
						const newChecks = { ...current };
						delete newChecks[selectedChat.id];
						return newChecks;
					});
					clearInterval(timer);
				}

				return newTimeLeft;
			});
		}, 1000);

		return () => clearInterval(timer);
	}, [selectedChat?.id, currentFollowUpCheck]);

	/**
	 * Cancela um follow-up agendado
	 * @param {string} chatId - ID do chat
	 * @param {number} followUpId - ID do follow-up (scheduledTime)
	 */
	const handleCancelFollowUp = useCallback(async (chatId, followUpId) => {
		try {
			const result = await ipcRenderer.invoke("cancel-follow-up", {
				instanceId,
				chatId,
				followUpId
			});

			if (result.success) {
				toast.success("Follow-up cancelado com sucesso");

				ipcRenderer
					.invoke("get-active-follow-ups", instanceId)
					.then((followUps) => {
						setActiveFollowUps(followUps || {});
					})
					.catch((error) => {
						console.error("Erro ao atualizar follow-ups:", error);
					});
			} else {
				toast.error(result.message || "Erro ao cancelar follow-up");
			}
		} catch (error) {
			toast.error("Erro ao cancelar follow-up");
			console.error("Erro ao cancelar follow-up:", error);
		}
	}, [instanceId]);

	/**
	 * Envia um follow-up imediatamente
	 * @param {string} chatId - ID do chat
	 * @param {number} followUpId - ID do follow-up (scheduledTime)
	 */
	const handleSendFollowUpNow = useCallback(async (chatId, followUpId) => {
		try {
			const result = await ipcRenderer.invoke("send-follow-up-now", {
				instanceId,
				chatId,
				followUpId
			});

			if (result.success) {
				toast.success("Follow-up enviado com sucesso");

				ipcRenderer
					.invoke("get-active-follow-ups", instanceId)
					.then((followUps) => {
						setActiveFollowUps(followUps || {});
					})
					.catch((error) => {
						console.error("Erro ao atualizar follow-ups:", error);
					});
			} else {
				toast.error(result.message || "Erro ao enviar follow-up");
			}
		} catch (error) {
			toast.error("Erro ao enviar follow-up");
			console.error("Erro ao enviar follow-up:", error);
		}
	}, [instanceId]);

	/**
	 * Verifica imediatamente a elegibilidade para follow-up (MANUAL)
	 * (Esta função é responsável por toasts de verificações manuais do usuário)
	 * @param {string} chatId - ID do chat
	 */
	const handleCheckFollowUpNow = useCallback(async (chatId) => {
		if (isCheckingFollowUp) return;

		setIsCheckingFollowUp(true);

		try {
			const result = await ipcRenderer.invoke("check-follow-up-now", {
				instanceId,
				chatId
			});

			if (result.success) {
				if (result.cancelledAutomaticCheck) {
					setFollowUpChecks(prev => {
						const newChecks = { ...prev };
						delete newChecks[chatId];
						return newChecks;
					});
					setFollowUpCheckTimeLeft(0);
				}

				// Só exibe toasts se foi uma verificação MANUAL (pelo usuário)
				// Verificações automáticas são tratadas pelo listener followUpCheckResultListener
				if (result.isManualCheck !== false) {
					const baseToastId = `manual-check-${chatId}`;

					if (result.hasFollowUp) {
						if (!toast.isActive(`${baseToastId}-success`)) {
							toast.success(result.message, {
								position: "top-right",
								autoClose: 5000,
								toastId: `${baseToastId}-success`
							});
						}
					} else {
						if (!toast.isActive(`${baseToastId}-info`)) {
							toast.info(result.message, {
								position: "top-right",
								autoClose: 5000,
								toastId: `${baseToastId}-info`
							});
						}
					}

					if (result.reason && !toast.isActive(`${baseToastId}-reason`)) {
						toast.info(result.reason, {
							position: "top-right",
							autoClose: 8000,
							delay: 1000,
							toastId: `${baseToastId}-reason`
						});
					}
				}

				// Sempre atualiza a lista de follow-ups independente de ser manual ou automático
				if (result.hasFollowUp) {
					ipcRenderer
						.invoke("get-active-follow-ups", instanceId)
						.then((followUps) => {
							setActiveFollowUps(followUps || {});
						})
						.catch((error) => {
							console.error("Erro ao atualizar follow-ups:", error);
						});
				}
			} else {
				const errorToastId = `${chatId}-error`;
				if (!toast.isActive(errorToastId)) {
					toast.error(result.message, {
						position: "top-right",
						autoClose: 5000,
						toastId: errorToastId
					});
				}
			}
		} catch (error) {
			const errorToastId = `${chatId}-error`;
			if (!toast.isActive(errorToastId)) {
				toast.error("Erro ao verificar follow-up", {
					position: "top-right",
					autoClose: 5000,
					toastId: errorToastId
				});
			}
			console.error("Erro ao verificar follow-up:", error);
		} finally {
			setIsCheckingFollowUp(false);
		}
	}, [instanceId, isCheckingFollowUp]);

	/**
	 * @param {string} chatId - ID do chat a ser limpo
	 */
	const handleClearChat = useCallback(async (chatId) => {
		if (!chatId || isClearingChat) return;

		const confirmed = window.confirm("Tem certeza que deseja limpar toda a conversa deste chat? Esta ação não pode ser desfeita.");
		if (!confirmed) return;

		setIsClearingChat(true);

		try {
			const result = await ipcRenderer.invoke("clear-chat-conversation", {
				instanceId,
				chatId
			});

			if (result.success) {
				toast.success("Conversa limpa com sucesso");
				setMessages([]);
				ipcRenderer
					.invoke("get-chats", instanceId)
					.then((chatsInfo) => {
						const filteredChats = chatsInfo.filter((chat) => {
							const hasValidMessage =
								chat.lastMessage && chat.lastMessage.trim() !== "";
							const hasValidTimestamp = chat.timestamp && chat.timestamp > 0;
							return hasValidMessage && hasValidTimestamp;
						});
						setChats(filteredChats);
					})
					.catch((error) => {
						console.error("Erro ao recarregar chats:", error);
					});
			} else {
				toast.error(result.message || "Erro ao limpar conversa");
			}
		} catch (error) {
			console.error("Erro ao limpar conversa:", error);
			toast.error("Erro ao limpar conversa");
		} finally {
			setIsClearingChat(false);
		}
	}, [instanceId, isClearingChat]);

	const ChatHeader = ({
		selectedChat,
		allInterventions,
		handleInterventionToggle,
		followUpCheckTimeLeft,
		followUpChecks,
		isCheckingFollowUp,
		handleCheckFollowUpNow,
		handleSendFollowUpNow,
		handleCancelFollowUp,
		activeFollowUps,
		instanceId,
		handleClearChat,
		isClearingChat,
		followUpConditions
	}) => {
		if (!selectedChat) return null;

		const isHumanInterventionActive = !!allInterventions[selectedChat.id];
		const intervention = allInterventions[selectedChat.id] || {};
		const isManual = intervention.isManualIntervention;
		const [remainingTime, setRemainingTime] = useState(
			intervention.remainingTime || 0,
		);

		// Calcula os follow-ups e o próximo follow-up dentro do componente
		const followUps = useMemo(() => {
			return activeFollowUps[selectedChat.id] || [];
		}, [activeFollowUps, selectedChat.id]);

		const nextFollowUp = useMemo(() => {
			return followUps.length > 0 ? followUps.sort((a, b) => a.scheduledTime - b.scheduledTime)[0] : null;
		}, [followUps]);

		const hasActiveTimer = !!followUpChecks[selectedChat.id];

		useEffect(() => {
			setRemainingTime(intervention.remainingTime || 0);

			if (
				!isHumanInterventionActive ||
				isManual ||
				!intervention.remainingTime
			) {
				return;
			}

			const timer = setInterval(() => {
				setRemainingTime((prev) => {
					const newTime = Math.max(0, prev - 1000);
					return newTime;
				});
			}, 1000);

			return () => clearInterval(timer);
		}, [isHumanInterventionActive, isManual, intervention.remainingTime]);

		const formatRemainingTime = useCallback((ms) => {
			if (!ms) return null;

			const hours = Math.floor(ms / 3600000);
			const minutes = Math.floor((ms % 3600000) / 60000);
			const seconds = Math.floor((ms % 60000) / 1000);

			if (hours > 0) {
				return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
			}

			return `${minutes}:${seconds.toString().padStart(2, "0")}`;
		}, []);

		const handleCheckFollowUpClick = useCallback((e) => {
			e.preventDefault();
			e.stopPropagation();
			handleCheckFollowUpNow(selectedChat.id);
		}, [selectedChat.id, handleCheckFollowUpNow]);

		const handleSendFollowUpClick = useCallback(() => {
			if (nextFollowUp?.scheduledTime) {
				handleSendFollowUpNow(selectedChat.id, nextFollowUp.scheduledTime);
			}
		}, [selectedChat.id, nextFollowUp?.scheduledTime, handleSendFollowUpNow]);

		const handleCancelFollowUpClick = useCallback(() => {
			if (nextFollowUp?.scheduledTime) {
				handleCancelFollowUp(selectedChat.id, nextFollowUp.scheduledTime);
			}
		}, [selectedChat.id, nextFollowUp?.scheduledTime, handleCancelFollowUp]);

		return (
			<div className="flex flex-col border-b bg-chatHeaderBg">
				<div className="flex justify-between items-center p-4">
					<div className="flex items-center">
						<span className="text-lg font-medium">
							{selectedChat.name || "Chat"}
						</span>
					</div>

					<div className="flex items-center">
						{isHumanInterventionActive && !isManual && remainingTime > 0 && (
							<div className="mr-3 flex items-center px-3 py-1 rounded-md bg-purple-700/20 border border-purple-500/30">
								<Clock size={14} className="text-purple-400 mr-2" />
								<div className="flex flex-col">
									<span className="text-xs text-gray-400">Reativação em</span>
									<span className="text-sm font-semibold text-purple-400">
										{formatRemainingTime(remainingTime)}
									</span>
								</div>
							</div>
						)}

						<div
							className={`flex items-center px-3 py-1 rounded-md ${isHumanInterventionActive ? "bg-purple-700/20 border border-purple-500/30" : "bg-green-700/20 border border-green-500/30"} mr-3`}
						>
							<span
								className={`text-sm ${isHumanInterventionActive ? "text-purple-400" : "text-green-400"}`}
							>
								{isHumanInterventionActive
									? isManual
										? "Modo Manual"
										: "Modo Temporário"
									: "Modo IA"}
							</span>
						</div>

						<button
							type="button"
							onClick={() => {
								ipcRenderer
									.invoke("toggle-human-intervention", {
										chatId: selectedChat.id,
										currentStatus: isHumanInterventionActive,
									})
									.then((result) => {
										if (result.success) {
											handleInterventionToggle(
												selectedChat.id,
												!isHumanInterventionActive,
												result.details,
											);
										}
									})
									.catch((error) => {
										console.error("Erro ao alternar intervenção:", error);
									});
							}}
							className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${isHumanInterventionActive ? "bg-purple-600" : "bg-green-600"
								}`}
						>
							<span
								className={`absolute left-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full transition-all text-white ${!isHumanInterventionActive ? "opacity-100" : "opacity-40"
									}`}
							>
								<BotIcon size={12} />
							</span>

							<span
								className={`absolute top-0.5 flex h-5 w-5 transform items-center justify-center rounded-full bg-white transition-transform ${isHumanInterventionActive ? "translate-x-0.5" : "translate-x-6"
									}`}
							/>

							<span
								className={`absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full transition-all text-white ${isHumanInterventionActive ? "opacity-100" : "opacity-40"
									}`}
							>
								<UserIcon size={12} />
							</span>
						</button>

						<button
							type="button"
							onClick={() => handleClearChat(selectedChat.id)}
							disabled={isClearingChat}
							className={`ml-3 flex items-center justify-center h-8 w-8 rounded-full transition-colors ${isClearingChat
								? "bg-red-400 cursor-not-allowed"
								: "bg-red-600 hover:bg-red-700"
								}`}
							title="Limpar conversa"
						>
							{isClearingChat ? (
								<div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
							) : (
								<Trash2 size={16} className="text-white" />
							)}
						</button>
					</div>
				</div>

				{/* Container completamente estável para seções de follow-up */}
				<div className="follow-up-sections">
					{/* Seção azul - somente exibe se não há follow-up agendado */}
					{followUpConditions.shouldShowBlueSection && (
						<div className="px-4 py-2 bg-blue-900/20 border-t border-b border-blue-700/30 flex items-center justify-between">
							<div className="flex items-center">
								<Bell size={16} className="text-blue-400 mr-2" />
								<div>
									<span className="text-xs text-blue-400 font-medium">Follow-up</span>
									<p className="text-sm text-white">
										{followUpChecks[selectedChat.id]
											? "Verificação automática agendada"
											: "Gerencie follow-ups para este chat"}
									</p>
								</div>
							</div>
							<div className="flex flex-col gap-2 items-end">
								{followUpChecks[selectedChat.id] && followUpCheckTimeLeft > 0 && (
									<div className="flex items-center bg-blue-900/40 px-3 py-1 rounded-md border border-blue-700/30">
										<Clock size={14} className="text-blue-400 mr-2" />
										<span className="text-sm text-blue-300">
											{formatRemainingTime(followUpCheckTimeLeft)}
										</span>
									</div>
								)}

								<div className="flex gap-2">
									<button
										type="button"
										onClick={handleCheckFollowUpClick}
										disabled={isCheckingFollowUp}
										className={`flex items-center justify-center text-white text-xs rounded px-3 py-1 transition-colors ${isCheckingFollowUp
											? 'bg-blue-400 cursor-not-allowed'
											: 'bg-blue-600 hover:bg-blue-700'
											}`}
									>
										{isCheckingFollowUp ? (
											<>
												<div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
												Verificando...
											</>
										) : (
											<>
												<Clock size={12} className="mr-1" />
												{hasActiveTimer ? "Verificar agora" : "Verificar"}
											</>
										)}
									</button>
								</div>
							</div>
						</div>
					)}

					{/* Seção amarela - follow-up agendado */}
					{followUpConditions.shouldShowYellowSection && (
						<div className="px-4 py-2 bg-yellow-900/20 border-t border-b border-yellow-700/30 flex items-center justify-between">
							<div className="flex items-center">
								<Bell size={16} className="text-yellow-400 mr-2" />
								<div>
									<span className="text-xs text-yellow-400 font-medium">Follow-up agendado</span>
									<p className="text-sm text-white">"{nextFollowUp?.message}"</p>
								</div>
							</div>
							<div className="flex flex-col gap-2">
								<FollowUpSendTimer
									followUps={followUps}
									formatTime={formatRemainingTime}
								/>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={handleSendFollowUpClick}
										className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white text-xs rounded px-3 py-1 transition-colors"
									>
										<SendIcon size={12} className="mr-1" />
										Enviar agora
									</button>
									<button
										type="button"
										onClick={handleCancelFollowUpClick}
										className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white text-xs rounded px-3 py-1 transition-colors"
									>
										<XIcon size={12} className="mr-1" />
										Cancelar
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		);
	};

	// Adicionar após a função renderMessageContent (linha ~1149):

	/**
	 * Formata separador de data seguindo a lógica do WhatsApp
	 * @param {number|string} timestamp - Timestamp da mensagem
	 * @returns {string} Data formatada para separador
	 */
	const formatDateSeparator = (timestamp) => {
		if (!timestamp) return "";

		try {
			let date;
			const timestampNum = Number(timestamp);
			
			if (Number.isNaN(timestampNum) || timestampNum <= 0) {
				return "";
			}

			// Se o timestamp está em segundos (< 10 bilhões), converte para milissegundos
			if (timestampNum < 10000000000) {
				date = fromUnixTime(timestampNum);
			} else {
				// Timestamp já está em milissegundos
				date = new Date(timestampNum);
			}

			// Verifica se a data é válida
			if (!isValid(date)) {
				return "";
			}

			// Usa as funções do date-fns para verificar hoje e ontem
			if (isToday(date)) {
				return "Hoje";
			}

			if (isYesterday(date)) {
				return "Ontem";
			}

			// Calcula a diferença em dias usando date-fns
			const daysDiff = differenceInDays(startOfDay(new Date()), startOfDay(date));

			// Últimos 7 dias (mas não ontem nem hoje): mostra o dia da semana
			if (daysDiff >= 2 && daysDiff <= 7) {
				return format(date, "EEEE", { locale: ptBR });
			}

			// Mais de 7 dias: mostra a data completa
			return format(date, "dd/MM/yyyy", { locale: ptBR });
		} catch (error) {
			console.error("Erro ao formatar separador de data:", error, "timestamp:", timestamp);
			return "";
		}
	};

	/**
	 * Verifica se duas datas são do mesmo dia
	 * @param {number|string} timestamp1 - Primeiro timestamp
	 * @param {number|string} timestamp2 - Segundo timestamp
	 * @returns {boolean} True se são do mesmo dia
	 */
	const isSameDay = (timestamp1, timestamp2) => {
		if (!timestamp1 || !timestamp2) return false;

		try {
			const parseTimestamp = (ts) => {
				const timestampNum = Number(ts);
				if (Number.isNaN(timestampNum) || timestampNum <= 0) {
					return null;
				}
				
				// Se o timestamp está em segundos (< 10 bilhões), converte para milissegundos
				if (timestampNum < 10000000000) {
					return fromUnixTime(timestampNum);
				} else {
					// Timestamp já está em milissegundos
					return new Date(timestampNum);
				}
			};

			const date1 = parseTimestamp(timestamp1);
			const date2 = parseTimestamp(timestamp2);

			if (!date1 || !date2 || !isValid(date1) || !isValid(date2)) {
				return false;
			}

			return format(date1, "yyyy-MM-dd") === format(date2, "yyyy-MM-dd");
		} catch (error) {
			console.warn("Erro ao comparar datas:", error);
			return false;
		}
	};

	return (
		<div className="fixed inset-0 bottom-14 flex flex-col bg-dashboardBg text-white">
			<ConnectionAlert connected={connectionStatus.connected} />

			<div className="flex flex-1 overflow-hidden">
				<div className="w-1/3 flex flex-col border-r border-primaryColor/20 bg-chatSidebarBg">
					<div className="p-4 border-b border-primaryColor/20 bg-chatHeaderBg backdrop-blur-sm flex-shrink-0">
						<h1 className="text-lg font-bold text-primaryColor">Conversas</h1>
					</div>

					<div className="overflow-y-auto flex-1 chat-scrollbar">
						{chats.length === 0 ? (
							<div className="p-6 text-center text-gray-400">
								Nenhuma conversa encontrada
							</div>
						) : (
							<ul className="list-none">
								{chats.map((chat) => (
									<button
										type="button"
										key={chat.id}
										className={`w-full text-left p-4 border-b border-primaryColor/5 hover:bg-chatItemHover transition-all duration-200 ${selectedChat?.id === chat.id
											? "bg-chatItemSelected"
											: "bg-transparent"
											}`}
										onClick={() => handleChatSelect(chat)}
										onKeyDown={(e) => handleKeyboardSelect(e, chat)}
									>
										<div className="flex justify-between">
											<div className="flex items-center">
												{chat.isGroup && (
													<span className="text-xs bg-primaryColor/20 text-primaryColor px-2 py-0.5 rounded mr-2">
														Grupo
													</span>
												)}
												<h3 className="font-semibold text-white">
													{chat.name ||
														(chat.isGroup
															? `${chat.id.split("@")[0]}`
															: chat.id.split("@")[0])}
												</h3>

												{activeFollowUps[chat.id] && (
													<span className="ml-2 text-yellow-400" title="Follow-up agendado">
														<Bell size={16} />
													</span>
												)}

												<AIModeToggle
													chatId={chat.id}
													instanceId={instanceId}
													onStatusChange={handleAIModeStatusChange}
												/>
											</div>
											<span className="text-xs text-gray-400">
												{formatHeaderDate(chat.timestamp)}
											</span>
										</div>
										<p className="text-sm text-gray-300 truncate mt-1">
											{chat.lastMessageFromMe ? (
												<span className="font-medium text-blue-400">Você: </span>
											) : chat.isGroup && chat.lastMessageSender ? (
												`${chat.lastMessageSender}: `
											) : ""}
											{chat.lastMessage}
										</p>
									</button>
								))}
							</ul>
						)}
					</div>
				</div>

				<div className="w-2/3 flex flex-col bg-chatContentBg">
					{selectedChat ? (
						<>
							<ChatHeader
								selectedChat={selectedChat}
								allInterventions={allInterventions}
								handleInterventionToggle={handleInterventionToggle}
								followUpCheckTimeLeft={followUpCheckTimeLeft}
								followUpChecks={followUpChecks}
								isCheckingFollowUp={isCheckingFollowUp}
								handleCheckFollowUpNow={handleCheckFollowUpNow}
								handleSendFollowUpNow={handleSendFollowUpNow}
								handleCancelFollowUp={handleCancelFollowUp}
								activeFollowUps={activeFollowUps}
								instanceId={instanceId}
								handleClearChat={handleClearChat}
								isClearingChat={isClearingChat}
								followUpConditions={followUpConditions}
							/>

							<div className="flex-1 p-4 overflow-y-auto chat-scrollbar">
								{messages.length === 0 ? (
									<div className="text-center text-gray-400 my-8">
										Nenhuma mensagem encontrada neste chat
									</div>
								) : (
									<div className="space-y-4">
										{(() => {
											const messagesWithSeparators = [];
											
											messages.forEach((msg, index) => {
												const isFromMe = msg.key?.fromMe;
												const isAI = isAIMessage(msg);
												const messageId = msg.key?.id || `msg-${index}`;
												const messageContent = renderMessageContent(msg);
												
												// Testa múltiplas fontes de timestamp
												const getValidTimestamp = () => {
													const timestampSources = [
														msg.messageTimestamp,
														msg.key?.timestamp,
														msg.timestamp,
														msg.t,
														Date.now() / 1000
													];
													
													for (const ts of timestampSources) {
														if (ts && Number(ts) > 0) {
															return ts;
														}
													}
													
													return Date.now() / 1000;
												};
												
												const timestamp = getValidTimestamp();

												if (messageContent === null) return;

												// Verifica se precisa adicionar separador de data
												let shouldShowSeparator = false;
												
												if (index === 0) {
													// Primeira mensagem: sempre mostra separador
													shouldShowSeparator = true;
												} else {
													// Para outras mensagens, verifica se é um dia diferente da anterior
													const prevMsg = messages[index - 1];
													
													// Usa a mesma função para obter timestamp da mensagem anterior
													const getPrevValidTimestamp = () => {
														const timestampSources = [
															prevMsg.messageTimestamp,
															prevMsg.key?.timestamp,
															prevMsg.timestamp,
															prevMsg.t,
															Date.now() / 1000
														];
														
														for (const ts of timestampSources) {
															if (ts && Number(ts) > 0) {
																return ts;
															}
														}
														
														return Date.now() / 1000;
													};
													
													const prevTimestamp = getPrevValidTimestamp();
													
													if (!isSameDay(timestamp, prevTimestamp)) {
														shouldShowSeparator = true;
													}
												}

												if (shouldShowSeparator) {
													const dateSeparator = formatDateSeparator(timestamp);
													if (dateSeparator) {
														messagesWithSeparators.push(
															<div key={`date-separator-${index}`} className="flex justify-center my-6">
																<div className="bg-gray-700/50 text-gray-300 text-xs px-3 py-1 rounded-full">
																	{dateSeparator}
																</div>
															</div>
														);
													}
												}

												const isHighlighted = isNewMessage(messageId);

												// Adiciona a mensagem
												messagesWithSeparators.push(
													<div
														key={messageId}
														className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}
													>
														<div
															className={`max-w-[70%] p-4 rounded-lg shadow-md transition-all duration-500 ${isFromMe
																? isAI
																	? `bg-gradient-to-r from-purple-600 to-indigo-600 text-white border border-purple-400/30 ${isHighlighted ? "shadow-glow-accent animate-pulse-subtle" : ""}`
																	: isFollowUpMessage(msg)
																		? `bg-gradient-to-r from-yellow-600 to-amber-600 text-white border border-yellow-400/30 ${isHighlighted ? "shadow-glow-yellow animate-pulse-subtle" : ""}`
																		: `bg-chatMessageFromMeBg hover:bg-chatMessageFromMeHover text-white ${isHighlighted ? "shadow-glow-accent animate-pulse-subtle" : ""}`
																: `bg-chatMessageFromOtherBg border border-primaryColor/10 text-white ${isHighlighted ? "shadow-glow-primary animate-pulse-subtle" : ""}`
																}`}
														>
															{isFromMe && (
																<div className={`flex items-center mb-2 text-xs font-medium border-b pb-1 ${
																	isAI 
																		? "text-purple-200 border-purple-400/30"
																		: isFollowUpMessage(msg)
																			? "text-yellow-200 border-yellow-400/30"
																			: "text-white/70 border-white/20"
																}`}>
																	{isAI && <span className="mr-1">🤖</span>}
																	{isFollowUpMessage(msg) && <Bell size={12} className="mr-1" />}
																	Você
																</div>
															)}

															{selectedChat?.isGroup &&
																!isFromMe &&
																msg.pushName && (
																	<div className="text-xs font-medium text-primaryColor mb-1">
																		{msg.pushName}
																	</div>
																)}
															{messageContent}
															<div
																className={`text-xs mt-2 text-right ${isFromMe
																	? "text-white/70"
																	: "text-gray-400"
																	}`}
															>
																{formatMessageDate(timestamp)}
															</div>
														</div>
													</div>
												);
											});

											return messagesWithSeparators;
										})()}
										<div ref={messagesEndRef} />
									</div>
								)}
							</div>

							<div className="p-4 border-t border-primaryColor/20 bg-chatHeaderBg flex-shrink-0 z-10">
								<form
									onSubmit={handleSendMessage}
									className="flex items-center space-x-2"
								>
									<textarea
										className="w-full bg-chatInputBg text-white border border-primaryColor/20 rounded-lg px-4 py-3 resize-none focus:outline-none focus:border-primaryColor"
										placeholder="Digite uma mensagem..."
										rows="1"
										value={messageInput}
										onChange={(e) => setMessageInput(e.target.value)}
										onKeyDown={handleKeyPress}
										disabled={isSending || !selectedChat}
										ref={messageInputRef}
									/>
									<button
										type="submit"
										className={`bg-gradient-to-r from-primaryColor to-dashboardAccent text-white rounded-lg p-3 transition-all duration-200 ${isSending || !selectedChat || !messageInput.trim()
											? "opacity-50 cursor-not-allowed"
											: "hover:opacity-90"
											}`}
										disabled={
											isSending || !selectedChat || !messageInput.trim()
										}
									>
										{isSending ? (
											<div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
										) : (
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="h-6 w-6"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												aria-labelledby="sendIconTitle"
											>
												<title id="sendIconTitle">Enviar mensagem</title>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
												/>
											</svg>
										)}
									</button>
								</form>
							</div>
						</>
					) : (
						<div className="flex flex-col items-center justify-center h-full">
							<div className="text-center p-8 rounded-2xl bg-chatWelcomeBg border border-primaryColor/10 max-w-md">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-16 w-16 mx-auto text-primaryColor/70 mb-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									aria-labelledby="chatIconTitle"
								>
									<title id="chatIconTitle">Ícone de Chat</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
									/>
								</svg>
								<p className="text-lg text-gray-300 mb-2">
									Bem-vindo ao chat do Zap GPT
								</p>
								<p className="text-gray-400">
									Selecione um chat para visualizar as mensagens
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
