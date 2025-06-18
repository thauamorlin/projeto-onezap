const { activeFollowUps, followUpTimeouts, lastMessageTimestamp, socketClients } = require("../config/states");
const { settings } = require("../config/settings");
const { getMessages } = require("../messageStorage");
const { OpenAI } = require("openai");
const { BrowserWindow } = require('electron');
const { saveFollowUpsToFile } = require('./followUpPersistence');
const { incrementMetric } = require("../metrics/metricsManager");

require('./followUpTypes');

/**
 * @type {number}
 */
const NUM_MESSAGES_FOR_ANALYSIS = 20;

/**
 * Armazena os follow-ups já enviados para evitar duplicações
 * @type {Record<string, Record<string, {lastFollowUpTime: number, followUpCount: number}>>}
 */
const sentFollowUps = {};

/**
 * Adicionar um debounce para evitar múltiplas execuções
 * @type {Map<string, number>}
 */
const updateDebounce = new Map();

/**
 * Armazena os IDs dos timeouts para cancelamento
 * @type {Map<string, Set<number>>}
 */
const followUpTimeoutIds = new Map();

/**
 * Mutex para sincronização de operações críticas
 * @type {Map<string, boolean>}
 */
const followUpMutex = new Map();

/**
 * Executa uma operação com mutex para evitar race conditions
 * @param {string} key - Chave única para o mutex
 * @param {Function} operation - Operação a ser executada
 * @returns {Promise<any>} Resultado da operação
 */
async function withMutex(key, operation) {
  // Aguarda até que o mutex esteja livre
  while (followUpMutex.get(key)) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  followUpMutex.set(key, true);
  try {
    return await operation();
  } finally {
    followUpMutex.delete(key);
  }
}

/**
 * Gera um ID único para follow-up
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 * @returns {string} ID único
 */
function generateFollowUpId(instanceId, chatId) {
  return `${instanceId}-${chatId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Cancela todos os timeouts de um chat
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 */
function cancelChatTimeouts(instanceId, chatId) {
  const key = `${instanceId}-${chatId}`;
  const timeoutIds = followUpTimeoutIds.get(key);
  
  if (timeoutIds) {
    timeoutIds.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    followUpTimeoutIds.delete(key);
    console.log(`⏰ ${timeoutIds.size} timeouts cancelados para ${chatId}`);
  }
}

/**
 * Adiciona um timeout ID para rastreamento
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 * @param {number} timeoutId - ID do timeout
 */
function addTimeoutId(instanceId, chatId, timeoutId) {
  const key = `${instanceId}-${chatId}`;
  
  if (!followUpTimeoutIds.has(key)) {
    followUpTimeoutIds.set(key, new Set());
  }
  
  // @ts-ignore - Sabemos que o Set existe pois acabamos de criar
  followUpTimeoutIds.get(key).add(timeoutId);
}

/**
 * Remove um timeout ID do rastreamento
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 * @param {number} timeoutId - ID do timeout
 */
function removeTimeoutId(instanceId, chatId, timeoutId) {
  const key = `${instanceId}-${chatId}`;
  const timeoutIds = followUpTimeoutIds.get(key);
  
  if (timeoutIds) {
    timeoutIds.delete(timeoutId);
    
    if (timeoutIds.size === 0) {
      followUpTimeoutIds.delete(key);
    }
  }
}

/**
 * Inicializa as estruturas de dados necessárias para o follow up para uma instância
 * @param {string} instanceId - ID da instância
 */
function initFollowUpStructures(instanceId) {
  if (!activeFollowUps[instanceId]) {
    activeFollowUps[instanceId] = new Map();
  }

  if (!followUpTimeouts[instanceId]) {
    followUpTimeouts[instanceId] = new Map();
  }

  if (!lastMessageTimestamp[instanceId]) {
    lastMessageTimestamp[instanceId] = new Map();
  }

  if (!sentFollowUps[instanceId]) {
    sentFollowUps[instanceId] = {};
  }

  console.log(`✅ Estruturas de follow up inicializadas para instância ${instanceId}`);
}

/**
 * Registra o timestamp da última mensagem recebida de um chat
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 * @param {import("@whiskeysockets/baileys").proto.IWebMessageInfo|null} message - Objeto da mensagem recebida (opcional)
 */
function updateLastMessageTimestamp(instanceId, chatId, message = null) {
  const key = `${instanceId}-${chatId}`;
  
  // Cancela execução anterior se existir
  if (updateDebounce.has(key)) {
    clearTimeout(updateDebounce.get(key));
  }
  
  // Agenda nova execução com delay
  const timeoutId = setTimeout(() => {
  // Verifica se é um grupo (grupos contêm @g.us no ID)
  if (chatId.includes('@g.us')) {
    console.log(`ℹ️ Follow-up não funciona em grupos. Ignorando: ${chatId}`);
    return;
  }

  // Se uma mensagem foi fornecida, verifica se é uma mensagem válida
  if (message) {
    // Verifica se é uma mensagem do sistema ou evento que não deve ser considerado
    const isSystemMessage =
      message.messageStubType ||
      (message.message &&
        (message.message.protocolMessage ||
          message.message.senderKeyDistributionMessage ||
          message.message.deviceSentMessage));

    // Se for mensagem do sistema ou evento, ignora
    if (isSystemMessage) {
      console.log(`ℹ️ Evento de sistema ou não-mensagem recebido. Ignorando follow-up para: ${chatId}`);
      return;
    }

    // Verifica se a mensagem tem conteúdo
    const hasContent = message.message && (
      message.message.conversation ||
      message.message.extendedTextMessage ||
      message.message.imageMessage ||
      message.message.videoMessage ||
      message.message.audioMessage ||
      message.message.documentMessage ||
      message.message.stickerMessage ||
      message.message.contactMessage ||
      message.message.locationMessage
    );

    // Se não tiver conteúdo, ignora
    if (!hasContent) {
      console.log(`ℹ️ Mensagem sem conteúdo válido. Ignorando follow-up para: ${chatId}`);
      return;
    }
  }

  if (!lastMessageTimestamp[instanceId]) {
    lastMessageTimestamp[instanceId] = new Map();
  }

  lastMessageTimestamp[instanceId].set(chatId, Date.now());

  // Cancela follow-ups pendentes quando há nova atividade do cliente
  cancelFollowUps(instanceId, chatId);

  // Limpa registros de follow-ups já enviados quando há nova atividade do cliente
  if (sentFollowUps[instanceId]?.[chatId]) {
    delete sentFollowUps[instanceId][chatId];
    console.log(`🔄 Limpando histórico de follow-ups para ${chatId} devido a nova atividade`);
  }

  // Só agenda verificação de follow-up se a IA já interagiu com este chat
  scheduleFollowUpCheckWithAIValidation(instanceId, chatId);

    updateDebounce.delete(key);
  }, 1000); // 1 segundo de debounce
  
  updateDebounce.set(key, Number(timeoutId));
}

/**
 * Agenda uma verificação de follow up com validação prévia de interação da IA
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 */
async function scheduleFollowUpCheckWithAIValidation(instanceId, chatId) {
  try {
    // Verifica primeiro se o chat está permitido para receber follow-up
    if (!isAllowedForFollowUp(instanceId, chatId)) {
      console.log(`ℹ️ Chat ${chatId} não está permitido para follow-up (modo IA desativado ou filtros). Não agendando verificação.`);
      return;
    }

    // Obtém o histórico de mensagens do chat
    const allMessages = await getMessages(instanceId, chatId, {
      filterEmpty: true
    });

    if (!allMessages || allMessages.length === 0) {
      console.log(`ℹ️ Nenhuma mensagem encontrada para ${chatId}. Não agendando follow-up.`);
      return;
    }

    // Verifica se existe pelo menos uma mensagem da IA no histórico
    const hasAIInteraction = allMessages.some(msg => {
      // Verifica se é uma mensagem nossa (fromMe = true) e é marcada como mensagem da IA
      // @ts-ignore
      return msg.key?.fromMe && (msg.isAIMessage || msg.isFollowUp);
    });

    if (!hasAIInteraction) {
      console.log(`ℹ️ Nenhuma interação da IA encontrada para ${chatId}. Não agendando verificação de follow-up.`);
      return;
    }

    console.log(`✅ Interação da IA confirmada para ${chatId}. Agendando verificação de follow-up.`);
    scheduleFollowUpCheck(instanceId, chatId);

  } catch (error) {
    console.error(`❌ Erro ao verificar interação da IA para ${chatId}:`, error);
    // Em caso de erro, não agenda para evitar follow-ups incorretos
  }
}

/**
 * Agenda uma verificação de follow up para um chat após o período de inatividade
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 * @param {number|null} delay - Tempo em ms para aguardar antes de verificar (opcional)
 */
function scheduleFollowUpCheck(instanceId, chatId, delay = null) {
  if (followUpTimeouts[instanceId]?.has(chatId)) {
    clearTimeout(followUpTimeouts[instanceId].get(chatId));
  }

  // Verifica se o follow up está ativo nas configurações
  if (!settings[instanceId]?.FOLLOW_UP_ATIVO) {
    console.log(`ℹ️ Follow-up desativado para a instância ${instanceId}`);
    return;
  }

  // Usa o tempo configurado no dashboard (padrão: 10 minutos)
  const tempoVerificacaoMinutos = Number.parseInt(settings[instanceId]?.FOLLOW_UP_TEMPO_VERIFICACAO || "10", 10);
  const tempoVerificacaoMs = tempoVerificacaoMinutos * 60 * 1000; // Converte minutos para milissegundos

  console.log(`🕒 Tempo de verificação configurado para ${instanceId}: ${tempoVerificacaoMinutos} minutos (${tempoVerificacaoMs}ms)`);

  const timeoutId = setTimeout(() => {
    checkAndScheduleFollowUp(instanceId, chatId);

    // Limpa o timeout após a execução
    if (followUpTimeouts[instanceId]?.has(chatId)) {
      followUpTimeouts[instanceId].delete(chatId);
    }
  }, delay || tempoVerificacaoMs);

  if (!followUpTimeouts[instanceId]) {
    followUpTimeouts[instanceId] = new Map();
  }
  followUpTimeouts[instanceId].set(chatId, timeoutId);

  console.log(`✅ Verificação de follow-up agendada para ${chatId} em ${delay ? `${Math.floor(delay / 1000 / 60)} minutos` : `${tempoVerificacaoMinutos} minutos`}`);
}

/**
 * Verifica se um chat pode receber follow-up baseado no histórico de follow-ups já enviados
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 * @returns {boolean} - True se pode enviar follow-up, false caso contrário
 */
function canSendFollowUp(instanceId, chatId) {
  // Inicializa estruturas se necessário
  if (!sentFollowUps[instanceId]) {
    sentFollowUps[instanceId] = {};
  }

  const chatFollowUpHistory = sentFollowUps[instanceId][chatId];

  if (!chatFollowUpHistory) {
    // Primeiro follow-up para este chat
    return true;
  }

  // Limita a 3 follow-ups por chat para evitar spam
  // Se já atingiu o limite, não pode enviar mais follow-ups
  if (chatFollowUpHistory.followUpCount >= 3) {
    console.log(`🚫 Limite de follow-ups atingido para ${chatId} (${chatFollowUpHistory.followUpCount}/3)`);
    return false;
  }

  return true;
}

/**
 * Registra que um follow-up foi enviado para um chat
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 */
function registerFollowUpSent(instanceId, chatId) {
  if (!sentFollowUps[instanceId]) {
    sentFollowUps[instanceId] = {};
  }

  if (!sentFollowUps[instanceId][chatId]) {
    sentFollowUps[instanceId][chatId] = {
      lastFollowUpTime: 0,
      followUpCount: 0
    };
  }

  sentFollowUps[instanceId][chatId].lastFollowUpTime = Date.now();
  sentFollowUps[instanceId][chatId].followUpCount += 1;

  console.log(`📝 Follow-up registrado para ${chatId}. Total: ${sentFollowUps[instanceId][chatId].followUpCount}`);
}

/**
 * Verifica se um chat pode receber follow-up baseado no modo IA
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 * @returns {boolean} - True se pode receber follow-up, false caso contrário
 */
function isAllowedForFollowUp(instanceId, chatId) {
  // Verifica se as configurações existem
  if (!settings[instanceId]) {
    console.log(`ℹ️ Configurações não encontradas para instância ${instanceId}`);
    return false;
  }

  // Usa o sistema centralizado de modo IA que já verifica:
  // - Filtros (SOMENTE_RESPONDER, NAO_RESPONDER)
  // - Intervenção humana
  // - Grupos (sempre desativados)
  // - Configurações manuais
  const { isAIModeActive } = require("./aiModeManager");
  const aiActive = isAIModeActive(instanceId, chatId);

  if (!aiActive) {
    console.log(`🚫 Chat ${chatId} com modo IA desativado. Follow-up bloqueado.`);
    return false;
  }

  // Follow-up só funciona em chats individuais (grupos já são bloqueados pelo aiModeManager)
  if (chatId.includes('@g.us')) {
    console.log(`🚫 Chat ${chatId} é um grupo. Follow-up não disponível para grupos.`);
    return false;
  }

  return true;
}

/**
 * Verifica se um chat está elegível para follow up e agenda se necessário
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 */
async function checkAndScheduleFollowUp(instanceId, chatId) {
  try {
    // Verifica se o follow up está ativo nas configurações
    if (!settings[instanceId]?.FOLLOW_UP_ATIVO) {
      console.log(`ℹ️ Follow-up desativado para a instância ${instanceId}`);
      return;
    }

    // Verifica PRIMEIRO se o chat está permitido para receber follow-up (sem fazer análise custosa)
    if (!isAllowedForFollowUp(instanceId, chatId)) {
      console.log(`ℹ️ Chat ${chatId} não permitido para follow-up (modo IA desativado ou filtros). Evitando análise.`);
      BrowserWindow.getAllWindows().forEach(window => {
        if (!window.isDestroyed()) {
          window.webContents.send('follow-up-check-result', {
            instanceId,
            chatId,
            success: true,
            hasFollowUp: false,
            message: "Follow-up não enviado - chat bloqueado por filtros ou modo IA desativado",
            reason: "Este chat está com modo IA desativado ou nas configurações de filtros que impedem o envio de follow-up",
            isAutomaticCheck: true
          });
        }
      });
      return;
    }

    // Verifica se pode enviar follow-up (não enviou recentemente)
    if (!canSendFollowUp(instanceId, chatId)) {
      BrowserWindow.getAllWindows().forEach(window => {
        if (!window.isDestroyed()) {
          window.webContents.send('follow-up-check-result', {
            instanceId,
            chatId,
            success: true,
            hasFollowUp: false,
            message: "Follow-up não enviado - limite de frequência atingido",
            reason: "Este cliente já recebeu follow-up recentemente ou atingiu o limite máximo",
            isAutomaticCheck: true
          });
        }
      });
      return;
    }

    // Só faz a análise custosa com IA se passou por todas as verificações básicas
    const isEligible = await isEligibleForFollowUp(instanceId, chatId);
    let hasFollowUp = false;
    let reason = "";

    if (isEligible) {
      // Obtém todas as mensagens do chat para contexto da IA
      const allMessages = await getMessages(instanceId, chatId, {
        filterEmpty: true
      });

      const messages = allMessages ? allMessages.slice(-NUM_MESSAGES_FOR_ANALYSIS) : [];
      let followUpMessages = [];

      // Verifica se deve gerar mensagens por IA
      if (settings[instanceId]?.FOLLOW_UP_GERAR_IA && messages.length > 0) {
        followUpMessages = await generateFollowUpMessages(instanceId, chatId, messages);
      } else {
        // Usa mensagens pré-definidas
        followUpMessages = getFallbackMessages(instanceId);
      }

      // Agenda múltiplas mensagens de follow-up com intervalos
      scheduleMultipleFollowUps(instanceId, chatId, followUpMessages);
      console.log(`✅ Chat ${chatId} elegível para follow up. Agendando ${followUpMessages.length} mensagens...`);

      hasFollowUp = true;
      reason = `A IA determinou que este chat precisa de follow-up. ${followUpMessages.length} mensagens foram agendadas.`;
    } else {
      console.log(`ℹ️ Chat ${chatId} não elegível para follow up.`);
      reason = "A IA determinou que este cliente não precisa de follow-up, pois já finalizou a compra ou manifestou desinteresse.";
    }

    // Emite evento para atualizar a interface
    BrowserWindow.getAllWindows().forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send('follow-up-check-result', {
          instanceId,
          chatId,
          success: true,
          hasFollowUp,
          message: hasFollowUp ? "Follow-up agendado com sucesso" : "Cliente não precisa de follow-up",
          reason,
          isAutomaticCheck: true
        });
      }
    });

  } catch (error) {
    console.error(`❌ Erro ao verificar elegibilidade para follow up: ${error}`);

    // Emite evento de erro para atualizar a interface
    BrowserWindow.getAllWindows().forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send('follow-up-check-result', {
          instanceId,
          chatId,
          success: false,
          message: `Erro ao verificar follow-up: ${error}`,
          reason: "Ocorreu um erro durante a verificação",
          isAutomaticCheck: true
        });
      }
    });
  }
}

/**
 * Extrai texto do conteúdo da mensagem
 * @param {any} message - Objeto de mensagem
 * @returns {string} - Texto extraído da mensagem
 */
function extractTextFromMessage(message) {
  if (!message || !message.message) return '';

  const msgContent = message.message;

  return (
    msgContent.conversation ||
    msgContent.extendedTextMessage?.text ||
    msgContent.ephemeralMessage?.message?.conversation ||
    msgContent.ephemeralMessage?.message?.extendedTextMessage?.text ||
    (msgContent.imageMessage ? '🖼️ [Imagem]' : '') ||
    (msgContent.videoMessage ? '🎥 [Vídeo]' : '') ||
    (msgContent.audioMessage ? '🎵 [Áudio]' : '') ||
    (msgContent.documentMessage ? '📄 [Documento]' : '') ||
    (msgContent.stickerMessage ? '🏷️ [Sticker]' : '') ||
    '[Mensagem não suportada]'
  );
}

/**
 * Prepara as mensagens para serem enviadas à API
 * @param {any[]} messages - Array de mensagens para processar
 * @returns {any[]} - Array de mensagens formatado para a API
 */
function prepareMessagesForAPI(messages) {
  return messages.map(msg => {
    const text = extractTextFromMessage(msg);
    const isFromMe = Boolean(msg.key?.fromMe);

    return {
      role: isFromMe ? "assistant" : "user",
      content: text
    };
  });
}

/**
 * Analisa a elegibilidade para follow up usando OpenAI
 * @param {string} apiKey - Chave da API OpenAI
 * @param {any[]} formattedMessages - Mensagens formatadas para a API
 * @returns {Promise<boolean>} - Promessa que resolve com a elegibilidade
 */
async function analyzeWithOpenAI(apiKey, formattedMessages) {
  try {
    const openai = new OpenAI({
      apiKey: apiKey
    });

    const systemPrompt = {
      role: "system",
      content: `Você é um assistente especializado em analisar conversas de WhatsApp e determinar se um cliente precisa de follow-up.

Analise cuidadosamente a conversa e SEMPRE recomende follow-up, EXCETO nos seguintes casos:
1. Se o cliente claramente EFETUOU a compra ou contratou o serviço
2. Se o cliente explicitamente declarou que NÃO TEM MAIS INTERESSE no produto/serviço

Mesmo em conversas curtas ou com apenas saudações, o follow-up deve ser recomendado, pois não há confirmação explícita de desinteresse ou compra concluída.`
    };

    // Definição da função que a IA deve chamar
    const functions = [
      {
        name: "determineFollowUpEligibility",
        description: "Determina se o cliente deve receber follow-up com base na conversa analisada",
        parameters: {
          type: "object",
          properties: {
            isEligible: {
              type: "boolean",
              description: "Se o cliente deve receber follow-up (true) ou não (false)"
            },
            reason: {
              type: "string",
              description: "Razão pela qual o cliente deve ou não receber follow-up"
            }
          },
          required: ["isEligible"]
        }
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [systemPrompt, ...formattedMessages],
      functions: functions,
      function_call: { name: "determineFollowUpEligibility" },
      temperature: 0.1
    });

    // Extrai a resposta estruturada do function calling
    const functionCall = response.choices[0]?.message?.function_call;

    if (functionCall && functionCall.name === "determineFollowUpEligibility") {
      try {
        const args = JSON.parse(functionCall.arguments);
        console.log(`📊 Análise OpenAI: ${args.isEligible ? 'Elegível' : 'Não elegível'} - ${args.reason || 'Sem razão fornecida'}`);
        return args.isEligible;
      } catch (parseError) {
        console.error(`❌ Erro ao analisar resposta da função: ${parseError}`);
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error(`Erro ao analisar com OpenAI: ${error}`);
    return false;
  }
}

/**
 * Analisa a elegibilidade para follow up usando Gemini
 * @param {string} apiKey - Chave da API Gemini
 * @param {any[]} formattedMessages - Mensagens formatadas para a API
 * @returns {Promise<boolean>} - Promessa que resolve com a elegibilidade
 */
async function analyzeWithGemini(apiKey, formattedMessages) {
  try {
    // Usando a compatibilidade com OpenAI conforme a documentação mais recente
    const gemini = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
    });

    const systemPrompt = {
      role: "system",
      content: `Você é um assistente especializado em analisar conversas de WhatsApp e determinar se um cliente precisa de follow-up.

Analise cuidadosamente a conversa e SEMPRE recomende follow-up, EXCETO nos seguintes casos:
1. Se o cliente claramente EFETUOU a compra ou contratou o serviço
2. Se o cliente explicitamente declarou que NÃO TEM MAIS INTERESSE no produto/serviço

Mesmo em conversas curtas ou com apenas saudações, o follow-up deve ser recomendado, pois não há confirmação explícita de desinteresse ou compra concluída.`
    };

    const response = await gemini.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        systemPrompt,
        ...formattedMessages,
        {
          role: "user",
          content: "Responda em um formato JSON estruturado com o seguinte formato: {\"isEligible\": boolean, \"reason\": string}. Onde isEligible indica se o cliente deve receber follow-up (true) ou não (false), e reason explica sua decisão."
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;

    if (content) {
      try {
        let result = JSON.parse(content);
        console.log("Resposta bruta da IA:", result);

        // Se a IA retornou um array, pega o primeiro item
        if (Array.isArray(result)) {
          console.log("⚠️ IA retornou array em vez de objeto único. Usando primeiro item.");
          result = result[0];
        }

        // Verifica se o resultado tem as propriedades esperadas
        if (result && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'isEligible')) {
          console.log(`📊 Análise Gemini: ${result.isEligible ? 'Elegível' : 'Não elegível'} - ${result.reason || 'Sem razão fornecida'}`);
          return result.isEligible;
        }

        console.error("❌ Resultado da IA não tem formato esperado:", result);
        return false;
      } catch (parseError) {
        console.error(`❌ Erro ao analisar JSON da resposta: ${parseError}`);
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error(`Erro ao analisar com Gemini: ${error}`);
    return false;
  }
}

/**
 * Verifica se um chat é elegível para receber follow up
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 * @returns {Promise<boolean>} - Promessa que resolve com true se o chat estiver elegível para follow up
 */
async function isEligibleForFollowUp(instanceId, chatId) {
  try {
    console.log(`🔍 Verificando elegibilidade para follow up: ${chatId}`);

    // Verifica se as configurações existem
    if (!settings[instanceId]) {
      console.error(`❌ Configurações não encontradas para instância ${instanceId}`);
      return false;
    }

    // Obtém o modelo de IA selecionado
    const aiSelected = settings[instanceId].AI_SELECTED;
    console.log(`ℹ️ IA selecionada: ${aiSelected}`);

    if (!aiSelected) {
      console.error(`❌ Nenhuma IA selecionada para instância ${instanceId}`);
      return false;
    }

    // Obtém todas as mensagens do chat primeiro
    const allMessages = await getMessages(instanceId, chatId, {
      filterEmpty: true
    });

    if (!allMessages || allMessages.length === 0) {
      console.log(`ℹ️ Nenhuma mensagem encontrada para o chat ${chatId}`);
      return false;
    }

    // Seleciona apenas as últimas NUM_MESSAGES_FOR_ANALYSIS mensagens
    const messages = allMessages.slice(-NUM_MESSAGES_FOR_ANALYSIS);

    console.log(`ℹ️ Analisando ${messages.length} mensagens recentes de um total de ${allMessages.length} mensagens no chat ${chatId}`);

    // Prepara as mensagens para envio à API
    const formattedMessages = prepareMessagesForAPI(messages);

    // Analisa com a IA apropriada
    let isEligible = false;

    if (aiSelected === "GPT") {
      const apiKey = settings[instanceId].OPENAI_KEY;

      if (!apiKey) {
        console.error(`❌ Chave de API não encontrada para ${aiSelected}`);
        return false;
      }

      isEligible = await analyzeWithOpenAI(apiKey, formattedMessages);
    } else if (aiSelected === "DEEPSEEK") {
      const apiKey = settings[instanceId].DEEPSEEK_KEY;

      if (!apiKey) {
        console.error(`❌ Chave de API não encontrada para ${aiSelected}`);
        return false;
      }

      isEligible = await analyzeWithOpenAI(apiKey, formattedMessages);
    } else if (aiSelected === "GEMINI") {
      const apiKey = settings[instanceId].GEMINI_KEY;

      if (!apiKey) {
        console.error("❌ Chave de API não encontrada para Gemini");
        return false;
      }

      isEligible = await analyzeWithGemini(apiKey, formattedMessages);
    } else {
      console.error(`❌ IA não suportada: ${aiSelected}`);
      return false;
    }

    return isEligible;
  } catch (error) {
    console.error(`❌ Erro ao verificar elegibilidade para follow up: ${error}`);
    return false;
  }
}

/**
 * @typedef {'pending' | 'sent' | 'failed'} FollowUpStatus
 */

/**
 * @typedef {Object} FollowUpItem
 * @property {string} message - Mensagem a ser enviada
 * @property {string} chatId - ID do chat para enviar a mensagem
 * @property {number} scheduledTime - Timestamp em ms para quando enviar o follow up
 * @property {string} instanceId - ID da instância
 * @property {FollowUpStatus} status - Status do follow up
 */

/**
 * Atualiza o status de um item de follow up de forma imutável
 * @param {FollowUpItem} item - Item de follow up a ser atualizado
 * @param {FollowUpStatus} status - Novo status
 * @returns {FollowUpItem} - Novo item de follow up com status atualizado
 */
const updateStatus = (item, status) => ({
  ...item,
  status
});

/**
 * Agenda um follow up para ser enviado para um chat
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 * @param {string} message - Mensagem a ser enviada
 * @param {number} delay - Tempo em ms para aguardar antes de enviar (padrão: 10 minutos)
 * @param {boolean} shouldEmitEvents - Se deve emitir eventos para a interface (padrão: true)
 */
function scheduleFollowUp(instanceId, chatId, message, delay = 600000, shouldEmitEvents = true) {
  // Inicializa estruturas se necessário
  if (!activeFollowUps[instanceId]) {
    activeFollowUps[instanceId] = new Map();
  }

  // Verifica se já existe um follow-up pendente para este chat
  if (activeFollowUps[instanceId].has(chatId)) {
    const existingFollowUps = activeFollowUps[instanceId].get(chatId);

    // Se já existem follow-ups pendentes, não agenda outro
    if (existingFollowUps?.some(item => item?.status === 'pending')) {
      console.log(`⚠️ Já existe follow-up agendado para ${chatId}. Ignorando solicitação.`);

      // Só emite eventos se solicitado (verificações automáticas)
      if (shouldEmitEvents) {
        // Notifica a interface sobre a decisão
        BrowserWindow.getAllWindows().forEach(window => {
          if (!window.isDestroyed()) {
            window.webContents.send('follow-up-check-result', {
              instanceId,
              chatId,
              success: true,
              hasFollowUp: true,
              message: "Já existe um follow-up agendado para este chat",
              reason: "Apenas um follow-up pode ser agendado por vez",
              isAutomaticCheck: true
            });
          }
        });
      }

      return;
    }
  } else {
    // Inicializa o array de follow-ups para este chat
    activeFollowUps[instanceId].set(chatId, []);
  }

  const scheduledTime = Date.now() + delay;

  // Cria novo item de follow up
  /** @type {FollowUpItem} */
  const followUpItem = {
    message,
    chatId,
    scheduledTime,
    instanceId,
    status: 'pending'
  };

  // Adiciona à lista de follow ups ativos
  const followUps = activeFollowUps[instanceId].get(chatId);
  if (followUps) {
    followUps.push(followUpItem);
  }

  // Agenda o envio
  setTimeout(async () => {
    const followUpItemIndex = followUps?.findIndex(
      item => item.scheduledTime === followUpItem.scheduledTime
    );

    if (followUpItemIndex !== undefined && followUpItemIndex >= 0 && followUps) {
      const updatedItem = await sendFollowUp(instanceId, chatId, followUpItem);
      followUps[followUpItemIndex] = updatedItem;
    }
  }, delay);

  console.log(`✅ Follow up agendado para ${chatId} às ${new Date(scheduledTime).toLocaleString()}`);
}

/**
 * Envia uma mensagem de follow up agendada
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 * @param {FollowUpItem} followUpItem - Item de follow up a ser enviado
 * @returns {Promise<FollowUpItem>} Item de follow up atualizado
 */
async function sendFollowUp(instanceId, chatId, followUpItem) {
  try {
    // ✅ VERIFICAÇÃO CRÍTICA: Se follow-up foi desativado, não envia
    if (!settings[instanceId]?.FOLLOW_UP_ATIVO) {
      console.log(`🚫 Follow-up desativado para instância ${instanceId}. Cancelando envio para ${chatId}`);
      return updateStatus(followUpItem, 'failed');
    }

    const sock = socketClients[instanceId];

    if (!sock) {
      console.error(`❌ Socket não disponível para instância ${instanceId}`);
      return updateStatus(followUpItem, 'failed');
    }

    // Envia a mensagem pelo WhatsApp
    const sentMsg = await sock.sendMessage(chatId, { text: followUpItem.message });

    // Verifica se a mensagem foi enviada com sucesso
    if (!sentMsg) {
      console.error(`❌ Mensagem não enviada para ${chatId}`);
      return updateStatus(followUpItem, 'failed');
    }

    // Registra que o follow-up foi enviado
    registerFollowUpSent(instanceId, chatId);

    // Após enviar, salva a mensagem com a marcação de follow-up
    const { saveMessage } = require("../messageStorage");

    // Salva a mensagem no armazenamento com a flag isFollowUp
    await saveMessage(instanceId, chatId, {
      key: sentMsg.key,
      message: sentMsg.message,
      messageTimestamp: Math.floor(Date.now() / 1000),
      pushName: "Follow-up",
      // @ts-ignore
      isFollowUp: true, // Marca a mensagem como follow-up
      fromMe: true
    }, false); // Não é uma mensagem de IA

    console.log(`✅ Follow up enviado para ${chatId}`);

    // Salva estado após envio
    saveFollowUpsToFile(instanceId);

    // Incrementa a métrica quando um follow-up é enviado com sucesso
    incrementMetric(instanceId, 'followUpsSent');
    console.log(`📊 Métrica: Follow-up enviado incrementado para ${instanceId}`);

    return updateStatus(followUpItem, 'sent');
  } catch (error) {
    console.error(`❌ Erro ao enviar follow up para ${chatId}:`, error);
    return updateStatus(followUpItem, 'failed');
  }
}

/**
 * Cancela todos os follow ups agendados para um chat
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 */
function cancelFollowUps(instanceId, chatId) {
  return withMutex(`cancel-${instanceId}-${chatId}`, async () => {
    // Cancela timeouts de verificação
  if (followUpTimeouts[instanceId]?.has(chatId)) {
    clearTimeout(followUpTimeouts[instanceId].get(chatId));
    followUpTimeouts[instanceId].delete(chatId);
  }

    // Cancela todos os timeouts de envio de mensagens
    cancelChatTimeouts(instanceId, chatId);

  if (activeFollowUps[instanceId]?.has(chatId)) {
    activeFollowUps[instanceId].delete(chatId);

    // Salva estado após cancelamento
    saveFollowUpsToFile(instanceId);
  }

  console.log(`✅ Follow ups cancelados para ${chatId}`);
  });
}

/**
 * Cancela TODOS os follow-ups ativos de uma instância (usado quando follow-up é desativado)
 * @param {string} instanceId - ID da instância
 */
function cancelAllFollowUps(instanceId) {
  return withMutex(`cancel-all-${instanceId}`, async () => {
    console.log(`🚫 Cancelando todos os follow-ups para instância ${instanceId}...`);
    
    let cancelledCount = 0;
    
    // Cancela todos os timeouts de verificação
    if (followUpTimeouts[instanceId]) {
      followUpTimeouts[instanceId].forEach((timeoutId, chatId) => {
        clearTimeout(timeoutId);
        console.log(`⏰ Timeout de verificação cancelado para ${chatId}`);
      });
      followUpTimeouts[instanceId].clear();
    }

    // Cancela todos os timeouts de envio de mensagens
    if (activeFollowUps[instanceId]) {
      activeFollowUps[instanceId].forEach((followUps, chatId) => {
        if (followUps && followUps.length > 0) {
          const pendingCount = followUps.filter(item => item.status === 'pending').length;
          cancelledCount += pendingCount;
          console.log(`📤 Cancelando ${pendingCount} follow-ups pendentes para ${chatId}`);
          
          // Cancela timeouts específicos deste chat
          cancelChatTimeouts(instanceId, chatId);
        }
      });
      activeFollowUps[instanceId].clear();
    }

    // Salva estado após cancelamento
    saveFollowUpsToFile(instanceId);

    console.log(`✅ Total de ${cancelledCount} follow-ups cancelados para instância ${instanceId}`);
    return cancelledCount;
  });
}

/**
 * Gera mensagens de follow-up personalizadas usando IA baseadas no contexto da conversa
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 * @param {any[]} messages - Mensagens da conversa para contexto
 * @returns {Promise<string[]>} - Array com mensagens personalizadas baseado na configuração
 */
async function generateFollowUpMessages(instanceId, chatId, messages) {
  try {
    console.log(`🤖 Gerando mensagens de follow-up personalizadas para ${chatId}`);

    const aiSelected = settings[instanceId].AI_SELECTED;
    const formattedMessages = prepareMessagesForAPI(messages);

    // Obtém a quantidade de mensagens configurada no dashboard
    const quantidadeMensagens = Number.parseInt(settings[instanceId]?.FOLLOW_UP_QUANTIDADE_MENSAGENS || "1", 10);
    console.log(`📊 Quantidade de mensagens configurada: ${quantidadeMensagens}`);

    // Obtém o prompt customizado ou usa o padrão, mas adapta para a quantidade configurada
    let customPrompt = settings[instanceId].FOLLOW_UP_PROMPT;
    
    if (!customPrompt) {
      // Prompt padrão adaptado para a quantidade de mensagens configurada
      if (quantidadeMensagens === 1) {
        customPrompt = `Você é um assistente especializado em criar mensagens de follow-up personalizadas para conversas de WhatsApp.

Analise a conversa fornecida e gere 1 mensagem de follow-up personalizada:

1. MENSAGEM ÚNICA: Gentil e amigável, referenciando algo específico da conversa e oferecendo ajuda

REGRAS:
- Use o contexto da conversa para personalizar a mensagem
- Seja natural e humano
- Mantenha o tom profissional mas amigável
- A mensagem deve ter entre 10-50 palavras
- Se mencionar produto/serviço, use informações da conversa`;
      } else if (quantidadeMensagens === 2) {
        customPrompt = `Você é um assistente especializado em criar mensagens de follow-up personalizadas para conversas de WhatsApp.

Analise a conversa fornecida e gere 2 mensagens de follow-up sequenciais e personalizadas:

1. PRIMEIRA MENSAGEM: Gentil e amigável, referenciando algo específico da conversa
2. SEGUNDA MENSAGEM: Mais direta, oferecendo ajuda adicional ou esclarecimentos

REGRAS:
- Use o contexto da conversa para personalizar as mensagens
- Seja natural e humano
- Mantenha o tom profissional mas amigável
- Cada mensagem deve ter entre 10-50 palavras
- Se mencionar produto/serviço, use informações da conversa
- Evite ser repetitivo entre as mensagens`;
      } else {
        customPrompt = `Você é um assistente especializado em criar mensagens de follow-up personalizadas para conversas de WhatsApp.

Analise a conversa fornecida e gere 3 mensagens de follow-up sequenciais e personalizadas:

1. PRIMEIRA MENSAGEM: Gentil e amigável, referenciando algo específico da conversa
2. SEGUNDA MENSAGEM: Mais direta, oferecendo ajuda adicional ou esclarecimentos
3. TERCEIRA MENSAGEM: Final, mais urgente mas ainda respeitosa

REGRAS:
- Use o contexto da conversa para personalizar as mensagens
- Seja natural e humano
- Mantenha o tom profissional mas amigável
- Cada mensagem deve ter entre 10-50 palavras
- Se mencionar produto/serviço, use informações da conversa
- Evite ser repetitivo entre as mensagens`;
      }
    }

    // Prompt para gerar mensagens de follow-up personalizadas
    const systemPrompt = {
      role: "system",
      content: customPrompt
    };

    // Adapta o userPrompt baseado na quantidade de mensagens configurada
    let userPromptContent;
    if (quantidadeMensagens === 1) {
      userPromptContent = `Baseado na conversa acima, gere 1 mensagem de follow-up personalizada em formato JSON:

{
  "mensagem1": "mensagem única aqui"
}`;
    } else if (quantidadeMensagens === 2) {
      userPromptContent = `Baseado na conversa acima, gere 2 mensagens de follow-up personalizadas em formato JSON:

{
  "mensagem1": "primeira mensagem aqui",
  "mensagem2": "segunda mensagem aqui"
}`;
    } else {
      userPromptContent = `Baseado na conversa acima, gere 3 mensagens de follow-up personalizadas em formato JSON:

{
  "mensagem1": "primeira mensagem aqui",
  "mensagem2": "segunda mensagem aqui",
  "mensagem3": "terceira mensagem aqui"
}`;
    }

    const userPrompt = {
      role: "user",
      content: userPromptContent
    };

    let generatedMessages = [];

    if (aiSelected === "GPT") {
      const apiKey = settings[instanceId].OPENAI_KEY;

      if (!apiKey) {
        console.error(`❌ Chave de API não encontrada para ${aiSelected}`);
        return getFallbackMessages(instanceId);
      }

      const openai = new OpenAI({
        apiKey: apiKey
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [systemPrompt, ...formattedMessages, userPrompt],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          const result = JSON.parse(content);
          
          // Extrai apenas a quantidade de mensagens configurada
          const mensagensDisponiveis = [];
          if (result.mensagem1 && result.mensagem1.trim() !== "") mensagensDisponiveis.push(result.mensagem1);
          if (quantidadeMensagens >= 2 && result.mensagem2 && result.mensagem2.trim() !== "") mensagensDisponiveis.push(result.mensagem2);
          if (quantidadeMensagens >= 3 && result.mensagem3 && result.mensagem3.trim() !== "") mensagensDisponiveis.push(result.mensagem3);
          
          generatedMessages = mensagensDisponiveis.slice(0, quantidadeMensagens);
        } catch (parseError) {
          console.error(`❌ Erro ao analisar JSON da resposta: ${parseError}`);
        }
      }

    } else if (aiSelected === "DEEPSEEK") {
      const apiKey = settings[instanceId].DEEPSEEK_KEY;

      if (!apiKey) {
        console.error(`❌ Chave de API não encontrada para ${aiSelected}`);
        return getFallbackMessages(instanceId);
      }

      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: "https://api.deepseek.com"
      });

      const response = await openai.chat.completions.create({
        model: settings[instanceId].DEEPSEEK_MODEL || "deepseek-chat",
        messages: [systemPrompt, ...formattedMessages, userPrompt],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          const result = JSON.parse(content);
          
          // Extrai apenas a quantidade de mensagens configurada
          const mensagensDisponiveis = [];
          if (result.mensagem1 && result.mensagem1.trim() !== "") mensagensDisponiveis.push(result.mensagem1);
          if (quantidadeMensagens >= 2 && result.mensagem2 && result.mensagem2.trim() !== "") mensagensDisponiveis.push(result.mensagem2);
          if (quantidadeMensagens >= 3 && result.mensagem3 && result.mensagem3.trim() !== "") mensagensDisponiveis.push(result.mensagem3);
          
          generatedMessages = mensagensDisponiveis.slice(0, quantidadeMensagens);
          console.log(`🤖 DeepSeek gerou ${generatedMessages.length} mensagens (solicitado: ${quantidadeMensagens})`);
        } catch (parseError) {
          console.error(`❌ Erro ao analisar JSON da resposta do DeepSeek: ${parseError}`);
        }
      }

    } else if (aiSelected === "GEMINI") {
      const apiKey = settings[instanceId].GEMINI_KEY;

      if (!apiKey) {
        console.error("❌ Chave de API não encontrada para Gemini");
        return getFallbackMessages(instanceId);
      }

      const gemini = new OpenAI({
        apiKey: apiKey,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
      });

      const response = await gemini.chat.completions.create({
        model: "gemini-2.0-flash",
        messages: [systemPrompt, ...formattedMessages, userPrompt],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          const result = JSON.parse(content);
          
          // Extrai apenas a quantidade de mensagens configurada
          const mensagensDisponiveis = [];
          if (result.mensagem1 && result.mensagem1.trim() !== "") mensagensDisponiveis.push(result.mensagem1);
          if (quantidadeMensagens >= 2 && result.mensagem2 && result.mensagem2.trim() !== "") mensagensDisponiveis.push(result.mensagem2);
          if (quantidadeMensagens >= 3 && result.mensagem3 && result.mensagem3.trim() !== "") mensagensDisponiveis.push(result.mensagem3);
          
          generatedMessages = mensagensDisponiveis.slice(0, quantidadeMensagens);
        } catch (parseError) {
          console.error(`❌ Erro ao analisar JSON da resposta: ${parseError}`);
        }
      }
    }

    // Se conseguiu gerar mensagens, retorna elas
    if (generatedMessages.length > 0) {
      console.log(`✅ ${generatedMessages.length} mensagens personalizadas geradas para ${chatId} (configurado: ${quantidadeMensagens})`);
      return generatedMessages;
    }

    // Se falhou, retorna mensagens de fallback
    console.log(`⚠️ Falha ao gerar mensagens personalizadas para ${chatId}. Usando fallback.`);
    return getFallbackMessages(instanceId);

  } catch (error) {
    console.error(`❌ Erro ao gerar mensagens personalizadas: ${error}`);
    return getFallbackMessages(instanceId);
  }
}

/**
 * Retorna as mensagens de fallback configuradas no dashboard
 * @param {string} instanceId - ID da instância
 * @returns {string[]} - Array com mensagens de fallback baseado na configuração
 */
function getFallbackMessages(instanceId) {
  // Obtém a quantidade de mensagens configurada no dashboard
  const quantidadeMensagens = Number.parseInt(settings[instanceId]?.FOLLOW_UP_QUANTIDADE_MENSAGENS || "1", 10);
  console.log(`📊 Usando ${quantidadeMensagens} mensagem(ns) de fallback conforme configuração`);

  const mensagem1 = settings[instanceId]?.FOLLOW_UP_MENSAGEM_1 || "Olá! Notamos que você não respondeu. Podemos ajudar com mais alguma coisa?";
  const mensagem2 = settings[instanceId]?.FOLLOW_UP_MENSAGEM_2;
  const mensagem3 = settings[instanceId]?.FOLLOW_UP_MENSAGEM_3;

  const mensagens = [mensagem1];
  
  // Só adiciona mensagem 2 se a quantidade configurada for >= 2 e a mensagem existir
  if (quantidadeMensagens >= 2 && mensagem2 && mensagem2.trim() !== "") {
    mensagens.push(mensagem2);
  }
  
  // Só adiciona mensagem 3 se a quantidade configurada for >= 3 e a mensagem existir
  if (quantidadeMensagens >= 3 && mensagem3 && mensagem3.trim() !== "") {
    mensagens.push(mensagem3);
  }

  // Garante que retorna exatamente a quantidade configurada
  return mensagens.slice(0, quantidadeMensagens);
}

/**
 * Função base para agendar múltiplos follow-ups
 * @param {string} instanceId
 * @param {string} chatId
 * @param {string[]} messages
 * @param {number} intervalHours - Intervalo em horas entre mensagens
 * @param {boolean} shouldEmitEvents - Se deve emitir eventos para a interface (padrão: true)
 */
function _scheduleMultipleFollowUpsBase(instanceId, chatId, messages, intervalHours, shouldEmitEvents = true) {
  return withMutex(`schedule-${instanceId}-${chatId}`, async () => {
    // ✅ VERIFICAÇÃO CRÍTICA: Se follow-up está desativado, não agenda
    if (!settings[instanceId]?.FOLLOW_UP_ATIVO) {
      console.log(`🚫 Follow-up desativado para instância ${instanceId}. Não agendando follow-ups para ${chatId}`);
      
      if (shouldEmitEvents) {
        BrowserWindow.getAllWindows().forEach(window => {
          if (!window.isDestroyed()) {
            window.webContents.send('follow-up-check-result', {
              instanceId,
              chatId,
              success: true,
              hasFollowUp: false,
              message: "Follow-up não agendado - funcionalidade desativada",
              reason: "O sistema de follow-up está desativado nas configurações",
              isAutomaticCheck: true
            });
          }
        });
      }

      return;
    }

  if (!activeFollowUps[instanceId]) {
    activeFollowUps[instanceId] = new Map();
  }

  const hasFollowUpToChat = activeFollowUps[instanceId].has(chatId);

  if (hasFollowUpToChat) {
    const existingFollowUps = activeFollowUps[instanceId].get(chatId);

      // Verificação mais robusta de follow-ups pendentes
      // @ts-ignore - Verificação de ID opcional para compatibilidade
      if (existingFollowUps?.some(item => item?.status === 'pending' && item?.id)) {
        console.log(`⚠️ Já existe follow-up agendado para ${chatId}. Cancelando timeouts antigos e reagendando.`);
        
        // Cancela timeouts antigos antes de agendar novos
        cancelChatTimeouts(instanceId, chatId);
        
        // Limpa follow-ups pendentes antigos
        activeFollowUps[instanceId].delete(chatId);
      }
    }

    // Garante que existe uma lista vazia
    if (!activeFollowUps[instanceId].has(chatId)) {
    activeFollowUps[instanceId].set(chatId, []);
  }

  const intervalMs = intervalHours * 60 * 60 * 1000; // Converte horas para milissegundos
  const followUps = activeFollowUps[instanceId].get(chatId);

    // Agenda cada mensagem com intervalos progressivos
  messages.forEach((message, index) => {
    if (!message || message.trim() === "") return;

    const delay = (index + 1) * intervalMs;
    const scheduledTime = Date.now() + delay;
      const followUpId = generateFollowUpId(instanceId, chatId);

      // Cria follow-up item com ID único
      // @ts-ignore - Objeto estendido com propriedades adicionais
    const followUpItem = {
        id: followUpId, // ID único para identificação
      message,
      chatId,
      scheduledTime,
      instanceId,
        status: 'pending',
        sequenceIndex: index + 1, // Adiciona índice da sequência
        totalInSequence: messages.length // Total de mensagens na sequência
    };

    // Adiciona à lista de follow ups ativos
    if (followUps) {
        // @ts-ignore - Compatibilidade com tipos estendidos
      followUps.push(followUpItem);
    }

      // Agenda o envio com timeout rastreável
      const timeoutId = setTimeout(async () => {
        await withMutex(`send-${instanceId}-${chatId}-${followUpId}`, async () => {
          const currentFollowUps = activeFollowUps[instanceId]?.get(chatId);
          const followUpItemIndex = currentFollowUps?.findIndex(
            // @ts-ignore - ID existe no objeto criado
            item => item.id === followUpId
          );

          if (followUpItemIndex !== undefined && followUpItemIndex >= 0 && currentFollowUps) {
            // @ts-ignore - Compatibilidade com tipos estendidos
        const updatedItem = await sendFollowUp(instanceId, chatId, followUpItem);
            currentFollowUps[followUpItemIndex] = updatedItem;

        // Remove o item da lista se foi enviado com sucesso
        if (updatedItem.status === 'sent') {
              currentFollowUps.splice(followUpItemIndex, 1);

          // Se não há mais follow-ups pendentes para este chat, limpa a entrada
              if (currentFollowUps.length === 0) {
            activeFollowUps[instanceId].delete(chatId);
          }

          // Salva estado após atualização
          saveFollowUpsToFile(instanceId);
        }
      }

          // Remove o timeout ID do rastreamento
          removeTimeoutId(instanceId, chatId, Number(timeoutId));
        });
    }, delay);

      // Adiciona o timeout ID para rastreamento
      addTimeoutId(instanceId, chatId, Number(timeoutId));

      console.log(`✅ Follow-up ${index + 1}/${messages.length} (ID: ${followUpId}) agendado para ${chatId} em ${Math.floor(delay / 1000 / 60 / 60)} horas`);
  });

  console.log(`📅 Total de ${messages.length} mensagens de follow-up agendadas para ${chatId} com intervalo de ${intervalHours}h`);

  // Salva estado após agendar
  saveFollowUpsToFile(instanceId);
  });
}

/**
 * @param {string} instanceId
 * @param {string} chatId
 * @param {string[]} messages
 * @param {boolean} shouldEmitEvents - Se deve emitir eventos para a interface (padrão: true)
 */
function scheduleMultipleFollowUps(instanceId, chatId, messages, shouldEmitEvents = true) {
  // Usa o intervalo configurado no dashboard
  const intervalHours = Number.parseInt(settings[instanceId]?.FOLLOW_UP_INTERVALO_HORAS || "24", 10);
  console.log(`📊 Usando intervalo configurado no dashboard: ${intervalHours}h`);
  
  _scheduleMultipleFollowUpsBase(instanceId, chatId, messages, intervalHours, shouldEmitEvents);
}

/**
 * @param {string} instanceId
 * @param {string} chatId
 * @param {string[]} messages
 * @param {number} intervalHours - Intervalo customizado em horas
 * @param {boolean} shouldEmitEvents - Se deve emitir eventos para a interface (padrão: true)
 */
function scheduleMultipleFollowUpsWithCustomInterval(instanceId, chatId, messages, intervalHours, shouldEmitEvents = true) {
  console.log(`📊 Usando intervalo customizado: ${intervalHours}h`);
  
  _scheduleMultipleFollowUpsBase(instanceId, chatId, messages, intervalHours, shouldEmitEvents);
}

module.exports = {
  initFollowUpStructures,
  updateLastMessageTimestamp,
  scheduleFollowUpCheck,
  scheduleFollowUpCheckWithAIValidation,
  checkAndScheduleFollowUp,
  isEligibleForFollowUp,
  scheduleFollowUp,
  scheduleMultipleFollowUps,
  scheduleMultipleFollowUpsWithCustomInterval,
  sendFollowUp,
  cancelFollowUps,
  cancelAllFollowUps,
  generateFollowUpMessages,
  getFallbackMessages
};
