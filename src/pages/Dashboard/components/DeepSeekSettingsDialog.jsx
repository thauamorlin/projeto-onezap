import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../../../components/ui/dialog";

export const DeepSeekSettingsDialog = ({
	isOpen,
	onClose,
	deepseekPrompt,
	deepseekKey,
	openaiKey,
	deepseekModel,
	onSave,
}) => {
	const [localPrompt, setLocalPrompt] = useState(deepseekPrompt);
	const [localDeepSeekKey, setLocalDeepSeekKey] = useState(deepseekKey);
	const [localOpenAIKey, setLocalOpenAIKey] = useState(openaiKey);
	const [localDeepSeekModel, setLocalDeepSeekModel] = useState(
		deepseekModel || "deepseek-chat",
	);

	const handleSave = () => {
		onSave({
			deepseekKey: localDeepSeekKey,
			deepseekPrompt: localPrompt,
			openaiKey: localOpenAIKey,
			deepseekModel: localDeepSeekModel,
		});
	};

	useEffect(() => {
		if (isOpen) {
			setLocalPrompt(deepseekPrompt || "");
			setLocalDeepSeekKey(deepseekKey || "");
			setLocalOpenAIKey(openaiKey || "");
			setLocalDeepSeekModel(deepseekModel || "deepseek-chat");
		}
	}, [isOpen, deepseekPrompt, deepseekKey, openaiKey, deepseekModel]);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-[850px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<span className="text-[#2AB09C]">🧠</span> Configurações do DeepSeek
					</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-6">
					<div>
						<label
							htmlFor="openai-key-deepseek"
							className="block text-sm font-medium text-gray-300 mb-2"
						>
							OpenAI Key (para áudios e imagens)
						</label>
						<input
							id="openai-key-deepseek"
							type="text"
							value={localOpenAIKey}
							onChange={(e) => setLocalOpenAIKey(e.target.value)}
							className="w-full rounded-lg border border-[#2AB09C]/30 bg-[#1a202c] px-4 py-3 text-white focus:border-[#2AB09C] focus:ring focus:ring-[#2AB09C]/30"
							placeholder="Digite sua OpenAI Key"
						/>
						<p className="text-xs text-gray-400 mt-2">
							<strong className="text-gray-300">Por que preciso dessa chave?</strong> O DeepSeek ainda não
							entende áudios e imagens. Por isso, usamos a OpenAI apenas para
							realizar a transcrição desses conteúdos antes que o DeepSeek
							responda.
						</p>
					</div>
					<div>
						<label
							htmlFor="deepseek-key"
							className="block text-sm font-medium text-gray-300 mb-2"
						>
							DeepSeek Key
						</label>
						<input
							id="deepseek-key"
							type="text"
							value={localDeepSeekKey}
							onChange={(e) => setLocalDeepSeekKey(e.target.value)}
							className="w-full rounded-lg border border-[#2AB09C]/30 bg-[#1a202c] px-4 py-3 text-white focus:border-[#2AB09C] focus:ring focus:ring-[#2AB09C]/30"
							placeholder="Digite sua DeepSeek Key"
						/>
					</div>
					<div>
						<label
							htmlFor="deepseek-model"
							className="block text-sm font-medium text-gray-300 mb-2"
						>
							Modelo do DeepSeek
						</label>
						<select
							id="deepseek-model"
							value={localDeepSeekModel}
							onChange={(e) => setLocalDeepSeekModel(e.target.value)}
							className="w-full rounded-lg border border-[#2AB09C]/30 bg-[#1a202c] px-4 py-3 text-white focus:border-[#2AB09C] focus:ring focus:ring-[#2AB09C]/30"
						>
							<option value="deepseek-chat">
								DeepSeek Chat 🤖 (Mais rápido, ideal para conversas)
							</option>
							<option value="deepseek-reasoner">
								DeepSeek Reasoner 🧠 (Melhor para raciocínio complexo)
							</option>
						</select>
					</div>
					<div>
						<label
							htmlFor="deepseek-prompt"
							className="block text-sm font-medium text-gray-300 mb-2"
						>
							DeepSeek Prompt
						</label>
						<textarea
							id="deepseek-prompt"
							className="w-full h-40 rounded-lg border border-[#2AB09C]/30 bg-[#1a202c] p-4 text-white focus:border-[#2AB09C] focus:ring focus:ring-[#2AB09C]/30"
							value={localPrompt}
							onChange={(e) => setLocalPrompt(e.target.value)}
							placeholder="Digite o prompt para o DeepSeek"
						/>
					</div>
				</div>
				<div className="flex justify-end space-x-2 pt-4 mt-2">
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg border border-gray-500 bg-transparent px-4 py-2 text-gray-300 transition hover:bg-gray-700"
					>
						Cancelar
					</button>
					<button
						onClick={handleSave}
						type="button"
						className="rounded-lg bg-gradient-to-r from-[#2AB09C] to-[#38d9a9] px-4 py-2 font-medium text-white transition hover:shadow-lg hover:from-[#38d9a9] hover:to-[#2AB09C]"
					>
						Salvar
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
