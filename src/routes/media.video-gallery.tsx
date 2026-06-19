import { createFileRoute } from "@tanstack/react-router";

import { SubPage } from "@/components/SubPage";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/media/video-gallery")({
	loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(
			context.trpc.posts.videos.queryOptions({ lang: deps.lang }),
		),
	head: () => ({
		meta: [
			{ title: "Video Gallery — KAPE" },
			{ name: "description", content: "Documentaries, training recordings and field stories from KAPE." },
		],
	}),
	component: VideoGallery,
});

function VideoGallery() {
	const videos = Route.useLoaderData();
	const { t } = useLang();

	return (
		<SubPage section={t("nav.media")} title={t("nav.media.video")} lead="Documentaries, training recordings and field stories from KAPE." badge="Watch">
			{videos.length === 0 ? (
				<p className="text-muted-foreground">No videos yet.</p>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{videos.map((v) => (
						<a key={v.id} href={v.youtubeUrl || "#"} target="_blank" rel="noopener noreferrer" className="group">
							<div className="relative aspect-video rounded-2xl overflow-hidden ring-1 ring-border bg-gradient-to-br from-[var(--secondary)]/30 to-[var(--accent)]/20 grid place-items-center">
								<div className="h-16 w-16 rounded-full bg-background/95 grid place-items-center shadow-[var(--shadow-lift)] group-hover:scale-110 transition">
									<div className="ml-1 w-0 h-0 border-y-[10px] border-y-transparent border-l-[16px] border-l-[var(--accent)]" />
								</div>
							</div>
							<h3 className="mt-3 font-display text-base font-semibold text-primary group-hover:text-[var(--accent)] transition">{v.title}</h3>
							{v.excerpt && <p className="mt-1 text-sm text-muted-foreground">{v.excerpt}</p>}
						</a>
					))}
				</div>
			)}
		</SubPage>
	);
}
