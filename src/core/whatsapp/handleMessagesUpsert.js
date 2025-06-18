const {
  hasExcludedNumbersByIntervention,
  hasSentMessagesIds,
  addExcludedNumbersByIntervention,
  processNonTextMessage,
  storeMessageInBuffer,
  processMessageType,
  sendSplitMessages,
  sendMessage,
} = require("./messageProcessor");
const {
  initializeNewAIChatSessionOpenAI,
} = require("./ai/openai");

const {
  initializeNewAIChatSessionGemini,
} = require("./ai/google");
const { processingStates, messageTimeouts, activeChatId, messagesIdsAlreadyAnswered } = require("../config/states");
const { isAllowedToProcess } = require("../util/permissions");
const { shouldReplyToMessage, isValidWhatsAppId } = require("../util/messages");
const { settings } = require("../config/settings");
const { saveMessage } = require("../messageStorage");
const { updateLastMessageTimestamp, cancelFollowUps } = require("./followUpManager");
const { isAIModeActive, clearManualAIMode } = require("./aiModeManager");
const { incrementMetric } = require("../metrics/metricsManager");

/**
 * Manipula eventos de mensagens recebidas do WhatsApp.
 *
 * Lógica do activeChatId e intervenção humana:
 *
 * 1. Quando uma primeira mensagem de um usuário é recebida, o chat ainda não é considerado ativo
 * 2. Quando a IA processa e responde à mensagem, marca o chatId como ativo em activeChatId[instanceId]
 * 3. Se uma mensagem enviada por nós (fromMe = true) for detectada em um chat ativo:
 *    - Se a mensagem não foi enviada pela IA (não está em sentMessageIds)
 *    - Considera-se que houve uma intervenção humana
 *    - O chat é adicionado a excludedNumbersByIntervention
 *    - A IA para de responder neste chat por um período definido em settings[instanceId].HORAS_PARA_REATIVAR_IA
 * 4. Após este período, o chatId é removido de excludedNumbersByIntervention e a IA pode voltar a responder
 *
 * @param {object} param
 * @param {import("@whiskeysockets/baileys").WASocket} param.sock
 * @param {string} param.instanceId
 * @param {{ messages: import("@whiskeysockets/baileys").WAMessage[]; type: import("@whiskeysockets/baileys").MessageUpsertType; requestId?: string; }} param.messagesUpsert
 * @returns
 */
async function handleMessagesUpsert({ sock, messagesUpsert, instanceId }) {
  if (messagesUpsert.type === "notify") {
    for (const msg of messagesUpsert.messages) {
      const messageType = Object.keys(msg.message ?? {})[0];

      /**
       * @type {string}
       */
      // @ts-ignore
      const chatId = msg.key.remoteJid;

      // Verifica se o chatId é válido
      if (!chatId) {
        console.log("Mensagem sem chatId, ignorando");
        return;
      }

      // Validação do formato do chatId para garantir que é um número de WhatsApp legítimo
      if (!isValidWhatsAppId(chatId)) {
        console.log(`⚠️ ID de chat com formato suspeito detectado: ${chatId}. Ignorando mensagem.`);
        return;
      }

      if (chatId && chatId !== "status@broadcast") {
        updateLastMessageTimestamp(instanceId, chatId, msg);
      }

      // Salva a mensagem no armazenamento
      if (chatId && chatId !== "status@broadcast") {
        // Salva a mensagem no armazenamento
        saveMessage(instanceId, chatId, msg);
      }

      const AI_SELECTED = settings[instanceId].AI_SELECTED;
      const { fromMe, id: messageId } = msg.key;

      // Obter o conjunto de chats ativos para esta instância
      const activeChatIdSet = activeChatId[instanceId];

      // Debug completo da mensagem recebida
      const shortMsgJson = JSON.stringify(msg, (_key, value) => {
        // Omite conteúdos longos para o log ficar mais limpo
        if (typeof value === 'string' && value.length > 100) {
          return `${value.substring(0, 100)}...`;
        }
        return value;
      });
      console.log("------------- NOVA MENSAGEM -------------");
      console.log(`Chat: ${chatId} | Tipo: ${messageType} | De mim: ${fromMe}`);
      console.log(`Chat está ativo: ${activeChatIdSet.has(chatId)}`);
      console.log(`ID da mensagem: ${messageId}`);
      console.log(`Detalhes: ${shortMsgJson}`);
      console.log("-----------------------------------------");

      const chatName = msg.pushName;

      // Verifica se o chat deve ser ignorado devido a intervenção humana anterior
      const isIgnoredDueToIntervention =
        hasExcludedNumbersByIntervention(chatId) && activeChatIdSet.has(chatId);

      // Detecta intervenção humana:
      // 1. A mensagem é enviada pelo próprio usuário (fromMe = true)
      // 2. Não foi enviada pelo próprio bot (não está nos sentMessageIds)
      // 3. Não é uma mensagem de status
      // 4. O chat já está ativo (a IA já respondeu anteriormente) OU a configuração de intervenção imediata está ativada
      const isHumanInterventionDetected =
        fromMe &&
        messageId &&
        !hasSentMessagesIds(messageId, instanceId) &&
        chatId !== "status@broadcast" &&
        (activeChatIdSet.has(chatId) || settings[instanceId].INTERVENCAO_HUMANA_IMEDIATA);

      // Log detalhado para todas as mensagens que são enviadas por nós (fromMe=true)
      if (fromMe && messageId && chatId !== "status@broadcast") {
        console.log(`📊 ANÁLISE DE INTERVENÇÃO: Chat=${chatId}, messageId=${messageId}`);
        console.log(`   - É mensagem nossa (fromMe): ${fromMe}`);
        console.log(`   - Foi enviada pelo bot: ${hasSentMessagesIds(messageId, instanceId)}`);
        console.log(`   - Chat está ativo: ${activeChatIdSet.has(chatId)}`);
        console.log(`   - Intervenção imediata configurada: ${settings[instanceId].INTERVENCAO_HUMANA_IMEDIATA}`);
        console.log(`   - Resultado final: ${isHumanInterventionDetected ? 'INTERVENÇÃO DETECTADA ✅' : 'NÃO É INTERVENÇÃO ❌'}`);
      }

      const shouldSendErrorMessage =
        !messageType &&
        msg?.messageStubType === 2 &&
        msg.key.remoteJid &&
        !msg.key.participant &&
        msg.key.id;

      // Se o chat está na lista de ignorados por intervenção humana, não processa
      if (isIgnoredDueToIntervention) {
        console.log(`⚠️ Chat ${chatId} está sendo ignorado por intervenção humana anterior`);
        return;
      }

      // Se uma intervenção humana foi detectada
      if (isHumanInterventionDetected) {
        console.log(`🚫 INTERVENÇÃO HUMANA DETECTADA no chat ${chatId}`);
        console.log(`   - ID da mensagem: ${messageId}`);
        console.log(`   - Mensagem enviada por nós: ${fromMe}`);
        console.log(`   - Chat ativo: ${activeChatIdSet.has(chatId)}`);
        console.log(`   - Intervenção imediata: ${settings[instanceId].INTERVENCAO_HUMANA_IMEDIATA}`);
        console.log("   - Não está na lista de mensagens enviadas pelo bot");

        // Obtém o tempo de reativação configurado
        const horasParaReativar = Number(settings[instanceId].HORAS_PARA_REATIVAR_IA);
        console.log(`ℹ️ Chat ${chatId} será reativado após ${horasParaReativar} horas`);

        // Adiciona o chat à lista de excluídos (intervenção automática temporária)
        addExcludedNumbersByIntervention(chatId, false, horasParaReativar);

        return;
      }

      // Verifica se a IA está ativa para este chat usando o novo sistema
      if (!isAIModeActive(instanceId, chatId)) {
        console.log(`🤖 Modo IA desativado para o chat ${chatId}`);
        return;
      }

      if (shouldSendErrorMessage) {
        setTimeout(() => {
          if (
            messagesIdsAlreadyAnswered.has(chatId) &&
            !messagesIdsAlreadyAnswered
              .get(chatId)
              // @ts-ignore
              ?.includes(msg.key.id)
          ) {
            sendMessage({
              // @ts-ignore
              chatId: msg.key.remoteJid,
              messageToSend:
                "Oi, tive um problema para processar sua mensagem, pode enviar novamente?",
              sock,
            });
          }
        }, 30000);
      }

      // Verifica se deve responder à mensagem
      if (
        shouldReplyToMessage(
          msg,
          messageType,
          // @ts-ignore
          messagesIdsAlreadyAnswered,
          chatId,
          settings[instanceId]
        )
      ) {
        // Quando a mensagem deve ser respondida, marca o chat como ativo
        // Isso indica que a IA está processando/respondendo este chat
        // e futuras mensagens fromMe (do usuário) serão consideradas intervenção humana
        activeChatIdSet.add(chatId);
        console.log(`✅ Chat ${chatId} marcado como ativo - IA irá responder`);

        // Coleta métrica de mensagem recebida
        // Só conta mensagens de entrada (fromMe = false) que serão processadas pela IA
        if (!fromMe) {
          incrementMetric(instanceId, 'messagesReceived');
          console.log(`📊 Métrica: Mensagem recebida incrementada para ${instanceId}`);
        }

        const isNonTextMessage = await processNonTextMessage({
          chatId,
          msg,
          sock,
          instanceId,
        });

        if (isNonTextMessage) {
          console.log(`ℹ️ Mensagem não-texto processada para ${chatId}`);
          return;
        }

        if (AI_SELECTED === "GPT" || AI_SELECTED === "DEEPSEEK") {
          await initializeNewAIChatSessionOpenAI(instanceId, chatId);
        }

        if (AI_SELECTED === "GEMINI") {
          await initializeNewAIChatSessionGemini(instanceId, chatId);
        }

        const { category, textContent, responseAI } = await processMessageType({
          msg,
          instanceId,
          // @ts-ignore
          aiSelected: AI_SELECTED,
          chatId,
        });

        if (!textContent) {
          console.log("❌ Nenhum conteúdo de texto extraído da mensagem");
          return;
        }

        if (category === "image" && AI_SELECTED === "GEMINI") {
          if (!responseAI) {
            console.log("❌ Nenhuma resposta de IA para a imagem");
            return;
          }
          await sendSplitMessages({
            chatId,
            answer: responseAI,
            sock,
            activeChatId: activeChatIdSet,
            instanceId,
          });

          return;
        }

        if (category === "audio" && AI_SELECTED === "GEMINI") {
          if (!responseAI) {
            console.log("❌ Nenhuma resposta de IA para o áudio");
            return;
          }
          await sendSplitMessages({
            chatId,
            answer: responseAI,
            sock,
            activeChatId: activeChatIdSet,
            instanceId,
          });
          return;
        }

        if (!textContent) {
          console.log("❌ Mensagem recebida não encontrada ou processamento falhou.");
          return;
        }

        setTimeout(async () => {
          if (settings[instanceId]?.VISUALIZAR_MENSAGENS ?? true) {
            await sock.readMessages([msg.key]);
          }
        }, 1000);

        console.log(`📝 Armazenando mensagem para processamento: "${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}"`);
        storeMessageInBuffer({
          chatId,
          messageReceived: textContent,
          sock,
          instanceId,
          processingStates: processingStates[instanceId],
          messageTimeouts: messageTimeouts[instanceId],
          activeChatId: activeChatId[instanceId],
          AI_SELECTED,
          chatName: chatName || "",
          messagesIdsAlreadyAnswered,
          msgId: msg.key.id || "",
        });
      } else {
        console.log(`ℹ️ Mensagem não atende critérios para resposta no chat ${chatId}`);
      }
    }
  }
}


module.exports = { handleMessagesUpsert };
