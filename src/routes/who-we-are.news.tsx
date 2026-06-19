import { createFileRoute } from "@tanstack/react-router";

import { SubPage } from "@/components/SubPage";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/who-we-are/news")({
	loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(
			context.trpc.posts.list.queryOptions({ type: "news", lang: deps.lang }),
		),
	head: () => ({
		meta: [
			{ title: "News & Events — KAPE" },
			{ name: "description", content: "Latest news, ceremonies and field updates from KAPE across Cambodia." },
		],
	}),
	component: NewsList,
});

function NewsList() {
	const posts = Route.useLoaderData();
	const { lang, t } = useLang();
	const q = lang && lang !== "en" ? `?lang=${lang}` : "";

	return (
		<SubPage
			section={t("nav.who")}
			title={t("nav.who.news")}
			lead="Stories, ceremonies and updates from KAPE's work across 15 provinces."
		>
			{posts.length === 0 ? (
				<p className="text-muted-foreground">No news yet.</p>
			) : (
				<div className="grid md:grid-cols-2 gap-6">
					{posts.map((p) => (
						<article
							key={p.id}
							className="rounded-2xl overflow-hidden border border-border bg-background/40 hover:shadow-[var(--shadow-lift)] transition"
						>
							<div className="aspect-[16/10] bg-gradient-to-br from-[var(--secondary)]/25 to-[var(--accent)]/15" />
							<div className="p-5">
								<div className="text-xs text-[var(--accent)] font-semibold uppercase tracking-wider">
									{p.publishedAt} · KAPE Cambodia
								</div>
								<h3 className="mt-2 font-display text-lg font-semibold text-primary leading-snug">
									{p.title}
								</h3>
								<p className="mt-2 text-sm text-foreground/75 leading-relaxed">{p.excerpt}</p>
								<a
									href={`/who-we-are/news/${p.slug}${q}`}
									className="mt-3 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
								>
									{t("home.news.readmore")}
								</a>
							</div>
						</article>
					))}
				</div>
			)}
		</SubPage>
	);
}
