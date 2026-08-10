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

export const Route = createFileRoute("/admin/offices/")({
	component: OfficesList,
});

type Row = Awaited<
	ReturnType<typeof trpcClient.adminOffices.list.query>
>[number];

function OfficesList() {
	const [provinces, setProvinces] = useState<Record<string, string>>({});
	const load = useCallback(async () => {
		const [o, prov] = await Promise.all([
			trpcClient.adminOffices.list.query(),
			trpcClient.terms.list.query({ taxonomy: "location" }),
		]);
		setProvinces(Object.fromEntries(prov.map((p) => [p.key, p.label])));
		return o;
	}, []);
	const { rows, setRows, state, error, reload } = useListQuery<Row>(load);
	const [q, setQ] = useState("");

	async function del(row: Row) {
		if (!(await confirm("Delete this office?"))) return;
		await removeWithRollback(
			rows,
			setRows,
			(r) => r.id === row.id,
			() => trpcClient.adminOffices.delete.mutate({ id: row.id }),
		);
	}

	const provinceLabel = (r: Row) =>
		r.province ? (provinces[r.province] ?? r.province) : "";
	const shown = rows.filter((r) =>
		matchesQuery(q, r.name, provinceLabel(r), r.phone),
	);

	const newOffice = (
		<Link
			to="/admin/offices/new"
			className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
		>
			+ New office
		</Link>
	);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">
						Offices
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Office locations
						{state === "ready" ? ` — ${rows.length} total.` : "."}
					</p>
				</div>
				{newOffice}
			</div>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					title="No offices yet"
					description="Offices are the places the organisation works from. They appear on the contact page and the map."
					action={newOffice}
				/>
			) : (
				<>
					<ListSearch
						value={q}
						onChange={setQ}
						label="Search offices"
						placeholder="Search by name, province or phone…"
						status={q ? `${shown.length} of ${rows.length}` : undefined}
					/>
					{shown.length === 0 ? (
						<EmptyState
							title="No offices match that search"
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
						<TableScroll label="Offices">
							<table className="w-full text-sm">
								<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
									<tr>
										<th className="px-4 py-2.5 w-16" />
										<th className="px-2 py-2.5">Name</th>
										<th className="px-2 py-2.5">Province</th>
										<th className="px-2 py-2.5">Phone</th>
										<th className="px-2 py-2.5">HQ</th>
										<th className="px-3 py-2.5 text-right">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{shown.map((r) => (
										<tr key={r.id} className="hover:bg-muted/20">
											<td className="px-4 py-2">
												<div className="h-10 w-14 rounded-md overflow-hidden bg-muted ring-1 ring-border">
													{r.imageUrl ? (
														<img
															src={r.imageUrl}
															alt=""
															className="h-full w-full object-cover"
														/>
													) : null}
												</div>
											</td>
											<td className="px-2 py-2">
												<Link
													to="/admin/offices/$id"
													params={{ id: String(r.id) }}
													className="font-medium text-foreground hover:text-[var(--accent)]"
												>
													{r.name}
												</Link>
											</td>
											<td className="px-2 py-2 text-foreground/80">
												{provinceLabel(r) || "—"}
											</td>
											<td className="px-2 py-2 text-foreground/80">
												{r.phone || "—"}
											</td>
											<td className="px-2 py-2">
												{r.isHq ? (
													<span className="inline-flex rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
														HQ
													</span>
												) : null}
											</td>
											<td className="px-3 py-2 text-right whitespace-nowrap">
												<Link
													to="/admin/offices/$id"
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
																label: "Delete office",
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
