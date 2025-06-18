const {
  saveMessage,
  getMessages,
  getChatsInfo,
  clearChatMessages
} = require('../messageStorage');


/**
 * @param {import('electron').IpcMain} ipcMain - Instância do IpcMain do Electron
 * @param {Object} deps - Dependências injetadas
 * @param {Object} [deps.socketClients] - Clientes de socket para cada instância
 */
const setupChatHandlers = (ipcMain, deps = {}) => {
  const { socketClients } = deps;

  ipcMain.handle('get-chat-messages', async (_, { instanceId, chatId }) => {
    return getMessages(instanceId, chatId);
  });

  ipcMain.handle('get-chats', async (_, instanceId) => {
    return getChatsInfo(instanceId, false);
  });

  ipcMain.handle('save-message', async (_, { instanceId, chatId, message }) => {
    saveMessage(instanceId, chatId, message);
    return { success: true };
  });

  ipcMain.handle('send-message', async (_, { instanceId, chatId, message }) => {
    if (!socketClients || !socketClients[instanceId]) {
      return { success: false, error: "Cliente não conectado" };
    }

    try {
      const messageObj = {
        key: {
          fromMe: true,
          id: `ui-generated-${Date.now()}`,
          remoteJid: chatId
        },
        message: {
          conversation: message
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        isUserMessage: true
      };

      saveMessage(instanceId, chatId, messageObj, false);

      await socketClients[instanceId].sendMessage(chatId, { text: message });

      return { success: true };
    } catch (error) {
      console.error(`Erro ao enviar mensagem: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao enviar mensagem"
      };
    }
  });

  ipcMain.handle('clear-chat-conversation', async (_, { instanceId, chatId }) => {
    try {
      const success = await clearChatMessages(instanceId, chatId);
      return { success };
    } catch (error) {
      console.error(`Erro ao limpar conversa do chat ${chatId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Erro desconhecido ao limpar conversa"
      };
    }
  });
};

/**
 * @typedef {Object} ConnectionStatusResponse
 * @property {boolean} connected - Indica se o WhatsApp está conectado
 */

/**
 * @param {import('electron').IpcMain} ipcMain - Instância do IpcMain do Electron
 * @param {Object} deps - Dependências injetadas
 * @param {Object} [deps.connectionStatus] - Status de conexão para cada instância
 */
const setupConnectionStatusHandlers = (ipcMain, deps = {}) => {
  const { connectionStatus } = deps;

  /**
   * Retorna o status de conexão para uma instância específica
   * @param {Electron.IpcMainInvokeEvent} _ - Evento IPC
   * @param {string} instanceId - ID da instância
   * @returns {ConnectionStatusResponse} Status de conexão
   */
  ipcMain.handle('get-connection-status', async (_, instanceId) => {
    if (!connectionStatus || !connectionStatus[instanceId]) {
      return { connected: false };
    }

    const status = connectionStatus[instanceId];

    switch (status) {
      case 'open':
        return { connected: true };
      default:
        return { connected: false };
    }
  });
};

/**
 * @param {import('electron').IpcMain} ipcMain - Instância do IpcMain do Electron
 */
const setupHumanInterventionHandlers = (ipcMain) => {
  const {
    hasExcludedNumbersByIntervention,
    addExcludedNumbersByIntervention,
    deleteExcludedNumbersByIntervention,
    getHumanInterventionDetails,
    getAllHumanInterventions
  } = require('../whatsapp/messageProcessor');

  ipcMain.handle('get-human-intervention-status', async (_, { chatId }) => {
    return hasExcludedNumbersByIntervention(chatId);
  });

  ipcMain.handle('get-human-intervention-details', async (_, { chatId }) => {
    return getHumanInterventionDetails(chatId);
  });

  ipcMain.handle('get-all-human-interventions', async () => {
    return getAllHumanInterventions();
  });

  ipcMain.handle('toggle-human-intervention', async (_, { chatId, currentStatus }) => {
    try {
      if (currentStatus) {
        deleteExcludedNumbersByIntervention(chatId);
        console.log(`🔄 Intervenção humana DESATIVADA manualmente para o chat ${chatId}`);
      }
      else {
        addExcludedNumbersByIntervention(chatId, true);
        console.log(`🔄 Intervenção humana ATIVADA manualmente para o chat ${chatId}`);
      }

      return {
        success: true,
        active: !currentStatus,
        details: getHumanInterventionDetails(chatId)
      };
    } catch (error) {
      console.error(`Erro ao alternar intervenção humana para ${chatId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao alternar intervenção humana'
      };
    }
  });
};

/**
 * @param {import('electron').IpcMain} ipcMain - Instância do IpcMain do Electron
 */
const setupOpenAIHandlers = (ipcMain) => {
  const axios = require('axios').default;

  ipcMain.handle('get-openai-assistants', async (_, apiKey) => {
    try {
      const response = await axios.request({
        method: 'GET',
        url: 'https://api.openai.com/v1/assistants',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('Erro ao listar assistentes OpenAI:', err);

      let mensagemErro = 'Erro ao listar assistentes';

      if (err && typeof err === 'object') {
        if ('response' in err &&
          err.response &&
          typeof err.response === 'object' &&
          'data' in err.response &&
          err.response.data &&
          typeof err.response.data === 'object' &&
          'error' in err.response.data &&
          err.response.data.error &&
          typeof err.response.data.error === 'object' &&
          'message' in err.response.data.error &&
          typeof err.response.data.error.message === 'string') {
          mensagemErro = err.response.data.error.message;
        } else if ('message' in err && typeof err.message === 'string') {
          mensagemErro = err.message;
        }
      }

      return {
        success: false,
        error: mensagemErro
      };
    }
  });

  ipcMain.handle('get-openai-models', async (_, apiKey) => {
    try {
      const response = await axios.request({
        method: 'GET',
        url: 'https://api.openai.com/v1/models',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('Erro ao listar modelos OpenAI:', err);

      let mensagemErro = 'Erro ao listar modelos';

      if (err && typeof err === 'object') {
        if ('response' in err &&
          err.response &&
          typeof err.response === 'object' &&
          'data' in err.response &&
          err.response.data &&
          typeof err.response.data === 'object' &&
          'error' in err.response.data &&
          err.response.data.error &&
          typeof err.response.data.error === 'object' &&
          'message' in err.response.data.error &&
          typeof err.response.data.error.message === 'string') {
          mensagemErro = err.response.data.error.message;
        } else if ('message' in err && typeof err.message === 'string') {
          mensagemErro = err.message;
        }
      }

      return {
        success: false,
        error: mensagemErro
      };
    }
  });

  ipcMain.handle('get-openai-assistant', async (_, { apiKey, assistantId }) => {
    try {
      const response = await axios.request({
        method: 'GET',
        url: `https://api.openai.com/v1/assistants/${assistantId}`,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('Erro ao obter detalhes do assistente OpenAI:', err);

      let mensagemErro = 'Erro ao obter detalhes do assistente';

      if (err && typeof err === 'object') {
        if ('response' in err &&
          err.response &&
          typeof err.response === 'object' &&
          'data' in err.response &&
          err.response.data &&
          typeof err.response.data === 'object' &&
          'error' in err.response.data &&
          err.response.data.error &&
          typeof err.response.data.error === 'object' &&
          'message' in err.response.data.error &&
          typeof err.response.data.error.message === 'string') {
          mensagemErro = err.response.data.error.message;
        } else if ('message' in err && typeof err.message === 'string') {
          mensagemErro = err.message;
        }
      }

      return {
        success: false,
        error: mensagemErro
      };
    }
  });

  ipcMain.handle('create-openai-assistant', async (_, { apiKey, assistantData }) => {
    try {
      const response = await axios.request({
        method: 'POST',
        url: 'https://api.openai.com/v1/assistants',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        data: assistantData
      });

      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('Erro ao criar assistente OpenAI:', err);

      let mensagemErro = 'Erro ao criar assistente';

      if (err && typeof err === 'object') {
        if ('response' in err &&
          err.response &&
          typeof err.response === 'object' &&
          'data' in err.response &&
          err.response.data &&
          typeof err.response.data === 'object' &&
          'error' in err.response.data &&
          err.response.data.error &&
          typeof err.response.data.error === 'object' &&
          'message' in err.response.data.error &&
          typeof err.response.data.error.message === 'string') {
          mensagemErro = err.response.data.error.message;
        } else if ('message' in err && typeof err.message === 'string') {
          mensagemErro = err.message;
        }
      }

      return {
        success: false,
        error: mensagemErro
      };
    }
  });

  ipcMain.handle('update-openai-assistant', async (_, { apiKey, assistantId, assistantData }) => {
    try {
      const response = await axios.request({
        method: 'POST',
        url: `https://api.openai.com/v1/assistants/${assistantId}`,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        data: assistantData
      });

      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('Erro ao atualizar assistente OpenAI:', err);

      let mensagemErro = 'Erro ao atualizar assistente';

      if (err && typeof err === 'object') {
        if ('response' in err &&
          err.response &&
          typeof err.response === 'object' &&
          'data' in err.response &&
          err.response.data &&
          typeof err.response.data === 'object' &&
          'error' in err.response.data &&
          err.response.data.error &&
          typeof err.response.data.error === 'object' &&
          'message' in err.response.data.error &&
          typeof err.response.data.error.message === 'string') {
          mensagemErro = err.response.data.error.message;
        } else if ('message' in err && typeof err.message === 'string') {
          mensagemErro = err.message;
        }
      }

      return {
        success: false,
        error: mensagemErro
      };
    }
  });
};

/**
 * @param {import('electron').IpcMain} ipcMain - Instância do IpcMain do Electron
 */
const setupAIModeHandlers = (ipcMain) => {
  const {
    setAIMode,
    getAIModeStatus,
    getManualAIModeChats
  } = require('../whatsapp/aiModeManager');

  ipcMain.handle('get-ai-mode-status', async (_, { instanceId, chatId }) => {
    try {
      const status = getAIModeStatus(instanceId, chatId);
      return {
        success: true,
        status
      };
    } catch (error) {
      console.error(`Erro ao obter status do modo IA para ${chatId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao obter status do modo IA'
      };
    }
  });

  ipcMain.handle('set-ai-mode', async (_, { instanceId, chatId, active }) => {
    try {
      const result = setAIMode(instanceId, chatId, active);
      return result;
    } catch (error) {
      console.error(`Erro ao alterar modo IA para ${chatId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido ao alterar modo IA',
        status: getAIModeStatus(instanceId, chatId)
      };
    }
  });

  ipcMain.handle('get-ai-mode-bulk', async (_, { instanceId, chatIds }) => {
    try {
      const results = {};
      for (const chatId of chatIds) {
        results[chatId] = getAIModeStatus(instanceId, chatId);
      }
      return {
        success: true,
        results
      };
    } catch (error) {
      console.error(`Erro ao obter status em lote do modo IA:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao obter status em lote'
      };
    }
  });

  ipcMain.handle('get-manual-ai-mode-chats', async (_, instanceId) => {
    try {
      const chats = getManualAIModeChats(instanceId);
      return {
        success: true,
        chats
      };
    } catch (error) {
      console.error(`Erro ao obter chats com modo IA manual:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  });
};

/**
 * @param {import('electron').IpcMain} ipcMain
 */
const setupIpcHandlers = (ipcMain, deps = {}) => {
  setupChatHandlers(ipcMain, deps);

  setupConnectionStatusHandlers(ipcMain, deps);

  setupHumanInterventionHandlers(ipcMain);

  setupOpenAIHandlers(ipcMain);

  setupAIModeHandlers(ipcMain);

  // Importa e configura os handlers de follow-up
  const { setupFollowUpHandlers } = require('./followUpHandlers');
  setupFollowUpHandlers(ipcMain);
};

module.exports = {
  setupIpcHandlers,
};
