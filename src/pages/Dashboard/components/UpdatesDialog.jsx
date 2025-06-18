import React from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../../../components/ui/dialog";
import { updates } from "../updatesData";

export const UpdatesDialog = ({ isOpen, onClose }) => (
	<Dialog open={isOpen} onOpenChange={onClose}>
		<DialogContent className="max-w-3xl">
			<DialogHeader>
				<DialogTitle>📝 Log de Atualizações</DialogTitle>
			</DialogHeader>
			<div className="mt-6 max-h-[500px] space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-[#2AB09C]/50 scrollbar-track-[#1a202c]/50 pr-2">
				{updates.map((update) => (
					<div
						key={update.version}
						className="rounded-lg bg-[dashboardCard]/50 p-6 shadow-md border border-[#2AB09C]/10"
					>
						<h2 className="flex items-center text-xl font-semibold text-[#2AB09C]">
							<span className="mr-2">📦</span> Versão {update.version}
						</h2>
						<ul className="mt-4 space-y-4">
							{update.changes.map((change) => (
								<li
									key={change}
									className={`flex items-start ${
										change.isHighlight
											? "rounded-lg bg-gradient-to-r from-[#2AB09C]/20 to-[#2AB09C]/10 p-4 border-2 border-[#2AB09C]/50 shadow-lg"
											: ""
									}`}
								>
									<span className="mr-3 text-2xl">{change.icon}</span>
									<div>
										{change.isHighlight && (
											<span className="inline-block px-2 py-1 mb-2 text-xs font-bold bg-[#2AB09C] text-white rounded-full">
												✨ DESTAQUE
											</span>
										)}
										<p className="text-lg font-medium text-white">{change.title}</p>
										<p className="text-gray-300">{change.content}</p>
									</div>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
		</DialogContent>
	</Dialog>
);
