import { useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../../../components/ui/dialog";
import { Info } from "lucide-react";

export const MessageTimerDialog = ({
	open,
	onClose,
	settings,
	setSettings,
}) => {
	const presetValues = {
		rapido: {
			MESSAGE_DELAY_FACTOR: 50,
			MESSAGE_DELAY_MAX: 2000,
			SEGUNDOS_PARA_ESPERAR_ANTES_DE_GERAR_RESPOSTA: 0.1,
		},
		humanizado: {
			MESSAGE_DELAY_FACTOR: 120,
			MESSAGE_DELAY_MAX: 10000,
			SEGUNDOS_PARA_ESPERAR_ANTES_DE_GERAR_RESPOSTA: 7,
		},
	};

	// Aplica valores padrão ao abrir pela primeira vez
	useEffect(() => {
		if (open) {
			const currentPreset = settings.MESSAGE_TIMER_PRESET || "rapido";
			const presetData = presetValues[currentPreset];

			// Se os valores estiverem vazios, aplica os padrões do preset atual
			if (!settings.MESSAGE_DELAY_FACTOR) {
				setSettings((prev) => ({
					...prev,
					MESSAGE_TIMER_PRESET: currentPreset,
					...presetData,
				}));
			}
		}
	}, [open]);

	const handlePresetChange = (preset) => {
		const values = presetValues[preset] || settings;
		setSettings((prev) => ({
			...prev,
			MESSAGE_TIMER_PRESET: preset,
			...values,
		}));
	};

	const handleCustomChange = (name, value) => {
		setSettings((prev) => ({
			...prev,
			[name]: Number(value) || 0,
			MESSAGE_TIMER_PRESET: "custom",
		}));
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<span className="text-[#2AB09C]">⏱️</span> Configurar Timers de Mensagens
					</DialogTitle>
				</DialogHeader>
				<div className="mt-4 space-y-4">
					{/* Preset de Timer */}
					<div>
						<label
							className="mb-2 flex items-center text-gray-300"
							htmlFor="preset"
						>
							Preset de Timer
							<div className="group relative ml-1">
								<Info className="size-4 cursor-pointer text-gray-400" />
								<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/80 backdrop-blur-sm px-3 py-2 text-xs text-white group-hover:block transition-all duration-300">
									Escolha um preset predefinido para definir automaticamente os
									tempos de resposta. Modificar qualquer valor mudará o preset
									para "Personalizado".
								</div>
							</div>
						</label>
						<select
							value={settings.MESSAGE_TIMER_PRESET}
							onChange={(e) => handlePresetChange(e.target.value)}
							className="w-full rounded-lg border border-[#2AB09C]/30 bg-[#1a202c] px-4 py-3 text-white focus:border-[#2AB09C] focus:ring focus:ring-[#2AB09C]/30"
							id="preset"
						>
							<option value="rapido">Rápido</option>
							<option value="humanizado">Humanizado</option>
							<option value="custom">Personalizado</option>
						</select>
					</div>

					{/* Delay por caractere */}
					<div>
						<label
							className="mb-2 flex items-center text-gray-300"
							htmlFor="MESSAGE_DELAY_FACTOR"
						>
							Delay por caractere (ms)
							<div className="group relative ml-1">
								<Info className="size-4 cursor-pointer text-gray-400" />
								<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/80 backdrop-blur-sm px-3 py-2 text-xs text-white group-hover:block transition-all duration-300">
									Define o tempo em milissegundos que o bot espera antes de
									enviar cada caractere. Valores mais altos simulam uma
									digitação mais lenta e natural.
								</div>
							</div>
						</label>
						<input
							type="number"
							value={settings.MESSAGE_DELAY_FACTOR}
							onChange={(e) =>
								handleCustomChange("MESSAGE_DELAY_FACTOR", e.target.value)
							}
							id="MESSAGE_DELAY_FACTOR"
							className="w-full rounded-lg border border-[#2AB09C]/30 bg-[#1a202c] px-4 py-3 text-white focus:border-[#2AB09C] focus:ring focus:ring-[#2AB09C]/30"
						/>
					</div>

					{/* Delay Máximo */}
					<div>
						<label
							className="mb-2 flex items-center text-gray-300"
							htmlFor="MESSAGE_DELAY_MAX"
						>
							Delay Máximo (ms)
							<div className="group relative ml-1">
								<Info className="size-4 cursor-pointer text-gray-400" />
								<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/80 backdrop-blur-sm px-3 py-2 text-xs text-white group-hover:block transition-all duration-300">
									Define o tempo máximo que o bot pode esperar antes de enviar
									uma mensagem. Evita tempos de resposta muito longos.
								</div>
							</div>
						</label>
						<input
							type="number"
							value={settings.MESSAGE_DELAY_MAX}
							onChange={(e) =>
								handleCustomChange("MESSAGE_DELAY_MAX", e.target.value)
							}
							className="w-full rounded-lg border border-[#2AB09C]/30 bg-[#1a202c] px-4 py-3 text-white focus:border-[#2AB09C] focus:ring focus:ring-[#2AB09C]/30"
							id="MESSAGE_DELAY_MAX"
						/>
					</div>

					{/* Aguardar Resposta */}
					<div>
						<label
							className="mb-2 flex items-center text-gray-300"
							htmlFor="SEGUNDOS_PARA_ESPERAR_ANTES_DE_GERAR_RESPOSTA"
						>
							Aguardar Resposta (Segundos)
							<div className="group relative ml-1">
								<Info className="size-4 cursor-pointer text-gray-400" />
								<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/80 backdrop-blur-sm px-3 py-2 text-xs text-white group-hover:block transition-all duration-300">
									Define quantos segundos o bot aguardará antes de responder uma
									mensagem. Um tempo maior pode parecer mais natural para
									interações humanas.
								</div>
							</div>
						</label>
						<input
							type="number"
							value={settings.SEGUNDOS_PARA_ESPERAR_ANTES_DE_GERAR_RESPOSTA}
							onChange={(e) =>
								handleCustomChange(
									"SEGUNDOS_PARA_ESPERAR_ANTES_DE_GERAR_RESPOSTA",
									e.target.value,
								)
							}
							id="SEGUNDOS_PARA_ESPERAR_ANTES_DE_GERAR_RESPOSTA"
							className="w-full rounded-lg border border-[#2AB09C]/30 bg-[#1a202c] px-4 py-3 text-white focus:border-[#2AB09C] focus:ring focus:ring-[#2AB09C]/30"
						/>
					</div>

					{/* Botão de Salvar */}
					<div className="flex justify-end pt-4">
						<button
							type="button"
							onClick={onClose}
							className="rounded-lg bg-gradient-to-r from-[#2AB09C] to-[#38d9a9] px-4 py-2 font-medium text-white transition hover:shadow-lg hover:from-[#38d9a9] hover:to-[#2AB09C]"
						>
							Salvar
						</button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
