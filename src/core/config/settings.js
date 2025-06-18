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

/**
 * @param {string} instanceId
 */
function getSettingsFilePath(instanceId) {
  return path.join(
    userDataPath,
    instanceId === "default" ? "zap-gpt-auth" : `zap-gpt-auth-${instanceId}`,
    "settings.json"
  );
}

/**
 * @param {string} instanceId
 */
function getAuthDir(instanceId) {
  return path.join(
    userDataPath,
    instanceId === "default" ? "zap-gpt-auth" : `zap-gpt-auth-${instanceId}`
  );
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
