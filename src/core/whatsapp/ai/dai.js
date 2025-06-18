const axios = require("axios");

/**
 * @param {Object} params - Parâmetros para o processamento da mensagem.
 * @param {string} params.currentMessage - A mensagem atual.
 * @param {string} params.chatId - O ID do chat.
 * @param {string} params.instanceId - O ID da instância.
 * @returns {Promise<string>} - A resposta gerada pela DAI.
 */
async function mainDAI({ currentMessage, chatId, instanceId }) {
	// assistant de teste zpa gpt IM79K3BKIe8yO5jDG3BQeH46FcvREePUmsRJPqAFUL9pwx4sm4Ovm4Vu8BVw2GtQ
	try {
		const response = await axios.post(
			"https://api.dai.tec.br/v1/chats",
			{
				message: currentMessage,
				messageServiceId: chatId,
			},
			{
				headers: {
					"x-api-key":
						"IM79K3BKIe8yO5jDG3BQeH46FcvREePUmsRJPqAFUL9pwx4sm4Ovm4Vu8BVw2GtQ",
					"Content-Type": "application/json",
				},
			},
		);

		console.log("Resposta da DAI:", response.data.response);
		return response.data.response; // Retorna apenas o conteúdo da resposta
	} catch (error) {
		console.log("Erro ao processar a mensagem com a DAI:", error);
		throw new Error("Falha ao conectar com a DAI.");
	}
}

module.exports = {
	mainDAI,
};
