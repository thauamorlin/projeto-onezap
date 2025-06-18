/**
 * @type {Map<string, boolean>}
 */
const chatInteractions = new Map();

/**
 * @param {Object} params - Parâmetros para a formatação da mensagem.
 * @param {string} params.currentMessage - A mensagem atual do usuário.
 * @param {string} params.chatId - O ID do chat.
 * @param {string} params.instanceId - O ID da instância.
 * @param {string} [params.chatName] - O nome do chat (opcional).
 * @param {boolean} [params.includeContactName=true] - Indica se o nome do contato deve ser incluído.
 * @returns {string} - A mensagem formatada (com metadados).
 */
function formatMessageForAI({ currentMessage, chatId, instanceId, chatName, includeContactName = true }) {
	const now = new Date();
	const timestamp = now.toLocaleString("pt-BR", {
		weekday: "long",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		timeZone: "America/Sao_Paulo",
	});

	const uniqueKey = `${chatId}:${instanceId}`;

	let nameInfo = "";
	if (!chatInteractions.has(uniqueKey)) {
		if (chatName && includeContactName) {
			nameInfo = `Nome do contato: ${chatName}\n`;
		}
		chatInteractions.set(uniqueKey, true);
	}

	const currentTime = now.toLocaleString("pt-BR", {
		weekday: "long",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		timeZone: "America/Sao_Paulo",
	});

	const message = `
<metadados>
${nameInfo}Mensagem recebida em: ${timestamp}
Horário atual: ${currentTime}
<!-- Instrução interna: use apenas a mensagem do usuário para gerar a resposta -->
</metadados>

${currentMessage}
`;

	console.log(message);
	return message;
}

/**
 * Remove todo o conteúdo entre as tags <metadados> e </metadados>.
 *
 * @param {string} message - A mensagem original retornada pela IA.
 * @returns {string} - A mensagem limpa, sem metadados.
 */
function removeMetadata(message) {
	return message.replace(/<metadados>[\s\S]*?<\/metadados>/g, "").trim();
}

module.exports = { formatMessageForAI, chatInteractions, removeMetadata };
