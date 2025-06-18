# Sistema de Detecção de Intervenção Humana

Este sistema gerencia o comportamento da IA nas conversas do WhatsApp, identificando intervenção humana e controlando quando a IA deve parar de responder.

## Funcionamento

### 1. Chats Ativos
- Um chat se torna ativo (`activeChatId`) quando a IA processa e responde a uma mensagem
- Os chats ativos são mantidos por instância do sistema no objeto `activeChatId[instanceId]` como um `Set<string>`
- Um chat ativo significa que a IA está engajada na conversa e potenciais mensagens enviadas pelo usuário (não o contato) serão consideradas intervenção humana

### 2. Mensagens Enviadas pelo Bot (IDs rastreados)
- Todas as mensagens enviadas pelo bot têm seus IDs armazenados em `sentMessageIds`
- Isso permite distinguir mensagens enviadas pelo bot daquelas enviadas por intervenção humana
- A função `trackSentMessageId` é usada para registrar as mensagens enviadas pelo bot
- Um timer limpa o conjunto `sentMessageIds` a cada 24 horas para evitar consumo excessivo de memória

### 3. Detecção de Intervenção Humana
Uma intervenção humana é detectada quando TODAS as condições abaixo são satisfeitas:
- A mensagem é marcada como enviada por nós (`fromMe: true`)
- A mensagem NÃO está registrada como enviada pelo bot (`!hasSentMessagesIds(messageId)`)
- A mensagem não é de status/broadcast
- O chat já está ativo (`activeChatIdSet.has(chatId)`)

### 4. Ações após Detecção de Intervenção
Quando uma intervenção humana é detectada:
- O chat é adicionado à lista de chats excluídos (`excludedNumbersByIntervention`)
- A IA para de responder a mensagens neste chat
- Um timer é configurado para remover o chat da lista após o período configurado (`HORAS_PARA_REATIVAR_IA`)
- Logs detalhados indicam exatamente quais condições foram satisfeitas para a detecção

### 5. Reinício de Respostas
- Após o período de tempo configurado, o chat é removido da lista de excluídos
- A IA pode voltar a responder a mensagens neste chat
- Logs indicam quando um chat foi reativado

## Persistência durante Reconexões

- Durante reconexões, os registros de chats ativos são preservados
- Isso garante que a detecção de intervenção humana continue funcionando
- Apenas durante logout completo as estruturas são limpas

## Logs e Debug
- O sistema possui logs detalhados para facilitar a depuração
- É possível rastrear exatamente quando um chat se torna ativo, quando uma intervenção é detectada, e quando o chat é reativado
- Mensagens grandes nos logs são truncadas para facilitar a leitura
- Emojis são usados para categorizar as mensagens de log e facilitar a identificação visual

## Dados Persistentes (Por Sessão)
- `activeChatId`: Conjunto de IDs de chats ativos
- `sentMessageIds`: Conjunto de IDs de mensagens enviadas pelo bot
- `excludedNumbersByIntervention`: Conjunto de IDs de chats com intervenção humana detectada

## Como adicionar mais logs para diagnóstico

Para adicionar mais logs em pontos específicos, utilize console.log com prefixos distintivos:
```javascript
// Para logs relacionados à intervenção humana
console.log(`🚫 [INTERVENÇÃO] Detecção em ${chatId}`);

// Para logs relacionados à atividade dos chats
console.log(`✅ [CHAT-ATIVO] Chat ${chatId} marcado como ativo`);

// Para logs relacionados às mensagens enviadas pelo bot
console.log(`📤 [MENSAGEM] ID ${messageId} enviada pelo bot`);
```

Estes conjuntos são limpos quando a aplicação é reiniciada ou periodicamente, dependendo da configuração.
