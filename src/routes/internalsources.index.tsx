import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { useT } from "#/lib/i18n";

export const Route = createFileRoute("/internalsources/")({
	component: NewsFeed,
});

type Item = Awaited<ReturnType<typeof trpcClient.staff.news.query>>[number];

function NewsFeed() {
	const t = useT();
	const [items, setItems] = useState<Item[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		trpcClient.staff.news.query({ lang: "en" }).then((i) => {
			setItems(i);
			setLoading(false);
		});
	}, []);

	return (
		<div>
			<h1 className="font-display text-2xl font-semibold text-primary mb-6">
				{t("internal.news.title", "Internal News Feed")}
			</h1>
			{loading ? (
				<p className="text-sm text-muted-foreground">
					{t("common.loading", "Loading…")}
				</p>
			) : items.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					{t("internal.news.empty", "No internal news.")}
				</p>
			) : (
				<div className="space-y-4">
					{items.map((n) => (
						<article
							key={n.id}
							className="rounded-xl border border-border bg-card p-5"
						>
							<div className="text-xs text-[var(--accent)] font-semibold uppercase tracking-wide">
								{n.publishedAt}
							</div>
							<h2 className="mt-1 font-display text-lg font-semibold text-primary">
								{n.title}
							</h2>
							<div
								className="prose-body mt-2 text-sm"
								// biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored, server-rendered by renderBody's allow-list
								dangerouslySetInnerHTML={{ __html: n.bodyHtml }}
							/>
						</article>
					))}
				</div>
			)}
		</div>
	);
}
