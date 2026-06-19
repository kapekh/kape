import { createFileRoute } from "@tanstack/react-router";

import { SubPage } from "@/components/SubPage";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/media/photo-gallery")({
	loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(
			context.trpc.posts.albums.queryOptions({ lang: deps.lang }),
		),
	head: () => ({
		meta: [
			{ title: "Photo Gallery — KAPE" },
			{ name: "description", content: "Moments from KAPE's classrooms, ceremonies and field visits." },
		],
	}),
	component: PhotoGallery,
});

function PhotoGallery() {
	const albums = Route.useLoaderData();
	const { lang, t } = useLang();
	const q = lang && lang !== "en" ? `?lang=${lang}` : "";

	return (
		<SubPage section={t("nav.media")} title={t("nav.media.photo")} lead="Albums from KAPE's classrooms, ceremonies and field visits." badge="In pictures">
			{albums.length === 0 ? (
				<p className="text-muted-foreground">No albums yet.</p>
			) : (
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					{albums.map((a) => (
						<a key={a.id} href={`/media/photo-gallery/${a.slug}${q}`} className="group rounded-2xl overflow-hidden border border-border bg-card hover:shadow-[var(--shadow-lift)] transition">
							<div className="aspect-[4/3] overflow-hidden bg-muted">
								{a.cover && <img src={a.cover} alt={a.title} className="h-full w-full object-cover group-hover:scale-105 transition duration-700" />}
							</div>
							<div className="p-3">
								<div className="font-display font-semibold text-sm text-primary leading-snug">{a.title}</div>
								<div className="text-xs text-muted-foreground mt-0.5">{a.count} photo{a.count === 1 ? "" : "s"}</div>
							</div>
						</a>
					))}
				</div>
			)}
		</SubPage>
	);
}
