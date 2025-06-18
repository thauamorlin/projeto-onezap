const { settings } = require("../config/settings");
const { formatPhoneNumber, isPhoneNumberMatch } = require("./formatters");

/**
 * @param {*} instanceId
 * @returns
 */
function getFormattedNumbers(instanceId) {
	const allowedNumbersFormatted =
		settings[instanceId].SOMENTE_RESPONDER.map(formatPhoneNumber).filter(
			(n) => n,
		) ?? [];

	const excludedNumbersFormatted =
		settings[instanceId].NAO_RESPONDER.map(formatPhoneNumber).filter(
			(n) => n,
		) ?? [];

	return { allowedNumbersFormatted, excludedNumbersFormatted };
}

/**
 * Verifica se o número `chatId` está permitido para processamento.
 *
 * @param {string} chatId - O ID do chat ou número de telefone.
 * @param {string} instanceId - O ID do chat ou número de telefone.
 * @returns {boolean} - Retorna `true` se o número estiver permitido, caso contrário `false`.
 */
function isAllowedToProcess(instanceId, chatId) {
	const { allowedNumbersFormatted, excludedNumbersFormatted } =
		getFormattedNumbers(instanceId);

	if (
		excludedNumbersFormatted.some((number) =>
			isPhoneNumberMatch(chatId, number),
		)
	) {
		console.log(
			`Número ${chatId} está na lista de excluídos. Ignorando mensagem.`,
		);
		return false;
	}

	if (
		allowedNumbersFormatted.length > 0 &&
		!allowedNumbersFormatted.some((number) =>
			isPhoneNumberMatch(chatId, number),
		)
	) {
		console.log(
			`Número ${chatId} não está na lista de permitidos. Ignorando mensagem.`,
		);
		return false;
	}

	return true;
}

module.exports = { isAllowedToProcess };
