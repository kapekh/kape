import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import {
	EmptyState,
	ListSearch,
	ListStatus,
	matchesQuery,
	removeWithRollback,
	TableScroll,
	useListQuery,
} from "#/components/admin/list-ui";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/pages/")({
	component: PagesList,
});

type Row = Awaited<ReturnType<typeof trpcClient.adminPages.list.query>>[number];

function PagesList() {
	const load = useCallback(() => trpcClient.adminPages.list.query(), []);
	const { rows, setRows, state, error, reload } = useListQuery<Row>(load);
	const [q, setQ] = useState("");

	async function del(row: Row) {
		if (
			!(await confirm(
				"Delete this page? Its child pages move up to its parent.",
			))
		)
			return;
		await removeWithRollback(
			rows,
			setRows,
			(r) => r.id === row.id,
			() => trpcClient.adminPages.delete.mutate({ id: row.id }),
		);
	}

	const titleById = new Map(rows.map((r) => [r.id, r.title]));
	const sorted = [...rows].sort((a, b) => a.slug.localeCompare(b.slug));
	const shown = sorted.filter((r) =>
		matchesQuery(q, r.title, r.slug, r.status),
	);

	const newPage = (
		<Link
			to="/admin/pages/new"
			className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
		>
			+ New page
		</Link>
	);

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
				{newPage}
			</div>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					title="No pages yet"
					description="Pages are the fixed parts of the site — About, Contact, a programme overview. Each one gets a URL you choose."
					action={newPage}
				/>
			) : (
				<>
					<ListSearch
						value={q}
						onChange={setQ}
						label="Search pages"
						placeholder="Search by title or URL…"
						status={q ? `${shown.length} of ${sorted.length}` : undefined}
					/>
					{shown.length === 0 ? (
						<EmptyState
							title="No pages match that search"
							description={`Nothing here contains “${q}”.`}
							action={
								<button
									type="button"
									onClick={() => setQ("")}
									className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
								>
									Clear search
								</button>
							}
						/>
					) : (
						<TableScroll label="Pages">
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
									{shown.map((r) => {
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
															label={`Actions for ${r.title}`}
															items={[
																{
																	label: "Delete",
																	danger: true,
																	onClick: () => del(r),
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
						</TableScroll>
					)}
				</>
			)}
		</div>
	);
}
