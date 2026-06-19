import { createFileRoute } from "@tanstack/react-router";

import { MapView, type MapMarker } from "@/components/MapView";
import { SubPage } from "@/components/SubPage";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/who-we-are/about")({
	loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
	loader: async ({ context, deps }) => {
		const [page, pins] = await Promise.all([
			context.queryClient.ensureQueryData(context.trpc.pages.bySlug.queryOptions({ slug: "who-we-are/about", lang: deps.lang })),
			context.queryClient.ensureQueryData(context.trpc.site.projectLocations.queryOptions({ lang: deps.lang })),
		]);
		return { page, pins };
	},
	head: ({ loaderData }) => ({ meta: [{ title: loaderData?.page ? `${loaderData.page.title} — KAPE` : "About KAPE" }] }),
	component: About,
});

function About() {
	const { page, pins } = Route.useLoaderData();
	const { t } = useLang();
	const markers: MapMarker[] = pins.map((p) => ({
		lat: p.lat,
		lng: p.lng,
		label: p.schoolName ? `${p.projectName} — ${p.schoolName}` : p.projectName,
	}));

	return (
		<SubPage section={t("nav.who")} title={page?.title ?? "About KAPE"} badge="Who we are">
			{/* biome-ignore lint/security/noDangerouslySetInnerHtml: trusted, server-rendered */}
			<div className="prose-kape" dangerouslySetInnerHTML={{ __html: page?.bodyHtml ?? "" }} />
			{markers.length > 0 && (
				<div className="mt-8">
					<h2 className="font-display text-2xl font-semibold text-primary mb-3">Where we work</h2>
					<MapView markers={markers} center={[12.5, 105.2]} zoom={7} />
				</div>
			)}
		</SubPage>
	);
}
