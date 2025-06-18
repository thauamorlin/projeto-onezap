// @ts-nocheck

/**
 * Divide o texto em partes menores, preservando URLs, e-mails, emojis e outros padrões complexos.
 *
 * @param {string} text - O texto a ser dividido.
 * @returns {string[]} - Um array de partes do texto.
 */
function splitMessages(text) {
	const complexPattern =
		/(http[s]?:\/\/[^\s]+)|(www\.[^\s]+)|([^\s]+@[^\s]+\.[^\s]+)|(["'].*?["'])|(\b\d+\.\s)|(\w+\.\w+)|([\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}])/gu;

	const placeholders = text.match(complexPattern) ?? [];

	const placeholder = "PLACEHOLDER_";
	let currentIndex = 0;
	const textWithPlaceholders = text.replace(
		complexPattern,
		() => `${placeholder}${currentIndex++}`,
	);

	const splitPattern = /(?<!\b\d+\.\s)(?<!\w+\.\w+)[^.?!]+(?:[.?!]+["')]*|$)/g;
	let parts = textWithPlaceholders.match(splitPattern) ?? [];

	if (placeholders.length > 0) {
		parts = parts.map((part) =>
			placeholders.reduce(
				(acc, val, idx) => acc.replace(`${placeholder}${idx}`, val),
				part,
			),
		);
	}

	// Ajuste para garantir que emojis fiquem na mensagem anterior com espaço
	parts = parts.reduce((acc, part) => {
		const isEmoji =
			/^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]+$/u.test(
				part.trim(),
			);
		if (isEmoji && acc.length > 0) {
			acc[acc.length - 1] += ` ${part.trim()}`;
		} else if (/^[^\w\d\s]/.test(part.trim()) && acc.length > 0) {
			acc[acc.length - 1] += ` ${part.trim()}`;
		} else {
			acc.push(part.trim());
		}
		return acc;
	}, []);

	// Remover mensagens vazias
	return parts.filter((p) => p.trim().length > 0);
}

/**
 * Registra uma mensagem no histórico ativo do chat.
 *
 * @param {Object} params - Parâmetros para o registro da mensagem.
 * @param {string} params.chatId - O ID do chat.
 * @param {string} params.message - A mensagem a ser registrada.
 * @param {Map<any, any>} params.activeChatsHistory - O histórico ativo de chats.
 */
function registerMessageOnHistory({ chatId, message, activeChatsHistory }) {
	if (activeChatsHistory.has(chatId)) {
		const currentHistory = activeChatsHistory.get(chatId);
		activeChatsHistory.set(chatId, [
			...currentHistory,
			{
				role: "model",
				parts: message,
			},
		]);
	} else {
		activeChatsHistory.set(chatId, [
			{
				role: "model",
				parts: message,
			},
		]);
	}
}

/**
 * Converte links em formato Markdown ([texto](link)) para o formato normal (texto: link).
 *
 * @param {string} text - O texto a ser processado.
 * @returns {string} - O texto com os links convertidos.
 */
function convertMarkdownLinks(text) {
	return text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1: $2");
}

/**
 * Valida o formato do ID de chat para garantir que é um número de WhatsApp legítimo
 *
 * @param {string} chatId - O ID do chat para validar
 * @returns {boolean} - Retorna true se o formato do ID é válido
 */
function isValidWhatsAppId(chatId) {
	if (!chatId || typeof chatId !== 'string') {
		return false;
	}

	return (
		(chatId.includes('@s.whatsapp.net') && /^\d+@s\.whatsapp\.net$/.test(chatId)) || // Contato individual
		(chatId.includes('@g.us') && /^\d+(-\d+)?@g\.us$/.test(chatId)) || // Grupo (com ou sem hífen)
		(chatId === 'status@broadcast') // Status
	);
}

/**
 * Verifica se deve responder a uma mensagem com base no tipo.
 *
 * @param {import("@whiskeysockets/baileys").proto.IWebMessageInfo} msg - A mensagem recebida.
 * @param {string} messageType - O tipo da mensagem.
 * @param {Map<string, string[]>} messagesIdsAlreadyAnswered - IDs das mensagens já respondidas.
 * @param {string} chatId - O ID do chat.
 * @param {Object} settings - Configurações da instância.
 * @returns {boolean} - Retorna `true` se deve responder à mensagem, caso contrário `false`.
 */
function shouldReplyToMessage(
	msg,
	messageType,
	messagesIdsAlreadyAnswered,
	chatId,
	settings
) {
	if (msg.key.id && chatId) {
		const messagesIds = messagesIdsAlreadyAnswered.get(chatId);
		if (messagesIds?.includes(msg.key.id)) {
			console.log("Mensagem já respondida!", msg);
			return false;
		}
	}

	// Validação de formato do chatId para garantir que é um número de WhatsApp legítimo
	if (!isValidWhatsAppId(chatId)) {
		console.log(`⚠️ ID de chat com formato suspeito detectado: ${chatId}. Não vou responder.`);
		return false;
	}

	const isFromGroup =
		!!msg.key.participant ||
		!!msg.message?.senderKeyDistributionMessage?.groupId ||
		chatId.endsWith("@g.us");

	if (isFromGroup) {
		console.log("Mensagem de grupo detectada, não será respondida.", msg);
		return false;
	}

	return (
		!msg.key.fromMe &&
		msg.key.remoteJid !== "status@broadcast" &&
		(messageType === "conversation" ||
			messageType === "extendedTextMessage" ||
			messageType === "messageContextInfo" ||
			messageType === "locationMessage" ||
			messageType === "liveLocationMessage" ||
			messageType === "imageMessage" ||
			messageType === "audioMessage" ||
			messageType === "videoMessage" ||
			messageType === "documentMessage")
	);
}

module.exports = {
	splitMessages,
	registerMessageOnHistory,
	shouldReplyToMessage,
	convertMarkdownLinks,
	isValidWhatsAppId
};
