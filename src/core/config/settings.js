const fs = require("fs");
const path = require("path");
const { defaultSettings } = require("../../shared/defaultSettings");

/** @type {Record<string, import("../../types").Settings>} */
// biome-ignore lint/style/useConst: <explanation>
let settings = {};



/**
 * @type {string}
 */
const userDataPath = process.env.HOME || process.env.USERPROFILE || "";

// Novo padrão de diretório (OneZap)
const NEW_AUTH_PREFIX = "onezap-auth";
// Legado (para retrocompatibilidade)
const LEGACY_AUTH_PREFIX = "zap-gpt-auth";

/**
 * Retorna o nome do diretório para uma instância
 * @param {string} instanceId
 * @param {string} prefix
 */
function getAuthDirName(instanceId, prefix) {
  return instanceId === "default" ? prefix : `${prefix}-${instanceId}`;
}

/**
 * Obtém o diretório de autenticação, verificando primeiro o novo padrão e fazendo fallback para o legado
 * @param {string} instanceId
 */
function getAuthDir(instanceId) {
  const newDir = path.join(userDataPath, getAuthDirName(instanceId, NEW_AUTH_PREFIX));
  const legacyDir = path.join(userDataPath, getAuthDirName(instanceId, LEGACY_AUTH_PREFIX));

  // Se o novo diretório existe, usa ele
  if (fs.existsSync(newDir)) {
    return newDir;
  }

  // Se o diretório legado existe, usa ele (retrocompatibilidade)
  if (fs.existsSync(legacyDir)) {
    return legacyDir;
  }

  // Nenhum existe, retorna o novo (será criado posteriormente)
  return newDir;
}

/**
 * @param {string} instanceId
 */
function getSettingsFilePath(instanceId) {
  return path.join(getAuthDir(instanceId), "settings.json");
}

/**
 * @param {string} instanceId
 */
function loadSettings(instanceId) {
  try {
    const data = fs.readFileSync(getSettingsFilePath(instanceId), "utf8");
    settings[instanceId] = JSON.parse(data);
  } catch (err) {
    console.error("Erro ao carregar configurações:", err);
  }
}

settings.default = defaultSettings;

module.exports = { settings, getAuthDir, loadSettings, getSettingsFilePath, userDataPath };
