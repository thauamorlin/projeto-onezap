/**
 * @fileoverview Tipos e interfaces para o sistema de follow-up
 */

/**
 * @typedef {'pending' | 'sent' | 'failed'} FollowUpStatus
 */

/**
 * @typedef {Object} FollowUpItem
 * @property {string} [id] - ID único do follow-up (opcional para compatibilidade)
 * @property {string} message - Mensagem a ser enviada
 * @property {string} chatId - ID do chat para enviar a mensagem
 * @property {number} scheduledTime - Timestamp em ms para quando enviar o follow up
 * @property {string} instanceId - ID da instância
 * @property {FollowUpStatus} status - Status do follow up
 * @property {number} [sequenceIndex] - Índice da sequência (opcional)
 * @property {number} [totalInSequence] - Total de mensagens na sequência (opcional)
 */

/**
 * @typedef {Object} SentFollowUpHistory
 * @property {number} lastFollowUpTime - Timestamp da última mensagem enviada
 * @property {number} followUpCount - Contador de mensagens enviadas
 */

/**
 * @typedef {Record<string, Record<string, SentFollowUpHistory>>} SentFollowUpsStorage
 */

/**
 * @typedef {Object} ExtendedMessage
 * @property {Object} key - Chave da mensagem
 * @property {boolean} [key.fromMe] - Se a mensagem é nossa
 * @property {Object} [message] - Conteúdo da mensagem
 * @property {boolean} [isAIMessage] - Se é uma mensagem da IA
 * @property {boolean} [isFollowUp] - Se é uma mensagem de follow-up
 */

module.exports = {};
