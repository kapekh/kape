import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/internalsources/documents")({
	component: Documents,
});

type Doc = Awaited<ReturnType<typeof trpcClient.staff.documents.query>>[number];

function Documents() {
	const [docs, setDocs] = useState<Doc[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		trpcClient.staff.documents.query({ lang: "en" }).then((d) => {
			setDocs(d);
			setLoading(false);
		});
	}, []);

	const byCategory = docs.reduce<Record<string, Doc[]>>((acc, d) => {
		(acc[d.category] ??= []).push(d);
		return acc;
	}, {});

	return (
		<div>
			<h1 className="font-display text-2xl font-semibold text-primary mb-6">Internal Documents</h1>
			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : docs.length === 0 ? (
				<p className="text-sm text-muted-foreground">No documents.</p>
			) : (
				<div className="space-y-6">
					{Object.entries(byCategory).map(([cat, list]) => (
						<section key={cat}>
							<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{cat}</h2>
							<ul className="rounded-xl border border-border bg-card divide-y divide-border">
								{list.map((d) => (
									<li key={d.id} className="flex items-center justify-between px-4 py-3 text-sm">
										<span className="flex items-center gap-2">📄 {d.title}</span>
										{d.fileUrl ? (
											<a href={d.fileUrl} className="text-[var(--accent)] font-semibold hover:underline">Download</a>
										) : (
											<span className="text-xs text-muted-foreground">no file</span>
										)}
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			)}
		</div>
	);
}
