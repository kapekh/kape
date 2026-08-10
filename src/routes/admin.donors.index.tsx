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

export const Route = createFileRoute("/admin/donors/")({
	component: DonorsList,
});

type Row = Awaited<
	ReturnType<typeof trpcClient.adminDonors.list.query>
>[number];

function DonorsList() {
	const load = useCallback(() => trpcClient.adminDonors.list.query(), []);
	const { rows, setRows, state, error, reload } = useListQuery<Row>(load);
	const [q, setQ] = useState("");

	async function del(row: Row) {
		if (!(await confirm("Delete this donor?"))) return;
		await removeWithRollback(
			rows,
			setRows,
			(r) => r.id === row.id,
			() => trpcClient.adminDonors.delete.mutate({ id: row.id }),
		);
	}

	const shown = rows.filter((r) => matchesQuery(q, r.name, r.url));

	const newDonor = (
		<Link
			to="/admin/donors/new"
			className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
		>
			+ New donor
		</Link>
	);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">
						Donors
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Organisations that fund the work
						{state === "ready" ? ` — ${rows.length} total.` : "."}
					</p>
				</div>
				{newDonor}
			</div>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					title="No donors yet"
					description="Donors are the organisations funding the work. They appear on the public partners and donors panels."
					action={newDonor}
				/>
			) : (
				<>
					<ListSearch
						value={q}
						onChange={setQ}
						label="Search donors"
						placeholder="Search by name or URL…"
						status={q ? `${shown.length} of ${rows.length}` : undefined}
					/>
					{shown.length === 0 ? (
						<EmptyState
							title="No donors match that search"
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
						<TableScroll label="Donors">
							<table className="w-full text-sm">
								<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
									<tr>
										<th className="px-4 py-2.5 w-16" />
										<th className="px-2 py-2.5">Name</th>
										<th className="px-2 py-2.5">URL</th>
										<th className="px-3 py-2.5 text-right">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{shown.map((r) => (
										<tr key={r.id} className="hover:bg-muted/20">
											<td className="px-4 py-2">
												<div className="h-10 w-14 rounded-md overflow-hidden bg-muted ring-1 ring-border grid place-items-center">
													{r.logoUrl ? (
														<img
															src={r.logoUrl}
															alt=""
															className="h-full w-full object-contain"
														/>
													) : null}
												</div>
											</td>
											<td className="px-2 py-2">
												<Link
													to="/admin/donors/$id"
													params={{ id: String(r.id) }}
													className="font-medium text-foreground hover:text-[var(--accent)]"
												>
													{r.name}
												</Link>
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
													to="/admin/donors/$id"
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
																label: "Delete donor",
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
