export const updates = [
	{
		version: "3.2.1",
		changes: [
			{
				icon: "🔄",
				title: "Correção bug de follow up",
				content: "Corrigido um bugs encontrados no follow up.",
			},
			{
				title: "Logs corrigidos",
				content: "Os logs não estavam sendo exibidos corretamente, agora estão funcionando como esperado.",
				icon: "📜"
			},
			{
				title: "Melhorias visuais no chat",
				content: "O chat integrado recebeu melhorias visuais para uma experiência mais agradável",
				icon: "🎨"
			}
		],
	},
	{
		version: "3.2.0",
		changes: [
			{
				icon: "🔄",
				title: "Follow up inteligente com IA",
				content: "Nova funcionalidade! A IA agora analisa automaticamente as conversas após o cliente parar de responder e decide de forma inteligente se deve enviar uma mensagem de follow up. Você pode configurar mensagens personalizadas, adicionar promoções e criar estratégias de reengajamento totalmente customizadas.",
				isHighlight: true
			},
			{
				icon: "🗑️",
				title: "Apagar conversas de chat específico",
				content: "Agora é possível apagar conversas de chat específico, facilitando a limpeza de conversas antigas e inativas."
			},
			{
				icon: "📊",
				title: "Tela de Métricas",
				content: "Adicionada nova tela de métricas com informações detalhadas como mensagens enviadas pela IA, mensagens processadas pelo bot, follow ups enviados por instância e muito mais para acompanhar o desempenho do seu bot."
			},
			{
				icon: "🤖",
				title: "Correção no Modo IA do Chat",
				content: "Ajustado o funcionamento do modo IA no chat integrado. Agora, quando o modo IA está ativo, isso garante com certeza que aquele chat específico está sendo respondido pela IA, eliminando conflitos com outras configurações como 'responder somente um número'."
			}
		],
	},
	{
		version: "3.1.1",
		changes: [
			{
				icon: "🛠️",
				title: "Correção do Bug de Intervenção Humana Imediata",
				content: "Corrigido um problema onde a IA não respondia a novos contatos após o app ser reiniciado, interpretando incorretamente que já havia ocorrido uma intervenção humana. A verificação agora é feita apenas pelo estado atual da sessão, sem considerar o histórico armazenado."
			},
			{
				icon: "🔄",
				title: "Correção de Instabilidade na Conexão",
				content: "Resolvido um bug que causava problemas de instabilidade onde o WhatsApp ficava conectando e desconectando sem parar, melhorando a estabilidade geral da aplicação."
			},
			{
				icon: "🎬",
				title: "Novos Vídeos Tutoriais",
				content: "Adicionados novos vídeos tutoriais para configurações de conversas, importação de informações, criação de instâncias, instalação no Windows e criação de prompts, organizados em categorias para facilitar o aprendizado."
			}
		]
	},
	{
		version: "3.1.0",
		changes: [
			{
				icon: "🛠️",
				title: "Correção na Detecção de Intervenção Humana",
				content: "Corrigido um problema intermitente onde o sistema às vezes não detectava corretamente a intervenção humana. A aplicação agora gerencia melhor o rastreamento de mensagens por instância."
			},
			{
				icon: "🔘",
				title: "Nova Opção de Intervenção Manual",
				content:
					"Adicionada a opção \"Não responder após mensagem manual\" que impede a IA de responder conversas que você iniciou primeiro. Recomendado manter DESATIVADA para quem faz disparos de campanhas no WhatsApp, pois a IA não conseguirá responder leads que entrarem em contato após seu disparo inicial.",
			},
			{
				icon: "🔍",
				title: "Filtro de Conversas Vazias",
				content:
					"Implementado um filtro inteligente que oculta conversas sem mensagens, melhorando a organização e evitando a exibição de chats desnecessários na interface.",
			},
			{
				icon: "☎️",
				title: "Correção para Números Inválidos",
				content:
					"Adicionada validação para evitar o envio de mensagens para números em formato incorreto ou não reconhecido pelo WhatsApp.",
			},
			{
				icon: "📚",
				title: "Página de Tutoriais",
				content:
					"Adicionada uma página de tutoriais completos sobre o uso do OneZap diretamente dentro do app, facilitando o aprendizado de todas as funcionalidades.",
			},
			{
				icon: "🔔",
				title: "Exibição Detalhada de Erros de IA",
				content:
					"Agora os erros de conexão com a IA são exibidos com detalhes específicos, permitindo identificar melhor os problemas quando a IA não responde.",
			},
			{
				icon: "🔴",
				title: "Erros de IA em Destaque nos Logs",
				content:
					"Os erros relacionados à IA agora aparecem em vermelho nos logs, tornando-os mais visíveis para análise e solução rápida de problemas.",
			},
			{
				icon: "🔄",
				title: "Correção no Carregamento da Conexão",
				content:
					"Resolvido o problema onde a conexão ficava carregando infinitamente sem estabelecer contato com o WhatsApp.",
			},
		],
	},
	{
		version: "3.0.1",
		changes: [
			{
				icon: "🚪",
				title: "Correção no Botão de Logout",
				content:
					"Corrigido um problema onde o botão de logout não funcionava corretamente, impedindo a desconexão do WhatsApp.",
			},
			{
				icon: "📋",
				title: "Correção ao Copiar Configurações entre Instâncias",
				content:
					"Resolvido um bug onde, em alguns casos, o app travava ao importar configurações de uma instância para outra.",
			},
			{
				icon: "🎯",
				title: "Foco Automático no Chat Após Envio",
				content:
					"Após enviar uma mensagem no novo chat integrado, o foco agora retorna automaticamente para a caixa de texto, facilitando o envio de mensagens seguidas.",
			},
		],
	},
	{
		version: "3.0.0",
		changes: [
			{
				icon: "🚀",
				title: "Redesign Visual Completo",
				content:
					"Interface totalmente reformulada para proporcionar uma experiência mais fluida e intuitiva aos usuários.",
			},
			{
				icon: "💬",
				title: "Novo Chat Integrado",
				content:
					"Agora o app possui um chat espelho do WhatsApp! Nele, é possível configurar manualmente quais chats a IA deve responder, visualizar chats inativos por intervenção humana e enviar mensagens de texto (beta).",
			},
			{
				icon: "🛠️",
				title: "Refatoração da Lógica de Tratamento de Mensagens",
				content:
					"O código responsável pelo processamento das mensagens foi completamente reestruturado, melhorando a estabilidade do app e garantindo o funcionamento correto da intervenção humana.",
			},
			{
				icon: "🤖",
				title: "Escolha Personalizada de Modelos e Temperaturas do Gemini",
				content:
					"Agora é possível selecionar diferentes modelos do Gemini e ajustar a temperatura diretamente no aplicativo, oferecendo maior controle sobre as respostas da IA.",
			},
			{
				icon: "🧠",
				title: "Gerenciamento de Assistentes da OpenAI",
				content:
					"O OneZap agora permite configurar seus assistentes personalizados da OpenAI! É possível alterar prompts, temperatura, top-p e até mesmo escolher o modelo do assistente diretamente no app.",
			},
			{
				icon: "📩",
				title: "Fila de Mensagens para Melhor Coerência",
				content:
					"Implementamos um sistema de filas para garantir que as mensagens sejam processadas na ordem correta. Isso melhora a fluidez das respostas da IA, evitando confusão entre diferentes assuntos.",
			},
		],
	},
	{
		version: "2.0.6",
		changes: [
			{
				icon: "🔧",
				title: "Correção no Envio de Metadados para a IA",
				content:
					"Corrigido um problema onde a IA incluía informações de metadados na resposta final enviada ao usuário.",
			},
			{
				icon: "⚙️",
				title: "Nova Opção para Incluir ou Não o Nome do Contato",
				content:
					"Agora é possível configurar se a IA deve receber ou não o nome do contato do WhatsApp, permitindo maior personalização no processamento das respostas.",
			},
		],
	},
	{
		version: "2.0.5",
		changes: [
			{
				icon: "⏰",
				title: "Correção na Exibição de Dados de Horário",
				content:
					"Corrigido um problema onde a IA mencionava horários e datas de mensagens que não deveria.",
			},
			{
				icon: "📝",
				title: "Melhoria na Tela de Logs",
				content:
					"A tela de logs foi aprimorada para exibir informações de forma mais organizada e clara, facilitando a análise de eventos.",
			},
			{
				icon: "🚫",
				title: "Correção para evitar abertura de múltiplas janelas",
				content:
					"Agora o OneZap impede que o aplicativo seja aberto mais de uma vez ao mesmo tempo. Se já houver uma janela em execução, ela será trazida para frente.",
			},
		],
	},
	{
		version: "2.0.4",
		changes: [
			{
				icon: "🔒",
				title: "Correções de Segurança",
				content:
					"Atualizações para melhorar a segurança da aplicação.",
			},
		],
	},
	{
		version: "2.0.3",
		changes: [
			{
				icon: "🧠",
				title: "Nova Opção de IA: DeepSeek",
				content:
					"Adicionada a opção de utilizar o modelo DeepSeek como alternativa de IA no OneZap.",
			},
			{
				icon: "🎨",
				title: "Melhorias Visuais no Login",
				content:
					"A tela de login recebeu melhorias visuais para uma experiência mais fluida e intuitiva.",
			},
			{
				icon: "🆘",
				title: "Botão de Suporte via WhatsApp",
				content:
					"Agora há um botão de suporte na tela de login para facilitar o contato com a equipe pelo WhatsApp.",
			},
			{
				icon: "👀",
				title: "Opção para Visualizar ou Não Mensagens",
				content:
					"Agora é possível configurar se o bot deve visualizar as mensagens recebidas ou não.",
			},
			{
				icon: "💬",
				title: "Envio de Respostas em Mensagem Única",
				content:
					"Nova opção permite que o bot envie toda a resposta em uma única mensagem, sem dividir em partes.",
			},
			{
				icon: "⚡",
				title: "Novo Modal para Configurar Velocidade das Respostas",
				content:
					"Adicionado um modal que permite ajustar a velocidade das respostas do bot de acordo com a preferência do usuário.",
			},
			{
				icon: "🤖",
				title: "Correção no Envio de Mensagens em Grupos",
				content:
					"Corrigido um problema onde o bot enviava mensagens indevidas em grupos.",
			},
			{
				icon: "🔒",
				title: "Melhoria no Servidor para Maior Estabilidade",
				content:
					"Aprimorada a infraestrutura do servidor para evitar que alguns usuários sejam deslogados automaticamente.",
			},
		],
	},
	{
		version: "2.0.2",
		changes: [
			{
				icon: "🔌",
				title: "Botão de Desconectar WhatsApp",
				content:
					"Agora há um botão para desconectar ou fazer logout da conexão com o WhatsApp diretamente pelo app.",
			},
			{
				icon: "🔑",
				title: "Recuperação de Senha",
				content:
					"Agora há um botão de 'Esqueci minha senha' na tela de login, permitindo redefinir a senha diretamente pelo app.",
			},
			{
				icon: "📅",
				title: "Exibição da Data de Acesso",
				content:
					"O Dashboard agora exibe até quando você tem acesso ao OneZap.",
			},
			{
				icon: "🚪",
				title: "Correção no Logout",
				content:
					"Corrigido o problema onde alguns usuários eram deslogados automaticamente sem motivo.",
			},
			{
				icon: "🔗",
				title: "Correção na Conexão Persistente",
				content:
					"Corrigido um erro onde a conexão permanecia ativa mesmo após o logout, garantindo maior segurança.",
			},
			{
				icon: "📊",
				title: "Monitoramento de Erros na API",
				content:
					"O sistema agora monitora erros na nossa API para melhor estabilidade e diagnóstico.",
			},
			{
				icon: "🤖",
				title: "Correção no Envio de Mensagens em Grupos",
				content:
					"Corrigido o bug onde o bot enviava algumas mensagens indevidas em grupos.",
			},
			{
				icon: "📝",
				title: "Exibição de Erros de Conexão com IA nos Logs",
				content:
					"Agora os logs exibem erros de conexão com a IA para facilitar o diagnóstico e solução de problemas.",
			},
			{
				icon: "⏰",
				title: "Correção na Consciência de Data e Hora",
				content:
					"Corrigido um erro onde, em alguns casos, o bot não sabia a data, hora ou o dia da semana corretamente.",
			},
		],
	},
	{
		version: "2.0.1",
		changes: [
			{
				icon: "🔒",
				title: "Correções de segurança",
				content: "-",
			},
		],
	},
	{
		version: "2.0.0",
		changes: [
			{
				icon: "🌌",
				title: "Adição do Gemini",
				content:
					"Agora o OneZap conta com suporte ao modelo Gemini, trazendo ainda mais poder para as respostas! E já conta com entedimento de imagem e áudio.",
			},
			{
				icon: "🔒",
				title: "Autenticação",
				content:
					"Adicionada autenticação ao OneZap, garantindo que apenas usuários autorizados tenham acesso às funcionalidades.",
			},
			{
				icon: "✂️",
				title: "Correção na divisão de mensagens",
				content:
					"Ajustada a lógica de envio para evitar cortes incorretos e garantir uma experiência mais fluida.",
			},
			{
				icon: "🚫",
				title: "Prevenção de links no formato errado",
				content:
					"Agora o modelo bloqueia links mal formatados no estilo `[]()` para evitar mensagens quebradas.",
			},
			{
				icon: "✨",
				title: "Melhorias no layout e usabilidade",
				content:
					"Layout atualizado para maior clareza e uma experiência mais intuitiva ao usuário.",
			},
			{
				icon: "📤",
				title: "Melhoria no envio de mensagens",
				content:
					"Mensagens agora são enviadas de forma ainda mais eficiente, com tempos de resposta otimizados.",
			},
			{
				icon: "🤝",
				title: "Identificação de contatos pelo nome",
				content:
					"O OneZap agora sabe o nome do contato com quem está interagindo, permitindo respostas ainda mais personalizadas.",
			},
		],
	},
	{
		version: "1.0.6",
		changes: [
			{
				icon: "🔧",
				title: "Correção nas conexões",
				content:
					"Corrigido um problema raro onde a aplicação ficava conectando e desconectando do WhatsApp continuamente.",
			},
			{
				icon: "⚠️",
				title: "Configurações Não Salvas",
				content:
					"Agora, sempre que você alterar uma configuração e não salvá-la, um aviso aparecerá para lembrar que as mudanças não foram aplicadas.",
			},
			{
				icon: "🔄",
				title: "Importar Configurações de Outra Conta",
				content:
					"Agora, ao criar uma nova conta, você pode copiar rapidamente as configurações de uma conta já existente com o botão de importar. Isso facilita a configuração e garante que todas as preferências e ajustes estejam prontos com apenas um clique.",
			},
			{
				icon: "🖋️",
				title: "Melhoria na exibição de botões de instância",
				content:
					"Botões de edição e exclusão reposicionados para melhorar o layout, com instância selecionada agora desabilitada para uma interação mais intuitiva.",
			},
		],
	},
	{
		version: "1.0.5",
		changes: [
			{
				icon: "🔧",
				title: "Correção no gerenciamento de contas",
				content:
					"Agora é possível renomear e apagar contas (instâncias) que foram criadas anteriormente.",
			},
			{
				icon: "🚀",
				title: "Atualização automática para Linux e macOS",
				content:
					"O aplicativo agora atualiza automaticamente para novas versões em Linux e macOS, garantindo sempre as últimas melhorias e correções, sem precisar de download manual.",
			},
			{
				icon: "📝",
				title: "Visualização de logs em tempo real",
				content:
					"Adicionado um botão de logs que abre um modal mostrando os logs da aplicação em tempo real, facilitando o monitoramento e a análise do sistema.",
			},
		],
	},
	{
		version: "1.0.4",
		changes: [
			{
				icon: "🔧",
				title: "Correção na leitura de imagem",
				content: "A transcrição de imagens não estava funcionando",
			},
		],
	},
	{
		version: "1.0.3",
		changes: [
			{
				icon: "🚀",
				title: "Atualização no gerenciamento de contas",
				content:
					"Agora o aplicativo pode controlar múltiplos WhatsApps de forma centralizada, sem a necessidade de abrir mais de uma instância.",
			},
			{
				icon: "⏰",
				title: "Consciência de horário e dia",
				content:
					"Agora o assistente tem consciência das horas e do dia da semana, podendo responder de forma mais contextualizada.",
			},
		],
	},
	{
		version: "1.0.2",
		changes: [
			{
				icon: "🔄",
				title: "Correção de múltiplas instâncias",
				content:
					"Correção para o software poder abrir em mais de uma instância.",
			},
			{
				icon: "📃",
				title: "Log de atualizações",
				content:
					"Adicionada a funcionalidade de mostrar o log de atualizações.",
			},
		],
	},
	{
		version: "1.0.1",
		changes: [
			{
				icon: "🎧",
				title: "Correção na interpretação de áudio",
				content:
					"Correção na interpretação de áudio que não estava funcionando corretamente.",
			},
		],
	},
];
