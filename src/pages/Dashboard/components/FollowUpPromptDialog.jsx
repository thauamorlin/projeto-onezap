import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../../../components/ui/dialog";
import { Info, AlertCircle } from "lucide-react";

const defaultPrompt = `Você é um assistente especializado em criar mensagens de follow-up personalizadas para conversas de WhatsApp.

Analise a conversa fornecida e gere 3 mensagens de follow-up sequenciais e personalizadas:

1. PRIMEIRA MENSAGEM: Gentil e amigável, referenciando algo específico da conversa
2. SEGUNDA MENSAGEM: Mais direta, oferecendo ajuda adicional ou esclarecimentos
3. TERCEIRA MENSAGEM: Final, mais urgente mas ainda respeitosa

REGRAS:
- Use o contexto da conversa para personalizar as mensagens
- Seja natural e humano
- Mantenha o tom profissional mas amigável
- Cada mensagem deve ter entre 10-50 palavras
- Se mencionar produto/serviço, use informações da conversa
- Evite ser repetitivo entre as mensagens
`;

export const FollowUpPromptDialog = ({ isOpen, onClose, currentPrompt, onSave }) => {
	const [prompt, setPrompt] = useState(currentPrompt || defaultPrompt);
	const [showDefault, setShowDefault] = useState(false);

	useEffect(() => {
		setPrompt(currentPrompt || defaultPrompt);
	}, [currentPrompt]);

	const handleSave = () => {
		onSave(prompt);
		onClose();
	};

	const handleRestoreDefault = () => {
		setPrompt(defaultPrompt);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border border-primaryColor/20 bg-gradient-to-br from-dashboardBg to-dashboardCard">
				<DialogHeader className="border-b border-primaryColor/10 pb-4">
					<DialogTitle className="text-primaryColor flex items-center">
						Configurar Prompt de Follow-Up
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-6 pt-4">
					{/* Explicação do prompt */}
					<div className="bg-dashboardCard/50 rounded-lg p-4 border border-primaryColor/10">
						<div className="flex items-start">
							<Info className="w-5 h-5 text-primaryColor mr-3 mt-0.5 flex-shrink-0" />
							<div className="space-y-2 text-sm text-gray-300">
								<p>
									<strong className="text-white">O que é este prompt?</strong>
								</p>
								<p>
									Este prompt instrui a IA sobre como gerar mensagens de follow-up personalizadas
									baseadas no contexto de cada conversa.
								</p>
								<p>
									<strong className="text-white">Por que personalizar?</strong>
								</p>
								<ul className="list-disc list-inside space-y-1 ml-2">
									<li>Adaptar o tom das mensagens ao seu negócio</li>
									<li>Incluir informações específicas do seu produto/serviço</li>
									<li>Definir regras customizadas para follow-up</li>
								</ul>
							</div>
						</div>
					</div>

					{/* Campo de edição do prompt */}
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<div className="text-gray-300 font-medium">
								Prompt de Geração de Follow-Up
							</div>
							<button
								type="button"
								onClick={() => setShowDefault(!showDefault)}
								className="text-xs bg-transparent text-primaryColor hover:text-dashboardAccent transition-colors"
							>
								{showDefault ? "Ocultar" : "Ver"} prompt padrão
							</button>
						</div>

						{showDefault && (
							<div className="bg-dashboardBg/50 rounded-lg p-3 border border-primaryColor/10 mb-2">
								<pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono">
									{defaultPrompt}
								</pre>
							</div>
						)}

						<textarea
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							rows={12}
							className="w-full rounded-lg border border-primaryColor/30 bg-dashboardBg px-4 py-3 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30 font-mono text-sm"
							placeholder="Digite seu prompt customizado..."
						/>

						<div className="flex justify-between items-center">
							<button
								type="button"
								onClick={handleRestoreDefault}
								className="text-sm bg-transparent text-gray-400 hover:text-white transition-colors"
							>
								Restaurar padrão
							</button>
							<div className="text-xs text-gray-500">
								{prompt.length} caracteres
							</div>
						</div>
					</div>

					{/* Exemplos de customização */}
					<div className="bg-dashboardCard/30 rounded-lg p-4 border border-primaryColor/5">
						<h4 className="text-sm font-medium text-gray-300 mb-2">
							Exemplos de customização:
						</h4>
						<div className="space-y-2 text-xs text-gray-400">
							<p>
								<strong>Para e-commerce:</strong> "Mencione descontos progressivos nas mensagens"
							</p>
							<p>
								<strong>Para serviços:</strong> "Ofereça uma consulta gratuita na terceira mensagem"
							</p>
							<p>
								<strong>Tom mais formal:</strong> "Use linguagem corporativa e evite emojis"
							</p>
						</div>
					</div>

					{/* Botões de ação */}
					<div className="flex justify-end space-x-3 pt-4 border-t border-primaryColor/10">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 rounded-lg border border-primaryColor/30 text-gray-300 hover:text-white hover:border-primaryColor transition-colors"
						>
							Cancelar
						</button>
						<button
							type="button"
							onClick={handleSave}
							className="px-4 py-2 rounded-lg bg-gradient-to-r from-primaryColor to-dashboardAccent text-white hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
						>
							Salvar Prompt
						</button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
