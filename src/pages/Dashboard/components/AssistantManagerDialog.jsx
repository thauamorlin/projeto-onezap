import React, { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../../../components/ui/dialog";
import {
	Info,
	Loader2,
	Plus,
	List,
	Check,
	Edit,
	RefreshCw,
	AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";

const { ipcRenderer } = window.require("electron");

export const AssistantManagerDialog = ({
	isOpen,
	onClose,
	apiKey,
	onAssistantSelected,
	currentAssistantId,
	assistantPrompt,
	temperature,
	topP,
}) => {
	// Estado para controlar os passos do assistente
	const [step, setStep] = useState("list"); // 'list', 'create', 'config'
	const [assistantsLoaded, setAssistantsLoaded] = useState(false);

	// Estados para gerenciar assistentes
	const [assistants, setAssistants] = useState([]);
	const [selectedAssistant, setSelectedAssistant] = useState(null);
	const [loadingAssistants, setLoadingAssistants] = useState(false);
	const [creatingAssistant, setCreatingAssistant] = useState(false);
	const [updatingAssistant, setUpdatingAssistant] = useState(false);
	const [assistantName, setAssistantName] = useState("");
	const [assistantModel, setAssistantModel] = useState("gpt-4o");
	const [prompt, setPrompt] = useState(assistantPrompt || "");
	const [temp, setTemp] = useState(temperature || 0.7);
	const [topPValue, setTopPValue] = useState(topP || 1);
	const [availableModels, setAvailableModels] = useState([]);
	const [loadingModels, setLoadingModels] = useState(false);

	// Função para buscar modelos disponíveis
	const fetchAvailableModels = async () => {
		if (!apiKey) {
			toast.error("Por favor, insira sua chave da OpenAI primeiro.");
			return;
		}

		setLoadingModels(true);
		try {
			const response = await ipcRenderer.invoke("get-openai-models", apiKey);

			if (response.success) {
				// Filtrar apenas modelos que podem ser usados com assistentes
				const assistantModels = response.data.data.filter(
					(model) =>
						model.id.includes("gpt-") && !model.id.includes("instruct"),
				);
				setAvailableModels(assistantModels);

				// Se não houver modelo selecionado, selecione o primeiro disponível
				if (assistantModels.length > 0 && !assistantModel) {
					setAssistantModel(assistantModels[0].id);
				}
			} else {
				throw new Error(response.error || "Erro ao listar modelos");
			}
		} catch (error) {
			console.error("Erro ao buscar modelos:", error);
			// Fallback para modelos padrão
			setAvailableModels([
				{ id: "gpt-4o", name: "GPT-4o" },
				{ id: "gpt-4-turbo", name: "GPT-4 Turbo" },
				{ id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
			]);
		} finally {
			setLoadingModels(false);
		}
	};

	// Função para listar assistentes usando IPC
	const fetchAssistants = async () => {
		if (!apiKey) {
			toast.error("Por favor, insira sua chave da OpenAI primeiro.");
			return;
		}

		setLoadingAssistants(true);
		try {
			const response = await ipcRenderer.invoke(
				"get-openai-assistants",
				apiKey,
			);

			if (response.success) {
				setAssistants(response.data.data || []);
				// Após listar, permanecemos na etapa de listagem
				setStep("list");
				setAssistantsLoaded(true);
			} else {
				throw new Error(response.error || "Erro ao listar assistentes");
			}
		} catch (error) {
			console.error("Erro ao buscar assistentes:", error);
			toast.error(
				"Falha ao listar assistentes. Verifique sua chave da OpenAI.",
			);
		} finally {
			setLoadingAssistants(false);
		}
	};

	// Função para criar um novo assistente usando IPC
	const createAssistant = async () => {
		if (!apiKey) {
			toast.error("Por favor, insira sua chave da OpenAI primeiro.");
			return;
		}

		if (!assistantName.trim()) {
			toast.error("Por favor, insira um nome para o assistente.");
			return;
		}

		setCreatingAssistant(true);
		try {
			const assistantData = {
				name: assistantName,
				model: assistantModel,
				instructions: prompt,
				temperature: temp,
				top_p: topPValue,
			};

			const response = await ipcRenderer.invoke("create-openai-assistant", {
				apiKey: apiKey,
				assistantData,
			});

			if (response.success) {
				const newAssistant = response.data;
				setSelectedAssistant(newAssistant);
				toast.success("Assistente criado com sucesso!");

				// Após criar, vamos para a etapa de configuração
				setStep("config");
			} else {
				throw new Error(response.error || "Erro ao criar assistente");
			}
		} catch (error) {
			console.error("Erro ao criar assistente:", error);
			toast.error("Falha ao criar assistente. Verifique sua chave da OpenAI.");
		} finally {
			setCreatingAssistant(false);
		}
	};

	// Função para modificar um assistente existente usando IPC
	const updateAssistant = async () => {
		if (!apiKey || !selectedAssistant) {
			toast.error("Chave da OpenAI e assistente selecionado são necessários.");
			return;
		}

		setUpdatingAssistant(true);
		try {
			const assistantData = {
				model: assistantModel, // Adicionei o modelo para ser atualizado
				instructions: prompt,
				temperature: temp,
				top_p: topPValue,
			};

			const response = await ipcRenderer.invoke("update-openai-assistant", {
				apiKey: apiKey,
				assistantId: selectedAssistant.id,
				assistantData,
			});

			if (response.success) {
				toast.success("Assistente atualizado com sucesso!");
				setSelectedAssistant(response.data);
			} else {
				throw new Error(response.error || "Erro ao atualizar assistente");
			}
		} catch (error) {
			console.error("Erro ao atualizar assistente:", error);
			toast.error(
				"Falha ao atualizar assistente. Verifique sua chave da OpenAI.",
			);
		} finally {
			setUpdatingAssistant(false);
		}
	};

	// Função para selecionar um assistente da lista
	const selectAssistant = (assistant) => {
		setSelectedAssistant(assistant);
		fetchAssistantDetails(assistant.id);
	};

	// Obter detalhes de um assistente específico usando IPC
	const fetchAssistantDetails = async (id) => {
		if (!apiKey || !id) return;

		try {
			const response = await ipcRenderer.invoke("get-openai-assistant", {
				apiKey: apiKey,
				assistantId: id,
			});

			if (response.success) {
				const data = response.data;
				setSelectedAssistant(data);
				setPrompt(data.instructions || "");
				setTemp(data.temperature || 0.7);
				setTopPValue(data.top_p || 1);
				setAssistantModel(data.model || "gpt-4o"); // Salvando o modelo atual do assistente
				// Carregar modelos disponíveis
				fetchAvailableModels();
				// Após obter os detalhes, vá para a etapa de configuração
				setStep("config");
			} else {
				throw new Error(
					response.error || "Erro ao buscar detalhes do assistente",
				);
			}
		} catch (error) {
			console.error("Erro ao buscar detalhes do assistente:", error);
			toast.error("Falha ao buscar detalhes do assistente.");
		}
	};

	// Se terminarmos de configurar, retornar o assistente selecionado
	const handleComplete = () => {
		if (selectedAssistant) {
			onAssistantSelected(selectedAssistant.id);
		} else {
			onClose();
		}
	};

	// Ao abrir o diálogo, reiniciamos alguns estados e buscamos os assistentes automaticamente
	useEffect(() => {
		if (isOpen) {
			// Limpar estados anteriores
			setStep("list");
			// Buscar assistentes automaticamente se houver uma API key
			if (apiKey) {
				fetchAssistants();
			} else {
				// Se não houver API key, apenas mostrar a tela inicial
				setAssistantsLoaded(false);
			}
		}
	}, [isOpen, apiKey]);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<span className="text-primaryColor">🤖</span> Gerenciador de
						Assistentes
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
					{/* Etapa de listagem */}
					{step === "list" && (
						<div className="space-y-4">
							{assistantsLoaded ? (
								<>
									{/* Cabeçalho com botões quando já listou assistentes */}
									<div className="flex justify-between items-center">
										<h3 className="text-white font-medium">
											Assistentes OpenAI
											{loadingAssistants && (
												<Loader2 className="ml-2 inline-block h-4 w-4 animate-spin text-primaryColor" />
											)}
										</h3>
										<div className="flex gap-2">
											<button
												type="button"
												onClick={() => {
													setStep("create");
													fetchAvailableModels();
												}}
												className="flex items-center gap-1 rounded-lg bg-primaryColor/20 px-3 py-1 text-sm text-primaryColor transition hover:bg-primaryColor/30"
											>
												<Plus className="h-4 w-4" />
												Criar Novo
											</button>
											<button
												type="button"
												onClick={fetchAssistants}
												disabled={loadingAssistants || !apiKey}
												className="flex items-center gap-1 rounded-lg bg-primaryColor/20 px-3 py-1 text-sm text-primaryColor transition hover:bg-primaryColor/30"
												title="Atualizar lista"
											>
												{loadingAssistants ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<RefreshCw className="h-4 w-4" />
												)}
											</button>
										</div>
									</div>

									{/* Lista de assistentes */}
									<div className="border border-primaryColor/20 rounded-lg bg-[#1a202c]/70 max-h-96 overflow-y-auto">
										{assistants.length === 0 ? (
											<div className="text-center p-8 text-gray-400">
												<p>
													Nenhum assistente encontrado. Crie um novo ou atualize
													a lista.
												</p>
											</div>
										) : (
											<ul className="divide-y divide-primaryColor/10">
												{assistants.map((assistant) => (
													<li key={assistant.id} className="p-2">
														<button
															type="button"
															className="w-full bg-dashboardBg hover:bg-dashboardCard transition-all flex items-center justify-between text-left rounded py-2 px-3 border border-transparent"
															onClick={() => selectAssistant(assistant)}
															aria-label={`Selecionar assistente ${assistant.name || "sem nome"}`}
														>
															<div className="w-full">
																<p className="text-white text-sm font-medium truncate">
																	{assistant.name || "Assistente sem nome"}
																</p>
																<p className="text-[#94a3b8] text-xs truncate">
																	{assistant.id}
																</p>
															</div>
															{assistant.id === currentAssistantId && (
																<Check className="h-4 w-4 text-primaryColor ml-2 flex-shrink-0" />
															)}
														</button>
													</li>
												))}
											</ul>
										)}
									</div>
								</>
							) : (
								// Estado de carregamento inicial
								<div className="flex flex-col items-center justify-center py-16 space-y-6">
									<div className="text-center">
										<h3 className="text-white font-medium text-lg mb-2">
											Assistentes OpenAI
										</h3>
										{loadingAssistants ? (
											<div className="flex flex-col items-center space-y-4">
												<Loader2 className="h-8 w-8 animate-spin text-primaryColor" />
												<p className="text-gray-400">
													Buscando seus assistentes...
												</p>
											</div>
										) : !apiKey ? (
											<div className="space-y-4">
												<p className="text-amber-300">
													Por favor, insira sua chave da OpenAI para listar seus
													assistentes.
												</p>
												<button
													type="button"
													onClick={onClose}
													className="px-4 py-2 bg-primaryColor text-white rounded-lg hover:bg-[#38d9a9]"
												>
													Voltar
												</button>
											</div>
										) : (
											<div className="space-y-4">
												<p className="text-gray-400 mb-6">
													Ocorreu um erro ao listar seus assistentes
												</p>
												<div className="flex justify-center gap-4">
													<button
														type="button"
														onClick={fetchAssistants}
														className="px-4 py-2 bg-primaryColor text-white rounded-lg hover:bg-[#38d9a9]"
													>
														Tentar Novamente
													</button>
													<button
														type="button"
														onClick={() => {
															setStep("create");
															fetchAvailableModels();
														}}
														className="px-4 py-2 border border-primaryColor text-primaryColor rounded-lg hover:bg-primaryColor/10"
													>
														Criar Novo Assistente
													</button>
												</div>
											</div>
										)}
									</div>
								</div>
							)}

							{assistantsLoaded && (
								<div className="flex justify-end">
									<button
										type="button"
										onClick={onClose}
										className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
									>
										Cancelar
									</button>
								</div>
							)}
						</div>
					)}

					{/* Etapa de criação */}
					{step === "create" && (
						<div className="space-y-4">
							<h3 className="text-white font-medium">Criar Novo Assistente</h3>

							<div className="space-y-4">
								<div>
									<label
										htmlFor="assistant-name"
										className="block text-sm font-medium text-gray-300 mb-1"
									>
										Nome do Assistente
									</label>
									<input
										id="assistant-name"
										type="text"
										value={assistantName}
										onChange={(e) => setAssistantName(e.target.value)}
										className="w-full rounded-lg border border-primaryColor/30 bg-[#1a202c] px-4 py-2 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30"
										placeholder="Meu Assistente"
									/>
								</div>

								<div>
									<label
										htmlFor="assistant-model"
										className="block text-sm font-medium text-gray-300 mb-1"
									>
										Modelo
									</label>
									<select
										id="assistant-model"
										value={assistantModel}
										onChange={(e) => setAssistantModel(e.target.value)}
										className="w-full rounded-lg border border-primaryColor/30 bg-[#1a202c] px-4 py-2 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30"
									>
										{loadingModels ? (
											<option>Carregando modelos...</option>
										) : availableModels.length > 0 ? (
											availableModels.map((model) => (
												<option key={model.id} value={model.id}>
													{model.id}
												</option>
											))
										) : (
											<>
												<option value="gpt-4o">gpt-4o</option>
												<option value="gpt-4-turbo">gpt-4-turbo</option>
												<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
											</>
										)}
									</select>
								</div>

								<div className="flex justify-end space-x-2">
									<button
										type="button"
										onClick={() => setStep("list")}
										className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
									>
										Voltar
									</button>
									<button
										type="button"
										onClick={createAssistant}
										disabled={
											creatingAssistant || !apiKey || !assistantName.trim()
										}
										className="px-4 py-2 bg-primaryColor text-white rounded-lg hover:bg-[#38d9a9] disabled:opacity-50 flex items-center"
									>
										{creatingAssistant ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Criando...
											</>
										) : (
											<>Avançar</>
										)}
									</button>
								</div>
							</div>
						</div>
					)}

					{/* Etapa de configuração */}
					{step === "config" && selectedAssistant && (
						<div className="space-y-4">
							<div className="flex justify-between items-center">
								<h3 className="text-white font-medium flex items-center">
									<span>Configurar Assistente</span>
									{selectedAssistant.name && (
										<span className="ml-2 text-xs bg-primaryColor/20 text-primaryColor px-2 py-1 rounded">
											{selectedAssistant.name}
										</span>
									)}
								</h3>
							</div>

							{/* Campo para alteração do modelo */}
							<div>
								<label
									htmlFor="config-assistant-model"
									className="block text-sm font-medium text-gray-300 mb-2 flex items-center"
								>
									Modelo
									<div className="group relative ml-1">
										<Info className="h-4 w-4 cursor-pointer text-gray-400" />
										<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
											Alterar o modelo do assistente pode impactar seu
											desempenho e custo. Modelos mais novos costumam ter melhor
											performance.
										</div>
									</div>
								</label>
								<select
									id="config-assistant-model"
									value={assistantModel}
									onChange={(e) => setAssistantModel(e.target.value)}
									className="w-full rounded-lg border border-primaryColor/30 bg-[#1a202c] px-4 py-2 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30"
								>
									{loadingModels ? (
										<option>Carregando modelos...</option>
									) : availableModels.length > 0 ? (
										availableModels.map((model) => (
											<option key={model.id} value={model.id}>
												{model.id}
											</option>
										))
									) : (
										<>
											<option value="gpt-4o">gpt-4o</option>
											<option value="gpt-4-turbo">gpt-4-turbo</option>
											<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
										</>
									)}
								</select>
							</div>

							<div>
								<label
									htmlFor="assistant-prompt"
									className="block text-sm font-medium text-gray-300 mb-2 flex items-center"
								>
									Prompt do Assistente
									<div className="group relative ml-1">
										<Info className="h-4 w-4 cursor-pointer text-gray-400" />
										<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
											Este é o prompt de instruções que define o comportamento
											do seu assistente. Aqui você define como ele deve se
											comportar e responder.
										</div>
									</div>
								</label>
								<textarea
									id="assistant-prompt"
									value={prompt}
									onChange={(e) => setPrompt(e.target.value)}
									className="w-full rounded-lg border border-primaryColor/30 bg-[#1a202c] px-4 py-3 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30 min-h-[120px]"
									placeholder="Você é um assistente..."
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="temperature"
										className="block text-sm font-medium text-gray-300 mb-2 flex items-center"
									>
										Temperatura
										<div className="group relative ml-1">
											<Info className="h-4 w-4 cursor-pointer text-gray-400" />
											<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
												Valores mais baixos resultam em respostas mais
												consistentes (ex: 0.2), enquanto valores mais altos
												geram resultados mais diversos e criativos (ex: 1.0).
												Varia de 0 a 2.
											</div>
										</div>
									</label>
									<div className="flex items-center space-x-2">
										<input
											type="range"
											id="temperature"
											min="0"
											max="2"
											step="0.1"
											value={temp}
											onChange={(e) =>
												setTemp(Number.parseFloat(e.target.value))
											}
											className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
										/>
										<input
											type="number"
											min="0"
											max="2"
											step="0.1"
											value={temp}
											onChange={(e) => {
												const value = Number.parseFloat(e.target.value);
												if (value >= 0 && value <= 2) {
													setTemp(value);
												}
											}}
											className="w-16 rounded-lg border border-primaryColor/30 bg-[#1a202c] px-2 py-1 text-white text-center"
										/>
									</div>
								</div>
								<div>
									<label
										htmlFor="top-p"
										className="block text-sm font-medium text-gray-300 mb-2 flex items-center"
									>
										Top P
										<div className="group relative ml-1">
											<Info className="h-4 w-4 cursor-pointer text-gray-400" />
											<div className="absolute bottom-full left-1/2 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-black/90 backdrop-blur-md px-3 py-2 text-xs text-white group-hover:block transition-all duration-200 z-50 shadow-lg border border-gray-700/50">
												Controla a diversidade considerando apenas os tokens com
												probabilidade acumulada. Valores menores (ex: 0.5)
												tornam o texto mais focado, enquanto valores maiores
												(ex: 1.0) permitem mais variedade.
											</div>
										</div>
									</label>
									<div className="flex items-center space-x-2">
										<input
											type="range"
											id="top-p"
											min="0"
											max="1"
											step="0.05"
											value={topPValue}
											onChange={(e) =>
												setTopPValue(Number.parseFloat(e.target.value))
											}
											className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
										/>
										<input
											type="number"
											min="0"
											max="1"
											step="0.05"
											value={topPValue}
											onChange={(e) => {
												const value = Number.parseFloat(e.target.value);
												if (value >= 0 && value <= 1) {
													setTopPValue(value);
												}
											}}
											className="w-16 rounded-lg border border-primaryColor/30 bg-[#1a202c] px-2 py-1 text-white text-center"
										/>
									</div>
								</div>
							</div>

							{/* Observação sobre o fluxo de atualização e conclusão */}
							<div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start space-x-2">
								<AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
								<p className="text-amber-100 text-sm">
									<span className="font-medium">Atenção ao fluxo:</span> Após
									fazer alterações, clique em{" "}
									<span className="font-medium text-primaryColor">
										Atualizar
									</span>{" "}
									para salvar suas modificações no assistente. Em seguida,
									clique em{" "}
									<span className="font-medium text-white">Concluir</span> para
									retornar ao formulário principal com o assistente selecionado.
								</p>
							</div>

							<div className="flex justify-between pt-4">
								<button
									type="button"
									onClick={() => setStep("list")}
									className="px-4 py-2 transition-all bg-dashboardBg border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
								>
									Voltar
								</button>

								<div className="space-x-2 flex">
									<button
										type="button"
										onClick={updateAssistant}
										disabled={updatingAssistant}
										className="px-4 py-2 bg-primaryColor/20 text-primaryColor rounded-lg hover:bg-primaryColor/30 flex items-center"
									>
										{updatingAssistant ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Atualizando...
											</>
										) : (
											<>
												<Edit className="mr-2 h-4 w-4" />
												Atualizar
											</>
										)}
									</button>

									<button
										type="button"
										onClick={handleComplete}
										className="px-4 py-2 bg-primaryColor text-white rounded-lg hover:bg-[#38d9a9]"
									>
										Concluir
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
};
