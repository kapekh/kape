import { createFileRoute } from "@tanstack/react-router";

import { PublicationGrid } from "@/components/PublicationGrid";
import { SubPage } from "@/components/SubPage";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/media/program-brochure")({
	loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(
			context.trpc.posts.publications.queryOptions({ category: "program-brochure", lang: deps.lang }),
		),
	head: () => ({ meta: [{ title: "Program Brochures — KAPE" }] }),
	component: Page,
});

function Page() {
	const items = Route.useLoaderData();
	const t = useT();
	return (
		<SubPage section={t("nav.media")} title={t("nav.media.brochure")} lead="Programme brochures and one-pagers." badge="PDF library">
			<PublicationGrid items={items} />
		</SubPage>
	);
}
