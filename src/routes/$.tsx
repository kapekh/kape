import { createFileRoute, redirect } from "@tanstack/react-router";

import { SubPage } from "@/components/SubPage";

/**
 * Generic page route: renders any DB-backed page by its slug (the full path).
 * Specific routes (index, /contact, /who-we-are/news, project/media pages, …)
 * take precedence; this splat catches the rest and looks them up in `pages`.
 * On a miss it checks `slug_redirects` and 301s to the page's current slug.
 */
export const Route = createFileRoute("/$")({
	loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
	loader: async ({ context, deps, params }) => {
		const slug = params._splat ?? "";
		const page = await context.queryClient.ensureQueryData(
			context.trpc.pages.bySlug.queryOptions({ slug, lang: deps.lang }),
		);
		if (!page) {
			const to = await context.queryClient.ensureQueryData(
				context.trpc.pages.redirect.queryOptions({ slug }),
			);
			if (to) throw redirect({ to: "/$", params: { _splat: to }, statusCode: 301 });
		}
		return page;
	},
	head: ({ loaderData }) => ({
		meta: [{ title: loaderData ? `${loaderData.title} — KAPE` : "KAPE" }],
	}),
	component: DbPage,
});

function DbPage() {
	const page = Route.useLoaderData();

	if (!page) {
		return (
			<SubPage section="KAPE" title="Page not found">
				<p className="text-muted-foreground">This page doesn't exist or was moved.</p>
			</SubPage>
		);
	}

	return (
		<SubPage section="KAPE" title={page.title}>
			{/* Server-rendered from stored Tiptap JSON via our extension allow-list. */}
			<div
				className="prose-kape"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted, server-rendered
				dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
			/>
		</SubPage>
	);
}
