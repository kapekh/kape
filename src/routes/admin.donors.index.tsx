import { createFileRoute, Link } from "@tanstack/react-router";
import { HandCoins, Plus, SearchX } from "lucide-react";
import { useCallback, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import {
	dragRow,
	EmptyState,
	ListSearch,
	ListStatus,
	matchesQuery,
	ReorderCell,
	ReorderHead,
	ReorderOff,
	removeWithRollback,
	SortableStatus,
	TableScroll,
	useListQuery,
	useListReorder,
} from "#/components/admin/list-ui";
import { Button } from "#/components/ui/button.tsx";
import { PageHeader } from "#/components/ui/page-header.tsx";
import { Table, TBody, TD, TH, THead, TR } from "#/components/ui/table.tsx";
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
	const reorder = useListReorder({
		rows: shown,
		id: (r: Row) => r.id,
		describe: (r: Row) => r.name,
		disabled: q !== "",
		save: (ids) => trpcClient.adminDonors.reorder.mutate({ ids }),
	});

	const newDonor = (
		<Button asChild>
			<Link to="/admin/donors/new">
				<Plus aria-hidden="true" />
				New donor
			</Link>
		</Button>
	);

	return (
		<div>
			<PageHeader
				title="Donors"
				description="Organisations that fund the work. They appear on the public partners and donors panels."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Donors" }]}
				actions={newDonor}
				toolbar={
					state === "ready" && rows.length > 0 ? (
						<ListSearch
							value={q}
							onChange={setQ}
							label="Search donors"
							placeholder="Search by name or URL…"
							status={
								q
									? `${shown.length} of ${rows.length}`
									: `${rows.length} ${rows.length === 1 ? "donor" : "donors"}`
							}
						/>
					) : undefined
				}
			/>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					icon={<HandCoins />}
					title="No donors yet"
					description="Donors are the organisations funding the work. They appear on the public partners and donors panels."
					action={newDonor}
				/>
			) : shown.length === 0 ? (
				<EmptyState
					icon={<SearchX />}
					title="No donors match that search"
					description={`Nothing here contains “${q}”.`}
					action={
						<Button type="button" variant="secondary" onClick={() => setQ("")}>
							Clear search
						</Button>
					}
				/>
			) : (
				<>
					{q !== "" ? <ReorderOff what="donors" /> : null}
					<SortableStatus status={reorder.status} />
					<TableScroll label="Donors">
						<Table>
							<THead>
								<TR>
									<ReorderHead />
									<TH width={72}>
										<span className="sr-only">Logo</span>
									</TH>
									<TH>Name</TH>
									<TH>URL</TH>
									<TH align="right" width={72}>
										Actions
									</TH>
								</TR>
							</THead>
							<TBody>
								{reorder.rows.map((r) => (
									<TR
										key={r.id}
										{...reorder.itemProps(r)}
										className={`hover:bg-admin-accent-soft/50 ${dragRow}`}
									>
										<ReorderCell grip={reorder.grip(r)} />
										<TD>
											<div className="grid h-10 w-14 place-items-center overflow-hidden rounded-lg bg-admin-neutral-soft ring-1 ring-admin-border">
												{r.logoUrl ? (
													<img
														src={r.logoUrl}
														alt=""
														className="h-full w-full object-contain"
													/>
												) : null}
											</div>
										</TD>
										<TD label="Name">
											<Link
												to="/admin/donors/$id"
												params={{ id: String(r.id) }}
												className="tap-target block truncate font-medium text-admin-ink max-md:whitespace-normal transition-colors duration-150 ease-out hover:text-admin-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
											>
												{r.name}
											</Link>
										</TD>
										<TD label="URL" className="text-admin-ink-muted">
											{r.url ? (
												<a
													href={r.url}
													target="_blank"
													rel="noopener noreferrer"
													className="truncate text-admin-accent-ink hover:underline"
												>
													{r.url}
												</a>
											) : (
												"—"
											)}
										</TD>
										<TD align="right" className="max-md:justify-end">
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
										</TD>
									</TR>
								))}
							</TBody>
						</Table>
					</TableScroll>
				</>
			)}
		</div>
	);
}
