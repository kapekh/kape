import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export type Publication = {
	id: number;
	slug: string;
	title: string;
	year: string;
	fileUrl: string | null;
	downloadCount: number;
};

/** Grid of downloadable PDFs; clicking Download increments the counter (meta.downloadCount). */
export function PublicationGrid({ items }: { items: Publication[] }) {
	if (items.length === 0) {
		return <p className="text-muted-foreground">No documents yet.</p>;
	}
	function track(id: number) {
		// fire-and-forget counter
		trpcClient.posts.trackDownload.mutate({ id }).catch(() => {});
	}
	return (
		<div className="grid sm:grid-cols-2 gap-3">
			{items.map((p) => (
				<a
					key={p.id}
					href={p.fileUrl ?? "#"}
					target={p.fileUrl ? "_blank" : undefined}
					rel="noopener noreferrer"
					onClick={() => p.fileUrl && track(p.id)}
					className="group flex items-start gap-4 rounded-2xl border border-border bg-background/40 p-4 hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 transition"
				>
					<div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[var(--secondary)]/15 text-xl text-[var(--secondary)]">
						📄
					</div>
					<div className="min-w-0">
						<div className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] font-semibold">
							PDF{p.year ? ` · ${p.year}` : ""}
						</div>
						<div className="mt-0.5 font-medium text-foreground group-hover:text-[var(--accent)] transition">
							{p.title}
						</div>
						<div className="text-xs text-muted-foreground mt-1">
							{p.downloadCount} download{p.downloadCount === 1 ? "" : "s"}
						</div>
					</div>
				</a>
			))}
		</div>
	);
}
