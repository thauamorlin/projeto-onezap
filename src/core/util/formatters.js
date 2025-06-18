/**
 * Formata um número de telefone para o formato usado no WhatsApp.
 *
 * @param {string} phoneNumber - O número de telefone a ser formatado.
 * @returns {string} - O número formatado com o sufixo '@c.us'.
 */
function formatPhoneNumber(phoneNumber) {
  let cleanNumber = phoneNumber.replace(/\D/g, "");

  if (cleanNumber === "") {
    return "";
  }

  if (cleanNumber.length === 13 && cleanNumber.startsWith("55")) {
    cleanNumber = cleanNumber.slice(0, 4) + cleanNumber.slice(5);
  }
  return `${cleanNumber}@c.us`;
}

/**
 * Normaliza um número de telefone removendo o código do país e o dígito do celular, se aplicável.
 *
 * @param {string} phoneNumber - O número de telefone a ser normalizado.
 * @returns {string} - O número normalizado.
 */
function normalizePhoneNumber(phoneNumber) {
  let cleanNumber = phoneNumber.replace(/\D/g, "");
  if (cleanNumber.startsWith("55")) {
    cleanNumber = cleanNumber.substring(2);
    if (cleanNumber.length === 11) {
      cleanNumber = cleanNumber.substring(0, 2) + cleanNumber.substring(3);
    }
  }
  return cleanNumber;
}

/**
 * Verifica se o `chatId` corresponde ao `phoneNumber`, após ambos serem normalizados.
 *
 * @param {string} chatId - O ID do chat (geralmente um número de telefone).
 * @param {string} phoneNumber - O número de telefone a ser comparado.
 * @returns {boolean} - Retorna `true` se os números normalizados coincidirem.
 */
function isPhoneNumberMatch(chatId, phoneNumber) {
  const normalizedChatId = normalizePhoneNumber(chatId);
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
  return normalizedChatId === normalizedPhoneNumber;
}

module.exports = {
  formatPhoneNumber,
  normalizePhoneNumber,
  isPhoneNumberMatch,
};
