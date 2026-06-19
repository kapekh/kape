import { createFileRoute } from "@tanstack/react-router";

import { SubPage } from "@/components/SubPage";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/what-we-do/impact-stories/$slug")({
	loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
	loader: ({ context, deps, params }) =>
		context.queryClient.ensureQueryData(
			context.trpc.posts.bySlug.queryOptions({ slug: params.slug, lang: deps.lang }),
		),
	head: ({ loaderData }) => ({
		meta: [{ title: loaderData ? `${loaderData.title} — KAPE` : "Story — KAPE" }],
	}),
	component: StoryArticle,
});

function StoryArticle() {
	const post = Route.useLoaderData();
	const { t } = useLang();

	if (!post) {
		return (
			<SubPage section={t("nav.what.impact")} title="Story not found">
				<p className="text-muted-foreground">This story doesn't exist or was moved.</p>
			</SubPage>
		);
	}

	return (
		<SubPage section={t("nav.what.impact")} title={post.title} lead={post.excerpt || undefined}>
			<div className="text-xs text-[var(--accent)] font-semibold uppercase tracking-wider mb-6">
				{post.publishedAt} · {post.author ?? "KAPE Cambodia"}
			</div>
			<div
				className="prose-kape"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted, server-rendered
				dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
			/>
		</SubPage>
	);
}
