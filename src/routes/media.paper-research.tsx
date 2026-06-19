import { createFileRoute } from "@tanstack/react-router";

import { PublicationGrid } from "@/components/PublicationGrid";
import { SubPage } from "@/components/SubPage";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/media/paper-research")({
	loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(
			context.trpc.posts.publications.queryOptions({ category: "paper-research", lang: deps.lang }),
		),
	head: () => ({ meta: [{ title: "Paper Research — KAPE" }] }),
	component: Page,
});

function Page() {
	const items = Route.useLoaderData();
	const t = useT();
	return (
		<SubPage section={t("nav.media")} title={t("nav.media.research")} lead="Research papers and studies." badge="PDF library">
			<PublicationGrid items={items} />
		</SubPage>
	);
}
