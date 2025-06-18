const { delay, downloadMediaMessage } = require("@whiskeysockets/baileys");

const {
	mainOpenAI,
	convertAndTranscriptionAudioOpenAI,
	transcriptionImageOpenAI,
} = require("./ai/openai");
const { mainDAI } = require("./ai/dai");
const {
	mainGoogle,
	convertAndTranscriptionAudioGemini,
	processImageMessageGemini,
} = require("./ai/google");
// biome-ignore lint/correctness/noUnusedVariables: <explanation>
const { proto } = require("@whiskeysockets/baileys");
const { settings } = require("../config/settings");
const { mainDeepSeek } = require("./ai/deepseek");
const { removeMetadata } = require("../util");
const { convertMarkdownLinks, splitMessages, isValidWhatsAppId } = require("../util/messages");
const { messageTimeoutsMap, messageBufferPerChatId, outgoingQueueMap, isSendingMap, activeChatId } = require("../config/states");
const { saveMessage } = require("../messageStorage");
const { incrementMetric } = require("../metrics/metricsManager");

// Modificando para um Map que guardará informações sobre cada intervenção humana
const humanInterventionMap = new Map();

// Alterando de um Set global para um Map por instância
const sentMessageIdsMap = new Map();

// Mapa para armazenar últimas mensagens enviadas por chat ID
const lastSentMessageWarningByChatId = new Map();

const MAX_RETRIES = 30;
const DELAY_BETWEEN_ATTEMPTS = 4000;

const handlers = {
	GPT: mainOpenAI,
	DAI: mainDAI,
	GEMINI: mainGoogle,
	DEEPSEEK: mainDeepSeek,
};

/**
 * @typedef {Object} ProcessChatStateProps
 * @property {string} chatId - ID do chat.
 * @property {import("@whiskeysockets/baileys").WASocket} sock - Socket de conexão com o WhatsApp.
 * @property {Map<string, boolean>} processingStates - Estados de processamento por chat.
 * @property {Map<string, boolean>} messageTimeouts - Timeout das mensagens por chat.
 */

/**
 * @typedef {Object} MessageProcessingProps
 * @property {string} chatId - ID do chat.
 * @property {string} instanceId
 * @property {string} AI_SELECTED
 * @property {string} chatName
 * @property {import("../../types").aiSelected} aiSelected
 * @property {import("@whiskeysockets/baileys").WASocket} sock - Socket de conexão com o WhatsApp.
 * @property {Map<string, boolean>} processingStates - Estados de processamento por chat.
 * @property {Map<string, boolean>} messageTimeouts - Timeout das mensagens por chat.
 * @property {Set<string>} [activeChatId] - IDs de chats ativos.
 */

/**
 * Tenta reenviar a requisição até o máximo de tentativas definidas.
 *
 * @param {Object} props
 * @param {function({ currentMessage: string, chatId: string, instanceId: string, chatName: string }): Promise<string>} props.handler - Função que lida com a requisição.
 * @param {string} props.chatId - ID do chat.
 * @param {string} props.chatName - Nome do chat.
 * @param {string} props.currentMessage - Mensagem atual a ser processada.
 * @param {number} [props.attempt] - Número de tentativas realizadas.
 * @param {import("@whiskeysockets/baileys").WASocket} props.sock - Socket de conexão com o WhatsApp.
 * @param {Map<string, boolean>} props.processingStates - Estados de processamento por chat.
 * @param {Map<string, boolean>} props.messageTimeouts - Timeout das mensagens por chat.
 * @param {string} props.instanceId - ID da instância.
 * @returns {Promise<string|undefined>}
 */
async function retryRequest({
	handler,
	chatId,
	chatName,
	currentMessage,
	attempt = 1,
	sock,
	processingStates,
	messageTimeouts,
	instanceId,
}) {
	try {
		const answer = await handler({
			currentMessage,
			chatId,
			instanceId,
			chatName,
		});
		processChatState({ chatId, processingStates, messageTimeouts });
		return answer;
	} catch (error) {
		console.log(`Erro na tentativa ${attempt}:`, error);
		if (attempt < MAX_RETRIES) {
			await new Promise((resolve) =>
				setTimeout(resolve, DELAY_BETWEEN_ATTEMPTS),
			);
			return await retryRequest({
				handler,
				chatId,
				currentMessage,
				attempt: attempt + 1,
				sock,
				processingStates,
				messageTimeouts,
				instanceId,
				chatName,
			});
		}
		console.log("Máximo de tentativas de conexão com a LLM excedido");
		console.log("Mensagem ignorada: ", currentMessage);
		processChatState({ chatId, processingStates, messageTimeouts });
	}
}


/**
 * @param {Object} props
 * @param {string} props.chatId - ID do chat.
 * @param {Map<string, boolean>} props.processingStates - Estados de processamento por chat.
 * @param {Map<string, boolean>} props.messageTimeouts - Timeout das mensagens por chat.
 * @returns {void}
 */
function processChatState({ chatId, processingStates, messageTimeouts }) {
	processingStates.set(chatId, false);
	messageTimeouts.delete(chatId);
}

/**
 * @param {Object} props
 * @param {string} props.chatId - ID do chat.
 * @param {string} props.answer - Resposta da IA.
 * @param {import("@whiskeysockets/baileys").WASocket} props.sock - Conexão com o WhatsApp.
 * @param {Set<string> | undefined} props.activeChatId - IDs dos chats ativos.
 * @param {string} props.instanceId - Define se as mensagens serao enviadas completas ou em partes
 * @returns {Promise<void>}
 */
async function sendSplitMessages({
	chatId,
	answer,
	sock,
	activeChatId,
	instanceId,
}) {
	// se caso envio em bloco nao existir, deixar como true
	const hasSplitMessages = settings[instanceId]?.ENVIO_EM_BLOCO
		? !settings[instanceId].ENVIO_EM_BLOCO
		: true;
	const convertedAnswer = removeMetadata(convertMarkdownLinks(answer));
	const messages = hasSplitMessages
		? splitMessages(convertedAnswer)
		: [convertedAnswer];
	console.log("Enviando mensagens...");

	for (const messageToSend of messages) {
		await sendMessage({
			chatId,
			messageToSend,
			sock,
			activeChatId,
			instanceId,
		});
	}
}

/**
 * Processa a mensagem agregada para o chat especificado.
 *
 * @param {Object} props - Propriedades para o processamento da mensagem.
 * @param {string} props.chatId - ID do chat.
 * @param {import("@whiskeysockets/baileys").WASocket} props.sock - Socket de conexão com o WhatsApp.
 * @param {Map<string, boolean>} props.processingStates - Estados de processamento por chat.
 * @param {Map<string, boolean>} props.messageTimeouts - Timeout das mensagens por chat.
 * @param {Set<string>} props.activeChatId - IDs de chats ativos.
 * @param {string} props.instanceId - ID da instância.
 * @param {string} props.AI_SELECTED - IA selecionada.
 * @param {string} props.chatName - Nome do chat.
 * @param {string} props.textContent - Mensagem agregada a ser processada.
 * @returns {Promise<void>}
 */
async function processMessage({
	chatId,
	sock,
	processingStates,
	messageTimeouts,
	activeChatId,
	instanceId,
	AI_SELECTED,
	chatName,
	textContent,
}) {
	processingStates.set(chatId, true);

	const currentMessage = textContent;

	const handler = getHandler(AI_SELECTED);
	const answer = await retryRequest({
		handler,
		chatId,
		chatName,
		currentMessage,
		sock,
		processingStates,
		messageTimeouts,
		instanceId,
	});

	if (!answer) {
		return;
	}
	console.log("Resposta da IA: ", answer);

	await sendSplitMessages({
		chatId,
		answer,
		sock,
		activeChatId,
		instanceId,
	});
}

/**
 * Obtém o handler correto com base na IA selecionada.
 *
 * @param {string} aiSelected - A IA selecionada (GPT ou GEMINI).
 * @returns {(params: { currentMessage: string; chatId: string }) => Promise<string>}
 */
function getHandler(aiSelected) {
	// @ts-ignore
	const handler = handlers[aiSelected.toUpperCase()];

	if (!handler) {
		throw new Error(
			`Handler para IA '${aiSelected}' não encontrado. Verifique as configurações.`,
		);
	}

	return handler;
}

/**
 * Coloca a mensagem na fila de saída para o chat.
 * Chamará `processOutgoingQueue` para enviar na ordem correta.
 *
 * @param {Object} props
 * @param {import("@whiskeysockets/baileys").WASocket} props.sock
 * @param {string} props.messageToSend
 * @param {string} props.chatId
 * @param {Set<string>|undefined} props.activeChatId
 * @param {string} props.instanceId
 * @returns {void}
 */
function sendMessage({ sock, messageToSend, chatId, activeChatId, instanceId }) {
	// Garante que as estruturas necessárias existam
	if (!outgoingQueueMap[instanceId]) {
		console.log(`⚠️ Criando fila de saída para instância ${instanceId}`);
		outgoingQueueMap[instanceId] = new Map();
	}

	if (!outgoingQueueMap[instanceId].has(chatId)) {
		console.log(`📨 Criando fila de mensagens para chat ${chatId}`);
		outgoingQueueMap[instanceId].set(chatId, []);
	}

	// Adiciona a mensagem à fila deste chat
	outgoingQueueMap[instanceId].get(chatId)?.push({ sock, messageToSend, activeChatId, instanceId });
	console.log(`📝 Mensagem adicionada à fila para chat ${chatId}: "${messageToSend.substring(0, 30)}${messageToSend.length > 30 ? '...' : ''}"`);

	// Marca o chat como ativo, se não estiver marcado e o conjunto existir
	if (activeChatId && !activeChatId.has(chatId)) {
		activeChatId.add(chatId);
		console.log(`✅ Chat ${chatId} marcado como ativo pela função sendMessage`);
	}

	// Inicia o processamento da fila
	processOutgoingQueue(instanceId, chatId);
}


/**
 * Processa a fila de saída para o chat especificado.
 * @param {string} instanceId
 * @param {string} chatId
 */
async function processOutgoingQueue(instanceId, chatId) {
	if (!isSendingMap[instanceId]) {
		isSendingMap[instanceId] = new Map();
	}

	if (isSendingMap[instanceId].get(chatId)) {
		console.log(`🔄 [FILA] O chat ${chatId} já está enviando mensagens. Aguardando término.`);
		return;
	}

	const queue = outgoingQueueMap[instanceId]?.get(chatId);
	if (!queue || queue.length === 0) {
		console.log(`✅ [FILA] Nenhuma mensagem na fila do chat ${chatId}.`);
		return;
	}

	isSendingMap[instanceId].set(chatId, true);
	console.log(`🚀 [FILA] Iniciando envio das mensagens do chat ${chatId} (Instância: ${instanceId}).`);

	const queueItem = queue.shift();
	if (!queueItem) {
		console.log(`⚠️ [FILA] Nenhuma mensagem disponível para o chat ${chatId}.`);
		isSendingMap[instanceId].set(chatId, false);
		return;
	}

	const { sock, messageToSend, activeChatId, instanceId: instId } = queueItem;

	console.log(`✉️ [FILA] Enviando mensagem para ${chatId}: "${messageToSend}"`);

	try {
		await _sendMessage({ sock, messageToSend, chatId, activeChatId, instanceId: instId });
		console.log(`✅ [FILA] Mensagem enviada para ${chatId}.`);
	} catch (err) {
		console.error(`❌ [FILA] Erro ao enviar mensagem para ${chatId}:`, err);
	}

	isSendingMap[instanceId].set(chatId, false);

	if (queue.length > 0) {
		console.log(`📩 [FILA] Ainda há mensagens na fila do chat ${chatId}. Processando próxima.`);
		processOutgoingQueue(instanceId, chatId);
	} else {
		console.log(`🏁 [FILA] Todas as mensagens do chat ${chatId} foram enviadas.`);
	}
}

/**
 * Armazena a mensagem (texto e opcionalmente seu ID) no buffer e reinicia o timer de processamento.
 *
 * @param {Object} params
 * @param {string} params.chatId - ID do chat.
 * @param {string} params.messageReceived - Texto da mensagem recebida.
 * @param {import("@whiskeysockets/baileys").WASocket} params.sock - Socket do WhatsApp.
 * @param {string} params.instanceId - ID da instância.
 * @param {Map<string, any>} params.processingStates - Mapa dos estados de processamento para o chat.
 * @param {Map<string, any>} params.messageTimeouts - Mapa dos timeouts para o chat.
 * @param {Set<string>} params.activeChatId - Conjunto dos chats ativos.
 * @param {string} params.AI_SELECTED - IA selecionada.
 * @param {string} params.chatName - Nome do chat ou do usuário.
 * @param {Map<string, string[]>} params.messagesIdsAlreadyAnswered - Mapa de IDs de mensagens já respondidas.
 * @param {string} [params.msgId] - (Opcional) ID da mensagem recebida.
 */
function storeMessageInBuffer({
	chatId,
	messageReceived,
	sock,
	instanceId,
	processingStates,
	messageTimeouts,
	activeChatId,
	AI_SELECTED,
	chatName,
	messagesIdsAlreadyAnswered,
	msgId,
}) {
	// Validação do formato do chatId para garantir que é um número de WhatsApp legítimo
	if (!isValidWhatsAppId(chatId)) {
		console.log(`⚠️ [BUFFER] ID de chat com formato suspeito detectado: ${chatId}. Ignorando mensagem.`);
		return;
	}

	if (!messageBufferPerChatId[instanceId].has(chatId)) {
		messageBufferPerChatId[instanceId].set(chatId, []);
	}

	if (!outgoingQueueMap[instanceId].has(chatId)) {
		outgoingQueueMap[instanceId].set(chatId, []);
	}

	messageBufferPerChatId[instanceId].get(chatId)?.push({ text: messageReceived, msgId });

	console.log(`🟡 [BUFFER] Mensagem adicionada ao buffer (Chat: ${chatId}). Total armazenado: ${messageBufferPerChatId[instanceId].get(chatId)?.length}`);

	if (!messageTimeoutsMap[instanceId]) {
		messageTimeoutsMap[instanceId] = new Map();
		console.log(`🔄 [BUFFER] Timer reiniciado para o chat: ${chatId}`);
	}
	if (messageTimeoutsMap[instanceId].has(chatId)) {
		clearTimeout(messageTimeoutsMap[instanceId].get(chatId));
	}

	const waitTime = Number(settings[instanceId].SEGUNDOS_PARA_ESPERAR_ANTES_DE_GERAR_RESPOSTA) * 1000;
	messageTimeoutsMap[instanceId].set(
		chatId,
		setTimeout(async () => {
			console.log(`🚀 [BUFFER] Timer expirado, processando mensagens do buffer para o chat: ${chatId}`);
			await processBufferedMessages({
				chatId,
				sock,
				instanceId,
				processingStates,
				messageTimeouts,
				activeChatId,
				AI_SELECTED,
				chatName,
				messagesIdsAlreadyAnswered,
			});
		}, waitTime)
	);
	console.log(`🟢 [BUFFER] Timer definido para ${waitTime / 1000}s no chat: ${chatId}`);
}

/**
 * Processa todas as mensagens acumuladas no buffer para o chat e limpa o buffer.
 *
 * @param {Object} params
 * @param {string} params.chatId - ID do chat.
 * @param {import("@whiskeysockets/baileys").WASocket} params.sock - Socket do WhatsApp.
 * @param {string} params.instanceId - ID da instância.
 * @param {Map<string, any>} params.processingStates - Estados de processamento para o chat.
 * @param {Map<string, any>} params.messageTimeouts - Timeouts associados ao chat.
 * @param {Set<string>} params.activeChatId - Conjunto de chats ativos.
 * @param {string} params.AI_SELECTED - IA selecionada.
 * @param {string} params.chatName - Nome do chat.
 * @param {Map<string, string[]>} params.messagesIdsAlreadyAnswered - Mapa de IDs de mensagens já respondidas.
 */
async function processBufferedMessages({
	chatId,
	sock,
	instanceId,
	processingStates,
	messageTimeouts,
	activeChatId,
	AI_SELECTED,
	chatName,
	messagesIdsAlreadyAnswered,
}) {
	if (!messageBufferPerChatId[instanceId] || !messageBufferPerChatId[instanceId].has(chatId)) {
		console.log(`⚠️ [BUFFER] Nenhuma mensagem no buffer para processar (Chat: ${chatId})`);
		return;
	}

	const messagesArray = messageBufferPerChatId[instanceId].get(chatId) || [];
	console.log(`🟡 [BUFFER] Processando ${messagesArray.length} mensagens acumuladas para o chat: ${chatId}`);

	const aggregatedText = messagesArray.map(m => m.text).join("\n");
	messagesArray.forEach(m => {
		if (m.msgId) {
			console.log(`✅ [BUFFER] Registrando mensagem processada no tracking (ID: ${m.msgId})`);
			storeMessageIdTracking({ chatId, msgId: m.msgId, messagesIdsAlreadyAnswered });
		}
	});

	messageBufferPerChatId[instanceId].delete(chatId);
	if (messageTimeoutsMap[instanceId]) {
		messageTimeoutsMap[instanceId].delete(chatId);
	}

	console.log(`🚀 [BUFFER] Enviando mensagens processadas para o chat: ${chatId}`);
	await processMessage({
		chatId,
		sock,
		processingStates,
		messageTimeouts,
		activeChatId,
		instanceId,
		AI_SELECTED,
		chatName,
		textContent: aggregatedText,
	});
}

/**
 * Verifica se uma mensagem foi enviada pelo bot.
 * Usada para determinar se uma mensagem fromMe é do bot ou de uma intervenção humana.
 *
 * @param {string} messageId - O ID da mensagem.
 * @param {string} instanceId - O ID da instância.
 * @returns {boolean} - Retorna true se a mensagem foi enviada pelo bot.
 */
function hasSentMessagesIds(messageId, instanceId) {
	if (!sentMessageIdsMap.has(instanceId)) {
		return false;
	}

	const wasMessageSentByBot = sentMessageIdsMap.get(instanceId).has(messageId);
	if (wasMessageSentByBot) {
		console.log(`Mensagem ${messageId} identificada como enviada pelo bot (não é intervenção humana)`);
	}
	return wasMessageSentByBot;
}

/**
 * Adiciona um chat à lista de números excluídos por intervenção humana.
 * Quando um chat está nessa lista, a IA não responderá às mensagens dele.
 *
 * @param {string} chatId - O ID do chat.
 * @param {boolean} isManualIntervention - Indica se a intervenção foi manual (permanente) ou automática (temporária)
 * @param {number} [hoursToReactivate=0] - Horas para reativar a IA (0 para intervenção manual/permanente)
 */
function addExcludedNumbersByIntervention(chatId, isManualIntervention = false, hoursToReactivate = 0) {
	const expiresAt = isManualIntervention ? 0 : Date.now() + (hoursToReactivate * 60 * 60 * 1000);

	// Armazena os dados da intervenção
	humanInterventionMap.set(chatId, {
		isManualIntervention,
		expiresAt,
		addedAt: Date.now()
	});

	console.log(`Chat ${chatId} adicionado à lista de excluídos por intervenção ${isManualIntervention ? 'manual (permanente)' : 'automática (temporária)'}`);
	if (!isManualIntervention) {
		console.log(`Será reativado em ${hoursToReactivate} horas (${new Date(expiresAt).toLocaleString()})`);
	}
}

/**
 * Remove um chat da lista de números excluídos por intervenção humana.
 * Após ser removido, a IA voltará a responder mensagens neste chat.
 *
 * @param {string} chatId - O ID do chat.
 */
function deleteExcludedNumbersByIntervention(chatId) {
	const wasExcluded = humanInterventionMap.has(chatId);
	humanInterventionMap.delete(chatId);

	if (wasExcluded) {
		console.log(`Chat ${chatId} removido da lista de excluídos por intervenção humana`);
	}
}

/**
 * Verifica se o chat está na lista de excluídos por intervenção humana.
 *
 * @param {string | undefined | null} chatId - O ID do chat que será verificado.
 * @returns {boolean} - Retorna `true` se o chat está excluído, caso contrário, `false`.
 */
function hasExcludedNumbersByIntervention(chatId) {
	if (!chatId) return false;

	// Verifica se o chat está no mapa de intervenção
	if (humanInterventionMap.has(chatId)) {
		const interventionData = humanInterventionMap.get(chatId);

		// Se for intervenção automática, verifica se já expirou
		if (!interventionData.isManualIntervention && interventionData.expiresAt > 0) {
			if (Date.now() >= interventionData.expiresAt) {
				// A intervenção expirou, remover do mapa
				humanInterventionMap.delete(chatId);
				console.log(`Intervenção automática para ${chatId} expirou e foi removida`);
				return false;
			}
		}

		// Ainda é válida
		return true;
	}

	return false;
}

/**
 * Obtém os detalhes da intervenção humana para um chat
 *
 * @param {string | undefined | null} chatId - O ID do chat
 * @returns {Object|null} - Informações sobre a intervenção ou null se não existir
 */
function getHumanInterventionDetails(chatId) {
	if (!chatId || !humanInterventionMap.has(chatId)) return null;

	const interventionData = humanInterventionMap.get(chatId);
	return {
		...interventionData,
		isActive: true,
		remainingTime: interventionData.isManualIntervention ? -1 : Math.max(0, interventionData.expiresAt - Date.now())
	};
}

/**
 * Obtém a lista de todos os chats com intervenção humana ativa
 *
 * @returns {Object} - Mapa com as informações de intervenção por chatId
 */
function getAllHumanInterventions() {
	const result = {};

	// Usando Array.from para iterar seguramente sobre as entradas do Map
	Array.from(humanInterventionMap.entries()).forEach(([chatId, data]) => {
		// Verificar se uma intervenção automática expirou
		if (!data.isManualIntervention && data.expiresAt > 0 && Date.now() >= data.expiresAt) {
			// Remover do mapa pois expirou
			humanInterventionMap.delete(chatId);
			return;
		}

		// Adicionar ao resultado com informações de tempo restante
		result[chatId] = {
			...data,
			isActive: true,
			remainingTime: data.isManualIntervention ? -1 : Math.max(0, data.expiresAt - Date.now())
		};
	});

	return result;
}

/**
 * Envia uma mensagem para o chat.
 *
 * @param {Object} props - Propriedades para o envio da mensagem.
 * @param {import("@whiskeysockets/baileys").WASocket} props.sock - O socket de conexão do WhatsApp.
 * @param {string} props.messageToSend - A mensagem a ser enviada.
 * @param {string} props.chatId - O ID do chat.
 * @param {Set<string>} [props.activeChatId] - O ID do chat ativo.
 * @param {string} props.instanceId - O ID da instancie.
 * @returns {Promise<import("@whiskeysockets/baileys").proto.WebMessageInfo | undefined>}
 */
async function _sendMessage({
	sock,
	messageToSend,
	chatId,
	activeChatId,
	instanceId,
}) {
	// Validação do formato do chatId para garantir que é um número de WhatsApp legítimo
	if (!isValidWhatsAppId(chatId)) {
		console.log(`⚠️ [SEND] ID de chat com formato suspeito detectado: ${chatId}. Não enviarei mensagens.`);
		return;
	}

	// Verifica se o chat está excluído por intervenção humana
	// Se estiver e for um chat ativo, ignora o envio
	if (
		hasExcludedNumbersByIntervention(chatId) &&
		activeChatId &&
		activeChatId.has(chatId)
	) {
		console.log("Ignorando", chatId, "por intervenção humana");
		return;
	}

	const cleanedMessage = removeMetadata(messageToSend);
	const trimmedMessage = cleanedMessage.trimStart().trimEnd();

	// Evita enviar mensagens duplicadas em sequência
	if (lastSentMessageWarningByChatId.get(chatId) === trimmedMessage) {
		console.log("Mensagem repetida, ignorando...");
		return;
	}

	// Simula a digitação
	await sock.sendPresenceUpdate("composing", chatId);

	// Calcula o atraso com base no tamanho da mensagem para simular digitação realista
	let dynamicDelay = 2000;
	if (
		!instanceId ||
		!settings[instanceId].MESSAGE_DELAY_FACTOR ||
		!settings[instanceId].MESSAGE_DELAY_MAX
	) {
		dynamicDelay = Math.min(messageToSend.length * 50, 2000);
	} else {
		dynamicDelay = Math.min(
			settings[instanceId].MESSAGE_DELAY_FACTOR * messageToSend.length,
			settings[instanceId].MESSAGE_DELAY_MAX,
		);
	}
	await delay(dynamicDelay);

	console.log(`Enviando mensagem para ${chatId}: "${trimmedMessage.substring(0, 50)}${trimmedMessage.length > 50 ? '...' : ''}"`);

	// Envia a mensagem efetivamente
	const result = await sock.sendMessage(chatId, {
		text: trimmedMessage,
	});

	// Coleta métrica de mensagem enviada quando o envio é bem-sucedido
	if (result && instanceId) {
		incrementMetric(instanceId, 'messagesSent');
		console.log(`📊 Métrica: Mensagem enviada incrementada para ${instanceId}`);
	}

	// Salva a mensagem enviada no sistema de armazenamento
	if (result && instanceId) {
		// Como esta função é chamada via sendSplitMessages após processMessage,
		// estas mensagens são sempre respostas da IA, então marcamos com isAI=true
		saveMessage(instanceId, chatId, result, true);
	}

	// Marca o chat como ativo se ainda não estiver
	if (activeChatId && !activeChatId.has(chatId)) {
		activeChatId.add(chatId);
		console.log(`Chat ${chatId} marcado como ativo durante envio de mensagem`);
	}

	// Rastreia o ID da mensagem enviada para identificá-la como do bot
	if (result?.key?.id) {
		trackSentMessageId(result.key.id, instanceId);
	}

	// Armazena a última mensagem enviada para este chat
	lastSentMessageWarningByChatId.set(chatId, trimmedMessage);

	return result;
}

/**
 * @param {Object} props
 * @param {proto.IWebMessageInfo} props.msg
 * @param {import("@whiskeysockets/baileys").WASocket} props.sock
 * @param {string} props.chatId
 * @param {string} props.instanceId
 * @returns {Promise<boolean>}
 */
async function processNonTextMessage({ msg, sock, chatId, instanceId }) {
	const activeChatIdSet = activeChatId[instanceId]
	const isVideoMessage =
		msg.message?.videoMessage ||
		msg.message?.ephemeralMessage?.message?.videoMessage;
	const isLocationMessage =
		msg.message?.locationMessage ||
		msg.message?.ephemeralMessage?.message?.locationMessage ||
		msg.message?.liveLocationMessage ||
		msg.message?.ephemeralMessage?.message?.liveLocationMessage;
	const isDocumentMessage =
		msg.message?.documentMessage ||
		msg.message?.ephemeralMessage?.message?.documentMessage;

	if (isLocationMessage || isDocumentMessage || isVideoMessage) {
		const messageToSend =
			// @ts-ignore
			settings[instanceId]
				.MENSAGEM_PARA_ENVIAR_QUANDO_RECEBER_TIPO_DESCONHECIDO;
		sendMessage({ sock, chatId, messageToSend, instanceId, activeChatId: activeChatIdSet });

		return true;
	}

	return false;
}

/**
 * @param {Object} props
 * @param {proto.IWebMessageInfo} props.msg
 * @param {string} props.instanceId
 * @param {import("../../types").aiSelected} props.aiSelected
 * @param {string} props.chatId
 * @returns {Promise<string | null>}
 */
async function processAudioMessage({ msg, aiSelected, instanceId, chatId }) {
	const aiHandlers = {
		GPT: convertAndTranscriptionAudioOpenAI,
		GEMINI: convertAndTranscriptionAudioGemini,
		DEEPSEEK: convertAndTranscriptionAudioOpenAI,
	};

	const convertAudioToText = aiHandlers[aiSelected];
	if (!convertAudioToText) {
		throw new Error(`IA '${aiSelected}' não configurada para áudio.`);
	}

	if (!msg.key.id) {
		console.log("msg.key.id não encontrado");
		return null;
	}

	const bufferAudio = await downloadMediaMessage(msg, "buffer", {});
	const transcriptionText = await convertAudioToText({
		//@ts-ignore
		bufferAudio,
		chatId,
		// @ts-ignore
		instanceId,
		messageId: msg.key.id,
	});

	console.log("Áudio processado e transcrito:", transcriptionText);
	return transcriptionText;
}

/**
 * @param {Object} props
 * @param {proto.IWebMessageInfo} props.msg
 * @param {string} props.instanceId
 * @param {import("../../types").aiSelected} props.aiSelected
 * @param {string} props.chatId
 * @returns {Promise<string | null>}
 */
async function generateImageResponse({ msg, aiSelected, instanceId, chatId }) {
	const handlers = {
		GPT: transcriptionImageOpenAI,
		DEEPSEEK: transcriptionImageOpenAI,
		GEMINI: processImageMessageGemini,
	};
	const processImageMessage = handlers[aiSelected];

	if (!processImageMessage) {
		throw new Error(
			`IA '${aiSelected}' não configurada para transcrição de imagens.`,
		);
	}

	if (!msg.key.id) {
		console.log("msg.key.id não encontrado");
		return null;
	}

	const bufferImage = await downloadMediaMessage(msg, "buffer", {});
	const aiResponse = await processImageMessage({
		// @ts-ignore
		bufferImage,
		messageId: msg.key.id,
		caption: msg.message?.imageMessage?.caption,
		// @ts-ignore
		instanceId,
		chatId,
	});

	return aiResponse;
}

/**
 * @param {proto.IWebMessageInfo} msg
 * @returns
 */
function getTextFromMessage(msg) {
	return (
		msg.message?.conversation ||
		msg.message?.extendedTextMessage?.text ||
		msg.message?.ephemeralMessage?.message?.conversation ||
		msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text
	);
}

/**
 * @param {Object} props
 * @param {proto.IWebMessageInfo} props.msg
 * @param {string} props.instanceId
 * @param {string} props.chatId
 * @param {import("../../types").aiSelected} props.aiSelected
 * @returns {Promise<{ category: "audio" | "image" | "text"; textContent: string | null | undefined; responseAI: string | null | undefined }>}
 */
async function processMessageType({ msg, instanceId, aiSelected, chatId }) {
	const isAudioMessage =
		msg.message?.audioMessage ||
		msg.message?.ephemeralMessage?.message?.audioMessage;
	const isImageMessage =
		msg.message?.imageMessage ||
		msg.message?.ephemeralMessage?.message?.imageMessage;

	if (isAudioMessage) {
		const answer = await processAudioMessage({
			aiSelected,
			instanceId,
			msg,
			chatId,
		});
		// precisa melhorar a logica
		// se for openai ele retorna a mensagem transcrita e a mensagem precisa ser tratada como uma mensagem de text
		// o gemini por ser multimodal ja manda a resposta da ia diretamente
		return { category: "audio", textContent: answer, responseAI: answer };
	}

	if (isImageMessage) {
		const answer = await generateImageResponse({
			msg,
			aiSelected,
			instanceId,
			chatId,
		});
		// precisa melhorar a logica
		// se for openai ele retorna a mensagem transcrita e a mensagem precisa ser tratada como uma mensagem de text
		// o gemini por ser multimodal ja manda a resposta da ia diretamente
		// a openai nao suporta imagens por base64 nos assistants ate o momento
		return { category: "image", textContent: answer, responseAI: answer };
	}

	const textContent = getTextFromMessage(msg);

	return { category: "text", textContent, responseAI: null };
}
/**
 * @param {Object} params - Parâmetros para o armazenamento do ID da mensagem.
 * @param {string} params.msgId - O ID da mensagem a ser armazenado.
 * @param {Map<string, string[]>} params.messagesIdsAlreadyAnswered - O mapa que armazena os IDs das mensagens já respondidas.
 * @param {string} params.chatId - O ID do chat onde a mensagem foi recebida.
 */
function storeMessageIdTracking({ msgId, messagesIdsAlreadyAnswered, chatId }) {
	if (msgId) {
		if (messagesIdsAlreadyAnswered.has(chatId)) {
			messagesIdsAlreadyAnswered.set(chatId, [
				// @ts-ignore
				...messagesIdsAlreadyAnswered.get(chatId),
				msgId,
			]);
			return;
		}
		messagesIdsAlreadyAnswered.set(chatId, [msgId]);
		setTimeout(
			() => {
				messagesIdsAlreadyAnswered.delete(chatId);
			},
			24 * 60 * 60 * 1000, // 24 horas
		);
	}
}

/**
 * Limpa o cache de IDs de mensagens enviadas periodicamente
 * para evitar consumo excessivo de memória
 * Executado a cada 24 horas
 */
setInterval(() => {
	// Usar Array.from para converter as entradas do Map em um array seguro para iteração
	Array.from(sentMessageIdsMap.entries()).forEach(([instanceId, messageIds]) => {
		const oldSize = messageIds.size;
		messageIds.clear();
		console.log(`✅ Cache de IDs de mensagens enviadas foi limpo para instância ${instanceId}. Tamanho anterior: ${oldSize}`);
	});
}, 24 * 60 * 60 * 1000);

/**
 * Adiciona o ID de uma mensagem enviada pelo bot ao conjunto de IDs rastreados
 * para evitar que seja detectada como intervenção humana
 *
 * @param {string} messageId - ID da mensagem enviada
 * @param {string} instanceId - ID da instância
 * @returns {void}
 */
function trackSentMessageId(messageId, instanceId) {
	if (!messageId || !instanceId) {
		console.log(`⚠️ Tentativa de rastrear mensagem com dados incompletos: messageId=${messageId}, instanceId=${instanceId}`);
		return;
	}

	if (!sentMessageIdsMap.has(instanceId)) {
		sentMessageIdsMap.set(instanceId, new Set());
	}

	sentMessageIdsMap.get(instanceId).add(messageId);
	console.log(`ID da mensagem adicionado ao rastreamento: ${messageId} (instância ${instanceId})`);
}

module.exports = {
	retryRequest,
	processChatState,
	processMessage,
	getHandler,
	storeMessageInBuffer,
	hasSentMessagesIds,
	addExcludedNumbersByIntervention,
	deleteExcludedNumbersByIntervention,
	sendMessage,
	processNonTextMessage,
	hasExcludedNumbersByIntervention,
	storeMessageIdTracking,
	processMessageType,
	generateImageResponse,
	sendSplitMessages,
	trackSentMessageId,
	getHumanInterventionDetails,
	getAllHumanInterventions,
	getTextFromMessage
};
