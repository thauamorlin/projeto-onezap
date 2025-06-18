/**
 * @type {import("../types").Settings}
 */
const defaultSettings = {
  AI_SELECTED: "GPT",
  OPENAI_KEY: "",
  OPENAI_ASSISTANT: "",
  GEMINI_KEY: "",
  GEMINI_PROMPT: "",
  MENSAGEM_PARA_ENVIAR_QUANDO_RECEBER_TIPO_DESCONHECIDO:
    "Desculpe! Eu ainda não sou capaz de entender esse tipo de mensagem",
  HORAS_PARA_REATIVAR_IA: "24",
  SOMENTE_RESPONDER: [],
  NAO_RESPONDER: [],
  SEGUNDOS_PARA_ESPERAR_ANTES_DE_GERAR_RESPOSTA: "10",
  VISUALIZAR_MENSAGENS: false,
  ENVIO_EM_BLOCO: false,
  INCLUIR_NOME_CONTATO: true,
  MESSAGE_TIMER_PRESET: "rapido",
  MESSAGE_DELAY_FACTOR: 50,
  MESSAGE_DELAY_MAX: 2000,
  DEEPSEEK_KEY: "",
  DEEPSEEK_PROMPT: "",
  DEEPSEEK_MODEL: "deepseek-chat",
  INTERVENCAO_HUMANA_IMEDIATA: false,
  // Configurações de follow-up
  FOLLOW_UP_ATIVO: false,
  FOLLOW_UP_TEMPO_VERIFICACAO: "10", // Tempo em minutos para verificação automática
  FOLLOW_UP_GERAR_IA: false, // Se deve gerar mensagens por IA
  FOLLOW_UP_INTERVALO_HORAS: "24", // Intervalo em horas entre mensagens
  FOLLOW_UP_QUANTIDADE_MENSAGENS: "1",
  FOLLOW_UP_MENSAGEM_1: "Olá! Notei que não recebemos resposta. Posso ajudar com mais alguma coisa?",
  FOLLOW_UP_MENSAGEM_2: "Olá novamente! Estou disponível caso precise de alguma informação adicional.",
  FOLLOW_UP_MENSAGEM_3: "Só passando para ver se está tudo bem. Estou à disposição para ajudar!",
  FOLLOW_UP_PROMPT: "", // Prompt customizado para geração de follow-up por IA
}

module.exports = { defaultSettings };
