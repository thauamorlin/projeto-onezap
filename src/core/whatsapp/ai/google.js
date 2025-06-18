// biome-ignore lint/correctness/noUnusedVariables: <explanation>
const { GoogleGenerativeAI, ChatSession } = require("@google/generative-ai");
const { formatMessageForAI, chatInteractions } = require("../../util");
const { settings } = require("../../config/settings");
const { channels } = require("../../../shared/constants");
const { BrowserWindow } = require("electron");

/**
 * Função para relatar erros de IA para a interface do usuário
 * @param {string} instanceId - ID da instância
 * @param {string} aiType - Tipo de IA (GEMINI, GPT, DEEPSEEK)
 * @param {unknown} errorObj - O erro que ocorreu
 * @param {string} context - Contexto adicional sobre onde o erro ocorreu
 */
function reportAIError(instanceId, aiType, errorObj, context) {
	// Converter para Error se não for
	const error = errorObj instanceof Error
		? errorObj
		: new Error(typeof errorObj === 'string'
			? errorObj
			: `Erro desconhecido: ${JSON.stringify(errorObj)}`);

	// Identificar o tipo de erro
	let errorType = "Erro desconhecido";
	let errorDetails = error.message || "Sem detalhes do erro";
	let errorSolution = "Verifique suas configurações e tente novamente";

	// Analisar o erro para fornecer informações mais específicas
	if (error.message?.includes("API key not valid") || error.message?.includes("API_KEY_INVALID")) {
		errorType = "Chave de API Inválida";
		errorDetails = "A chave da API do Gemini que você forneceu não é válida";
		errorSolution = "Verifique sua chave da API do Gemini nas configurações e gere uma nova em https://aistudio.google.com/app/apikey";
	} else if (error.message?.includes("You exceeded your current quota")) {
		errorType = "Limite de Cota Excedido";
		errorDetails = "Você excedeu o limite de requisições permitido pela sua chave da API";
		errorSolution = "Espere um pouco para fazer mais requisições ou obtenha uma chave com cota maior";
	} else if (error.message?.includes("not found") || error.message?.includes("model not found")) {
		errorType = "Modelo não encontrado";
		errorDetails = "O modelo de IA selecionado não está disponível";
		errorSolution = "Selecione outro modelo nas configurações";
	}

	// Montar o objeto de erro
	const errorInfo = {
		instanceId,
		aiType,
		id: `ai-error-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
		timestamp: new Date().toISOString(),
		errorType,
		errorMessage: error.message,
		errorDetails,
		errorSolution,
		context,
		originalError: error.toString(),
		stack: error.stack
	};

	// Obter todas as janelas do Electron
	const windows = BrowserWindow.getAllWindows();

	// Enviar para todas as janelas ativas
	windows.forEach(window => {
		if (!window.isDestroyed()) {
			window.webContents.send(channels.AI_ERROR, errorInfo);
		}
	});

	console.error(`[AI ERROR REPORT] ${aiType} error for instance ${instanceId}: ${errorType} - ${errorDetails}`);
	console.log(`[AI ERROR REPORT] ${aiType} error for instance ${instanceId}: ${errorType} - ${errorDetails}`);
}

/**
 * @type {Object<string, GoogleGenerativeAI>}
 */
const gemini = {};

/**
 * @type {Map<string, { session: ChatSession, history: Array<{ role: string, parts: any }> }>}
 */
const activeChats = new Map();

/**
 * @type {Object<string, boolean>}
 */
const didInit = {};

/**
 * @param {string} instanceId
 * @param {string} chatId
 * @returns {Promise<void>}
 */
async function initializeNewAIChatSessionGemini(instanceId, chatId) {
	try {
	// Inicializa a API Gemini se ainda não foi feito
		if (!didInit[instanceId]) {
			try {
			// @ts-ignore
				const apiKey = settings[instanceId]?.GEMINI_KEY;
				if (!apiKey) {
					console.error("Chave Gemini não encontrada para a instância:", instanceId);
					const error = new Error("Chave Gemini não configurada");
					reportAIError(instanceId, "GEMINI", error, "Inicialização da API");
					throw error;
				}

				gemini[instanceId] = new GoogleGenerativeAI(apiKey);
				didInit[instanceId] = true;
			} catch (error) {
				console.error("Erro ao inicializar GoogleGenerativeAI:", error);
				reportAIError(instanceId, "GEMINI", error, "Inicialização da API");
				throw error;
			}
		}

		// Retorna se a sessão já existe
		if (activeChats.has(`${chatId}-${instanceId}`)) return;

		// Configurações seguras do modelo
		try {
			// @ts-ignore
			const configuredModel = settings[instanceId]?.GEMINI_MODEL || "gemini-1.5-flash";
			// @ts-ignore
			const configuredTemperature = settings[instanceId]?.GEMINI_TEMPERATURE;
			// @ts-ignore
			const prompt = settings[instanceId]?.GEMINI_PROMPT || "";

			console.log("Modelo selecionado:", configuredModel);
			console.log("Temperatura configurada:", configuredTemperature);

			// Criação do modelo com configurações
			let model;
			try {
				if (configuredTemperature !== undefined) {
					model = gemini[instanceId].getGenerativeModel({
						model: configuredModel,
						generationConfig: {
							temperature: configuredTemperature
						}
					});
					console.log("Modelo criado com temperatura:", configuredTemperature);
				} else {
					model = gemini[instanceId].getGenerativeModel({
						model: configuredModel
					});
					console.log("Modelo criado sem temperatura específica");
				}
			} catch (error) {
				console.error("Erro ao criar modelo com configuração personalizada:", error);
				reportAIError(instanceId, "GEMINI", error, "Criação do modelo");
				console.log("Tentando criar com configuração padrão...");
				// Fallback para configuração padrão
				model = gemini[instanceId].getGenerativeModel({
					model: "gemini-1.5-flash"
				});
			}

			// Criação da sessão de chat
			let chat;
			try {
				chat = model.startChat({
					history: [],
					generationConfig: configuredTemperature !== undefined ? {
						temperature: configuredTemperature
					} : undefined
				});

				// Enviar o prompt de sistema em vez de usar systemInstruction
				if (prompt) {
					await chat.sendMessage(`Você é um assistente útil com as seguintes instruções: ${prompt}`);
				}
			} catch (error) {
				console.error("Erro ao iniciar sessão de chat:", error);
				reportAIError(instanceId, "GEMINI", error, "Inicialização da sessão de chat");
				throw error;
			}

			activeChats.set(`${chatId}-${instanceId}`, {
				session: chat,
				history: [],
			});

			console.log("Sessão de chat Gemini inicializada com sucesso");
		} catch (error) {
			console.error("Erro ao configurar o modelo Gemini:", error);
			reportAIError(instanceId, "GEMINI", error, "Configuração do modelo");
			throw error;
		}
	} catch (error) {
		console.error("Erro geral na inicialização do Gemini:", error);
		reportAIError(instanceId, "GEMINI", error, "Inicialização geral");
		throw error;
	}
}

/**
 * @param {Object} params
 * @param {string} params.chatId
 * @param {string} params.instanceId
 * @returns {Promise<ChatSession>}
 */
const getOrCreateChatSession = async ({ chatId, instanceId }) => {
	await initializeNewAIChatSessionGemini(instanceId, chatId);

	const chatKey = `${chatId}-${instanceId}`;
	const chatData = activeChats.get(chatKey);
	if (!chatData) {
		throw new Error("Sessão de chat não encontrada.");
	}
	return chatData.session;
};

/**
 * @param {Object} params
 * @param {string} params.currentMessage
 * @param {string} params.chatId
 * @param {string} params.chatName
 * @param {string} params.instanceId
 * @returns {Promise<string>}
 */
const mainGoogle = async ({ currentMessage, chatId, instanceId, chatName }) => {
	const chatSession = await getOrCreateChatSession({ chatId, instanceId });
	const formattedMessage = formatMessageForAI({
		currentMessage,
		chatName,
		chatId,
		instanceId,
		includeContactName: settings[instanceId]?.INCLUIR_NOME_CONTATO ?? true
	});
	const result = await chatSession.sendMessage(formattedMessage);
	const response = result.response.text();

	const chatKey = `${chatId}-${instanceId}`;
	const chatData = activeChats.get(chatKey);

	if (!chatData) {
		throw new Error("Sessão de chat não encontrada.");
	}

	chatData.history.push(
		{ role: "user", parts: formattedMessage },
		{ role: "model", parts: response },
	);

	console.log("Resposta Gemini:", response);
	return response;
};

/**
 * @param {Object} params
 * @param {Buffer} params.bufferAudio
 * @param {string} params.chatId
 * @param {string} params.instanceId
 * @returns {Promise<string>}
 */
async function convertAndTranscriptionAudioGemini({
	bufferAudio,
	chatId,
	instanceId,
}) {
	const userAddress = process.env.HOME || process.env.USERPROFILE;

	if (!userAddress) {
		throw new Error("Não foi possível encontrar o diretório do usuário.");
	}

	const base64AudioFile = bufferAudio.toString("base64");
	const chatSession = await getOrCreateChatSession({
		chatId,
		instanceId,
	});

	const result = await chatSession.sendMessage([
		{
			inlineData: {
				mimeType: "audio/wav",
				data: base64AudioFile,
			},
		},
		{ text: "Te enviei um audio" },
	]);
	const responseAI = result.response.text();
	console.log({ responseAI });
	return responseAI;
}

/**
 * @param {Object} params
 * @param {Buffer} params.bufferImage
 * @param {string} params.messageId
 * @param {string|null|undefined} params.caption
 * @param {string} params.instanceId
 * @param {string} params.chatId
 * @returns {Promise<string>}
 */
async function processImageMessageGemini({
	bufferImage,
	caption,
	instanceId,
	chatId,
}) {
	const userAddress = process.env.HOME || process.env.USERPROFILE;

	if (!userAddress) {
		throw new Error("Não foi possível encontrar o diretório do usuário.");
	}

	const chatSession = await getOrCreateChatSession({
		chatId,
		instanceId,
	});

	const textToSendWithImage = caption || "Te enviei uma imagem";

	const result = await chatSession.sendMessage([
		{
			inlineData: {
				data: Buffer.from(bufferImage).toString("base64"),
				mimeType: "image/jpeg",
			},
		},
		textToSendWithImage,
	]);
	const responseAI = result.response.text();
	return responseAI;
}

/**
 * @param {number} instanceId
 */
async function clearActiveChatsGemini(instanceId) {
	activeChats.forEach((_, key) => {
		if (key.endsWith(`-${instanceId}`)) {
			activeChats.delete(key);
		}
	});
	chatInteractions.forEach((_, key) => {
		if (key.endsWith(`:${instanceId}`)) {
			chatInteractions.delete(key);
		}
	});
	didInit[instanceId] = false;
}

module.exports = {
	mainGoogle,
	initializeNewAIChatSessionGemini,
	convertAndTranscriptionAudioGemini,
	processImageMessageGemini,
	clearActiveChatsGemini,
};
