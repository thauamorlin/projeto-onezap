const { settings, getSettingsFilePath, getAuthDir, loadSettings, userDataPath } = require("./core/config/settings");

const electron = require("electron");
const { clipboard } = require("electron");
const AutoLaunch = require("auto-launch");
const { autoUpdater } = require("electron-updater");
const notifier = require("node-notifier");
const { machineIdSync } = require("node-machine-id");

require("dotenv").config();

// Importar o módulo de métricas
const {
	getInstanceMetrics,
	getAllMetrics,
	getAggregatedMetrics,
	getAggregatedMetricsByPeriod,
	getInstanceMetricsByPeriod,
	getTrendDataByPeriod,
	initMetricsForInstance
} = require("./core/metrics/metricsManager");

const { channels } = require("./shared/constants");

const app = electron.app;

const BrowserWindow = electron.BrowserWindow;

const fs = require("fs");
const path = require("path");
const { createFileRoute, createURLRoute } = require("electron-router-dom");

const { connectWhatsApp } = require("./core/whatsapp/connectWhatsApp");
const { socketClients, connectionStatus } = require("./core/config/states");
const { clearActiveChatsGemini } = require("./core/whatsapp/ai/google");
const { clearActiveChatsOpenAI } = require("./core/whatsapp/ai/openai");
const { defaultSettings } = require("./shared/defaultSettings");
const { forceFlushAllFollowUps } = require("./core/whatsapp/followUpPersistence");

// Importar o módulo de manipuladores IPC
const { setupIpcHandlers } = require("./core/main/ipcHandlers");

/**
 * @type {string[]}
 */
const logsArray = [];

/**
 * @typedef {Object} AIErrorInfo
 * @property {string} id - ID único do erro
 * @property {string} instanceId - ID da instância do cliente
 * @property {string} aiType - Tipo de IA (GEMINI, GPT, DEEPSEEK)
 * @property {string} errorType - Tipo de erro (ex: "Chave de API Inválida")
 * @property {string} errorMessage - Mensagem de erro original
 * @property {string} errorDetails - Detalhes do erro para o usuário
 * @property {string} errorSolution - Sugestão de solução para o usuário
 * @property {string} timestamp - Timestamp ISO do erro
 * @property {number} [count] - Contador de ocorrências
 * @property {string} [originalError] - Erro original como string
 * @property {string} [stack] - Stack trace do erro
 */

/**
 * Armazenamento de erros de IA por instância
 * @type {Map<string, AIErrorInfo[]>}
 */
const aiErrorsStorage = new Map();

const originalConsoleLog = console.log;

console.log = (...args) => {
	originalConsoleLog(...args);
	logsArray.push(args.join(" "));
	if (logsArray.length > 1000) {
		logsArray.shift();
	}
};

const generateDeviceId = () => {
	// @ts-ignore
	return machineIdSync({ original: true });
};

const deviceId = generateDeviceId();
console.log("Device ID:", deviceId);

const appID = "zap-gpt";
const appName = "Zap GPT";
const icon = path.join(__dirname, "icons", "win", "favicon.ico");

/**
 * @type {Electron.BrowserWindow}
 */
let mainWindow;

function createWindow() {
	console.log("create window");
	electron.Menu.setApplicationMenu(null);

	setupIpcHandlers(electron.ipcMain, { socketClients, connectionStatus });

	electron.ipcMain.on(channels.START_WHATS, async (event, instanceId) => {
		if (socketClients[instanceId]) {
			console.log("socketClients[instanceId]", !!socketClients[instanceId]);
			return;
		}
		connectWhatsApp(event, instanceId);
	});
	electron.ipcMain.on(channels.LOGOUT, () => {
		app.quit();
	});

	electron.ipcMain.on(
		channels.SAVE_SETTINGS,
		(event, { newSettings, instanceId }) => {
			settings[instanceId] = newSettings;
			fs.writeFile(
				getSettingsFilePath(instanceId),
				JSON.stringify(newSettings),
				(err) => {
					if (err) {
						console.error("Erro ao salvar configurações:", err);
						event.reply(channels.SAVE_SETTINGS_REPLY, { success: false });
					} else {
						event.reply(channels.SAVE_SETTINGS_REPLY, { success: true });
					}
				},
			);
		},
	);

	electron.ipcMain.on(channels.LOAD_SETTINGS, (event, instanceId) => {
		event.reply(channels.LOAD_SETTINGS_REPLY, settings[instanceId]);
	});

	electron.ipcMain.on(channels.COPY_SETTINGS, (event, instanceId) => {
		event.reply(channels.COPY_SETTINGS_REPLY, settings[instanceId]);
	});

	electron.ipcMain.handle("get-logs", async () => {
		return logsArray;
	});

	electron.ipcMain.handle(channels.DISCONNECTED_ALL, async () => {
		for (const instanceId in socketClients) {
			if (socketClients[instanceId]) {
				socketClients[instanceId].end(
					new Error("disconnect by logout zap-gpt"),
				);
				// @ts-ignore
				socketClients[instanceId] = null;
			}
		}
		return true;
	});

	electron.ipcMain.handle(
		channels.DISCONNECT_INSTANCE,
		async (_, instanceId) => {
			if (socketClients[instanceId]) {
				console.log(`Desconectando instância: ${instanceId}`);
				socketClients[instanceId].end(
					new Error("disconnect by logout zap-gpt"),
				);
				// @ts-ignore
				socketClients[instanceId] = null;
				return {
					success: true,
					message: `Instância ${instanceId} desconectada.`,
				};
			}
			console.log(`Instância ${instanceId} já está desconectada.`);
			return {
				success: false,
				message: `Instância ${instanceId} já está desconectada.`,
			};
		},
	);

	electron.ipcMain.handle(
		channels.LOGOUT_INSTANCE,
		async (_, instanceId) => {
			const authDir = getAuthDir(instanceId);

			if (socketClients[instanceId]) {
				console.log(`Fazendo logout da instância: ${instanceId}`);
				// @ts-ignore
				socketClients[instanceId]?.logout(new Error("logout"));
				// @ts-ignore
				socketClients[instanceId] = null;
			}

			// Remove os arquivos de autenticação da instância
			if (fs.existsSync(authDir)) {
				fs.readdirSync(authDir).forEach((file) => {
					const filePath = path.join(authDir, file);
					// Preserva apenas o arquivo de configurações
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
				console.log(
					`Diretório de autenticação removido para instância: ${instanceId}`,
				);
				return {
					success: true,
					message: `Logout completo para a instância ${instanceId}.`,
				};
			}
			console.log(
				`Diretório de autenticação não encontrado para a instância: ${instanceId}`,
			);
			return {
				success: false,
				message: `Instância ${instanceId} não encontrada.`,
			};
		},
	);

	electron.ipcMain.handle(channels.RESET_CHATS, async (_, instanceId) => {
		const aiSelected = settings[instanceId].AI_SELECTED;

		if (aiSelected === "GPT") {
			clearActiveChatsOpenAI(instanceId);
		}
		if (aiSelected === "GEMINI") {
			clearActiveChatsGemini(instanceId);
		}
		return true;
	});

	electron.ipcMain.handle("get-deviceId", async () => {
		return deviceId;
	});

	electron.ipcMain.on("copy-logs", (_, logs) => {
		clipboard.writeText(logs);
	});

	electron.ipcMain.on(channels.SET_INSTANCE_ID, (event, instanceId) => {
		const settingsFilePath = getSettingsFilePath(instanceId);
		const authDir = getAuthDir(instanceId);

		if (!fs.existsSync(authDir)) {
			fs.mkdirSync(authDir, { recursive: true });
		}

		if (!fs.existsSync(settingsFilePath)) {
			fs.writeFileSync(settingsFilePath, JSON.stringify(defaultSettings));
			settings[instanceId] = defaultSettings;
		}
		loadSettings(instanceId);

		event.reply(channels.LOAD_SETTINGS_REPLY, settings[instanceId]);

		fs.readdir(userDataPath, (err, files) => {
			if (err) {
				event.reply(channels.GET_INSTANCE_LIST_REPLY, []);
				return;
			}

			const instances = files
				.filter((file) => file.startsWith("zap-gpt-auth"))
				.map((file) =>
					file === "zap-gpt-auth"
						? "default"
						: file.replace("zap-gpt-auth-", ""),
				);

			event.reply(channels.GET_INSTANCE_LIST_REPLY, instances);
		});
	});

	electron.ipcMain.on(channels.DELETE_INSTANCE, (event, instanceId) => {
		const authDir = getAuthDir(instanceId);

		if (fs.existsSync(authDir)) {
			try {
				fs.rmdirSync(authDir, { recursive: true });
				delete settings[instanceId];
				console.log(`Instance ${instanceId} and its settings deleted.`);
				event.reply(channels.DELETE_INSTANCE_REPLY, {
					success: true,
					instanceId,
				});
			} catch (err) {
				console.error(
					`Error deleting auth directory for instance ${instanceId}:`,
					err,
				);
				event.reply(channels.DELETE_INSTANCE_REPLY, {
					success: false,
					// @ts-ignore
					error: err.message,
				});
			}
		} else {
			event.reply(channels.DELETE_INSTANCE_REPLY, {
				success: false,
				error: "Instance not found",
			});
		}

		// @ts-ignore
		socketClients[instanceId]?.logout(new Error("logout"));
	});

	electron.ipcMain.on(channels.GET_INSTANCE_LIST, (event) => {
		const userDataPath = process.env.HOME || process.env.USERPROFILE;

		// @ts-ignore
		fs.readdir(userDataPath, (err, files) => {
			if (err) {
				event.sender.send(channels.GET_INSTANCE_LIST_REPLY, []);
				return;
			}

			const instances = files
				.filter((file) => file.startsWith("zap-gpt-auth"))
				.map((file) =>
					file === "zap-gpt-auth"
						? "default"
						: file.replace("zap-gpt-auth-", ""),
				);

			event.sender.send(channels.GET_INSTANCE_LIST_REPLY, instances);
		});
	});

	electron.ipcMain.on(
		channels.RENAME_INSTANCE,
		(event, { oldInstanceName, newInstanceName }) => {
			const oldAuthDir = getAuthDir(oldInstanceName);
			const newAuthDir = getAuthDir(newInstanceName);

			if (fs.existsSync(newAuthDir)) {
				event.reply(channels.RENAME_INSTANCE_REPLY, {
					success: false,
					error: "Já existe uma instância com esse nome.",
				});
				return;
			}

			try {
				fs.renameSync(oldAuthDir, newAuthDir);

				const oldSettingsPath = getSettingsFilePath(oldInstanceName);
				const newSettingsPath = getSettingsFilePath(newInstanceName);
				if (fs.existsSync(oldSettingsPath)) {
					fs.renameSync(oldSettingsPath, newSettingsPath);
				}

				settings[newInstanceName] = settings[oldInstanceName];
				delete settings[oldInstanceName];

				event.reply(channels.RENAME_INSTANCE_REPLY, {
					success: true,
					oldInstanceName,
					newInstanceName,
				});
			} catch (err) {
				console.error(`Error renaming instance ${oldInstanceName}:`, err);
				event.reply(channels.RENAME_INSTANCE_REPLY, {
					success: false,
					// @ts-ignore
					error: err.message,
				});
			}
		},
	);

	electron.ipcMain.on(channels.CLEAR_ALL_AI_ERRORS, (_, instanceId) => {
		if (aiErrorsStorage.has(instanceId)) {
			aiErrorsStorage.set(instanceId, []);
		}
	});

	// Handlers IPC para métricas
	electron.ipcMain.handle("get-instance-metrics", async (_, instanceId) => {
		try {
			if (!instanceId) {
				return null;
			}

			// Inicializa métricas se não existir
			initMetricsForInstance(instanceId);

			return getInstanceMetrics(instanceId);
		} catch (error) {
			console.error(`❌ Erro ao obter métricas da instância ${instanceId}:`, error);
			return null;
		}
	});

	electron.ipcMain.handle("get-all-metrics", async () => {
		try {
			return getAllMetrics();
		} catch (error) {
			console.error("❌ Erro ao obter todas as métricas:", error);
			return {};
		}
	});

	electron.ipcMain.handle("get-aggregated-metrics", async () => {
		try {
			return getAggregatedMetrics();
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
	});

	electron.ipcMain.handle("get-aggregated-metrics-by-period", async (_, period, customDates) => {
		try {
			return getAggregatedMetricsByPeriod(period, customDates);
		} catch (error) {
			console.error("❌ Erro ao obter métricas agregadas por período:", error);
			return {
				totalMessagesReceived: 0,
				totalMessagesSent: 0,
				totalFollowUpsSent: 0,
				totalInstances: 0,
				lastUpdated: new Date().toISOString(),
				period: period || 'all'
			};
		}
	});

	electron.ipcMain.handle("get-instance-metrics-by-period", async (_, instanceId, period) => {
		try {
			return getInstanceMetricsByPeriod(instanceId, period);
		} catch (error) {
			console.error(`❌ Erro ao obter métricas da instância ${instanceId} por período:`, error);
			return null;
		}
	});

	electron.ipcMain.handle("get-trend-data-by-period", async (_, period) => {
		try {
			return getTrendDataByPeriod(period);
		} catch (error) {
			console.error("❌ Erro ao obter dados de tendência:", error);
			return [];
		}
	});

	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 900,
		icon: path.join(__dirname, "icons", "win", "256x256.png"),
		title: "Zap GPT",
		webPreferences: {
			nodeIntegration: true,
			// enableRemoteModule: true,
			contextIsolation: false,
			// preload: path.join(__dirname, "preload.js"),
		},
	});

	if (process.env.ELECTRON_START_URL) {
		// and load the index.html of the app.

		mainWindow.loadURL(createURLRoute(process.env.ELECTRON_START_URL, "main"));
	} else {
		mainWindow.loadFile(
			...createFileRoute(path.join(__dirname, "../build/index.html"), "main"),
		);
	}

	if (process.env.REACT_APP_ENVIRONMENT === "DEV") {
		mainWindow.webContents.openDevTools({ mode: "detach" });
	}

	// Emitted when the window is closed.
	mainWindow.on("closed", () => {
		// @ts-ignore
		mainWindow = null;
	});

	const autoLaunch = new AutoLaunch({
		name: appName,
		path: app.getPath("exe"),
	});
	autoLaunch.isEnabled().then((isEnabled) => {
		if (!isEnabled) autoLaunch.enable();
	});

	// Manipuladores para os erros de IA persistentes
	electron.ipcMain.on(channels.AI_ERROR, (_, errorInfo) => {
		// Armazenar erro por instância
		const instanceId = errorInfo.instanceId;
		if (!aiErrorsStorage.has(instanceId)) {
			aiErrorsStorage.set(instanceId, []);
		}

		// Garantir que temos o array de erros
		/** @type {AIErrorInfo[]} */
		const errors = aiErrorsStorage.get(instanceId) || [];

		// Agrupar erros similares
		const similarErrorIndex = errors.findIndex(
			err => err.errorType === errorInfo.errorType &&
				err.aiType === errorInfo.aiType
		);

		if (similarErrorIndex >= 0) {
			// Atualizar erro existente
			errors[similarErrorIndex] = {
				...errors[similarErrorIndex],
				count: (errors[similarErrorIndex].count || 1) + 1,
				timestamp: errorInfo.timestamp,
				errorMessage: errorInfo.errorMessage,
				errorDetails: errorInfo.errorDetails,
				errorSolution: errorInfo.errorSolution,
				originalError: errorInfo.originalError,
				stack: errorInfo.stack
			};
		} else {
			// Adicionar novo erro (limitado a 3 por instância)
			errorInfo.count = 1;
			errors.unshift(errorInfo);

			// Manter apenas os 3 erros mais recentes
			if (errors.length > 3) {
				errors.pop();
			}
		}

		// Atualizar o armazenamento
		aiErrorsStorage.set(instanceId, errors);

		// Repassar o erro para todas as janelas abertas
		BrowserWindow.getAllWindows().forEach(window => {
			if (!window.isDestroyed()) {
				window.webContents.send(channels.AI_ERROR, errorInfo);
			}
		});
	});

	electron.ipcMain.handle(channels.GET_STORED_AI_ERRORS, (_, instanceId) => {
		return aiErrorsStorage.get(instanceId) || [];
	});

	electron.ipcMain.on(channels.CLEAR_AI_ERROR, (_, { instanceId, errorId }) => {
		if (aiErrorsStorage.has(instanceId)) {
			/** @type {AIErrorInfo[]} */
			const errors = aiErrorsStorage.get(instanceId) || [];
			const filteredErrors = errors.filter(err => err.id !== errorId);
			aiErrorsStorage.set(instanceId, filteredErrors);
		}
	});
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
	app.quit(); // Fecha a instância duplicada imediatamente
} else {
	app.on("second-instance", () => {
		// Foca na janela principal se o usuário tentar abrir outra instância
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
		}
	});
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

app.on("ready", () => {
	checkForUpdates();
});

// Handler para salvar follow-ups antes de fechar
app.on("before-quit", async (event) => {
	console.log("💾 Aplicação sendo fechada. Salvando follow-ups...");
	event.preventDefault();

	try {
		await forceFlushAllFollowUps();
		console.log("✅ Follow-ups salvos com sucesso");
	} catch (error) {
		console.error("❌ Erro ao salvar follow-ups:", error);
	}

	app.exit();
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== "darwin") {
		app.quit();
		// if (socketClient) {
		//   socketClient.end(new Error("disconnect"));
		// }
	}
});

app.on("activate", () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createWindow();
	}
});

function checkForUpdates() {
	autoUpdater.checkForUpdatesAndNotify();

	autoUpdater.on("checking-for-update", () => {
		console.log("Checking for update...");
	});

	autoUpdater.on("update-available", () => {
		console.log("Update available.");
		notifier.notify({
			title: "Atualização Disponível",
			message:
				"Uma nova versão do aplicativo está disponível. Será baixada em breve.",
			icon,
			sound: true,
			wait: false,
			appID,
		});
	});

	autoUpdater.on("update-not-available", () => { });

	autoUpdater.on("error", (err) => {
		console.log("Error in auto-updater. ", err);
		notifier.notify({
			title: "Erro",
			message: "Erro ao atualizar versão.",
			icon,
			sound: true,
			wait: false,
			appID,
		});
	});

	autoUpdater.on("download-progress", (progressObj) => {
		let log_message = `Download speed: ${progressObj.bytesPerSecond}`;
		log_message = `${log_message} - Downloaded ${progressObj.percent}%`;
		log_message = `${log_message} (${progressObj.transferred}/${progressObj.total})`;
		console.log(log_message);
	});

	autoUpdater.on("update-downloaded", () => {
		console.log("Update downloaded");
		notifier.notify({
			title: "Atualização Baixada",
			message: "A atualização foi baixada. O aplicativo será reiniciado.",
			icon,
			sound: true,
			wait: false,
			appID,
		});
		autoUpdater.quitAndInstall();
	});
}
