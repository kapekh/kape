import { createFileRoute } from "@tanstack/react-router";

import { SubPage } from "@/components/SubPage";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/what-we-do/impact-stories")({
	loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(
			context.trpc.posts.list.queryOptions({ type: "story", lang: deps.lang }),
		),
	head: () => ({
		meta: [
			{ title: "Impact / Success Stories — KAPE" },
			{ name: "description", content: "Case studies and success stories from KAPE's work." },
		],
	}),
	component: StoryList,
});

function StoryList() {
	const stories = Route.useLoaderData();
	const { lang, t } = useLang();
	const q = lang && lang !== "en" ? `?lang=${lang}` : "";

	return (
		<SubPage
			section={t("nav.what")}
			title={t("nav.what.impact")}
			lead="Behind every statistic is a child, a teacher, a community whose lives changed."
		>
			{stories.length === 0 ? (
				<p className="text-muted-foreground">No stories yet.</p>
			) : (
				<div className="grid md:grid-cols-3 gap-6">
					{stories.map((s) => (
						<article
							key={s.id}
							className="group rounded-2xl overflow-hidden border border-border bg-card hover:shadow-[var(--shadow-soft)] transition"
						>
							<div className="h-40 bg-gradient-to-br from-[var(--secondary)]/25 to-[var(--accent)]/15" />
							<div className="p-6">
								<h3 className="font-display text-base font-semibold leading-snug text-primary">{s.title}</h3>
								<p className="mt-2 text-sm text-foreground/75 leading-relaxed">{s.excerpt}</p>
								<a
									href={`/what-we-do/impact-stories/${s.slug}${q}`}
									className="mt-3 inline-block text-xs font-semibold text-[var(--accent)] hover:underline"
								>
									{t("home.impact.readfull")}
								</a>
							</div>
						</article>
					))}
				</div>
			)}
		</SubPage>
	);
}
