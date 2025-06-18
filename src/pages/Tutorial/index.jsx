import React, { useState } from "react";
import { PlayCircle } from "lucide-react";
import LogoImage from "../../img/logo.png";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../../components/ui/dialog";
import { tutorialModules, extractYoutubeId } from "../../shared/tutorials";

export function Tutorial() {
	const [selectedVideo, setSelectedVideo] = useState(null);

	const openYouTubeVideo = (video) => {
		setSelectedVideo(video);
	};

	const closeDialog = () => {
		setSelectedVideo(null);
	};

	return (
		<div className="flex min-h-screen flex-col bg-dashboardBg py-8 px-4 text-white">
			<div className="w-full max-w-5xl mx-auto">
				<div className="mb-8">
					<h1 className="text-2xl font-bold text-primaryColor mb-2">
						Tutoriais em Vídeo
					</h1>
					<p className="text-gray-300">
						Aprenda a utilizar todos os recursos do Zap GPT através dos nossos
						vídeos tutoriais.
					</p>
				</div>

				{tutorialModules.map((module) => (
					<div key={module.id} className="mb-10">
						<h2 className="text-xl font-semibold text-primaryColor mb-4">
							{module.title}
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{module.videos.map((video) => (
								<button
									type="button"
									key={video.id}
									className="bg-dashboardCard rounded-xl overflow-hidden border border-primaryColor/20 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primaryColor/50 cursor-pointer group text-left"
									onClick={() => openYouTubeVideo(video)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											openYouTubeVideo(video);
										}
									}}
								>
									<div className="relative">
										<div className="aspect-video bg-dashboardBg overflow-hidden relative">
											{/* Placeholder com logo do ZapGPT até termos as thumbnails reais */}
											<div className="absolute inset-0 flex items-center justify-center bg-dashboardCard/70">
												<img
													src={LogoImage}
													alt="ZapGPT Logo"
													className="h-16 w-auto object-contain opacity-40"
												/>
											</div>
											<div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
											<div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md">
												{video.duration}
											</div>
											<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
												<PlayCircle className="w-16 h-16 text-white drop-shadow-lg" />
											</div>
										</div>
									</div>
									<div className="p-4">
										<h3 className="text-primaryColor font-semibold line-clamp-2 mb-1">
											{video.title}
										</h3>
									</div>
								</button>
							))}
						</div>
					</div>
				))}
			</div>

			<Dialog
				open={!!selectedVideo}
				onOpenChange={(open) => !open && closeDialog()}
			>
				<DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{selectedVideo?.title}</DialogTitle>
					</DialogHeader>
					{selectedVideo && (
						<div className="aspect-video w-full">
							<iframe
								width="100%"
								height="100%"
								src={`https://www.youtube.com/embed/${extractYoutubeId(selectedVideo.url)}`}
								title={selectedVideo.title}
								frameBorder="0"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
								allowFullScreen
								className="rounded-md"
							/>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
