import { createFileRoute } from "@tanstack/react-router";

import { SubPage } from "@/components/SubPage";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/media/photo-gallery/$slug")({
	loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
	loader: ({ context, deps, params }) =>
		context.queryClient.ensureQueryData(
			context.trpc.posts.album.queryOptions({ slug: params.slug, lang: deps.lang }),
		),
	head: ({ loaderData }) => ({
		meta: [{ title: loaderData ? `${loaderData.title} — KAPE` : "Album — KAPE" }],
	}),
	component: Album,
});

function Album() {
	const album = Route.useLoaderData();
	const { t } = useLang();

	if (!album) {
		return (
			<SubPage section={t("nav.media.photo")} title="Album not found">
				<p className="text-muted-foreground">This album doesn't exist.</p>
			</SubPage>
		);
	}

	return (
		<SubPage section={t("nav.media.photo")} title={album.title} lead="Click any photo to view it larger.">
			<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
				{album.photos.map((p) => (
					<figure key={p.url} className="group relative overflow-hidden rounded-2xl border border-border">
						<img src={p.url} alt={p.caption} className="aspect-square w-full object-cover group-hover:scale-105 transition duration-700" />
						{p.caption && (
							<figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-3 opacity-0 group-hover:opacity-100 transition">
								{p.caption}
							</figcaption>
						)}
					</figure>
				))}
			</div>
		</SubPage>
	);
}
