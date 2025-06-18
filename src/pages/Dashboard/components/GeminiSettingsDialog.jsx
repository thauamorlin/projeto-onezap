import { useEffect, useState } from "react";
const { shell } = window.require("electron");

import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogHeader,
} from "../../../components/ui/dialog";

export const GeminiSettingsDialog = ({
	isOpen,
	onClose,
	geminiPrompt,
	geminiKey,
	onSave,
	geminiModel,
	temperature,
}) => {
	const [localPrompt, setLocalPrompt] = useState(geminiPrompt);
	const [localGeminiKey, setLocalGeminiKey] = useState(geminiKey);
	const [localGeminiModel, setLocalGeminiModel] = useState(geminiModel || "gemini-1.5-flash");
	const [localTemperature, setLocalTemperature] = useState(temperature || 1.0);

	const handleSave = () => {
		onSave({
			prompt: localPrompt,
			geminiKey: localGeminiKey,
			geminiModel: localGeminiModel,
			temperature: localTemperature
		});
	};

	useEffect(() => {
		if (isOpen) {
			setLocalPrompt(geminiPrompt || "");
			setLocalGeminiKey(geminiKey || "");
			setLocalGeminiModel(geminiModel || "gemini-1.5-flash");
			setLocalTemperature(temperature || 1.0);
		}
	}, [isOpen, geminiPrompt, geminiKey, geminiModel, temperature]);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-[850px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<span className="text-[#2AB09C]">💡</span> Configurações do Gemini
					</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-6">
					<div>
						<label
							htmlFor="gemini-key"
							className="block text-sm font-medium text-gray-300 mb-2"
						>
							Gemini Key
						</label>
						<input
							id="gemini-key"
							type="text"
							value={localGeminiKey}
							onChange={(e) => setLocalGeminiKey(e.target.value)}
							className="w-full rounded-lg border border-[#2AB09C]/30 bg-[#1a202c] px-4 py-3 text-white focus:border-[#2AB09C] focus:ring focus:ring-[#2AB09C]/30"
							placeholder="Digite sua Gemini Key"
						/>

						<span className="mt-2 block text-center text-xs text-gray-400">
							Gere uma gratuitamente em:{" "}
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									shell.openExternal("https://aistudio.google.com/app/apikey");
								}}
								className="text-[#2AB09C] bg-dashboardBg hover:underline"
							>
								https://aistudio.google.com/app/apikey
							</button>{" "}
							<span className="italic">
								(60 respostas por minuto de graça, sem cartão de crédito)
							</span>
						</span>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="gemini-model"
								className="block text-sm font-medium text-gray-300 mb-2"
							>
								Modelo do Gemini
							</label>
							<select
								id="gemini-model"
								value={localGeminiModel}
								onChange={(e) => setLocalGeminiModel(e.target.value)}
								className="w-full rounded-lg border border-[#2AB09C]/30 bg-[#1a202c] px-4 py-3 text-white focus:border-[#2AB09C] focus:ring focus:ring-[#2AB09C]/30"
							>
								<option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
								<option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
								<option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
								<option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite</option>
								<option value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B</option>
							</select>
						</div>

						<div>
							<label
								htmlFor="temperature"
								className="block text-sm font-medium text-gray-300 mb-2"
							>
								Temperatura: {localTemperature.toFixed(1)}
							</label>
							<div className="flex items-center">
								<span className="mr-2 text-xs text-gray-400">0.0</span>
								<input
									id="temperature"
									type="range"
									min="0"
									max="2"
									step="0.1"
									value={localTemperature}
									onChange={(e) => setLocalTemperature(Number.parseFloat(e.target.value))}
									className="w-full h-2 bg-[#1a202c] rounded-lg appearance-none cursor-pointer accent-[#2AB09C]"
								/>
								<span className="ml-2 text-xs text-gray-400">2.0</span>
							</div>
							<div className="mt-1 text-xs text-center text-gray-400">
								{localTemperature === 0 && 'Mais conservador e previsível'}
								{localTemperature > 0 && localTemperature < 1 && 'Equilibrado entre previsibilidade e criatividade'}
								{localTemperature >= 1 && localTemperature < 1.5 && 'Mais criativo e diverso'}
								{localTemperature >= 1.5 && 'Altamente criativo e imprevisível'}
							</div>
						</div>
					</div>

					<div>
						<label
							htmlFor="gemini-prompt"
							className="block text-sm font-medium text-gray-300 mb-2"
						>
							Prompt do Gemini
						</label>
						<textarea
							id="gemini-prompt"
							className="w-full h-40 rounded-lg border border-[#2AB09C]/30 bg-[#1a202c] p-4 text-white focus:border-[#2AB09C] focus:ring focus:ring-[#2AB09C]/30"
							value={localPrompt}
							onChange={(e) => setLocalPrompt(e.target.value)}
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
