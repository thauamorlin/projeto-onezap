const { OpenAI } = require("openai");
const { settings } = require("../../config/settings");
const { formatMessageForAI } = require("../../util");

/**
 * @type {Object.<string, import("openai").OpenAI>}
 */
const deepseekClients = {};

/**
 * @type {Map<string, Array<{ role: string, content: string }>>}
 */
const activeChats = new Map();

/**
 * @param {string} chatId - ID do chat.
 * @param {string} instanceId - ID da instância.
 * @returns {Array<{ role: string, content: string }>} O histórico de mensagens.
 */
function getOrCreateConversation(chatId, instanceId) {
	const key = `${chatId}-${instanceId}`;
	if (!activeChats.has(key)) {
		activeChats.set(key, [
			{ role: "system", content: settings[instanceId].DEEPSEEK_PROMPT },
		]);
	}
	return activeChats.get(key) ?? [];
}

/**
 * Obtém ou cria um client DeepSeek para a instância.
 *
 * @param {string} instanceId - ID da instância.
 * @returns {import("openai").OpenAI} O client DeepSeek.
 */
function getDeepSeekClient(instanceId) {
	if (!deepseekClients[instanceId]) {
		deepseekClients[instanceId] = new OpenAI({
			apiKey: settings[instanceId].DEEPSEEK_KEY,
			baseURL: "https://api.deepseek.com/v1",
		});
	}
	return deepseekClients[instanceId];
}

/**
 * Processa a mensagem atual utilizando o DeepSeek para gerar uma resposta.
 *
 * @param {Object} params - Parâmetros.
 * @param {string} params.currentMessage - Mensagem atual do usuário.
 * @param {string} params.chatId - ID do chat.
 * @param {string} params.instanceId - ID da instância.
 * @param {string} params.chatName - Nome do contato do cliente.
 * @returns {Promise<string>} A resposta gerada pelo DeepSeek.
 */
async function mainDeepSeek({ currentMessage, chatId, instanceId, chatName }) {
	const conversation = getOrCreateConversation(chatId, instanceId);
	const formattedMessage = formatMessageForAI({
		currentMessage,
		chatName,
		chatId,
		instanceId,
		includeContactName: settings[instanceId]?.INCLUIR_NOME_CONTATO ?? true
	});
	conversation.push({ role: "user", content: formattedMessage });
	const client = getDeepSeekClient(instanceId);
	try {
		const response = await client.chat.completions.create({
			model: settings[instanceId]?.DEEPSEEK_MODEL ?? "deepseek-chat",
			// @ts-ignore
			messages: conversation,
		});
		const deepseekResponse = response.choices[0].message.content;
		// @ts-ignore
		conversation.push({ role: "assistant", content: deepseekResponse });
		console.log("DeepSeek response:", deepseekResponse);
		return deepseekResponse ?? "";
	} catch (error) {
		console.error("Error calling DeepSeek API:", error);
		throw error;
	}
}

/**
 * Limpa as conversas ativas para uma instância específica.
 *
 * @param {number} instanceId - ID da instância.
 * @returns {Promise<void>}
 */
async function clearActiveChatsDeepSeek(instanceId) {
	activeChats.forEach((_, key) => {
		if (key.endsWith(`-${instanceId}`)) {
			activeChats.delete(key);
		}
	});
}

module.exports = {
	mainDeepSeek,
	clearActiveChatsDeepSeek,
};
