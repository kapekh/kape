import { createFileRoute, Link } from "@tanstack/react-router";
import { Handshake, Plus, SearchX } from "lucide-react";
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
	const [cat, setCat] = useState("");

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
	const categories = [
		...new Set(rows.map((r) => r.category).filter((c): c is string => !!c)),
	].sort();
	const ofCat = cat ? rows.filter((r) => r.category === cat) : rows;
	const shown = ofCat.filter((r) =>
		matchesQuery(q, r.name, catLabel(r), r.url),
	);
	const filtered = q !== "" || cat !== "";

	const reorder = useListReorder({
		rows: shown,
		id: (r: Row) => r.id,
		describe: (r: Row) => r.name,
		disabled: filtered,
		save: (ids) => trpcClient.adminPartners.reorder.mutate({ ids }),
	});

	const newPartner = (
		<Button asChild>
			<Link to="/admin/partners/new">
				<Plus aria-hidden="true" />
				New partner
			</Link>
		</Button>
	);

	const clearFilters = (
		<Button
			type="button"
			variant="secondary"
			onClick={() => {
				setQ("");
				setCat("");
			}}
		>
			{cat ? "Clear filters" : "Clear search"}
		</Button>
	);

	return (
		<div>
			<PageHeader
				title="Partners"
				description="The organisations you work alongside. They appear on the public partners page."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Partners" }]}
				actions={newPartner}
				toolbar={
					state === "ready" && rows.length > 0 ? (
						<>
							<ListSearch
								value={q}
								onChange={setQ}
								label="Search partners"
								placeholder="Search by name, category or URL…"
								status={
									filtered
										? `${shown.length} of ${rows.length}`
										: `${rows.length} ${rows.length === 1 ? "partner" : "partners"}`
								}
							/>
							{categories.length > 1 && (
								<fieldset className="flex flex-wrap items-center gap-2">
									<legend className="sr-only">Filter by category</legend>
									<Button
										type="button"
										size="sm"
										variant={cat === "" ? "primary" : "secondary"}
										aria-pressed={cat === ""}
										onClick={() => setCat("")}
									>
										All
									</Button>
									{categories.map((c) => (
										<Button
											key={c}
											type="button"
											size="sm"
											variant={cat === c ? "primary" : "secondary"}
											aria-pressed={cat === c}
											onClick={() => setCat(c)}
										>
											{cats[c] ?? c}
										</Button>
									))}
								</fieldset>
							)}
						</>
					) : undefined
				}
			/>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					icon={<Handshake />}
					title="No partners yet"
					description="Partners are the organisations you work alongside. They appear on the public partners page."
					action={newPartner}
				/>
			) : shown.length === 0 ? (
				<EmptyState
					icon={<SearchX />}
					title="No partners match your filters"
					description={
						q
							? `Nothing here contains “${q}”.`
							: "No partner sits in that category yet."
					}
					action={clearFilters}
				/>
			) : (
				<>
					{filtered ? (
						<ReorderOff what="partners" clear="the search and filters" />
					) : null}
					<SortableStatus status={reorder.status} />
					<TableScroll label="Partners">
						<Table>
							<THead>
								<TR>
									<ReorderHead />
									<TH width={72}>
										<span className="sr-only">Logo</span>
									</TH>
									<TH>Name</TH>
									<TH>Category</TH>
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
											<div className="h-10 w-14 overflow-hidden rounded-lg bg-admin-neutral-soft ring-1 ring-admin-border">
												{r.logoUrl ? (
													<img
														src={r.logoUrl}
														alt=""
														className="h-full w-full object-cover"
													/>
												) : null}
											</div>
										</TD>
										<TD label="Name">
											<Link
												to="/admin/partners/$id"
												params={{ id: String(r.id) }}
												className="tap-target block truncate font-medium text-admin-ink max-md:whitespace-normal transition-colors duration-150 ease-out hover:text-admin-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
											>
												{r.name}
											</Link>
										</TD>
										<TD label="Category" className="text-admin-ink-muted">
											{catLabel(r) || "—"}
										</TD>
										<TD label="URL" className="text-admin-ink-muted">
											{r.url ? (
												<a
													href={r.url}
													target="_blank"
													rel="noopener noreferrer"
													className="tap-target truncate text-admin-accent-ink hover:underline"
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
														label: "Delete partner",
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
