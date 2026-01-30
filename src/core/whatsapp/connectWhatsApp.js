const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode");
const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const NodeCache = require("node-cache");
const { getAuthDir } = require("../config/settings");
const { channels } = require("../../shared/constants");
const { default: pino } = require("pino");
const { handleMessagesUpsert } = require("./handleMessagesUpsert");
const { DisconnectReason } = require("@whiskeysockets/baileys");
const { processingStates, messageTimeouts, activeChatId, socketClients, messageBufferPerChatId, outgoingQueueMap, connectionStatus } = require("../config/states");
const { initFollowUpStructures } = require("./followUpManager");
const { restoreAndProcessFollowUps } = require("./followUpPersistence");

const msgRetryCounterCache = new NodeCache();

const noopLogger = pino({
  level: "warn",
  // @ts-ignore
  stream: {
    write: () => { },
  },
});

/**
 * @param {Electron.IpcMainEvent} event
 * @param {string} instanceId
 */
async function connectWhatsApp(event, instanceId) {
  try {
    // Inicializa o status de conexão como "disconnected"
    connectionStatus[instanceId] = "disconnected";

    // @ts-ignore
    if (socketClients[instanceId]?.connected) {
      console.log("A instância já está conectada.");
      connectionStatus[instanceId] = "open";
      return;
    }
    if (socketClients[instanceId]) {
      console.log("Desconectando instância duplicada...");
      socketClients[instanceId].end(
        new Error("Desconectando instância duplicada"),
      );
    }
    const authDir = getAuthDir(instanceId);
    if (!fs.existsSync(authDir)) {
      console.log(`Directory does not exist, creating: ${authDir}`);
      fs.mkdirSync(authDir, { recursive: true });
    } else {
      console.log(`Directory exists: ${authDir}`);
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using WA v${version.join(".")}, isLatest: ${isLatest}`);

    const sock = makeWASocket({
      syncFullHistory: false,
      msgRetryCounterCache,
      version,
      markOnlineOnConnect: true,
      auth: state,
      // @ts-ignore
      logger: noopLogger,
    });
    socketClients[instanceId] = sock;

    // Inicializa as estruturas para esta instância
    processingStates[instanceId] = new Map();
    messageTimeouts[instanceId] = new Map();

    // Inicializa o conjunto de chats ativos
    // Este conjunto é usado para rastrear chats onde a IA está engajada
    // e para detectar intervenção humana
    if (!activeChatId[instanceId]) {
      activeChatId[instanceId] = new Set();
      console.log(`🆕 Conjunto de chats ativos criado para instância ${instanceId}`);
    } else {
      console.log(`🔄 Reusando conjunto existente de chats ativos (${activeChatId[instanceId].size} chats) para instância ${instanceId}`);
    }

    // Inicializa buffers e filas de mensagens
    messageBufferPerChatId[instanceId] = new Map();
    outgoingQueueMap[instanceId] = new Map();

    // Inicializa estruturas de follow up
    initFollowUpStructures(instanceId);

    console.log(`✅ Estado inicializado para instância ${instanceId}: estruturas de dados criadas`);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        qrcode.toDataURL(qr, {}, async (err, qrCodeBase64) => {
          if (err) {
            return;
          }
          event.sender.send(channels.START_WHATS, { qrCodeBase64, instanceId });
        });
      }
      switch (connection) {
        case "close":
          // Atualiza o status de conexão
          connectionStatus[instanceId] = "close";

          event.sender.send(channels.STATUS_UPDATE, {
            status: "close",
            instanceId,
          });

          console.log("close connection", lastDisconnect?.error?.message);

          // Atualiza o status de conexão para desconectado
          console.log(`Status de conexão atualizado para ${instanceId}: conectado=false, motivo=${lastDisconnect?.error?.message || "Desconectado"}`);

          if (
            lastDisconnect?.error?.message === "disconnect by logout onezap" ||
            lastDisconnect?.error?.message === "disconnect by logout zap-gpt"
          ) {
            return;
          }

          // biome-ignore lint/correctness/noSwitchDeclarations: <explanation>
          const shouldReconnect =
            // @ts-ignore
            lastDisconnect?.error?.output?.statusCode !==
            DisconnectReason.loggedOut;

          console.log({ shouldReconnect });
          if (shouldReconnect) {
            // Preservamos o activeChatId durante a reconexão para manter
            // o histórico de chats ativos e permitir a detecção de intervenção humana
            console.log(`🔄 Reconectando instância ${instanceId} em 5 segundos...`);
            console.log(`ℹ️ Mantendo registros de ${activeChatId[instanceId]?.size || 0} chats ativos`);

            setTimeout(() => {
              connectWhatsApp(event, instanceId);
            }, 5000);
          } else {
            // Limpeza completa em caso de logout
            fs.readdirSync(authDir).forEach((file) => {
              const filePath = path.join(authDir, file);

              if (file !== "settings.json") {
                // Verifica se é um diretório ou um arquivo
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                  // Se for diretório, remove recursivamente
                  fs.rmdirSync(filePath, { recursive: true });
                } else {
                  // Se for arquivo, remove normalmente
                  fs.unlinkSync(filePath);
                }
              }
            });

            // @ts-ignore
            socketClients[instanceId]?.logout(new Error("logout"));
            // @ts-ignore
            socketClients[instanceId] = null;

            // Limpa estruturas de dados relacionadas à instância
            delete processingStates[instanceId];
            delete messageTimeouts[instanceId];
            delete activeChatId[instanceId];
            delete messageBufferPerChatId[instanceId];
            delete outgoingQueueMap[instanceId];
            delete connectionStatus[instanceId];

            console.log(`🧹 Estado limpo para instância ${instanceId}: estruturas de dados removidas`);

            event.sender.send(channels.STATUS_UPDATE, {
              status: "close-by-user",
              instanceId,
            });

            console.log("Pasta auth_info removida com sucesso.");
          }

          break;
        case "open":
          // Atualiza o status de conexão
          connectionStatus[instanceId] = "open";

          // Atualiza o status de conexão para conectado
          console.log(`Status de conexão atualizado para ${instanceId}: conectado=true`);

          event.sender.send(channels.STATUS_UPDATE, {
            status: "open",
            instanceId,
          });

          // Restaura e processa follow-ups salvos quando conectar
          console.log(`🔄 Conexão estabelecida. Restaurando follow-ups para instância ${instanceId}...`);
          restoreAndProcessFollowUps(instanceId).catch(error => {
            console.error("❌ Erro ao restaurar follow-ups após conexão:", error);
          });

          break;
        case "connecting":
          // Atualiza o status de conexão
          connectionStatus[instanceId] = "connecting";

          console.log("conneting");

          // Atualiza o status de conexão para conectando
          console.log(`Status de conexão atualizado para ${instanceId}: conectado=false, motivo=Conectando...`);

          event.sender.send(channels.STATUS_UPDATE, {
            status: "connecting",
            instanceId,
          });
          break;
        default:
          break;
      }
    });

    sock.ev.on("messages.upsert", async (messagesUpsert) => {
      handleMessagesUpsert({ sock, messagesUpsert, instanceId });
    });

  } catch (err) {
    // Atualiza o status em caso de erro
    connectionStatus[instanceId] = "error";
    console.log("err", err);
  }
}

module.exports = { connectWhatsApp };
