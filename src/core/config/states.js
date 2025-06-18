/**
 * @type {Record<string, import("@whiskeysockets/baileys").WASocket>}
 */
const socketClients = {};

/**
 * Armazena o estado de processamento para cada instância.
 * @type {Record<string, Map<string, any>>}
 */
const processingStates = {};

/**
 * Armazena os timeouts de mensagem para cada instância.
 * @type {Record<string, Map<string, NodeJS.Timeout>>}
 */
const messageTimeouts = {};

/**
 * Armazena os chatIds ativos para cada instância.
 * @type {Record<string, Set<string>>}
 */
const activeChatId = {};

/**
 * @type {Map<string, string[]>}
 */
const messagesIdsAlreadyAnswered = new Map();

// Limpa as mensagens respondidas a cada semana (7 dias = 604800000 ms)
setInterval(() => {
  messagesIdsAlreadyAnswered.clear();
  console.log("✅ messagesIdsAlreadyAnswered foi limpo.");
}, 7 * 24 * 60 * 60 * 1000);


/**
 * Armazena mensagens temporárias em buffer antes de serem processadas.
 * @type {Record<string, Map<string, { text: string, msgId?: string }[]>>}
 */
const messageBufferPerChatId = {};

/**
 * Armazena os timeouts de buffer para cada instância e chat.
 * @type {Record<string, Map<string, NodeJS.Timeout>>}
 */
const messageTimeoutsMap = {};

/**
 * @type {Record<string, Map<string, Array<{ sock: import("@whiskeysockets/baileys").WASocket, messageToSend: string, activeChatId: Set<string> | undefined, instanceId: string }>>>}
 */
const outgoingQueueMap = {}; // Fila de mensagens para cada instância e chat

/**
 * @type {Record<string, Map<string, boolean>>}
 */
const isSendingMap = {}; // Status de envio para cada instância e chat

/**
 * Estrutura para rastrear o status de conexão
 * @type {Record<string, string>}
 */
const connectionStatus = {};

/**
 * Estrutura para armazenar os follow ups ativos
 * @type {Record<string, Map<string, Array<{
 *   message: string,       // Mensagem a ser enviada
 *   chatId: string,        // ID do chat para enviar a mensagem
 *   scheduledTime: number, // Timestamp em ms para quando enviar o follow up
 *   instanceId: string,    // ID da instância
 *   status: 'pending' | 'sent' | 'failed'  // Status do follow up
 * }>>>}
 */
const activeFollowUps = {};

/**
 * Armazena os timeouts para verificação de follow up para cada instância e chat.
 * @type {Record<string, Map<string, NodeJS.Timeout>>}
 */
const followUpTimeouts = {};

/**
 * Armazena o timestamp da última mensagem recebida para cada chat
 * @type {Record<string, Map<string, number>>}
 */
const lastMessageTimestamp = {};

module.exports = {
  outgoingQueueMap,
  isSendingMap,
  messageBufferPerChatId,
  messageTimeoutsMap,
  processingStates,
  messageTimeouts,
  activeChatId,
  messagesIdsAlreadyAnswered,
  socketClients,
  connectionStatus,
  activeFollowUps,
  followUpTimeouts,
  lastMessageTimestamp
};
