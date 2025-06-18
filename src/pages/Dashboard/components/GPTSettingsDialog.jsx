import React, { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../../../components/ui/dialog";
import { List } from "lucide-react";
import { AssistantManagerDialog } from "./AssistantManagerDialog";

export const GPTSettingsDialog = ({
	isOpen,
	onClose,
	openaiKey,
	openaiAssistant,
	assistantPrompt,
	temperature,
	topP,
	onSave,
}) => {
	const [openAIKey, setOpenAIKey] = useState(openaiKey);
	const [assistantId, setAssistantId] = useState(openaiAssistant);
	const [isManagerOpen, setIsManagerOpen] = useState(false);

	const handleSave = () => {
		onSave({
			openaiKey: openAIKey,
			openaiAssistant: assistantId,
			assistantPrompt: assistantPrompt,
			temperature: temperature,
			topP: topP,
		});
	};

	// Função que será chamada quando um assistente for selecionado no gerenciador
	const handleAssistantSelected = (selectedAssistantId) => {
		setAssistantId(selectedAssistantId);
		setIsManagerOpen(false);
	};

	useEffect(() => {
		if (isOpen) {
			setOpenAIKey(openaiKey || "");
			setAssistantId(openaiAssistant || "");
		}
	}, [isOpen, openaiKey, openaiAssistant]);

	return (
		<>
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<span className="text-[#2AB09C]">🤖</span> Configurações do GPT
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
						<div>
							<label
								htmlFor="openai-key"
								className="block text-sm font-medium text-gray-300 mb-2"
							>
								OpenAI Key
							</label>
							<input
								id="openai-key"
								type="text"
								value={openAIKey}
								onChange={(e) => setOpenAIKey(e.target.value)}
								className="w-full rounded-lg border border-[#2AB09C]/30 bg-[#1a202c] px-4 py-3 text-white focus:border-[#2AB09C] focus:ring focus:ring-[#2AB09C]/30"
								placeholder="sk-..."
							/>
						</div>

						<div>
							<div className="flex items-center justify-between mb-2">
								<label
									htmlFor="assistant-id"
									className="block text-sm font-medium text-gray-300"
								>
									ID do Assistente
								</label>
								<button
									type="button"
									onClick={() => setIsManagerOpen(true)}
									className="flex items-center gap-1 rounded-lg bg-[#2AB09C]/20 px-3 py-1 text-sm text-[#2AB09C] transition hover:bg-[#2AB09C]/30"
								>
									<List className="h-4 w-4" />
									Gerenciar Assistentes
									<span className="ml-1 inline-flex items-center rounded-full bg-blue-500 px-1.5 py-0.5 text-xs font-medium text-white">
										Beta
									</span>
								</button>
							</div>
							<input
								id="assistant-id"
								type="text"
								value={assistantId}
								onChange={(e) => setAssistantId(e.target.value)}
								className="w-full rounded-lg border border-[#2AB09C]/30 bg-[#1a202c] px-4 py-2 text-white focus:border-[#2AB09C] focus:ring focus:ring-[#2AB09C]/30"
								placeholder="asst_..."
							/>
						</div>

						<div className="flex justify-end space-x-2 pt-4">
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
					</div>
				</DialogContent>
			</Dialog>

			{/* Modal para gerenciamento de assistentes */}
			{isManagerOpen && (
				<AssistantManagerDialog
					isOpen={isManagerOpen}
					onClose={() => setIsManagerOpen(false)}
					apiKey={openAIKey}
					onAssistantSelected={handleAssistantSelected}
					currentAssistantId={assistantId}
					assistantPrompt={assistantPrompt}
					temperature={temperature}
					topP={topP}
				/>
			)}
		</>
	);
};
