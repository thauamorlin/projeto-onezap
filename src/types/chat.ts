/**
 * Informações sobre o tipo de mídia
 */
export interface MediaInfo {
  /** Emoji que representa o tipo de mídia */
  icon: string;
  /** Texto descritivo do tipo de mídia */
  label: string;
  /** Classe CSS de cor de fundo */
  bgColor: string;
  /** Classe CSS de cor de borda */
  borderColor: string;
}

/**
 * Propriedades para mensagens de mídia
 */
export interface MediaMessageProps {
  /** Tipo da mídia */
  type: 'image'|'video'|'audio'|'document'|'sticker'|'contact'|'location'|'reaction'|'interactive'|'poll';
  /** Legenda da mídia (opcional) */
  caption?: string;
}

/**
 * Chave da mensagem
 */
export interface MessageKey {
  /** ID único da mensagem */
  id: string;
  /** Indica se a mensagem foi enviada pelo usuário */
  fromMe: boolean;
  /** JID do remetente/destinatário remoto */
  remoteJid: string;
}

/**
 * Conteúdo de mídia
 */
export interface MediaContent {
  /** Legenda da mídia */
  caption?: string;
  /** Nome do arquivo (para documentos) */
  fileName?: string;
}

/**
 * Conteúdo da mensagem
 */
export interface MessageContent {
  /** Conteúdo de texto simples */
  conversation?: string;
  /** Mensagem de texto estendida */
  extendedTextMessage?: {
    /** Texto da mensagem estendida */
    text: string;
  };
  /** Mensagem de imagem */
  imageMessage?: MediaContent;
  /** Mensagem de vídeo */
  videoMessage?: MediaContent;
  /** Mensagem de áudio */
  audioMessage?: MediaContent;
  /** Mensagem de documento */
  documentMessage?: MediaContent;
  /** Mensagem de sticker */
  stickerMessage?: object;
  /** Mensagem de contato */
  contactMessage?: object;
  /** Mensagem de contatos múltiplos */
  contactsArrayMessage?: object;
  /** Mensagem de localização */
  locationMessage?: object;
  /** Mensagem de botões */
  buttonsMessage?: object;
  /** Mensagem de template */
  templateMessage?: object;
  /** Mensagem de criação de enquete */
  pollCreationMessage?: object;
  /** Mensagem de atualização de enquete */
  pollUpdateMessage?: object;
}

/**
 * Mensagem completa
 */
export interface Message {
  /** Chave da mensagem */
  key: MessageKey;
  /** Conteúdo da mensagem */
  message: MessageContent;
  /** Timestamp da mensagem */
  messageTimestamp: number;
  /** Timestamp alternativo para uso interno */
  timestamp?: number;
  /** Estado de leitura da mensagem */
  read?: boolean;
  /** Nome do remetente (se disponível) */
  pushName?: string;
}

/**
 * Informações do chat
 */
export interface ChatInfo {
  /** ID do chat */
  id: string;
  /** Nome do contato ou grupo */
  name: string;
  /** Última mensagem recebida/enviada */
  lastMessage: string;
  /** Nome do remetente da última mensagem (usado em grupos) */
  lastMessageSender?: string;
  /** Timestamp da última mensagem */
  timestamp: number;
  /** Número de mensagens não lidas */
  unreadCount: number;
  /** Indica se o chat é um grupo */
  isGroup?: boolean;
  /** Indica se a última mensagem foi enviada por nós */
  lastMessageFromMe?: boolean;
}
