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

export const Route = createFileRoute("/admin/partners/")({
	component: PartnersList,
});

type Row = Awaited<
	ReturnType<typeof trpcClient.adminPartners.list.query>
>[number];

function PartnersList() {
	const [cats, setCats] = useState<Record<string, string>>({});
	// Both queries under one state: a category list that failed leaves the table
	// naming raw keys, which is not a table worth showing.
	const load = useCallback(async () => {
		const [p, c] = await Promise.all([
			trpcClient.adminPartners.list.query(),
			trpcClient.terms.list.query({ taxonomy: "partner_category" }),
		]);
		setCats(Object.fromEntries(c.map((x) => [x.key, x.label])));
		return p;
	}, []);
	const { rows, setRows, state, error, reload } = useListQuery<Row>(load);
	const [q, setQ] = useState("");

	async function del(row: Row) {
		if (!(await confirm("Delete this partner?"))) return;
		await removeWithRollback(
			rows,
			setRows,
			(r) => r.id === row.id,
			() => trpcClient.adminPartners.delete.mutate({ id: row.id }),
		);
	}

	const catLabel = (r: Row) =>
		r.category ? (cats[r.category] ?? r.category) : "";
	const shown = rows.filter((r) => matchesQuery(q, r.name, catLabel(r), r.url));

	const newPartner = (
		<Link
			to="/admin/partners/new"
			className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
		>
			+ New partner
		</Link>
	);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">
						Partners
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Partner organisations
						{state === "ready" ? ` — ${rows.length} total.` : "."}
					</p>
				</div>
				{newPartner}
			</div>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					title="No partners yet"
					description="Partners are the organisations you work alongside. They appear on the public partners page."
					action={newPartner}
				/>
			) : (
				<>
					<ListSearch
						value={q}
						onChange={setQ}
						label="Search partners"
						placeholder="Search by name, category or URL…"
						status={q ? `${shown.length} of ${rows.length}` : undefined}
					/>
					{shown.length === 0 ? (
						<EmptyState
							title="No partners match that search"
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
						<TableScroll label="Partners">
							<table className="w-full text-sm">
								<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
									<tr>
										<th className="px-4 py-2.5 w-16" />
										<th className="px-2 py-2.5">Name</th>
										<th className="px-2 py-2.5">Category</th>
										<th className="px-2 py-2.5">URL</th>
										<th className="px-3 py-2.5 text-right">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{shown.map((r) => (
										<tr key={r.id} className="hover:bg-muted/20">
											<td className="px-4 py-2">
												<div className="h-10 w-14 rounded-md overflow-hidden bg-muted ring-1 ring-border">
													{r.logoUrl ? (
														<img
															src={r.logoUrl}
															alt=""
															className="h-full w-full object-cover"
														/>
													) : null}
												</div>
											</td>
											<td className="px-2 py-2">
												<Link
													to="/admin/partners/$id"
													params={{ id: String(r.id) }}
													className="font-medium text-foreground hover:text-[var(--accent)]"
												>
													{r.name}
												</Link>
											</td>
											<td className="px-2 py-2 text-foreground/80">
												{catLabel(r) || "—"}
											</td>
											<td className="px-2 py-2 text-foreground/80">
												{r.url ? (
													<a
														href={r.url}
														target="_blank"
														rel="noopener noreferrer"
														className="text-[var(--accent)] hover:underline"
													>
														{r.url}
													</a>
												) : (
													"—"
												)}
											</td>
											<td className="px-3 py-2 text-right whitespace-nowrap">
												<Link
													to="/admin/partners/$id"
													params={{ id: String(r.id) }}
													className="text-xs font-semibold text-[var(--accent)] hover:underline"
												>
													Edit
												</Link>
												<span className="ml-2 inline-flex align-middle">
													<ActionMenu
														label={`Actions for ${r.name}`}
														items={[
															{
																label: "Delete partner",
																danger: true,
																onClick: () => del(r),
															},
														]}
													/>
												</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</TableScroll>
					)}
				</>
			)}
		</div>
	);
}
