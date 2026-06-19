import { createFileRoute } from "@tanstack/react-router";

import { SubPage } from "@/components/SubPage";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/who-we-are/news/$slug")({
	loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
	loader: ({ context, deps, params }) =>
		context.queryClient.ensureQueryData(
			context.trpc.posts.bySlug.queryOptions({ slug: params.slug, lang: deps.lang }),
		),
	head: ({ loaderData }) => ({
		meta: [{ title: loaderData ? `${loaderData.title} — KAPE` : "Article — KAPE" }],
	}),
	component: NewsArticle,
});

function NewsArticle() {
	const post = Route.useLoaderData();
	const { t } = useLang();

	if (!post) {
		return (
			<SubPage section={t("nav.who.news")} title="Article not found">
				<p className="text-muted-foreground">This article doesn't exist or was moved.</p>
			</SubPage>
		);
	}

	return (
		<SubPage
			section={t("nav.who.news")}
			title={post.title}
			lead={post.excerpt || undefined}
		>
			<div className="text-xs text-[var(--accent)] font-semibold uppercase tracking-wider mb-6">
				{post.publishedAt} · {post.author ?? "KAPE Cambodia"}
			</div>
			{/* Server-rendered from stored Tiptap JSON (trusted, sanitized at render). */}
			<div
				className="prose-kape"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered from our extension allow-list
				dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
			/>
		</SubPage>
	);
}
