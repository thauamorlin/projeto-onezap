module.exports = {
	channels: {
		STATUS_UPDATE: "STATUS_UPDATE",
		NEW_MESSAGE: "NEW_MESSAGE",
		START_WHATS: "start_whats",
		LOGOUT: "logout",
		TOAST: "toast",
		SAVE_SETTINGS: "save_settings",
		LOAD_SETTINGS: "load_settings",
		LOAD_SETTINGS_REPLY: "load_settings_reply",
		SAVE_SETTINGS_REPLY: "save_settings_reply",
		LOG: "log",
		// Novos eventos adicionados:
		SET_INSTANCE_ID: "set_instance_id", // Para definir a instância selecionada
		GET_INSTANCE_LIST: "get_instance_list", // Para solicitar a lista de instâncias
		GET_INSTANCE_LIST_REPLY: "get_instance_list_reply", // Para receber a lista de instâncias do processo principal
		DELETE_INSTANCE: "DELETE_INSTANCE", // Para receber a lista de instâncias do processo principal
		DELETE_INSTANCE_REPLY: "DELETE_INSTANCE_REPLY", // Para receber a lista de instâncias do processo principal
		RENAME_INSTANCE: "rename_instance",
		RENAME_INSTANCE_REPLY: "rename_instance_reply",
		COPY_SETTINGS: "copy_settings",
		COPY_SETTINGS_REPLY: "copy_settings_reply",
		DISCONNECTED_ALL: "disconnected_all",
		RESET_CHATS: "reset_chats",
		DISCONNECT_INSTANCE: "disconnect_instance",
		LOGOUT_INSTANCE: "logout_instance",
		// Adicionar novo canal para notificações de erros de IA
		AI_ERROR: "ai-error",
		AI_ERROR_REPLY: "ai-error-reply",
		GET_STORED_AI_ERRORS: "get-stored-ai-errors",
		GET_STORED_AI_ERRORS_REPLY: "get-stored-ai-errors-reply",
		CLEAR_AI_ERROR: "clear-ai-error",
		CLEAR_ALL_AI_ERRORS: "clear-all-ai-errors",
		CHAT_CLEARED: "chat-cleared",
	},
};
