import { createFileRoute } from "@tanstack/react-router";

import { SubPage } from "@/components/SubPage";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/who-we-are/leadership/$slug")({
	loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
	loader: ({ context, deps, params }) =>
		context.queryClient.ensureQueryData(
			context.trpc.posts.bySlug.queryOptions({ slug: params.slug, lang: deps.lang }),
		),
	head: ({ loaderData }) => ({
		meta: [{ title: loaderData ? `${loaderData.title} — KAPE` : "KAPE" }],
	}),
	component: Bio,
});

function Bio() {
	const person = Route.useLoaderData();
	const { t } = useLang();

	if (!person) {
		return (
			<SubPage section={t("nav.who.leader")} title="Not found">
				<p className="text-muted-foreground">This profile doesn't exist.</p>
			</SubPage>
		);
	}

	return (
		<SubPage section={t("nav.who.leader")} title={person.title} lead={person.excerpt || undefined}>
			{/* biome-ignore lint/security/noDangerouslySetInnerHtml: trusted, server-rendered */}
			<div className="prose-kape" dangerouslySetInnerHTML={{ __html: person.bodyHtml }} />
		</SubPage>
	);
}
