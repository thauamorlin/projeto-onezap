/**
 * @fileoverview Gerenciador centralizado do modo IA para chats
 * Controla quando a IA deve ou não responder em cada conversa
 */

const { settings } = require("../config/settings");
const {
  hasExcludedNumbersByIntervention,
  getHumanInterventionDetails
} = require("./messageProcessor");

/**
 * @typedef {Object} AIModeStatus
 * @property {boolean} active - Se o modo IA está ativo
 * @property {string} reason - Razão do status atual
 * @property {boolean} canToggle - Se pode ser alterado manualmente
 * @property {'filter' | 'intervention' | 'manual' | 'default'} source - Origem da configuração
 * @property {number} [timestamp] - Quando foi alterado
 * @property {boolean} [isGroup] - Se é um grupo
 */

/**
 * Armazena o estado do modo IA para cada chat
 * @type {Record<string, Record<string, {active: boolean, source: string, timestamp: number}>>}
 */
const aiModeState = {};

/**
 * Verifica se o chat está nas listas de filtros (Somente Responder / Não Responder)
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 * @returns {{inAllowList: boolean, inBlockList: boolean, hasFilters: boolean}}
 */
function checkFilters(instanceId, chatId) {
  const instanceSettings = settings[instanceId];
  if (!instanceSettings) {
    return { inAllowList: false, inBlockList: false, hasFilters: false };
  }

  const phoneNumber = chatId.split('@')[0];
  const somenteResponder = instanceSettings.SOMENTE_RESPONDER || [];
  const naoResponder = instanceSettings.NAO_RESPONDER || [];

  const inAllowList = somenteResponder.length > 0 && somenteResponder.includes(phoneNumber);
  const inBlockList = naoResponder.includes(phoneNumber);
  const hasFilters = somenteResponder.length > 0 || naoResponder.length > 0;

  return { inAllowList, inBlockList, hasFilters };
}

/**
 * Verifica se o modo IA está ativo para um chat específico
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 * @returns {boolean} - True se a IA deve responder neste chat
 */
function isAIModeActive(instanceId, chatId) {
  // 1. Verifica filtros (máxima prioridade)
  const { inAllowList, inBlockList, hasFilters } = checkFilters(instanceId, chatId);

  // Se está na lista de bloqueio, IA sempre inativa
  if (inBlockList) return false;

  // Se tem lista de permissão e não está nela, IA inativa
  const somenteResponder = settings[instanceId]?.SOMENTE_RESPONDER || [];
  if (hasFilters && somenteResponder.length > 0 && !inAllowList) return false;

  // 2. Verifica intervenção humana
  if (hasExcludedNumbersByIntervention(chatId)) {
    return false;
  }

  // 3. Verifica configuração manual do chat
  if (!aiModeState[instanceId]) {
    aiModeState[instanceId] = {};
  }

  const chatState = aiModeState[instanceId][chatId];
  if (chatState && chatState.source === 'manual') {
    return chatState.active;
  }

  // 4. Comportamento padrão
  const isGroup = chatId.includes('@g.us');

  // Grupos vêm desativados por padrão
  if (isGroup) {
    return false;
  }

  // Chats individuais vêm ativados por padrão
  return true;
}

/**
 * Define o modo IA para um chat (se permitido)
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 * @param {boolean} active - Se deve ativar ou desativar
 * @returns {{success: boolean, message: string, status: AIModeStatus}}
 */
function setAIMode(instanceId, chatId, active) {
  const status = getAIModeStatus(instanceId, chatId);

  if (!status.canToggle) {
    return {
      success: false,
      message: getModeRestrictionMessage(status),
      status
    };
  }

  // Se está ativando a IA e há intervenção humana ativa, limpa a intervenção
  if (active && status.source === 'intervention') {
    const { deleteExcludedNumbersByIntervention } = require("./messageProcessor");
    deleteExcludedNumbersByIntervention(chatId);
    console.log(`🔄 Intervenção humana removida para ${chatId} devido à ativação manual da IA`);
  }

  // Inicializa estruturas se necessário
  if (!aiModeState[instanceId]) {
    aiModeState[instanceId] = {};
  }

  // Define o novo estado
  aiModeState[instanceId][chatId] = {
    active,
    source: 'manual',
    timestamp: Date.now()
  };

  const newStatus = getAIModeStatus(instanceId, chatId);

  return {
    success: true,
    message: active ? 'Modo IA ativado com sucesso' : 'Modo IA desativado com sucesso',
    status: newStatus
  };
}

/**
 * Obtém o status completo do modo IA para um chat
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 * @returns {AIModeStatus}
 */
function getAIModeStatus(instanceId, chatId) {
  const { inAllowList, inBlockList } = checkFilters(instanceId, chatId);
  const hasIntervention = hasExcludedNumbersByIntervention(chatId);
  const isGroup = chatId.includes('@g.us');

  // Verifica se é grupo - grupos nunca podem ser alterados
  if (isGroup) {
    return {
      active: false,
      reason: 'O OneZap ainda não responde grupos',
      canToggle: false,
      source: 'default',
      isGroup: true
    };
  }

  // Verifica bloqueio por filtros
  if (inBlockList) {
    return {
      active: false,
      reason: 'Chat está na lista "Não Responder"',
      canToggle: false,
      source: 'filter',
      isGroup
    };
  }

  // Verifica lista de permissão
  const somenteResponder = settings[instanceId]?.SOMENTE_RESPONDER || [];
  if (somenteResponder.length > 0 && !inAllowList) {
    return {
      active: false,
      reason: 'Chat não está na lista "Somente Responder"',
      canToggle: false,
      source: 'filter',
      isGroup
    };
  }

  // Verifica intervenção humana
  if (hasIntervention) {
    /** @type {any} */
    const details = getHumanInterventionDetails(chatId);
    if (!details || typeof details !== 'object') {
      return {
        active: false,
        reason: 'Intervenção humana ativa - você pode reativar a IA quando quiser',
        canToggle: true, // Sempre permite alterar durante intervenção
        source: 'intervention',
        isGroup
      };
    }

    const isManual = Boolean(details.isManual);
    const hoursRemaining = Number(details.hoursRemaining) || 0;
    const timestamp = Number(details.timestamp) || Date.now();

    return {
      active: false,
      reason: isManual
        ? 'Modo manual ativo - você pode reativar a IA quando quiser'
        : `Intervenção humana detectada (reativaria automaticamente em ${hoursRemaining}h) - você pode reativar manualmente quando quiser`,
      canToggle: true, // Sempre permite alterar durante intervenção
      source: 'intervention',
      timestamp: timestamp,
      isGroup
    };
  }

  // Verifica configuração manual
  const chatState = aiModeState[instanceId]?.[chatId];
  if (chatState && chatState.source === 'manual') {
    return {
      active: chatState.active,
      reason: chatState.active ? 'Modo IA ativado manualmente' : 'Modo IA desativado manualmente',
      canToggle: true,
      source: 'manual',
      timestamp: chatState.timestamp,
      isGroup
    };
  }

  // Estado padrão para chats individuais
  return {
    active: true, // Chats individuais ativados por padrão
    reason: 'IA ativa por padrão em chats individuais',
    canToggle: true,
    source: 'default',
    isGroup
  };
}

/**
 * Gera mensagem explicativa sobre restrição do modo IA
 * @param {AIModeStatus} status - Status atual do modo IA
 * @returns {string}
 */
function getModeRestrictionMessage(status) {
  // Verifica se é um grupo
  if (status.isGroup) {
    return 'O OneZap ainda não responde grupos. Esta funcionalidade está em desenvolvimento.';
  }

  switch (status.source) {
    case 'filter':
      if (status.reason.includes('Não Responder')) {
        return 'Este chat está na lista "Não Responder". Remova-o dessa lista nas configurações para poder ativar a IA.';
      }
      if (status.reason.includes('Somente Responder')) {
        return 'Este chat não está na lista "Somente Responder". Adicione-o nessa lista ou remova todos os números dela para poder ativar a IA.';
      }
      break;
    case 'intervention':
      // Intervenção humana não é mais uma restrição - sempre permite alterar
      return 'Você pode ativar ou desativar a IA livremente durante intervenção humana.';
  }
  return 'Não é possível alterar o modo IA neste momento.';
}

/**
 * Limpa o estado manual de um chat (usado quando há intervenção)
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 */
function clearManualAIMode(instanceId, chatId) {
  if (aiModeState[instanceId]?.[chatId]) {
    delete aiModeState[instanceId][chatId];
  }
}

/**
 * Obtém todos os chats com configuração manual de modo IA
 * @param {string} instanceId - ID da instância
 * @returns {Array<{chatId: string, active: boolean, timestamp: number}>}
 */
function getManualAIModeChats(instanceId) {
  if (!aiModeState[instanceId]) return [];

  return Object.entries(aiModeState[instanceId])
    .filter(([_, state]) => state.source === 'manual')
    .map(([chatId, state]) => ({
      chatId,
      active: state.active,
      timestamp: state.timestamp
    }));
}

module.exports = {
  isAIModeActive,
  setAIMode,
  getAIModeStatus,
  clearManualAIMode,
  getManualAIModeChats,
  getModeRestrictionMessage
};
