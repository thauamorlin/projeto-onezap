const { activeFollowUps } = require("../config/states");
const { sendFollowUp } = require("../whatsapp/followUpManager");
const { saveFollowUpsToFile } = require("../whatsapp/followUpPersistence");

/**
 * Configura os manipuladores de IPC relacionados a follow-ups
 * @param {Electron.IpcMain} ipcMain - Objeto IpcMain do Electron
 */
function setupFollowUpHandlers(ipcMain) {
  /**
   * Manipulador para obter follow-ups ativos para uma instância
   */
  ipcMain.handle("get-active-follow-ups", async (_, instanceId) => {
    try {
      if (!activeFollowUps[instanceId]) {
        return {};
      }

      // Converte o Map para um objeto mais amigável para a UI
      /** @type {Record<string, any>} */
      const result = {};

      // Itera sobre cada chat com follow-ups
      activeFollowUps[instanceId].forEach((followUps, chatId) => {
        if (followUps.length > 0) {
          // Ordenar follow-ups por scheduledTime (os mais próximos primeiro)
          const sortedFollowUps = [...followUps].sort((a, b) => a.scheduledTime - b.scheduledTime);

          // Armazena apenas os follow-ups pendentes e ativos
          const pendingFollowUps = sortedFollowUps.filter(item =>
            item.status === 'pending' && item.scheduledTime > Date.now()
          );

          if (pendingFollowUps.length > 0) {
            result[chatId] = pendingFollowUps;
          }
        }
      });

      return result;
    } catch (error) {
      console.error(`❌ Erro ao obter follow-ups ativos: ${error}`);
      return {};
    }
  });

  /**
   * Manipulador para cancelar um follow-up específico
   */
  ipcMain.handle("cancel-follow-up", async (_, { instanceId, chatId, followUpId }) => {
    try {
      if (!activeFollowUps[instanceId] || !activeFollowUps[instanceId].has(chatId)) {
        return { success: false, message: "Follow-up não encontrado" };
      }

      const followUps = activeFollowUps[instanceId].get(chatId);
      if (!followUps) {
        return { success: false, message: "Follow-up não encontrado" };
      }

      const followUpIndex = followUps.findIndex(item => item.scheduledTime === followUpId);

      if (followUpIndex === -1) {
        return { success: false, message: "Follow-up não encontrado" };
      }

      // Remove o follow-up da lista
      followUps.splice(followUpIndex, 1);

      // Se não houver mais follow-ups para este chat, remove a entrada
      if (followUps.length === 0) {
        activeFollowUps[instanceId].delete(chatId);
      }

      // Salva estado após cancelamento
      await saveFollowUpsToFile(instanceId);

      return { success: true, message: "Follow-up cancelado com sucesso" };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Erro ao cancelar follow-up: ${errorMessage}`);
      return { success: false, message: `Erro ao cancelar follow-up: ${errorMessage}` };
    }
  });

  /**
   * Manipulador para enviar follow-up imediatamente
   */
  ipcMain.handle("send-follow-up-now", async (_, { instanceId, chatId, followUpId }) => {
    try {
      if (!activeFollowUps[instanceId] || !activeFollowUps[instanceId].has(chatId)) {
        return { success: false, message: "Follow-up não encontrado" };
      }

      const followUps = activeFollowUps[instanceId].get(chatId);
      if (!followUps) {
        return { success: false, message: "Follow-up não encontrado" };
      }

      const followUpIndex = followUps.findIndex(item => item.scheduledTime === followUpId);

      if (followUpIndex === -1) {
        return { success: false, message: "Follow-up não encontrado" };
      }

      const followUpItem = followUps[followUpIndex];

      // Envia o follow-up agora
      const updatedItem = await sendFollowUp(instanceId, chatId, followUpItem);

      // Atualiza o item na lista ou remove se foi enviado com sucesso
      if (updatedItem.status === 'sent') {
        // Remove o follow-up da lista
        followUps.splice(followUpIndex, 1);

        // Se não houver mais follow-ups para este chat, remove a entrada
        if (followUps.length === 0) {
          activeFollowUps[instanceId].delete(chatId);
        }
      } else {
        // Atualiza o status do item
        followUps[followUpIndex] = updatedItem;
      }

      // Salva estado após envio
      await saveFollowUpsToFile(instanceId);

      return {
        success: updatedItem.status === 'sent',
        message: updatedItem.status === 'sent'
          ? "Follow-up enviado com sucesso"
          : "Erro ao enviar follow-up"
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Erro ao enviar follow-up: ${errorMessage}`);
      return { success: false, message: `Erro ao enviar follow-up: ${errorMessage}` };
    }
  });

  /**
   * Manipulador para ver a próxima verificação de follow-up para um chat
   */
  ipcMain.handle("get-follow-up-check-info", async (_, { instanceId, chatId }) => {
    try {
      const { followUpTimeouts, lastMessageTimestamp } = require("../config/states");
      const { settings } = require("../config/settings");

      if (!followUpTimeouts[instanceId] || !followUpTimeouts[instanceId].has(chatId)) {
        return { hasScheduledCheck: false };
      }

      // Obter o timestamp da última mensagem
      const lastMessageTime = lastMessageTimestamp[instanceId]?.get(chatId) || 0;

      // Se não houver registro de última mensagem, não mostra verificação
      if (lastMessageTime === 0) {
        return { hasScheduledCheck: false };
      }

      // Usa o tempo configurado no dashboard (padrão: 10 minutos)
      const tempoVerificacaoMinutos = Number.parseInt(settings[instanceId]?.FOLLOW_UP_TEMPO_VERIFICACAO || "10", 10);
      const tempoVerificacaoMs = tempoVerificacaoMinutos * 60 * 1000; // Converte minutos para milissegundos

      const checkTime = lastMessageTime + tempoVerificacaoMs;

      return {
        hasScheduledCheck: true,
        checkTime: checkTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Erro ao obter informações de verificação de follow-up: ${errorMessage}`);
      return { hasScheduledCheck: false };
    }
  });

  /**
   * Manipulador para verificar follow-up manualmente
   */
  ipcMain.handle("check-follow-up-now", async (_, { instanceId, chatId }) => {
    try {
      const { isEligibleForFollowUp, scheduleMultipleFollowUps, generateFollowUpMessages, getFallbackMessages } = require("../whatsapp/followUpManager");
      const { followUpTimeouts } = require("../config/states");
      const { settings } = require("../config/settings");
      const { getMessages } = require("../messageStorage");

      // Cancela a verificação automática agendada se houver
      let cancelledAutomaticCheck = false;
      if (followUpTimeouts[instanceId]?.has(chatId)) {
        const timeoutId = followUpTimeouts[instanceId].get(chatId);
        if (timeoutId) {
          clearTimeout(timeoutId);
          followUpTimeouts[instanceId].delete(chatId);
          cancelledAutomaticCheck = true;
          console.log(`✅ Verificação automática cancelada para ${chatId} devido à verificação manual`);
        }
      }

      // Primeiro verifica se já existe follow-up agendado
      if (activeFollowUps[instanceId]?.has(chatId)) {
        const followUps = activeFollowUps[instanceId].get(chatId);
        if (followUps && followUps.length > 0) {
          return {
            success: true,
            hasFollowUp: true,
            message: "Já existe um follow-up agendado para este chat",
            reason: "Já agendado",
            cancelledAutomaticCheck,
            isManualCheck: true
          };
        }
      }

      // Verifica se o chat está permitido para receber follow-up baseado nos filtros e modo IA
      const { hasExcludedNumbersByIntervention } = require("../whatsapp/messageProcessor");

      // Verifica se o chat está com intervenção humana ativa (modo manual)
      if (hasExcludedNumbersByIntervention(chatId)) {
        return {
          success: true,
          hasFollowUp: false,
          message: "Follow-up não enviado - chat no modo manual",
          reason: "Este chat está no modo manual (intervenção humana ativa) e a IA não está respondendo",
          cancelledAutomaticCheck,
          isManualCheck: true
        };
      }

      const instanceSettings = settings?.[instanceId];
      if (instanceSettings) {
        const phoneNumber = chatId.split('@')[0];

        // Verifica a lista "NÃO RESPONDER"
        const naoResponder = instanceSettings.NAO_RESPONDER || [];
        if (naoResponder.length > 0 && naoResponder.includes(phoneNumber)) {
          return {
            success: true,
            hasFollowUp: false,
            message: "Follow-up não enviado - chat bloqueado por filtros",
            reason: "Este chat está na lista 'NÃO RESPONDER' e não pode receber follow-up",
            cancelledAutomaticCheck,
            isManualCheck: true
          };
        }

        // Verifica a lista "SOMENTE RESPONDER"
        const somenteResponder = instanceSettings.SOMENTE_RESPONDER || [];
        if (somenteResponder.length > 0 && !somenteResponder.includes(phoneNumber)) {
          return {
            success: true,
            hasFollowUp: false,
            message: "Follow-up não enviado - chat bloqueado por filtros",
            reason: "Este chat não está na lista 'SOMENTE RESPONDER' e não pode receber follow-up",
            cancelledAutomaticCheck,
            isManualCheck: true
          };
        }
      }

      // Verifica elegibilidade
      const isEligible = await isEligibleForFollowUp(instanceId, chatId);

      // Se elegível, agenda imediatamente (SEM CHAMAR checkAndScheduleFollowUp para evitar eventos duplicados)
      if (isEligible) {
        try {
          // Obtém todas as mensagens do chat para contexto da IA
          const allMessages = await getMessages(instanceId, chatId, {
            filterEmpty: true
          });

          const messages = allMessages ? allMessages.slice(-20) : []; // Últimas 20 mensagens
          let followUpMessages = [];

          // Verifica se deve gerar mensagens por IA
          if (settings[instanceId]?.FOLLOW_UP_GERAR_IA && messages.length > 0) {
            followUpMessages = await generateFollowUpMessages(instanceId, chatId, messages);
          } else {
            // Usa mensagens pré-definidas
            followUpMessages = getFallbackMessages(instanceId);
          }

          // Agenda múltiplas mensagens de follow-up com intervalos (SEM emitir eventos)
          scheduleMultipleFollowUps(instanceId, chatId, followUpMessages, false);
          console.log(`✅ Chat ${chatId} elegível para follow up. Agendando ${followUpMessages.length} mensagens...`);

          return {
            success: true,
            hasFollowUp: true,
            message: "Follow-up agendado com sucesso",
            reason: `A IA determinou que este chat precisa de follow-up. ${followUpMessages.length} mensagens foram agendadas.`,
            cancelledAutomaticCheck,
            isManualCheck: true
          };
        } catch (error) {
          console.error(`❌ Erro ao agendar follow-up manual: ${error}`);
          return {
            success: false,
            message: "Erro ao agendar follow-up",
            reason: "Ocorreu um erro durante o agendamento",
            cancelledAutomaticCheck,
            isManualCheck: true
          };
        }
      }

      return {
        success: true,
        hasFollowUp: false,
        message: "Cliente não precisa de follow-up",
        reason: "A IA determinou que este cliente não precisa de follow-up",
        cancelledAutomaticCheck,
        isManualCheck: true
      };
    } catch (error) {
      console.error("Erro ao verificar follow-up:", error);
      return {
        success: false,
        message: "Erro ao verificar follow-up",
        reason: "Ocorreu um erro durante a verificação",
        isManualCheck: true
      };
    }
  });

  /**
   * Manipulador para criar follow-up manual
   */
  ipcMain.handle("create-follow-up", async (_, { instanceId, chatId, message }) => {
    try {
      // Valida a mensagem
      if (!message || message.trim() === "") {
        return {
          success: false,
          message: "Mensagem de follow-up não pode estar vazia"
        };
      }

      // Verifica se já existe follow-up para este chat
      if (activeFollowUps[instanceId]?.has(chatId) &&
        activeFollowUps[instanceId]?.get(chatId)?.some(item => item.status === 'pending')) {
        return {
          success: false,
          message: "Já existe um follow-up agendado para este chat"
        };
      }

      // Importa a função para agendar múltiplos follow-ups
      const { scheduleMultipleFollowUps } = require("../whatsapp/followUpManager");

      // Agenda o follow-up com a mensagem única fornecida
      scheduleMultipleFollowUps(instanceId, chatId, [message]);

      return {
        success: true,
        message: "Follow-up criado com sucesso"
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Erro ao criar follow-up manual: ${errorMessage}`);
      return {
        success: false,
        message: `Erro ao criar follow-up: ${errorMessage}`
      };
    }
  });

  /**
   * Manipulador para criar follow-up avançado com múltiplas mensagens e intervalo customizado
   */
  ipcMain.handle("create-follow-up-advanced", async (_, { instanceId, chatId, messages, intervalHours }) => {
    try {
      // Valida as mensagens
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return {
          success: false,
          message: "Pelo menos uma mensagem deve ser fornecida"
        };
      }

      // Filtra mensagens vazias
      const validMessages = messages.filter(msg => msg && msg.trim() !== "");

      if (validMessages.length === 0) {
        return {
          success: false,
          message: "Pelo menos uma mensagem válida deve ser fornecida"
        };
      }

      // Valida o intervalo
      const interval = Number(intervalHours);
      if (Number.isNaN(interval) || interval < 1 || interval > 168) {
        return {
          success: false,
          message: "O intervalo deve estar entre 1 e 168 horas"
        };
      }

      // Verifica se já existe follow-up para este chat
      if (activeFollowUps[instanceId]?.has(chatId)) {
        const existingFollowUps = activeFollowUps[instanceId].get(chatId);
        if (existingFollowUps?.some(item => item?.status === 'pending')) {
          return {
            success: false,
            message: "Já existe um follow-up agendado para este chat"
          };
        }
      }

      // Importa a função para agendar múltiplos follow-ups
      const { scheduleMultipleFollowUpsWithCustomInterval } = require("../whatsapp/followUpManager");

      // Agenda os follow-ups com o intervalo customizado (SEM emitir eventos)
      scheduleMultipleFollowUpsWithCustomInterval(instanceId, chatId, validMessages, interval, false);

      return {
        success: true,
        message: `Follow-up criado com sucesso - ${validMessages.length} mensagens agendadas`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Erro ao criar follow-up avançado: ${errorMessage}`);
      return { success: false, message: `Erro ao criar follow-up: ${errorMessage}` };
    }
  });

  /**
   * Manipulador para cancelar TODOS os follow-ups de uma instância (quando desativado)
   */
  ipcMain.handle("cancel-all-follow-ups", async (_, { instanceId }) => {
    try {
      const { cancelAllFollowUps } = require("../whatsapp/followUpManager");
      
      const cancelledCount = cancelAllFollowUps(instanceId);
      
      return {
        success: true,
        message: `${cancelledCount} follow-ups cancelados com sucesso`,
        cancelledCount
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Erro ao cancelar todos os follow-ups: ${errorMessage}`);
      return { success: false, message: `Erro ao cancelar follow-ups: ${errorMessage}` };
    }
  });
}

module.exports = { setupFollowUpHandlers };
