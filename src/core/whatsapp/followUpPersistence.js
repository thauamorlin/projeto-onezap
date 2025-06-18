const fs = require('fs').promises;
const path = require('path');
const { activeFollowUps } = require('../config/states');
const { getAuthDir, settings } = require('../config/settings');

/**
 * @typedef {import('./followUpTypes').FollowUpItem} FollowUpItem
 */

// Cache de escrita para implementar debounce
const writeCache = new Map();
const DEBOUNCE_TIME = 2000; // 2 segundos

// Flags para evitar condições de corrida
const savingFlags = new Map();

/**
 * Converte Map para objeto serializável
 * @param {Map<string, FollowUpItem[]>} followUpMap - Map de follow-ups
 * @returns {Record<string, FollowUpItem[]>} Objeto serializável
 */
function mapToObject(followUpMap) {
  /** @type {Record<string, FollowUpItem[]>} */
  const obj = {};
  followUpMap.forEach((value, key) => {
    // Filtra apenas follow-ups pendentes
    const pendingFollowUps = value.filter(item => item.status === 'pending');
    if (pendingFollowUps.length > 0) {
      obj[key] = pendingFollowUps;
    }
  });
  return obj;
}

/**
 * Converte objeto para Map
 * @param {Object} obj - Objeto com follow-ups
 * @returns {Map<string, FollowUpItem[]>} Map de follow-ups
 */
function objectToMap(obj) {
  const map = new Map();
  Object.entries(obj).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      map.set(key, value);
    }
  });
  return map;
}

/**
 * Salva os follow-ups de uma instância em arquivo (com debounce)
 * @param {string} instanceId - ID da instância
 */
async function saveFollowUpsToFile(instanceId) {
  if (!instanceId || !activeFollowUps[instanceId]) {
    return;
  }

  // Cancela save anterior pendente
  if (writeCache.has(instanceId)) {
    clearTimeout(writeCache.get(instanceId));
  }

  // Agenda novo save com debounce
  const timeoutId = setTimeout(async () => {
    await performSave(instanceId);
    writeCache.delete(instanceId);
  }, DEBOUNCE_TIME);

  writeCache.set(instanceId, timeoutId);
}

/**
 * Realiza o salvamento imediato dos follow-ups
 * @param {string} instanceId - ID da instância
 */
async function performSave(instanceId) {
  // Evita salvamentos concorrentes
  if (savingFlags.get(instanceId)) {
    console.log(`⏳ Salvamento já em andamento para instância ${instanceId}`);
    return;
  }

  savingFlags.set(instanceId, true);

  try {
    // Obtém o diretório de autenticação da instância
    const authDir = getAuthDir(instanceId);
    const filePath = path.join(authDir, 'follow-ups.json');
    const backupPath = `${filePath}.backup`;

    // Converte Map para objeto
    const followUpsObj = mapToObject(activeFollowUps[instanceId]);

    // Se não há follow-ups pendentes, remove o arquivo
    if (Object.keys(followUpsObj).length === 0) {
      try {
        await fs.unlink(filePath);
        console.log(`🗑️ Arquivo de follow-ups removido para instância ${instanceId} (sem follow-ups pendentes)`);
      } catch {
        // Arquivo pode não existir, ignorar erro
      }
      return;
    }

    const data = JSON.stringify(followUpsObj, null, 2);

    // Cria backup do arquivo existente
    try {
      await fs.copyFile(filePath, backupPath);
    } catch {
      // Arquivo pode não existir ainda, ignorar erro
    }

    // Salva o novo arquivo
    await fs.writeFile(filePath, data, 'utf8');
    console.log(`💾 Follow-ups salvos para instância ${instanceId}: ${Object.keys(followUpsObj).length} chats`);

    // Remove backup após sucesso
    try {
      await fs.unlink(backupPath);
    } catch {
      // Ignorar erro ao remover backup
    }
  } catch (error) {
    console.error(`❌ Erro ao salvar follow-ups para instância ${instanceId}:`, error);
  } finally {
    savingFlags.set(instanceId, false);
  }
}

/**
 * Carrega os follow-ups de uma instância do arquivo
 * @param {string} instanceId - ID da instância
 * @returns {Promise<Map<string, FollowUpItem[]>>} Map de follow-ups carregados
 */
async function loadFollowUpsFromFile(instanceId) {
  try {
    // Obtém o diretório de autenticação da instância
    const authDir = getAuthDir(instanceId);
    const filePath = path.join(authDir, 'follow-ups.json');

    // Verifica se o arquivo existe
    try {
      await fs.access(filePath);
    } catch {
      console.log(`ℹ️ Nenhum arquivo de follow-ups encontrado para instância ${instanceId}`);
      return new Map();
    }

    const data = await fs.readFile(filePath, 'utf8');
    const followUpsObj = JSON.parse(data);

    // Valida a estrutura dos dados
    if (typeof followUpsObj !== 'object' || followUpsObj === null) {
      console.error(`❌ Arquivo de follow-ups corrompido para instância ${instanceId}`);
      return new Map();
    }

    const followUpsMap = objectToMap(followUpsObj);
    console.log(`📂 Follow-ups carregados para instância ${instanceId}: ${followUpsMap.size} chats`);

    return followUpsMap;
  } catch (error) {
    console.error(`❌ Erro ao carregar follow-ups para instância ${instanceId}:`, error);
    return new Map();
  }
}

/**
 * Processa follow-ups retroativos (que deveriam ter sido enviados)
 * @param {string} instanceId - ID da instância
 * @param {Map<string, FollowUpItem[]>} loadedFollowUps - Follow-ups carregados do arquivo
 */
async function processRetroactiveFollowUps(instanceId, loadedFollowUps) {
  // ✅ VERIFICAÇÃO CRÍTICA: Se follow-up está desativado, não processa retroativos
  if (!settings[instanceId]?.FOLLOW_UP_ATIVO) {
    console.log(`🚫 Follow-up desativado para instância ${instanceId}. Não processando follow-ups retroativos.`);
    return;
  }

  const now = Date.now();
  /** @type {FollowUpItem[]} */
  const retroactiveFollowUps = [];
  /** @type {FollowUpItem[]} */
  const futureFollowUps = [];

  // Separa follow-ups retroativos e futuros
  loadedFollowUps.forEach((followUpArray, chatId) => {
    followUpArray.forEach(followUp => {
      if (followUp.status === 'pending') {
        if (followUp.scheduledTime <= now) {
          retroactiveFollowUps.push({ ...followUp, chatId });
        } else {
          futureFollowUps.push({ ...followUp, chatId });
        }
      }
    });
  });

  console.log(`📊 Follow-ups para instância ${instanceId}:`);
  console.log(`   - Retroativos: ${retroactiveFollowUps.length}`);
  console.log(`   - Futuros: ${futureFollowUps.length}`);

  // Processa follow-ups retroativos com delay
  if (retroactiveFollowUps.length > 0) {
    const { sendFollowUp } = require('./followUpManager');

    // Ordena por tempo agendado (mais antigos primeiro)
    retroactiveFollowUps.sort((a, b) => a.scheduledTime - b.scheduledTime);

    console.log(`⏰ Processando ${retroactiveFollowUps.length} follow-ups retroativos...`);

    // Envia com delay progressivo para evitar spam
    for (let i = 0; i < retroactiveFollowUps.length; i++) {
      const followUp = retroactiveFollowUps[i];
      const delay = i * 3000; // 3 segundos entre cada envio

      setTimeout(async () => {
        console.log(`📤 Enviando follow-up retroativo ${i + 1}/${retroactiveFollowUps.length} para ${followUp.chatId}`);

        try {
          const updatedFollowUp = await sendFollowUp(instanceId, followUp.chatId, followUp);

          // Atualiza o status no activeFollowUps
          if (activeFollowUps[instanceId]?.has(followUp.chatId)) {
            const followUps = activeFollowUps[instanceId].get(followUp.chatId);
            if (!followUps) return;

            const index = followUps.findIndex(f => f.scheduledTime === followUp.scheduledTime);

            if (index >= 0) {
              if (updatedFollowUp.status === 'sent') {
                followUps.splice(index, 1);
                if (followUps.length === 0) {
                  activeFollowUps[instanceId].delete(followUp.chatId);
                }
              } else {
                followUps[index] = updatedFollowUp;
              }
            }
          }

          // Salva o estado atualizado
          await performSave(instanceId);
        } catch (error) {
          console.error(`❌ Erro ao enviar follow-up retroativo para ${followUp.chatId}:`, error);
        }
      }, delay);
    }
  }

  // Reagenda follow-ups futuros
  if (futureFollowUps.length > 0) {
    console.log(`⏱️ Reagendando ${futureFollowUps.length} follow-ups futuros...`);

    futureFollowUps.forEach(followUp => {
      const delay = followUp.scheduledTime - now;

      if (delay > 0) {
        console.log(`📅 Reagendando follow-up para ${followUp.chatId} em ${Math.floor(delay / 1000 / 60)} minutos`);

        setTimeout(async () => {
          const { sendFollowUp } = require('./followUpManager');
          const followUps = activeFollowUps[instanceId]?.get(followUp.chatId);
          const followUpItemIndex = followUps?.findIndex(
            item => item.scheduledTime === followUp.scheduledTime
          );

          if (followUpItemIndex !== undefined && followUpItemIndex >= 0 && followUps) {
            const updatedItem = await sendFollowUp(instanceId, followUp.chatId, followUp);

            if (updatedItem.status === 'sent') {
              followUps.splice(followUpItemIndex, 1);
              if (followUps.length === 0) {
                activeFollowUps[instanceId].delete(followUp.chatId);
              }
            } else {
              followUps[followUpItemIndex] = updatedItem;
            }

            // Salva o estado atualizado
            await performSave(instanceId);
          }
        }, delay);
      }
    });
  }
}

/**
 * Restaura e processa follow-ups ao iniciar/conectar
 * @param {string} instanceId - ID da instância
 */
async function restoreAndProcessFollowUps(instanceId) {
  try {
    console.log(`🔄 Restaurando follow-ups para instância ${instanceId}...`);

    // ✅ VERIFICAÇÃO CRÍTICA: Se follow-up está desativado, não restaura
    if (!settings[instanceId]?.FOLLOW_UP_ATIVO) {
      console.log(`🚫 Follow-up desativado para instância ${instanceId}. Não restaurando follow-ups.`);
      return;
    }

    // Carrega follow-ups do arquivo
    const loadedFollowUps = await loadFollowUpsFromFile(instanceId);

    if (loadedFollowUps.size === 0) {
      console.log(`ℹ️ Nenhum follow-up para restaurar na instância ${instanceId}`);
      return;
    }

    // Inicializa estrutura se necessário
    if (!activeFollowUps[instanceId]) {
      activeFollowUps[instanceId] = new Map();
    }

    // Mescla com follow-ups existentes (caso haja)
    loadedFollowUps.forEach((followUpArray, chatId) => {
      if (!activeFollowUps[instanceId].has(chatId)) {
        activeFollowUps[instanceId].set(chatId, []);
      }

      const existingFollowUps = activeFollowUps[instanceId].get(chatId);
      if (!existingFollowUps) return;

      // Adiciona apenas follow-ups que não existem (baseado no scheduledTime)
      followUpArray.forEach(loadedFollowUp => {
        const exists = existingFollowUps.some(
          existing => existing.scheduledTime === loadedFollowUp.scheduledTime
        );

        if (!exists && loadedFollowUp.status === 'pending') {
          existingFollowUps.push(loadedFollowUp);
        }
      });
    });

    // Processa follow-ups retroativos e reagenda futuros
    await processRetroactiveFollowUps(instanceId, loadedFollowUps);

  } catch (error) {
    console.error(`❌ Erro ao restaurar follow-ups para instância ${instanceId}:`, error);
  }
}

/**
 * Força salvamento imediato (útil antes de fechar a aplicação)
 */
async function forceFlushAllFollowUps() {
  console.log('💾 Forçando salvamento de todos os follow-ups...');

  // Cancela todos os debounces pendentes
  writeCache.forEach((timeoutId) => clearTimeout(timeoutId));
  writeCache.clear();

  // Salva todas as instâncias
  const savePromises = [];

  for (const instanceId of Object.keys(activeFollowUps)) {
    if (activeFollowUps[instanceId] && activeFollowUps[instanceId].size > 0) {
      savePromises.push(performSave(instanceId));
    }
  }

  await Promise.all(savePromises);
  console.log('✅ Todos os follow-ups foram salvos');
}

module.exports = {
  saveFollowUpsToFile,
  loadFollowUpsFromFile,
  restoreAndProcessFollowUps,
  forceFlushAllFollowUps
};
