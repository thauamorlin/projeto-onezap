const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { getAuthDir } = require('./config/settings');
const { channels } = require('../shared/constants');
const electron = require('electron');
const { isValidWhatsAppId } = require('./util/messages');

/**
 * @typedef {import('@whiskeysockets/baileys').proto.IWebMessageInfo} IWebMessageInfo
 * @typedef {import('@whiskeysockets/baileys').WAMessage} WAMessage
 * @typedef {import('../types/chat').ChatInfo} ChatInfo
 */

/**
 * Mensagem estendida com campos adicionais para uso interno
 * @typedef {IWebMessageInfo & {timestamp?: number, read?: boolean, isAIMessage?: boolean}} ExtendedMessage
 */

/**
 * Constantes para caminhos de diretórios
 * @type {{ CHATS_DIR: string }}
 */
const DIRECTORY_PATHS = {
  CHATS_DIR: 'chats'
};

// Contador para operações em andamento por arquivo
const pendingOperations = new Map();

/**
 * Garante que um diretório exista
 * @param {string} dir - Caminho do diretório
 * @returns {Promise<void>}
 */
async function ensureDirectoryExists(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Erro ao criar diretório ${dir}:`, error);
    throw new Error(`Não foi possível criar o diretório ${dir}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Valida o ID da instância
 * @param {string} instanceId - ID da instância para validar
 * @throws {Error} Se o ID da instância for inválido
 */
function validateInstanceId(instanceId) {
  if (!instanceId || typeof instanceId !== 'string') {
    throw new Error('ID da instância inválido ou não fornecido');
  }
}

/**
 * Valida o ID do chat
 * @param {string} chatId - ID do chat para validar
 * @throws {Error} Se o ID do chat for inválido
 */
function validateChatId(chatId) {
  if (!chatId || typeof chatId !== 'string') {
    throw new Error('ID do chat inválido ou não fornecido');
  }

  // Valida formato básico de ID de chat do WhatsApp (pode ser melhorado)
  if (!chatId.includes('@') && !chatId.match(/^\d+/)) {
    throw new Error('Formato de ID de chat inválido');
  }

  // Validação adicional para garantir que é um número de telefone ou grupo do WhatsApp
  if (!isValidWhatsAppId(chatId)) {
    console.log(`⚠️ ID de chat com formato suspeito detectado: ${chatId}`);
    throw new Error('ID do chat não segue o formato padrão do WhatsApp');
  }
}

/**
 * Valida a mensagem
 * @param {IWebMessageInfo} message - Mensagem para validar
 * @throws {Error} Se a mensagem for inválida
 */
function validateMessage(message) {
  if (!message || typeof message !== 'object') {
    throw new Error('Mensagem inválida ou não fornecida');
  }

  // Garante que a mensagem tenha uma estrutura mínima
  if (!message.key && !message.message) {
    throw new Error('Estrutura de mensagem inválida (faltam campos obrigatórios)');
  }
}

/**
 * Notifica a interface do usuário sobre mudanças
 * @param {string} channel - Canal de notificação
 * @param {any} data - Dados a serem enviados
 */
function notifyUI(channel, data) {
  console.log(`[NOTIFY_UI] Enviando evento no canal: ${channel}`, data?.chatId || '');

  if (electron.app && electron.BrowserWindow) {
    const windows = electron.BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      console.log(`[NOTIFY_UI] Total de janelas: ${windows.length}`);
      windows[0].webContents.send(channel, data);
    } else {
      console.log("[NOTIFY_UI] Nenhuma janela encontrada para enviar evento");
    }
  } else {
    console.log("[NOTIFY_UI] Electron app ou BrowserWindow não disponíveis");
  }
}

/**
 * Realiza uma operação de arquivo com um mecanismo básico de serialização
 * @param {string} filePath - Caminho do arquivo
 * @param {function} operation - Função assíncrona que realiza a operação
 * @returns {Promise<any>} - Resultado da operação
 */
async function withFileOperation(filePath, operation) {
  // Se houver operações pendentes para este arquivo, aguarda
  while (pendingOperations.has(filePath)) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  // Marca este arquivo como tendo operações pendentes
  pendingOperations.set(filePath, true);

  try {
    // Executa a operação
    return await operation();
  } finally {
    // Libera o arquivo para outras operações
    pendingOperations.delete(filePath);
  }
}

/**
 * Salva uma mensagem para uma instância e chat específicos
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat (geralmente o número do telefone)
 * @param {IWebMessageInfo} message - Objeto da mensagem do WhatsApp
 * @param {boolean} [isAI=false] - Indica se a mensagem é da IA
 * @returns {Promise<ExtendedMessage>} - Mensagem formatada que foi salva
 */
async function saveMessage(instanceId, chatId, message, isAI = false) {
  try {
    // Validações
    validateInstanceId(instanceId);
    validateChatId(chatId);
    validateMessage(message);

    const authDir = getAuthDir(instanceId);
    const chatsDir = path.join(authDir, DIRECTORY_PATHS.CHATS_DIR);

    // Cria o diretório de chats se não existir
    await ensureDirectoryExists(chatsDir);

    const chatFilePath = path.join(chatsDir, `${chatId}.json`);

    return await withFileOperation(chatFilePath, async () => {
      // Lê o arquivo existente ou cria um novo array
      /** @type {ExtendedMessage[]} */
      let messages = [];

      if (fsSync.existsSync(chatFilePath)) {
        try {
          const fileContent = await fs.readFile(chatFilePath, 'utf8');
          messages = JSON.parse(fileContent);

          // Validação adicional do conteúdo do arquivo
          if (!Array.isArray(messages)) {
            console.error(`Conteúdo inválido no arquivo de chat ${chatId}, reiniciando.`);
            messages = [];
          }
        } catch (error) {
          console.error(`Erro ao ler arquivo de chat ${chatId}:`, error);
          // Em caso de erro de leitura, cria um novo arquivo
        }
      }

      // Formata a mensagem para garantir compatibilidade
      /** @type {ExtendedMessage} */
      const formattedMessage = {
        ...message,
        key: {
          ...message.key,
          id: message.key?.id || `generated-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          fromMe: Boolean(message.key?.fromMe),
          remoteJid: message.key?.remoteJid || chatId
        },
        messageTimestamp: message.messageTimestamp || Math.floor(Date.now() / 1000),
        timestamp: Date.now(),
        isAIMessage: isAI // Adiciona marcador explícito para mensagens da IA
      };

      // Adiciona a nova mensagem
      messages.push(formattedMessage);

      // Limita o número de mensagens armazenadas, se necessário (opcional)
      const MAX_STORED_MESSAGES = 1000; // Define um limite razoável
      if (messages.length > MAX_STORED_MESSAGES) {
        messages = messages.slice(-MAX_STORED_MESSAGES);
      }

      // Salva o arquivo atualizado
      await fs.writeFile(chatFilePath, JSON.stringify(messages, null, 2));

      // Logs para depuração
      console.log(`[SAVE_MESSAGE] Salvando mensagem para ${chatId}, ID: ${formattedMessage.key?.id}`);
      console.log(`[SAVE_MESSAGE] Total de mensagens no chat: ${messages.length}`);

      // Emite um evento para notificar sobre a nova mensagem
      notifyUI(channels.NEW_MESSAGE, {
        instanceId,
        chatId,
        message: formattedMessage
      });

      return formattedMessage;
    });
  } catch (error) {
    console.error(`Erro ao salvar mensagem para ${chatId}:`, error);
    throw error;
  }
}

/**
 * Recupera todas as mensagens de um chat específico
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 * @param {Object} [options] - Opções adicionais
 * @param {number} [options.limit] - Limite de mensagens para retornar
 * @param {number} [options.offset] - Offset para paginação
 * @param {boolean} [options.filterEmpty=true] - Filtra mensagens sem conteúdo
 * @returns {Promise<ExtendedMessage[]>} - Array de mensagens
 */
async function getMessages(instanceId, chatId, options = {}) {
  try {
    validateInstanceId(instanceId);
    validateChatId(chatId);

    const authDir = getAuthDir(instanceId);
    const chatFilePath = path.join(authDir, DIRECTORY_PATHS.CHATS_DIR, `${chatId}.json`);

    if (!fsSync.existsSync(chatFilePath)) {
      return [];
    }

    try {
      const fileContent = await fs.readFile(chatFilePath, 'utf8');
      let messages = JSON.parse(fileContent);

      // Validação do conteúdo
      if (!Array.isArray(messages)) {
        console.error(`[GET_MESSAGES] Conteúdo inválido no arquivo de chat ${chatId}`);
        return [];
      }

      // Garante que as mensagens estejam ordenadas por timestamp
      messages.sort((a, b) => {
        const timestampA = a.messageTimestamp || (a.timestamp ? a.timestamp / 1000 : 0);
        const timestampB = b.messageTimestamp || (b.timestamp ? b.timestamp / 1000 : 0);
        return timestampA - timestampB;
      });

      // Filtra mensagens sem conteúdo, se a opção filterEmpty não estiver definida como false
      if (options.filterEmpty !== false) {
        const originalCount = messages.length;
        messages = messages.filter(message => {
          // Nunca filtra mensagens da IA, mesmo que pareçam vazias
          if (message.isAIMessage) {
            return true;
          }
          const content = extractMessageContent(message);
          return content && content !== 'Mensagem não suportada';
        });

        if (originalCount !== messages.length) {
          console.log(`[GET_MESSAGES] Filtradas ${originalCount - messages.length} mensagens sem conteúdo`);
        }
      }

      // Aplica limite e offset se fornecidos
      if (options.limit || options.offset) {
        const offset = options.offset || 0;
        const limit = options.limit || messages.length;

        messages = messages.slice(offset, offset + limit);
      }

      return messages;
    } catch (error) {
      console.error(`[GET_MESSAGES] Erro ao ler arquivo de chat ${chatId}:`, error);
      return [];
    }
  } catch (error) {
    console.error(`[GET_MESSAGES] Erro ao obter mensagens para ${chatId}:`, error);
    throw error;
  }
}

/**
 * Obtém a lista de todos os chats disponíveis para uma instância
 * @param {string} instanceId - ID da instância
 * @returns {Promise<string[]>} - Array com os IDs dos chats
 */
async function getChatsList(instanceId) {
  try {
    validateInstanceId(instanceId);

    const authDir = getAuthDir(instanceId);
    const chatsDir = path.join(authDir, DIRECTORY_PATHS.CHATS_DIR);

    if (!fsSync.existsSync(chatsDir)) {
      return [];
    }

    try {
      const files = await fs.readdir(chatsDir);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      console.error(`Erro ao listar chats para a instância ${instanceId}:`, error);
      return [];
    }
  } catch (error) {
    console.error(`Erro ao obter lista de chats para ${instanceId}:`, error);
    throw error;
  }
}

/**
 * Obtém o nome mais recente de um contato das mensagens existentes
 * @param {ExtendedMessage[]} messages - Array de mensagens do chat
 * @returns {string|null} - Nome do contato ou null se não encontrado
 */
function getLastContactName(messages) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) return null;

  // Percorre as mensagens do final para o início buscando um pushName
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    // Só considera o pushName se NÃO for uma mensagem do próprio usuário (fromMe === false)
    if (message?.pushName && !message.key?.fromMe) {
      return message.pushName || null;
    }
  }

  return null;
}

/**
 * Formata o nome do chat para exibição
 * @param {string} chatId - ID do chat
 * @returns {string} - Nome formatado
 */
function formatChatName(chatId) {
  if (!chatId || typeof chatId !== 'string') {
    return 'Chat Desconhecido';
  }

  // Remove o sufixo @s.whatsapp.net ou @g.us
  const cleanId = chatId.split('@')[0];

  // Se for um grupo, formato com prefixo mais claro
  if (chatId.includes('@g.us')) {
    // Formata o ID do grupo para ser mais legível
    // Exemplo: "123456789-1234567" -> "Grupo 123-456..."
    if (cleanId.length > 8) {
      const shortId = `${cleanId.substring(0, 3)}-${cleanId.substring(3, 6)}...`;
      return `Grupo ${shortId}`;
    }
    return `Grupo ${cleanId}`;
  }

  // Para contatos individuais, formata o número
  return formatPhoneNumber(cleanId);
}

/**
 * Formata um número de telefone para exibição
 * @param {string} phoneNumber - Número de telefone
 * @returns {string} - Número formatado
 */
function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return 'Número desconhecido';
  }

  // Implementação básica - pode ser melhorada para formatar corretamente
  if (phoneNumber.length > 8) {
    return `+${phoneNumber.substring(0, 2)} ${phoneNumber.substring(2)}`;
  }
  return phoneNumber;
}

/**
 * Obtém informações resumidas de todos os chats
 * @param {string} instanceId - ID da instância
 * @param {boolean} [filterEmptyMessages=true] - Filtra mensagens sem conteúdo
 * @returns {Promise<ChatInfo[]>} - Array com informações dos chats
 */
async function getChatsInfo(instanceId, filterEmptyMessages = true) {
  try {
    validateInstanceId(instanceId);

    const chatIds = await getChatsList(instanceId);

    const chatsInfoPromises = chatIds.map(async (chatId) => {
      // Passa explicitamente a opção de filtrar mensagens vazias
      const messages = await getMessages(instanceId, chatId, { filterEmpty: filterEmptyMessages });
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      const isGroup = chatId.includes('@g.us');

      // Para grupos e contatos individuais, tratamos de forma diferente
      let chatName;
      let lastMessageSender = undefined;

      if (isGroup) {
        // Em grupos, usamos formatChatName como padrão para evitar confusão
        // TODO: No futuro, buscar o nome real do grupo (subject) da API do WhatsApp
        chatName = formatChatName(chatId);

        // Ainda armazenamos o último remetente para exibir nas mensagens
        if (lastMessage?.pushName && !lastMessage.key?.fromMe) {
          lastMessageSender = lastMessage.pushName;
        }
      } else {
        // Para chats individuais, pode usar o nome do contato normalmente
        const contactName = getLastContactName(messages);
        chatName = contactName || formatChatName(chatId);
      }

      // Obter timestamp com tratamento de erro
      let timestamp = 0;
      try {
        if (lastMessage) {
          // Tentar obter timestamp válido
          const messageTimestamp = lastMessage.messageTimestamp;
          const messageTs = lastMessage.timestamp;

          if (messageTimestamp) {
            // Verifica se o timestamp é um objeto com propriedades low/high (formato Long)
            if (typeof messageTimestamp === 'object' && messageTimestamp.low !== undefined) {
              // Usa o valor 'low' como timestamp (geralmente em segundos)
              timestamp = messageTimestamp.low * 1000;
            } else {
              // Verificar se o timestamp está em segundos ou milissegundos
              timestamp = messageTimestamp < 10000000000 ? messageTimestamp * 1000 : messageTimestamp;
            }
          } else if (messageTs) {
            // Caso o timestamp esteja em uma propriedade diferente
            timestamp = messageTs;
          }

          // Verificar se é uma data válida e não é futura
          const now = Date.now();
          const maxAllowedTime = now + (60 * 60 * 1000); // Atual + 1 hora (tolerância)

          if (Number.isNaN(timestamp) || timestamp > maxAllowedTime) {
            console.warn(`[GET_CHATS_INFO] Timestamp inválido ou futuro para ${chatId}: ${timestamp}, usando timestamp atual`);
            timestamp = Date.now();
          }
        }
      } catch (error) {
        console.error(`[GET_CHATS_INFO] Erro ao processar timestamp para ${chatId}: ${error instanceof Error ? error.message : String(error)}`);
        timestamp = Date.now(); // Usa timestamp atual em caso de erro
      }

      // Mesmo que não tenha mensagens com conteúdo, mantém o registro do chat
      // mas com informações vazias para a última mensagem
      return {
        id: chatId,
        name: chatName,
        lastMessage: lastMessage ? extractMessageContent(lastMessage) : '',
        lastMessageSender,
        timestamp: timestamp,
        unreadCount: messages.filter(msg => !msg.read && !isOwnMessage(msg)).length,
        isGroup,
        lastMessageFromMe: lastMessage ? isOwnMessage(lastMessage) : false
      };
    });

    const chatsInfo = await Promise.all(chatsInfoPromises);
    // Ordenar por timestamp decrescente, garantindo que chats com mensagens recentes fiquem no topo
    return chatsInfo.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (error) {
    console.error(`[GET_CHATS_INFO] Erro ao obter informações de chats: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Extrai o conteúdo da mensagem para exibição
 * @param {ExtendedMessage} message - Objeto da mensagem
 * @returns {string} - Conteúdo da mensagem
 */
function extractMessageContent(message) {
  if (!message || !message.message) return '';

  const msgContent = message.message;

  // Verifica texto na mensagem ou mensagem efêmera, usando a mesma lógica de getTextFromMessage
  const textContent =
    msgContent.conversation ||
    msgContent.extendedTextMessage?.text ||
    msgContent.ephemeralMessage?.message?.conversation ||
    msgContent.ephemeralMessage?.message?.extendedTextMessage?.text;

  if (textContent) return textContent;

  // Se não tem texto, verifica o tipo de mídia
  if (msgContent.imageMessage || msgContent.ephemeralMessage?.message?.imageMessage) return '🖼️ Imagem';
  if (msgContent.videoMessage || msgContent.ephemeralMessage?.message?.videoMessage) return '🎥 Vídeo';
  if (msgContent.audioMessage || msgContent.ephemeralMessage?.message?.audioMessage) return '🎵 Áudio';
  if (msgContent.documentMessage || msgContent.ephemeralMessage?.message?.documentMessage) return '📄 Documento';
  if (msgContent.stickerMessage || msgContent.ephemeralMessage?.message?.stickerMessage) return '🏷️ Sticker';

  return 'Mensagem não suportada';
}

/**
 * Verifica se a mensagem é do próprio usuário
 * @param {ExtendedMessage} message - Objeto da mensagem
 * @returns {boolean} - true se for mensagem própria
 */
function isOwnMessage(message) {
  return Boolean(message?.key?.fromMe);
}

/**
 * Limpa todas as mensagens de um chat específico
 * @param {string} instanceId - ID da instância
 * @param {string} chatId - ID do chat
 * @returns {Promise<boolean>} - true se a limpeza foi bem-sucedida
 */
async function clearChatMessages(instanceId, chatId) {
  try {
    validateInstanceId(instanceId);
    validateChatId(chatId);

    const authDir = getAuthDir(instanceId);
    const chatFilePath = path.join(authDir, DIRECTORY_PATHS.CHATS_DIR, `${chatId}.json`);

    return await withFileOperation(chatFilePath, async () => {
      // Verifica se o arquivo existe
      if (!fsSync.existsSync(chatFilePath)) {
        console.log(`[CLEAR_CHAT] Arquivo de chat ${chatId} não existe, nada para limpar`);
        return true;
      }

      try {
        // Remove o arquivo de mensagens
        await fs.unlink(chatFilePath);
        console.log(`[CLEAR_CHAT] Arquivo de chat ${chatId} removido com sucesso`);

        // Notifica a UI sobre a limpeza do chat
        notifyUI(channels.CHAT_CLEARED, {
          instanceId,
          chatId
        });

        return true;
      } catch (error) {
        console.error(`[CLEAR_CHAT] Erro ao remover arquivo de chat ${chatId}:`, error);
        return false;
      }
    });
  } catch (error) {
    console.error(`[CLEAR_CHAT] Erro ao limpar mensagens do chat ${chatId}:`, error);
    throw error;
  }
}

module.exports = {
  saveMessage,
  getMessages,
  getChatsList,
  getChatsInfo,
  extractMessageContent,
  isOwnMessage,
  clearChatMessages
};
