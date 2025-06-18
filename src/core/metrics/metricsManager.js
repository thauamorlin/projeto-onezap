// @ts-nocheck
const fs = require("fs");
const path = require("path");
const { userDataPath } = require("../config/settings");

/**
 * @typedef {Object} DailyMetrics
 * @property {number} messagesReceived - Mensagens recebidas no dia
 * @property {number} messagesSent - Mensagens enviadas no dia
 * @property {number} followUpsSent - Follow-ups enviados no dia
 */

/**
 * @typedef {Object} InstanceMetrics
 * @property {number} messagesReceived - Total de mensagens recebidas
 * @property {number} messagesSent - Total de mensagens enviadas
 * @property {number} followUpsSent - Total de follow-ups enviados
 * @property {string} lastUpdated - Timestamp da última atualização
 * @property {Record<string, DailyMetrics>} dailyStats - Estatísticas diárias (YYYY-MM-DD)
 */

/**
 * @typedef {Record<string, InstanceMetrics>} MetricsData
 */

/**
 * Obtém o caminho do arquivo de métricas
 * @returns {string} Caminho do arquivo de métricas
 */
function getMetricsFilePath() {
  return path.join(userDataPath, "metrics.json");
}

/**
 * Carrega as métricas do arquivo
 * @returns {MetricsData} Dados das métricas
 */
function loadMetrics() {
  const metricsPath = getMetricsFilePath();

  try {
    if (fs.existsSync(metricsPath)) {
      const data = fs.readFileSync(metricsPath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("❌ Erro ao carregar métricas:", error);
  }

  return {};
}

/**
 * Salva as métricas no arquivo
 * @param {MetricsData} metrics - Dados das métricas para salvar
 */
function saveMetrics(metrics) {
  const metricsPath = getMetricsFilePath();

  try {
    // Cria o diretório se não existir
    const dir = path.dirname(metricsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.error("❌ Erro ao salvar métricas:", error);
  }
}

/**
 * Inicializa as métricas para uma instância se não existir
 * @param {string} instanceId - ID da instância
 */
function initMetricsForInstance(instanceId) {
  const metrics = loadMetrics();

  if (!metrics[instanceId]) {
    metrics[instanceId] = {
      messagesReceived: 0,
      messagesSent: 0,
      followUpsSent: 0,
      lastUpdated: new Date().toISOString(),
      dailyStats: {}
    };

    saveMetrics(metrics);
    console.log(`✅ Métricas inicializadas para instância: ${instanceId}`);
  }
}

/**
 * Obtém a data atual no formato YYYY-MM-DD
 * @returns {string} Data atual formatada
 */
function getCurrentDateKey() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Incrementa uma métrica específica para uma instância
 * @param {string} instanceId - ID da instância
 * @param {'messagesReceived' | 'messagesSent' | 'followUpsSent'} metricType - Tipo da métrica
 * @param {number} increment - Valor a incrementar (padrão: 1)
 */
function incrementMetric(instanceId, metricType, increment = 1) {
  if (!instanceId || !metricType) {
    console.error("❌ Parâmetros inválidos para incrementar métrica");
    return;
  }

  try {
    const metrics = loadMetrics();

    // Inicializa a instância se não existir
    if (!metrics[instanceId]) {
      initMetricsForInstance(instanceId);
      // Recarrega as métricas após inicialização
      const updatedMetrics = loadMetrics();
      metrics[instanceId] = updatedMetrics[instanceId];
    }

    const today = getCurrentDateKey();

    // Incrementa o total geral
    metrics[instanceId][metricType] += increment;

    // Incrementa as estatísticas diárias
    if (!metrics[instanceId].dailyStats[today]) {
      metrics[instanceId].dailyStats[today] = {
        messagesReceived: 0,
        messagesSent: 0,
        followUpsSent: 0
      };
    }

    metrics[instanceId].dailyStats[today][metricType] += increment;

    // Atualiza o timestamp
    metrics[instanceId].lastUpdated = new Date().toISOString();

    // Salva as métricas atualizadas
    saveMetrics(metrics);

    console.log(`📊 Métrica incrementada: ${instanceId} - ${metricType} +${increment}`);
  } catch (error) {
    console.error(`❌ Erro ao incrementar métrica ${metricType} para ${instanceId}:`, error);
  }
}

/**
 * Obtém as métricas de uma instância específica
 * @param {string} instanceId - ID da instância
 * @returns {InstanceMetrics | null} Métricas da instância ou null se não existir
 */
function getInstanceMetrics(instanceId) {
  if (!instanceId) {
    return null;
  }

  try {
    const metrics = loadMetrics();
    return metrics[instanceId] || null;
  } catch (error) {
    console.error(`❌ Erro ao obter métricas da instância ${instanceId}:`, error);
    return null;
  }
}

/**
 * Obtém todas as métricas de todas as instâncias
 * @returns {MetricsData} Todas as métricas
 */
function getAllMetrics() {
  try {
    return loadMetrics();
  } catch (error) {
    console.error("❌ Erro ao obter todas as métricas:", error);
    return {};
  }
}

/**
 * Obtém métricas agregadas de todas as instâncias
 * @returns {Object} Métricas agregadas
 */
function getAggregatedMetrics() {
  try {
    const allMetrics = loadMetrics();
    const aggregated = {
      totalMessagesReceived: 0,
      totalMessagesSent: 0,
      totalFollowUpsSent: 0,
      totalInstances: 0,
      lastUpdated: new Date().toISOString()
    };

    for (const instanceId in allMetrics) {
      const instanceMetrics = allMetrics[instanceId];
      aggregated.totalMessagesReceived += instanceMetrics.messagesReceived || 0;
      aggregated.totalMessagesSent += instanceMetrics.messagesSent || 0;
      aggregated.totalFollowUpsSent += instanceMetrics.followUpsSent || 0;
      aggregated.totalInstances += 1;
    }

    return aggregated;
  } catch (error) {
    console.error("❌ Erro ao obter métricas agregadas:", error);
    return {
      totalMessagesReceived: 0,
      totalMessagesSent: 0,
      totalFollowUpsSent: 0,
      totalInstances: 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Obtém métricas agregadas filtradas por período
 * @param {'today' | 'yesterday' | '7d' | '30d' | 'all' | 'custom'} period - Período para filtrar
 * @param {Object} customDates - Datas personalizadas para período custom
 * @param {string} customDates.startDate - Data inicial (YYYY-MM-DD)
 * @param {string} customDates.endDate - Data final (YYYY-MM-DD)
 * @returns {Object} Métricas agregadas filtradas
 */
function getAggregatedMetricsByPeriod(period = 'all', customDates = null) {
  try {
    const allMetrics = loadMetrics();
    const aggregated = {
      totalMessagesReceived: 0,
      totalMessagesSent: 0,
      totalFollowUpsSent: 0,
      totalInstances: 0,
      lastUpdated: new Date().toISOString(),
      period: period
    };

    // Se for 'all', retorna as métricas totais
    if (period === 'all') {
      for (const instanceId in allMetrics) {
        const instanceMetrics = allMetrics[instanceId];
        aggregated.totalMessagesReceived += instanceMetrics.messagesReceived || 0;
        aggregated.totalMessagesSent += instanceMetrics.messagesSent || 0;
        aggregated.totalFollowUpsSent += instanceMetrics.followUpsSent || 0;
        aggregated.totalInstances += 1;
      }
      return aggregated;
    }

    // Gera array de datas no período
    let dateKeys = [];
    
    switch (period) {
      case 'today':
        // Apenas hoje
        const today = new Date().toISOString().split('T')[0];
        dateKeys = [today];
        break;
      case 'yesterday':
        // Apenas ontem
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        dateKeys = [yesterday.toISOString().split('T')[0]];
        break;
      case '7d':
        // Últimos 7 dias
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          dateKeys.push(date.toISOString().split('T')[0]);
        }
        break;
      case '30d':
        // Últimos 30 dias
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          dateKeys.push(date.toISOString().split('T')[0]);
        }
        break;
      case 'custom':
        if (customDates && customDates.startDate && customDates.endDate) {
          const startDate = new Date(customDates.startDate);
          const endDate = new Date(customDates.endDate);
          const currentDate = new Date(startDate);
          
          while (currentDate <= endDate) {
            dateKeys.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
          }
        } else {
          return aggregated;
        }
        break;
      default:
        return aggregated;
    }

    // Soma as métricas do período para cada instância
    for (const instanceId in allMetrics) {
      const instanceMetrics = allMetrics[instanceId];
      aggregated.totalInstances += 1;

      if (instanceMetrics.dailyStats) {
        for (const dateKey of dateKeys) {
          const dayStats = instanceMetrics.dailyStats[dateKey];
          if (dayStats) {
            aggregated.totalMessagesReceived += dayStats.messagesReceived || 0;
            aggregated.totalMessagesSent += dayStats.messagesSent || 0;
            aggregated.totalFollowUpsSent += dayStats.followUpsSent || 0;
          }
        }
      }
    }

    return aggregated;
  } catch (error) {
    console.error("❌ Erro ao obter métricas agregadas por período:", error);
    return {
      totalMessagesReceived: 0,
      totalMessagesSent: 0,
      totalFollowUpsSent: 0,
      totalInstances: 0,
      lastUpdated: new Date().toISOString(),
      period: period
    };
  }
}

/**
 * Obtém métricas de uma instância específica filtradas por período
 * @param {string} instanceId - ID da instância
 * @param {'1d' | '7d' | '30d' | 'all'} period - Período para filtrar
 * @returns {Object | null} Métricas da instância filtradas
 */
function getInstanceMetricsByPeriod(instanceId, period = 'all') {
  if (!instanceId) {
    return null;
  }

  try {
    const metrics = loadMetrics();
    const instanceMetrics = metrics[instanceId];
    
    if (!instanceMetrics) {
      return null;
    }

    // Se for 'all', retorna as métricas totais
    if (period === 'all') {
      return {
        ...instanceMetrics,
        period: period
      };
    }

    // Calcula as datas para o período
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      default:
        return {
          messagesReceived: 0,
          messagesSent: 0,
          followUpsSent: 0,
          lastUpdated: instanceMetrics.lastUpdated,
          period: period
        };
    }

    // Gera array de datas no período
    const dateKeys = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dateKeys.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Soma as métricas do período
    const periodMetrics = {
      messagesReceived: 0,
      messagesSent: 0,
      followUpsSent: 0,
      lastUpdated: instanceMetrics.lastUpdated,
      period: period,
      dailyStats: {}
    };

    if (instanceMetrics.dailyStats) {
      for (const dateKey of dateKeys) {
        const dayStats = instanceMetrics.dailyStats[dateKey];
        if (dayStats) {
          periodMetrics.messagesReceived += dayStats.messagesReceived || 0;
          periodMetrics.messagesSent += dayStats.messagesSent || 0;
          periodMetrics.followUpsSent += dayStats.followUpsSent || 0;
          periodMetrics.dailyStats[dateKey] = dayStats;
        }
      }
    }

    return periodMetrics;
  } catch (error) {
    console.error(`❌ Erro ao obter métricas da instância ${instanceId} por período:`, error);
    return null;
  }
}

/**
 * Obtém dados para gráfico de tendência por período
 * @param {'1d' | '7d' | '30d'} period - Período para o gráfico
 * @returns {Array} Array com dados diários para gráfico
 */
function getTrendDataByPeriod(period = '7d') {
  try {
    const allMetrics = loadMetrics();
    
    // Calcula as datas para o período
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    // Gera array de datas no período
    const trendData = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayData = {
        date: dateKey,
        messagesReceived: 0,
        messagesSent: 0,
        followUpsSent: 0
      };

      // Soma as métricas de todas as instâncias para este dia
      for (const instanceId in allMetrics) {
        const instanceMetrics = allMetrics[instanceId];
        if (instanceMetrics.dailyStats && instanceMetrics.dailyStats[dateKey]) {
          const dayStats = instanceMetrics.dailyStats[dateKey];
          dayData.messagesReceived += dayStats.messagesReceived || 0;
          dayData.messagesSent += dayStats.messagesSent || 0;
          dayData.followUpsSent += dayStats.followUpsSent || 0;
        }
      }

      trendData.push(dayData);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return trendData;
  } catch (error) {
    console.error("❌ Erro ao obter dados de tendência:", error);
    return [];
  }
}

/**
 * Limpa estatísticas diárias antigas (mantém apenas os últimos 30 dias)
 * @param {string} instanceId - ID da instância (opcional, se não fornecido limpa todas)
 */
function cleanOldDailyStats(instanceId = null) {
  try {
    const metrics = loadMetrics();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffKey = cutoffDate.toISOString().split('T')[0];

    const instancesToClean = instanceId ? [instanceId] : Object.keys(metrics);

    for (const id of instancesToClean) {
      if (metrics[id] && metrics[id].dailyStats) {
        const dailyStats = metrics[id].dailyStats;
        let cleaned = false;

        for (const dateKey in dailyStats) {
          if (dateKey < cutoffKey) {
            delete dailyStats[dateKey];
            cleaned = true;
          }
        }

        if (cleaned) {
          console.log(`🧹 Limpeza de estatísticas antigas para instância: ${id}`);
        }
      }
    }

    saveMetrics(metrics);
  } catch (error) {
    console.error("❌ Erro ao limpar estatísticas antigas:", error);
  }
}

module.exports = {
  initMetricsForInstance,
  incrementMetric,
  getInstanceMetrics,
  getAllMetrics,
  getAggregatedMetrics,
  getAggregatedMetricsByPeriod,
  getInstanceMetricsByPeriod,
  getTrendDataByPeriod,
  cleanOldDailyStats
};
