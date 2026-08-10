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

export const Route = createFileRoute("/admin/people/")({
	component: PeopleList,
});

type Row = Awaited<
	ReturnType<typeof trpcClient.adminPeople.list.query>
>[number];
const TIER_LABELS: Record<string, string> = {
	board: "Board",
	smt: "Senior Mgmt",
	pm: "Program Mgr",
	team: "Team",
	staff: "Staff",
};

function PeopleList() {
	const load = useCallback(() => trpcClient.adminPeople.list.query(), []);
	const { rows, setRows, state, error, reload } = useListQuery<Row>(load);
	const [q, setQ] = useState("");

	async function del(row: Row) {
		if (!(await confirm("Delete this person?"))) return;
		await removeWithRollback(
			rows,
			setRows,
			(r) => r.id === row.id,
			() => trpcClient.adminPeople.delete.mutate({ id: row.id }),
		);
	}

	const shown = rows.filter((r) =>
		matchesQuery(
			q,
			r.nameEn,
			r.nameKm,
			r.position,
			TIER_LABELS[r.tier] ?? r.tier,
		),
	);

	const newPerson = (
		<Link
			to="/admin/people/new"
			className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
		>
			+ New person
		</Link>
	);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">
						People
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Team, leadership &amp; staff
						{state === "ready" ? ` — ${rows.length} total.` : "."} Public
						profiles appear on the Team page &amp; org chart.
					</p>
				</div>
				{newPerson}
			</div>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					title="No people yet"
					description="People are the board, management and staff. The ones marked public appear on the Team page and the org chart."
					action={newPerson}
				/>
			) : (
				<>
					<ListSearch
						value={q}
						onChange={setQ}
						label="Search people"
						placeholder="Search by name, position or tier…"
						status={q ? `${shown.length} of ${rows.length}` : undefined}
					/>
					{shown.length === 0 ? (
						<EmptyState
							title="No people match that search"
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
						<TableScroll label="People">
							<table className="w-full text-sm">
								<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
									<tr>
										<th className="px-4 py-2.5 w-12" />
										<th className="px-2 py-2.5">Name</th>
										<th className="px-2 py-2.5">Position</th>
										<th className="px-2 py-2.5">Tier</th>
										<th className="px-2 py-2.5">Public</th>
										<th className="px-3 py-2.5 text-right">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{shown.map((r) => (
										<tr key={r.id} className="hover:bg-muted/20">
											<td className="px-4 py-2">
												{r.photoUrl ? (
													<img
														src={r.photoUrl}
														alt=""
														className="h-9 w-9 rounded-full object-cover"
													/>
												) : (
													<span className="grid h-9 w-9 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
														{(r.nameEn ?? "?").slice(0, 1)}
													</span>
												)}
											</td>
											<td className="px-2 py-2">
												<Link
													to="/admin/people/$id"
													params={{ id: String(r.id) }}
													className="font-medium text-foreground hover:text-[var(--accent)]"
												>
													{r.nameEn}
												</Link>
												{r.nameKm ? (
													<span className="ml-2 text-xs text-muted-foreground font-khmer">
														{r.nameKm}
													</span>
												) : null}
											</td>
											<td className="px-2 py-2 text-foreground/80">
												{r.position || "—"}
											</td>
											<td className="px-2 py-2 text-foreground/80">
												{TIER_LABELS[r.tier] ?? r.tier}
											</td>
											<td className="px-2 py-2">
												{r.isPublic ? (
													<span className="rounded-full bg-[var(--palm)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--palm)]">
														Public
													</span>
												) : (
													<span className="text-xs text-muted-foreground">
														Internal
													</span>
												)}
											</td>
											<td className="px-3 py-2 text-right whitespace-nowrap">
												<Link
													to="/admin/people/$id"
													params={{ id: String(r.id) }}
													className="text-xs font-semibold text-[var(--accent)] hover:underline"
												>
													Edit
												</Link>
												<span className="ml-2 inline-flex align-middle">
													<ActionMenu
														label={`Actions for ${r.nameEn}`}
														items={[
															{
																label: "Delete person",
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
