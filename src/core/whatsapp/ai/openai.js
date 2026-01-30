const { OpenAI } = require("openai");
const dotenv = require("dotenv");
const fs = require("node:fs");
const path = require("node:path");
const { formatMessageForAI, chatInteractions } = require("../../util");
const { settings } = require("../../config/settings");
const { channels } = require("../../../shared/constants");
const { BrowserWindow } = require("electron");

dotenv.config();

/**
 * Função para relatar erros de IA para a interface do usuário
 * @param {string} instanceId - ID da instância
 * @param {unknown} errorObj - O erro que ocorreu
 * @param {string} context - Contexto adicional sobre onde o erro ocorreu
 */
function reportOpenAIError(instanceId, errorObj, context) {
	// Converter para Error se não for
	const error = errorObj instanceof Error
		? errorObj
		: new Error(typeof errorObj === 'string'
			? errorObj
			: `Erro desconhecido: ${JSON.stringify(errorObj)}`);

	// Obter todas as janelas do Electron
	const windows = BrowserWindow.getAllWindows();

	// Identificar o tipo de erro
	let errorType = "Erro desconhecido";
	let errorDetails = error.message || "Sem detalhes do erro";
	let errorSolution = "Verifique suas configurações e tente novamente";

	// Analisar o erro para fornecer informações mais específicas
	if (error.message?.includes("API key") || error.message?.includes("authentication")) {
		errorType = "Chave de API Inválida";
		errorDetails = "A chave da API do OpenAI que você forneceu não é válida";
		errorSolution = "Verifique sua chave da API do OpenAI nas configurações";
	} else if (error.message?.includes("Rate limit") || error.message?.includes("quota")) {
		errorType = "Limite de Requisições Excedido";
		errorDetails = "Você excedeu o limite de requisições permitido pela OpenAI";
		errorSolution = "Aguarde um pouco antes de enviar mais mensagens ou use uma conta com maior limite";
	} else if (error.message?.includes("not found") || error.message?.includes("assistant")) {
		errorType = "Assistente Não Encontrado";
		errorDetails = "O assistente configurado não foi encontrado ou não está disponível";
		errorSolution = "Verifique se o ID do assistente está correto ou crie um novo assistente";
	}

	// Montar o objeto de erro
	const errorInfo = {
		instanceId,
		aiType: "GPT",
		timestamp: new Date().toISOString(),
		errorType,
		errorMessage: error.message,
		errorDetails,
		errorSolution,
		context,
		originalError: error.toString(),
		stack: error.stack
	};

	// Enviar para todas as janelas ativas
	windows.forEach(window => {
		if (!window.isDestroyed()) {
			window.webContents.send(channels.AI_ERROR, errorInfo);
		}
	});

	console.error(`[AI ERROR REPORT] GPT error for instance ${instanceId}: ${errorType} - ${errorDetails}`);
	console.log(`[AI ERROR REPORT] GPT error for instance ${instanceId}: ${errorType} - ${errorDetails}`);
}

/** @type {Record<string, { id: string, instructions: string }>} */
const assistant = {};

/** @type {Record<string, import("openai").OpenAI>} */
const openai = {};

/** @type {Map<string, { id: string }>} */
const activeChats = new Map();

/** @type {Record<string, boolean>} */
const didInit = {};

/**
 * @param {string} instanceId - O ID da instância.
 * @param {string} chatId - O ID do chat.
 * @returns {Promise<void>}
 */
async function initializeNewAIChatSessionOpenAI(instanceId, chatId) {
	try {
		if (!didInit[instanceId]) {
			try {
				// @ts-ignore
				const apiKey = settings[instanceId]?.OPENAI_KEY;
				if (!apiKey) {
					const error = new Error("Chave OpenAI não configurada");
					reportOpenAIError(instanceId, error, "Inicialização da API");
					throw error;
				}

				openai[instanceId] = new OpenAI({
					apiKey: apiKey,
				});

				if (settings[instanceId].OPENAI_ASSISTANT) {
					try {
						// @ts-ignore
						assistant[instanceId] = await openai[instanceId].beta.assistants.retrieve(
							// @ts-ignore
							settings[instanceId].OPENAI_ASSISTANT,
						);
					} catch (error) {
						console.error("Erro ao recuperar assistente OpenAI:", error);
						reportOpenAIError(instanceId, error, "Recuperação do assistente");
						throw error;
					}
				} else {
					const error = new Error("Nenhum assistente OpenAI configurado");
					reportOpenAIError(instanceId, error, "Configuração do assistente");
					throw error;
				}

				didInit[instanceId] = true;
			} catch (error) {
				console.error("Erro ao inicializar OpenAI:", error);
				reportOpenAIError(instanceId, error, "Inicialização da API");
				throw error;
			}
		}

		if (activeChats.has(`${chatId}-${instanceId}`)) return;

		try {
			const thread = await openai[instanceId].beta.threads.create();
			activeChats.set(`${chatId}-${instanceId}`, thread);
		} catch (error) {
			console.error("Erro ao criar thread OpenAI:", error);
			reportOpenAIError(instanceId, error, "Criação da thread");
			throw error;
		}
	} catch (error) {
		console.error("Erro geral na inicialização do OpenAI:", error);
		reportOpenAIError(instanceId, error, "Inicialização geral");
		throw error;
	}
}

/**
 * Processa a mensagem atual usando a IA.
 *
 * @param {Object} params - Parâmetros para o processamento da mensagem.
 * @param {string} params.currentMessage - A mensagem atual.
 * @param {string} params.chatId - O ID do chat.
 * @param {string} params.instanceId - O ID do chat.
 * @param {string} params.chatName - O nome do chat.
 * @returns {Promise<string>} - A resposta gerada pela IA.
 */
async function mainOpenAI({ currentMessage, chatId, instanceId, chatName }) {
	const thread = activeChats.get(`${chatId}-${instanceId}`);

	if (!thread) {
		throw new Error("Conversa ativa não encontrada para o chat.");
	}

	const formattedMessage = formatMessageForAI({
		currentMessage,
		chatName,
		chatId,
		instanceId,
		includeContactName: settings[instanceId]?.INCLUIR_NOME_CONTATO ?? true
	});

	await openai[instanceId].beta.threads.messages.create(thread.id, {
		role: "user",
		content: formattedMessage,
	});

	const run = await openai[instanceId].beta.threads.runs.create(thread.id, {
		assistant_id: assistant[instanceId].id,
		instructions: assistant[instanceId].instructions,
	});

	const messages = await checkRunStatus({
		threadId: thread.id,
		runId: run.id,
		instanceId,
	});
	// @ts-ignore
	const responseAI = messages.data[0].content[0];
	return responseAI.text.value;
}

/**
 * @param {Object} params - Parâmetros para a verificação do status.
 * @param {string} params.threadId - O ID do thread.
 * @param {string} params.runId - O ID da execução.
 * @param {string} params.instanceId - O ID da execução.
 * @returns {Promise<Object>} - As mensagens geradas pela IA.
 */
async function checkRunStatus({ threadId, runId, instanceId }) {
	return await new Promise((resolve, reject) => {
		const verify = async () => {
			try {
				const runStatus = await openai[instanceId].beta.threads.runs.retrieve(
					threadId,
					runId,
				);

				switch (runStatus.status) {
					case "completed": {
						const messages =
							await openai[instanceId].beta.threads.messages.list(threadId);
						resolve(messages);
						break;
					}
					case "in_progress":
					case "queued":
						console.log(
							"Aguardando resposta da OpenAI... runStatus.status: ",
							runStatus.status,
						);
						setTimeout(verify, 1000);
						break;
					case "requires_action":
						reject(
							new Error(
								"OpenAI pediu por funções que não estão ativas no código para realizar.",
							),
						);
						break;
					case "failed":
					case "cancelled":
					case "cancelling":
					case "expired":
						console.log("runStatus.status:", runStatus.status);
						reject(new Error("Falha ao processar a mensagem na OpenAI."));
						break;
					default:
						reject(
							new Error(
								"Falha ao processar a mensagem na OpenAI: Status desconhecido",
							),
						);
						break;
				}
			} catch (error) {
				console.log("Erro ao verificar o status do run:", error);
				reject(error);
			}
		};

		verify();
	});
}

/**
 * @param {Object} params - Parâmetros para a conversão e transcrição.
 * @param {Buffer} params.bufferAudio - O buffer de áudio a ser convertido.
 * @param {string} params.messageId - O ID da mensagem.
 * @param {number} params.instanceId
 * @returns {Promise<string>} - A transcrição do áudio.
 */
async function convertAndTranscriptionAudioOpenAI({
	bufferAudio,
	messageId,
	instanceId,
}) {
	return await new Promise((resolve, reject) => {
		const userAddress = process.env.HOME || process.env.USERPROFILE;

		if (!userAddress) {
			reject(new Error("Não foi possível encontrar o diretório do usuário."));
			return;
		}

		const inputFilePath = path.join(
			userAddress,
			"onezap-auth",
			`input-audio-${messageId}.wav`,
		);

		fs.writeFile(inputFilePath, bufferAudio, {}, (err) => {
			if (err) {
				console.error("An error occurred:", err);
				reject(err);
			} else {
				console.log("File saved, sending to Whisper API...");

				openai[instanceId].audio.transcriptions
					.create({
						file: fs.createReadStream(inputFilePath),
						model: "whisper-1",
						language: "pt",
					})
					.then((transcription) => {
						fs.unlink(inputFilePath, () => { });
						resolve(transcription.text);
					})
					.catch((error) => {
						console.error("An error occurred while transcribing:", error);
						reject(error);
					});
			}
		});
	});
}

/**
 * @param {Object} params - Parâmetros para a transcrição da imagem.
 * @param {Buffer} params.bufferImage - O buffer da imagem a ser transcrita.
 * @param {string} params.messageId - O ID da mensagem.
 * @param {string|null|undefined} params.caption - A legenda enviada com a imagem.
 * @param {number} params.instanceId
 * @returns {Promise<string>} - A transcrição da imagem.
 */
async function transcriptionImageOpenAI({
	bufferImage,
	messageId,
	caption,
	instanceId,
}) {
	return await new Promise((resolve, reject) => {
		const userAddress = process.env.HOME || process.env.USERPROFILE;
		if (!userAddress) {
			reject(new Error("Não foi possível encontrar o diretório do usuário."));
			return;
		}

		const inputFilePath = path.join(
			userAddress,
			"onezap-auth",
			`image-${messageId}.jpg`,
		);
		fs.writeFile(inputFilePath, bufferImage, {}, async () => {
			try {
				const imageBuffer = fs.readFileSync(inputFilePath);
				const base64Image = imageBuffer.toString("base64");
				const response = await openai[instanceId].chat.completions.create({
					model: "gpt-4o-mini",
					messages: [
						{
							role: "user",
							content: [
								{ type: "text", text: "O que tem na imagem?" },
								{
									type: "image_url",
									image_url: { url: `data:image/jpeg;base64,${base64Image}` },
								},
							],
						},
					],
				});
				fs.unlink(inputFilePath, () => { });
				resolve(
					`Você recebeu uma imagem que já foi descrita por outro modelo, responda para o cliente com base na imagem recebida. aqui está a descrição dela: ${response.choices[0].message.content
					} ${caption &&
					`O cliente enviou junto com a imagem a seguinte mensagem: ${caption}`
					}`,
				);
			} catch (err) {
				console.log("err", err);
				reject(err);
			}
		});
	});
}

/**
Í * @param {number} instanceId
 */
async function clearActiveChatsOpenAI(instanceId) {
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

/**
 *  Função nao utilizada temporariamente pq openai nao suporta imagens base64 via assistants API
 * @param {Object} params - Parâmetros para a transcrição da imagem.
 * @param {Buffer} params.bufferImage - O buffer da imagem a ser transcrita.
 * @param {string} params.messageId - O ID da mensagem.
 * @param {string|null|undefined} params.caption - A legenda enviada com a imagem.
 * @param {string} params.chatId - O ID do chat.
 * @param {string} params.instanceId - O ID da instância.
 * @returns {Promise<string>} - A resposta gerada pela IA.
 */
// biome-ignore lint/correctness/noUnusedVariables: se a openai atualizar e base64 for possivel via assistant api, essa funcao está pronta!
async function processImageMessageOpenAI({
	bufferImage,
	messageId,
	caption,
	chatId,
	instanceId,
}) {
	const thread = activeChats.get(`${chatId}-${instanceId}`);

	if (!thread) {
		throw new Error("Conversa ativa não encontrada para o chat.");
	}

	const userAddress = process.env.HOME || process.env.USERPROFILE;

	if (!userAddress) {
		throw new Error("Não foi possível encontrar o diretório do usuário.");
	}

	const inputFilePath = path.join(
		userAddress,
		"onezap-auth",
		`image-${messageId}.jpg`,
	);

	return new Promise((resolve, reject) => {
		fs.writeFile(inputFilePath, bufferImage, {}, async (err) => {
			if (err) {
				console.log("Erro ao salvar a imagem:", err);
				reject(err);
				return;
			}

			try {
				const imageBuffer = fs.readFileSync(inputFilePath);
				const base64Image = imageBuffer.toString("base64");
				console.log("base64Image", base64Image);
				const textToSendWithImage = caption || "Te enviei uma imagem";

				await openai[instanceId].beta.threads.messages.create(thread.id, {
					role: "user",
					content: [
						{ type: "text", text: textToSendWithImage },
						{
							type: "image_url",
							image_url: { url: `data:image/jpeg;base64,${base64Image}` },
						},
					],
				});

				const run = await openai[instanceId].beta.threads.runs.create(
					thread.id,
					{
						assistant_id: assistant[instanceId].id,
						instructions: assistant[instanceId].instructions,
					},
				);

				const messages = await checkRunStatus({
					threadId: thread.id,
					runId: run.id,
					instanceId,
				});

				// @ts-ignore
				const responseAI = messages.data[0].content[0];
				resolve(responseAI.text.value);
			} catch (err) {
				console.log("Erro ao processar a imagem na IA:", err);
				reject(err);
			} finally {
				// Remove o arquivo temporário
				fs.unlink(inputFilePath, () => { });
			}
		});
	});
}

module.exports = {
	initializeNewAIChatSessionOpenAI,
	mainOpenAI,
	convertAndTranscriptionAudioOpenAI,
	transcriptionImageOpenAI,
	clearActiveChatsOpenAI,
};
