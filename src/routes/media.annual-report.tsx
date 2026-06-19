import { createFileRoute } from "@tanstack/react-router";

import { PublicationGrid } from "@/components/PublicationGrid";
import { SubPage } from "@/components/SubPage";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/media/annual-report")({
	loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(
			context.trpc.posts.publications.queryOptions({ category: "annual-report", lang: deps.lang }),
		),
	head: () => ({ meta: [{ title: "Annual Reports — KAPE" }] }),
	component: Page,
});

function Page() {
	const items = Route.useLoaderData();
	const t = useT();
	return (
		<SubPage section={t("nav.media")} title={t("nav.media.annual")} lead="A year-by-year record of KAPE's reach, results and finances." badge="PDF library">
			<PublicationGrid items={items} />
		</SubPage>
	);
}
