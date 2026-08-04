import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/pages/")({
	component: PagesList,
});

type Row = Awaited<ReturnType<typeof trpcClient.adminPages.list.query>>[number];

function PagesList() {
	const [rows, setRows] = useState<Row[]>([]);
	const [loading, setLoading] = useState(true);

	function refresh() {
		return trpcClient.adminPages.list.query().then((r) => {
			setRows(r);
			setLoading(false);
		});
	}
	useEffect(() => {
		refresh();
	}, []);

	async function del(id: number) {
		if (
			!(await confirm(
				"Delete this page? Its child pages move up to its parent.",
			))
		)
			return;
		await trpcClient.adminPages.delete.mutate({ id });
		await refresh();
	}

	const titleById = new Map(rows.map((r) => [r.id, r.title]));
	const sorted = [...rows].sort((a, b) => a.slug.localeCompare(b.slug));

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">
						Pages
					</h1>
					<p className="mt-0.5 text-sm text-muted-foreground">
						Every page and its URL. Set a page's parent and URL segment in the
						editor.
					</p>
				</div>
				<Link
					to="/admin/pages/new"
					className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
				>
					+ New page
				</Link>
			</div>
			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : rows.length === 0 ? (
				<p className="text-sm text-muted-foreground">No pages yet.</p>
			) : (
				<div className="overflow-hidden rounded-xl border border-border bg-card">
					<table className="w-full text-sm">
						<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
							<tr>
								<th className="px-4 py-2.5">Title</th>
								<th className="px-4 py-2.5">URL</th>
								<th className="px-4 py-2.5">Parent</th>
								<th className="px-4 py-2.5">Status</th>
								<th className="px-4 py-2.5" />
							</tr>
						</thead>
						<tbody>
							{sorted.map((r) => {
								const depth = Math.max(0, r.slug.split("/").length - 1);
								return (
									<tr
										key={r.id}
										className="border-t border-border hover:bg-muted/30 transition"
									>
										<td
											className="px-4 py-2.5 font-medium text-foreground"
											style={{ paddingLeft: 16 + depth * 16 }}
										>
											{r.title}
										</td>
										<td className="px-4 py-2.5 font-mono text-xs text-foreground/60">
											/{r.slug}
										</td>
										<td className="px-4 py-2.5 text-foreground/60">
											{r.parentId != null
												? (titleById.get(r.parentId) ?? "—")
												: "—"}
										</td>
										<td className="px-4 py-2.5">
											<span
												className={`rounded-full px-2 py-0.5 text-xs capitalize ${r.status === "published" ? "bg-[var(--palm)]/15 text-[var(--palm)]" : "bg-muted text-muted-foreground"}`}
											>
												{r.status}
											</span>
										</td>
										<td className="px-4 py-2.5 text-right whitespace-nowrap">
											<Link
												to="/admin/pages/$id"
												params={{ id: String(r.id) }}
												className="text-[var(--accent)] font-semibold hover:underline"
											>
												Edit
											</Link>
											<span className="ml-3 inline-flex align-middle">
												<ActionMenu
													items={[
														{
															label: "Delete",
															danger: true,
															onClick: () => del(r.id),
														},
													]}
												/>
											</span>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
