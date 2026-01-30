import React, { useState, useEffect } from "react";
import { channels } from "../shared/constants";
import {
	LayoutDashboard,
	MessageSquare,
	LogOut,
	ChevronUp,
	User,
	Settings,
	X,
	Info,
	EditIcon,
	TrashIcon,
	CheckCircleIcon,
	XCircleIcon,
	PlayCircle,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../components/ui/dialog";
import { toast } from "react-toastify";
const { ipcRenderer, shell } = window.require("electron");

import Logo from "../img/logo.png";
import { Dashboard } from "../pages/Dashboard";
import { Chat } from "../pages/Chat";
import { Tutorial } from "../pages/Tutorial";
import { UpdatesDialog } from "../pages/Dashboard/components/UpdatesDialog";
import { LogsDialog } from "../pages/Dashboard/components/LogsDialog";
import { AIErrorNotification } from "../pages/Dashboard/components/AIErrorNotification";
import { APP_LOGO_ALT, APP_NAME, SUPPORT_WHATSAPP } from "../config";
import { Grid2X2 } from "lucide-react";
import { DashboardV2 } from "../pages/DashboardV2";
import { LayoutPanelTop } from "lucide-react";

const { version } = require("../../package.json");

/**
 * @typedef {Object} AppLayoutProps
 * @property {() => void} onLogout - Função para realizar logout
 */

/**
 * Componente principal de layout da aplicação que gerencia navegação e instâncias
 * @param {AppLayoutProps} props - Propriedades do componente
 * @returns {JSX.Element} Componente React renderizado
 */
function AppLayout({ onLogout }) {
	/** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
	const [currentPage, setCurrentPage] = useState("dashboard");

	/** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
	const [menuExpanded, setMenuExpanded] = useState(false);

	/** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
	const [instanceSelectionDialogOpen, setInstanceSelectionDialogOpen] =
		useState(false);

	/** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
	const [logsDialogOpen, setLogsDialogOpen] = useState(false);

	/** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
	const [updatesDialogOpen, setUpdatesDialogOpen] = useState(false);

	/** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
	const [options247DialogOpen, setOptions247DialogOpen] = useState(false);

	/** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
	const [instanceName, setInstanceName] = useState("Padrão");

	/** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
	const [accessUntil, setAccessUntil] = useState("Carregando...");

	/** @type {[string[], React.Dispatch<React.SetStateAction<string[]>>]} */
	const [existingInstances, setExistingInstances] = useState([]);

	/** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
	const [newInstanceName, setNewInstanceName] = useState("");

	/** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
	const [instanceId, setInstanceId] = useState("default");

	/** @type {[Object, React.Dispatch<React.SetStateAction<Object>>]} */
	const [instances, setInstances] = useState({});

	/** @type {[string|null, React.Dispatch<React.SetStateAction<string|null>>]} */
	const [isEditing, setIsEditing] = useState(null);

	/** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
	const [editedInstanceName, setEditedInstanceName] = useState("");

	/** @type {[string[], React.Dispatch<React.SetStateAction<string[]>>]} */
	const [logs, setLogs] = useState([]);

	/**
	 * Alterna o estado de expansão do menu
	 */
	const toggleMenu = () => setMenuExpanded(!menuExpanded);

	/**
	 * Inicia a edição de uma instância
	 * @param {string} instance - Nome da instância
	 */
	const handleEditInstance = (instance) => {
		setIsEditing(instance);
		setEditedInstanceName(instance);
	};

	/**
	 * Salva o nome de uma instância após edição
	 * @param {string} oldInstanceName - Nome antigo da instância
	 */
	const handleSaveInstanceName = (oldInstanceName) => {
		if (editedInstanceName && editedInstanceName.trim() !== "") {
			if (existingInstances.includes(editedInstanceName.trim())) {
				toast.error("Já existe uma instância com esse nome!");
				return;
			}

			ipcRenderer.send(channels.RENAME_INSTANCE, {
				oldInstanceName,
				newInstanceName: editedInstanceName.trim(),
			});

			ipcRenderer.once(channels.RENAME_INSTANCE_REPLY, (_, response) => {
				if (response.success) {
					toast.success(
						`Instância renomeada para ${editedInstanceName.trim()} com sucesso!`,
					);

					if (oldInstanceName === instanceId) {
						setInstanceId(editedInstanceName.trim());
					}

					ipcRenderer.send(channels.GET_INSTANCE_LIST);
					ipcRenderer.on(channels.GET_INSTANCE_LIST_REPLY, (_, instances) => {
						setExistingInstances(instances);
					});
				} else {
					toast.error(`Erro ao renomear a instância: ${response.error}`);
				}
			});
		}
	};

	/**
	 * Exclui uma instância
	 * @param {string} instance - Nome da instância a ser excluída
	 */
	const handleDeleteInstance = (instance) => {
		if (
			window.confirm(
				`Você tem certeza que quer deletar a instância ${instance}?`,
			)
		) {
			ipcRenderer.send(channels.DELETE_INSTANCE, instance);

			ipcRenderer.once(channels.DELETE_INSTANCE_REPLY, (_, response) => {
				if (response.success) {
					toast.success(`Instância ${instance} deletada com sucesso!`);

					if (response.instanceId === instanceId) {
						setInstanceId("default");
						toast.info("Você foi movido para a instância padrão.");
					}

					ipcRenderer.send(channels.GET_INSTANCE_LIST);
					ipcRenderer.on(channels.GET_INSTANCE_LIST_REPLY, (_, instances) => {
						setExistingInstances(instances);
					});
				} else {
					toast.error(
						`Erro ao deletar a instância ${instance}: ${response.error}`,
					);
				}
			});
		}
	};

	/**
	 * Seleciona uma instância
	 * @param {string} instance - Nome da instância a ser selecionada
	 */
	const handleSelectInstance = (instance) => {
		if (instanceId !== instance) {
			setInstanceId(instance);
			setInstanceSelectionDialogOpen(false);
			toast.success(`Conta ${instance} selecionada!`);
			setInstanceName(instance === "default" ? "Padrão" : instance);
		}
	};

	// Atualizar o tempo de acesso quando o componente montar
	useEffect(() => {
		const storedAccessUntil = localStorage.getItem("accessUntil");
		if (storedAccessUntil) {
			const expirationDate = new Date(storedAccessUntil);
			const currentDate = new Date();
			const twentyYearsLater = new Date();
			twentyYearsLater.setFullYear(currentDate.getFullYear() + 20);

			if (expirationDate > twentyYearsLater) {
				setAccessUntil("Vitalício");
			} else {
				setAccessUntil(
					expirationDate.toLocaleDateString("pt-BR", {
						day: "2-digit",
						month: "2-digit",
						year: "numeric",
					}),
				);
			}
		}
	}, []);

	useEffect(() => {
		ipcRenderer.on(channels.STATUS_UPDATE, (_, arg) => {
			const { status, instanceId: incomingInstanceId } = arg;
			const isConnected = status === "open";
			const isCloseByUser = status === "close-by-user";

			setInstances((prevInstances) => {
				const updatedInstance = {
					...prevInstances[incomingInstanceId],
					connected: isConnected,
				};

				if (isConnected) {
					updatedInstance.qrCode = null;
				}

				if (isCloseByUser) {
					updatedInstance.qrCode = null;
					toast.warning(
						"Conexão encerrada pelo usuário. Escaneie o QR Code novamente.",
					);
				}

				return {
					...prevInstances,
					[incomingInstanceId]: updatedInstance,
				};
			});
		});

		ipcRenderer.send(channels.SET_INSTANCE_ID, instanceId);

		ipcRenderer.send(channels.GET_INSTANCE_LIST);
		ipcRenderer.on(channels.GET_INSTANCE_LIST_REPLY, (_, instances) => {
			setExistingInstances(instances);

			instances.forEach((instance) => {

				ipcRenderer
					.invoke("get-connection-status", instance)
					.then((status) => {
						setInstances((prevInstances) => ({
							...prevInstances,
							[instance]: {
								...prevInstances[instance],
								connected: status.connected,
							},
						}));
					})
					.catch((error) => {
						console.error(
							`Erro ao verificar status da instância ${instance}:`,
							error,
						);
					});
			});
		});

		return () => {
			ipcRenderer.removeAllListeners(channels.STATUS_UPDATE);
			ipcRenderer.removeAllListeners(channels.GET_INSTANCE_LIST_REPLY);
		};
	}, [instanceId]);

	/**
	 * Função para copiar logs para a área de transferência
	 */
	const handleCopyLogs = () => {
		ipcRenderer.send("copy-logs", logs.join("\n"));
		toast.success("Logs copiados para a área de transferência!");
	};

	// Carregar logs quando o modal de logs estiver aberto
	useEffect(() => {
		let intervalId;

		if (logsDialogOpen) {
			// Buscar logs iniciais
			ipcRenderer.invoke("get-logs").then((newLogs) => {
				setLogs(newLogs);
			});

			// Atualizar logs a cada segundo
			intervalId = setInterval(async () => {
				const newLogs = await ipcRenderer.invoke("get-logs");
				setLogs(newLogs);
			}, 1000);
		}

		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	}, [logsDialogOpen]);

	return (
		<div className="flex flex-col h-screen bg-dashboardBg">
			{/* Conteúdo principal */}
			<div className="flex-1 overflow-auto relative pb-24">
				<AIErrorNotification instanceId={instanceId} onToastClick={() => setCurrentPage("dashboard")} />
				{currentPage === "dashboard" && (
					<Dashboard
						onLogout={onLogout}
						setInstanceSelectionDialogOpen={setInstanceSelectionDialogOpen}
						setLogsDialogOpen={setLogsDialogOpen}
						setUpdatesDialogOpen={setUpdatesDialogOpen}
						instanceSelectionDialogOpen={false}
						logsDialogOpen={false}
						updatesDialogOpen={false}
						setInstanceName={setInstanceName}
						setAccessUntil={setAccessUntil}
						instanceId={instanceId}
						setInstanceId={setInstanceId}
					/>
				)}
				{currentPage === "dashboardV2" && <DashboardV2 />}
				{currentPage === "chat" && <Chat instanceId={instanceId} />}
				{currentPage === "tutorial" && <Tutorial />}
			</div>

			{/* Modais compartilhados - disponíveis em qualquer página */}
			<UpdatesDialog
				isOpen={updatesDialogOpen}
				onClose={() => setUpdatesDialogOpen(false)}
			/>
			<LogsDialog
				isOpen={logsDialogOpen}
				onClose={() => setLogsDialogOpen(false)}
				logs={logs}
				handleCopyLogs={handleCopyLogs}
			/>

			{/* Modal de opções 24/7 */}
			<Dialog
				open={options247DialogOpen}
				onOpenChange={setOptions247DialogOpen}
			>
				<DialogContent className="max-w-4xl rounded-lg border border-primaryColor/20 bg-gradient-to-br from-dashboardBg to-dashboardCard p-6">
					<DialogHeader className="border-b border-primaryColor/10 pb-4">
						<DialogTitle className="text-xl font-bold text-primaryColor">
							Opções para Execução 24/7
						</DialogTitle>
					</DialogHeader>

					<div className="mt-4 overflow-auto">
						<table className="w-full border-collapse">
							<thead>
								<tr className="border-b border-primaryColor/20">
									<th className="p-3 text-left text-primaryColor">Opção</th>
									<th className="p-3 text-left text-primaryColor">Como funciona</th>
									<th className="p-3 text-left text-primaryColor">Custos</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-b border-dashboardCard/30">
									<td className="p-3 text-white">💻 App Desktop (local)</td>
									<td className="p-3 text-gray-300">Responde enquanto o app estiver aberto no seu PC.</td>
									<td className="p-3 text-gray-300">Nenhum custo adicional com instancias ilimitadas.</td>
								</tr>
								<tr className="border-b border-dashboardCard/30">
									<td className="p-3 text-white">🖥️ VPS Windows (sua própria)</td>
									<td className="p-3 text-gray-300">Você instala o OneZap numa VPS Windows e deixa as janelas abertas lá.</td>
									<td className="p-3 text-gray-300">Você paga apenas a VPS (5$ / mês). Instâncias ilimitadas. Tutorial passo‑a‑passo incluso na aba de "Tutoriais".</td>
								</tr>
								<tr>
									<td className="p-3 text-white">☁️ OneZap Cloud (em breve)</td>
									<td className="p-3 text-gray-300">Rodamos tudo nos nossos servidores, 24/7, sem precisar configurar nada.</td>
									<td className="p-3 text-gray-300">Cobrança por instância ativa para cobrir a infraestrutura.</td>
								</tr>
							</tbody>
						</table>
					</div>
				</DialogContent>
			</Dialog>

			{/* Modal de seleção de instância */}
			<Dialog
				open={instanceSelectionDialogOpen}
				onOpenChange={setInstanceSelectionDialogOpen}
			>
				<DialogContent className="max-w-2xl rounded-lg border border-primaryColor/20 bg-gradient-to-br from-dashboardBg to-dashboardCard p-6 max-h-[80vh] flex flex-col">
					<DialogHeader className="border-b border-primaryColor/10 pb-4">
						<DialogTitle className="text-xl font-bold text-primaryColor">
							Configuração de Múltiplas Instâncias
						</DialogTitle>
					</DialogHeader>

					<div
						className="overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-primaryColor/30 scrollbar-track-dashboardBg/50"
						style={{ maxHeight: "60vh" }}
					>
						<div className="rounded-lg border border-primaryColor/10 bg-dashboardCard/50 p-6 shadow-lg">
							<p className="text-base text-gray-300">
								Gerencie múltiplos números de WhatsApp facilmente. Selecione uma
								conta para alternar ou configure uma nova sem precisar abrir
								várias instâncias.
							</p>
						</div>

						<h3 className="my-4 text-xl font-semibold text-primaryColor">
							Instâncias Configuradas:
						</h3>

						<div className="mb-6 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-primaryColor/30 scrollbar-track-dashboardBg/50">
							<ul className="space-y-4">
								{existingInstances.map((instance) => (
									<li
										key={instance}
										className="flex items-center justify-between space-x-4"
									>
										<div
											className={`grow cursor-pointer rounded-lg p-4 shadow transition-all duration-200 ${instanceId === instance
												? "cursor-not-allowed bg-dashboardBg/70"
												: "bg-dashboardCard hover:bg-[#364153]"
												}`}
											onClick={() => {
												if (instanceId !== instance) {
													handleSelectInstance(instance);
												}
											}}
											onKeyDown={(e) => {
												if (
													(e.key === "Enter" || e.key === " ") &&
													instanceId !== instance
												) {
													handleSelectInstance(instance);
												}
											}}
											style={{ opacity: instanceId === instance ? 0.5 : 1 }}
										>
											<div className="flex items-center space-x-3">
												{isEditing === instance ? (
													<input
														type="text"
														value={editedInstanceName}
														onClick={(e) => e.stopPropagation()}
														onChange={(e) =>
															setEditedInstanceName(e.target.value)
														}
														className="w-20 rounded-lg border border-primaryColor/30 bg-dashboardBg px-2 py-1 text-white"
													/>
												) : (
													<span className="text-lg font-semibold text-white">
														{instance === "default" ? "Padrão" : instance}
													</span>
												)}

												<span
													className={`flex items-center ${instances[instance]?.connected ? "text-green-400" : "text-red-400"}`}
												>
													{instances[instance]?.connected ? (
														<CheckCircleIcon className="size-6" />
													) : (
														<XCircleIcon className="size-6" />
													)}
													<span className="ml-1">
														{instances[instance]?.connected
															? "Conectado"
															: "Desconectado"}
													</span>
												</span>
											</div>
										</div>

										<div className="flex space-x-2">
											{instance !== "default" && (
												<>
													{isEditing === instance ? (
														<>
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	handleSaveInstanceName(instance);
																}}
																className="rounded-lg bg-gradient-to-r from-primaryColor to-dashboardAccent px-3 py-1 text-white hover:shadow-lg hover:from-dashboardAccent hover:to-primaryColor"
															>
																Salvar
															</button>
															<button
																onClick={(e) => {
																	e.stopPropagation();
																	setIsEditing(null);
																}}
																type="button"
																className="rounded-lg border border-red-500/50 bg-transparent px-3 py-1 text-red-400 hover:bg-red-500/20"
															>
																Cancelar
															</button>
														</>
													) : (
														<button
															onClick={(e) => {
																e.stopPropagation();
																handleEditInstance(instance);
															}}
															type="button"
															className="rounded-lg border border-primaryColor/30 bg-transparent p-2 text-primaryColor hover:bg-primaryColor/10"
														>
															<EditIcon className="size-5" />
														</button>
													)}
												</>
											)}

											{instance !== "default" && (
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteInstance(instance);
													}}
													type="button"
													className="rounded-lg border border-red-500/50 bg-transparent p-2 text-red-400 hover:bg-red-500/10"
												>
													<TrashIcon className="size-5" />
												</button>
											)}
										</div>
									</li>
								))}
							</ul>
						</div>
					</div>

					<div className="border-t border-primaryColor/10 pt-4 flex justify-between items-center">
						<input
							type="text"
							value={newInstanceName}
							onChange={(e) => setNewInstanceName(e.target.value)}
							className="w-full rounded-lg border border-primaryColor/30 bg-dashboardBg px-4 py-2 text-white focus:border-primaryColor focus:ring focus:ring-primaryColor/30"
							placeholder="Nome para a nova configuração"
						/>
						<button
							className="ml-4 rounded-lg bg-gradient-to-r from-primaryColor to-dashboardAccent px-6 py-2 font-medium text-white transition hover:shadow-lg hover:from-dashboardAccent hover:to-primaryColor"
							onClick={() => {
								if (newInstanceName.trim() !== "") {
									setInstanceId(newInstanceName.trim());
									setInstanceSelectionDialogOpen(false);
									setNewInstanceName("");
								}
							}}
							type="button"
						>
							Criar Nova Conta
						</button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Conteúdo do menu expandido e barra de navegação */}
			{menuExpanded && (
				<>
					{/* Backdrop escuro para fechar o menu clicando fora */}
					<div
						className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
						onClick={toggleMenu}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								toggleMenu();
							}
						}}
						role="button"
						tabIndex={0}
						aria-label="Fechar menu"
					/>

					<div className="absolute bottom-16 left-0 right-0 w-full bg-menuBg backdrop-blur-md shadow-2xl border-t border-menuBorder overflow-hidden transition-all duration-300 animate-slideUp z-10">
						<div className="py-5 px-4 mx-auto">
							{/* Grid de botões */}
							<div className="grid grid-cols-3 gap-3 mx-auto mb-4">
								<button
									type="button"
									onClick={() => setLogsDialogOpen(true)}
									className="relative rounded-lg px-3 py-2.5 text-sm font-medium text-white overflow-hidden shadow-md cursor-pointer group whitespace-nowrap"
								>
									<span className="relative z-10 flex items-center justify-center">
										<MessageSquare size={17} className="mr-1.5 text-navText" />
										Ver Logs
									</span>
									<div className="absolute inset-0 bg-gradient-to-r from-menuGradientStart to-menuGradientEnd transition-all duration-300" />
									<div className="absolute inset-0 bg-gradient-to-r from-menuHoverStart to-menuHoverEnd opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
								</button>

								<button
									type="button"
									onClick={() => setUpdatesDialogOpen(true)}
									className="relative rounded-lg px-3 py-2.5 text-sm font-medium text-white overflow-hidden shadow-md cursor-pointer group whitespace-nowrap bg-gradient-to-r from-primaryColor to-dashboardAccent bg-[length:200%_100%] bg-left hover:bg-right transition-all duration-300"
								>
									<span className="relative z-10 flex items-center justify-center">
										<Info size={17} className="mr-1.5 text-white" />
										Versão: {version}
									</span>
								</button>

								<button
									onClick={onLogout}
									className="relative rounded-lg px-3 py-2.5 text-sm font-medium text-white overflow-hidden shadow-md cursor-pointer group whitespace-nowrap"
									type="button"
								>
									<span className="relative z-10 flex items-center justify-center">
										<LogOut size={17} className="mr-1.5" />
										Sair da Conta
									</span>
									<div className="absolute inset-0 bg-gradient-to-r from-[#991b1b] to-[#7f1d1d] transition-all duration-300" />
									<div className="absolute inset-0 bg-gradient-to-r from-[#b91c1c] to-[#991b1b] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
								</button>
							</div>

							{/* Botão de Suporte */}
							<div className="flex justify-center mb-4">
								<button
									type="button"
									onClick={(e) => {
										e.preventDefault();
										shell.openExternal(SUPPORT_WHATSAPP);
									}}
									className="relative rounded-lg px-4 py-2.5 text-sm font-medium text-white w-full max-w-xs bg-gradient-to-r from-primaryColor via-dashboardAccent to-primaryColor bg-[length:200%_100%] bg-left hover:bg-right hover:shadow-lg transition-all duration-300"
								>
									<span className="relative z-10 flex items-center justify-center">
										<MessageSquare size={17} className="mr-1.5 text-white" />
										Suporte via WhatsApp
									</span>
								</button>
							</div>

							{/* Aviso 24/7 */}
							<div className="text-center my-4">
								<div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm">
									<p className="text-amber-200 mb-2">
										⚠️ OneZap funciona só enquanto o app estiver aberto.
									</p>
									<button
										type="button"
										onClick={() => setOptions247DialogOpen(true)}
										className="text-blue-400 hover:text-blue-300 transition-colors underline bg-transparent"
									>
										Precisa rodar 24/7? ➜ Clique aqui para ver as opções ☁️🖥️
									</button>
								</div>
							</div>

							{/* Tempo de acesso */}
							<div className="text-center text-gray-400 bg-accessBg/50 px-5 py-3 rounded-full mx-auto max-w-xs text-sm">
								Acesso válido até:{" "}
								<strong className="text-accessValidText">{accessUntil}</strong>
							</div>
						</div>
					</div>
				</>
			)}

			<div className="fixed bottom-0 left-0 right-0 z-50 w-full bg-navbarBg border-t border-menuBorder shadow-xl">
				<div className="max-w-xl mx-auto relative h-16">
					<div className="flex items-center justify-between h-full px-1">
						<div className="flex items-center flex-shrink-0">
							<button
								type="button"
								onClick={() => setCurrentPage("dashboard")}
								className={`relative flex flex-col items-center justify-center w-20 py-1 mx-0.5 rounded-lg transition-all duration-300 ${currentPage === "dashboard"
									? "text-navText bg-menuItem shadow-md"
									: "text-gray-300 bg-inactiveBtnBg hover:text-navTextHover hover:bg-inactiveBtnHover"
									}`}
							>
								<div
									className={`absolute inset-x-2 bottom-0 h-0.5 transition-all duration-300 ${currentPage === "dashboard"
										? "bg-navIndicator w-12 opacity-100"
										: "bg-transparent w-0 opacity-0"
										}`}
								/>
								<div className="flex flex-col items-center justify-center py-1 px-0.5">
									<LayoutDashboard className="h-5 w-5" />
									<span className="text-xs mt-0.5 font-medium">Central</span>
								</div>
							</button>

							<button
								type="button"
								onClick={() => setCurrentPage("dashboardV2")}
								className={`relative flex flex-col items-center justify-center w-20 py-1 mx-0.5 rounded-lg transition-all duration-300 ${currentPage === "dashboardV2"
									? "text-navText bg-menuItem shadow-md"
									: "text-gray-300 bg-inactiveBtnBg hover:text-navTextHover hover:bg-inactiveBtnHover"
									}`}
							>
								<div
									className={`absolute inset-x-2 bottom-0 h-0.5 transition-all duration-300 ${currentPage === "dashboardV2"
										? "bg-navIndicator w-12 opacity-100"
										: "bg-transparent w-0 opacity-0"
										}`}
								/>
								<div className="flex flex-col items-center justify-center py-1 px-0.5">
									<LayoutPanelTop className="h-5 w-5" />
									<span className="text-xs mt-0.5 font-medium">Métricas</span>
								</div>
							</button>

							<button
								type="button"
								onClick={() => setCurrentPage("chat")}
								className={`relative flex flex-col items-center justify-center w-20 py-1 mx-0.5 rounded-lg transition-all duration-300 ${currentPage === "chat"
									? "text-navText bg-menuItem shadow-md"
									: "text-gray-300 bg-inactiveBtnBg hover:text-navTextHover hover:bg-inactiveBtnHover"
									}`}
							>
								<div
									className={`absolute inset-x-2 bottom-0 h-0.5 transition-all duration-300 ${currentPage === "chat"
										? "bg-navIndicator w-12 opacity-100"
										: "bg-transparent w-0 opacity-0"
										}`}
								/>
								<div className="flex flex-col items-center justify-center py-1 px-0.5">
									<MessageSquare className="h-5 w-5" />
									<span className="text-xs mt-0.5 font-medium">Chat</span>
								</div>
							</button>
						</div>

						{/* Logo no centro com mais espaço */}
						<div className="flex-1 flex items-center justify-center px-2">
							<img
								src={Logo}
								alt={APP_LOGO_ALT}
								className="object-contain transition-all duration-300 hover:scale-105"
							/>
						</div>

						{/* Botões à direita */}
						<div className="flex items-center flex-shrink-0">
							<button
								type="button"
								onClick={() => setInstanceSelectionDialogOpen(true)}
								className="relative flex flex-col items-center justify-center w-20 py-1 mx-0.5 rounded-lg bg-instanceBtnBg text-instanceBtnText hover:bg-instanceBtnHover hover:text-white transition-all duration-300 shadow-sm border border-instanceBtnBorder/30"
							>
								<div className="absolute inset-x-2 bottom-0 h-0.5 bg-instanceBtnIndicator w-12 opacity-70" />
								<div className="flex flex-col items-center justify-center py-1 px-0.5">
									<User className="h-5 w-5" />
									<div className="flex items-center gap-0.5 mt-0.5">
										<span className="text-xs font-medium truncate max-w-[50px]">
											{instanceName}
										</span>
										<ChevronUp className="h-3 w-3 rotate-180" />
									</div>
								</div>
							</button>

							<button
								type="button"
								onClick={() => setCurrentPage("tutorial")}
								className={`relative flex flex-col items-center justify-center w-20 py-1 mx-0.5 rounded-lg transition-all duration-300 ${currentPage === "tutorial"
									? "text-navText bg-menuItem shadow-md"
									: "text-gray-300 bg-inactiveBtnBg hover:text-navTextHover hover:bg-inactiveBtnHover"
									}`}
							>
								<div
									className={`absolute inset-x-2 bottom-0 h-0.5 transition-all duration-300 ${currentPage === "tutorial"
										? "bg-navIndicator w-12 opacity-100"
										: "bg-transparent w-0 opacity-0"
										}`}
								/>
								<div className="flex flex-col items-center justify-center py-1 px-0.5">
									<PlayCircle className="h-5 w-5" />
									<span className="text-xs mt-0.5 font-medium">Tutoriais</span>
								</div>
							</button>

							<button
								type="button"
								onClick={toggleMenu}
								className={`relative flex flex-col items-center justify-center w-20 py-1 mx-0.5 rounded-lg transition-all duration-300 ${menuExpanded
									? "text-navText bg-menuItem shadow-md"
									: "text-gray-300 bg-inactiveBtnBg hover:text-navTextHover hover:bg-inactiveBtnHover"
									}`}
							>
								<div
									className={`absolute inset-x-2 bottom-0 h-0.5 transition-all duration-300 ${menuExpanded
										? "bg-navIndicator w-12 opacity-100"
										: "bg-transparent w-0 opacity-0"
										}`}
								/>
								<div className="flex flex-col items-center justify-center py-1 px-0.5">
									{menuExpanded ? (
										<X className="h-5 w-5" />
									) : (
										<Settings className="h-5 w-5" />
									)}
									<span className="text-xs mt-0.5 font-medium">Config</span>
								</div>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default AppLayout;
