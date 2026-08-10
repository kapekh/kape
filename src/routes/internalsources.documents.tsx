import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { usePdfReader } from "#/components/PdfReader";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { useT } from "#/lib/i18n";

export const Route = createFileRoute("/internalsources/documents")({
	component: Documents,
});

type Doc = Awaited<ReturnType<typeof trpcClient.staff.documents.query>>[number];

function Documents() {
	const t = useT();
	const [docs, setDocs] = useState<Doc[]>([]);
	const [loading, setLoading] = useState(true);
	const { openPdf, reader } = usePdfReader();

	useEffect(() => {
		trpcClient.staff.documents.query({ lang: "en" }).then((d) => {
			setDocs(d);
			setLoading(false);
		});
	}, []);

	const byCategory = docs.reduce<Record<string, Doc[]>>((acc, d) => {
		acc[d.category] ??= [];
		acc[d.category].push(d);
		return acc;
	}, {});

	return (
		<div>
			<h1 className="font-display text-2xl font-semibold text-primary mb-6">
				{t("internal.documents.title", "Internal Documents")}
			</h1>
			{loading ? (
				<p className="text-sm text-muted-foreground">
					{t("common.loading", "Loading…")}
				</p>
			) : docs.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					{t("internal.documents.empty", "No documents.")}
				</p>
			) : (
				<div className="space-y-6">
					{Object.entries(byCategory).map(([cat, list]) => (
						<section key={cat}>
							<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
								{cat}
							</h2>
							<ul className="rounded-xl border border-border bg-card divide-y divide-border">
								{list.map((d) => (
									<li
										key={d.id}
										className="flex items-center justify-between px-4 py-3 text-sm"
									>
										<span className="flex items-center gap-2">
											📄 {d.title}
										</span>
										{d.fileUrl ? (
											<a
												href={d.fileUrl}
												onClick={(e) =>
													d.fileUrl &&
													openPdf(e, { url: d.fileUrl, title: d.title })
												}
												className="text-[var(--accent)] font-semibold hover:underline"
											>
												{t("internal.documents.open", "Open")}
											</a>
										) : (
											<span className="text-xs text-muted-foreground">
												{t("internal.documents.nofile", "no file")}
											</span>
										)}
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			)}
			{reader}
		</div>
	);
}
