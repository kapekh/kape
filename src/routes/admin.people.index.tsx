import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, SearchX, UserRound } from "lucide-react";
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
import { viewOnSite } from "#/components/admin/view-on-site";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { PageHeader } from "#/components/ui/page-header.tsx";
import { Table, TBody, TD, TH, THead, TR } from "#/components/ui/table.tsx";
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
	const [tier, setTier] = useState("");

	async function del(row: Row) {
		if (!(await confirm("Delete this person?"))) return;
		await removeWithRollback(
			rows,
			setRows,
			(r) => r.id === row.id,
			() => trpcClient.adminPeople.delete.mutate({ id: row.id }),
		);
	}

	const tiers = [...new Set(rows.map((r) => r.tier))].sort();
	const ofTier = tier ? rows.filter((r) => r.tier === tier) : rows;
	const shown = ofTier.filter((r) =>
		matchesQuery(
			q,
			r.nameEn,
			r.nameKm,
			r.position,
			TIER_LABELS[r.tier] ?? r.tier,
		),
	);
	const filtered = q !== "" || tier !== "";
	// asc(tier, sort) off the server, so first appearance is the tier order
	const tiersShown = [...new Set(shown.map((r) => r.tier))];

	const newPerson = (
		<Button asChild>
			<Link to="/admin/people/new">
				<Plus aria-hidden="true" />
				New person
			</Link>
		</Button>
	);

	const clearFilters = (
		<Button
			type="button"
			variant="secondary"
			onClick={() => {
				setQ("");
				setTier("");
			}}
		>
			{tier ? "Clear filters" : "Clear search"}
		</Button>
	);

	return (
		<div>
			<PageHeader
				title="People"
				description="Board, management and staff. The ones marked public appear on the Team page and the org chart."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "People" }]}
				actions={newPerson}
				toolbar={
					state === "ready" && rows.length > 0 ? (
						<>
							<ListSearch
								value={q}
								onChange={setQ}
								label="Search people"
								placeholder="Search by name, position or tier…"
								status={
									filtered
										? `${shown.length} of ${rows.length}`
										: `${rows.length} ${rows.length === 1 ? "person" : "people"}`
								}
							/>
							<fieldset className="flex flex-wrap items-center gap-2">
								<legend className="sr-only">Filter by tier</legend>
								<Button
									type="button"
									size="sm"
									variant={tier === "" ? "primary" : "secondary"}
									aria-pressed={tier === ""}
									onClick={() => setTier("")}
								>
									All
								</Button>
								{tiers.map((t) => (
									<Button
										key={t}
										type="button"
										size="sm"
										variant={tier === t ? "primary" : "secondary"}
										aria-pressed={tier === t}
										onClick={() => setTier(t)}
									>
										{TIER_LABELS[t] ?? t}
									</Button>
								))}
							</fieldset>
						</>
					) : undefined
				}
			/>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					icon={<UserRound />}
					title="No people yet"
					description="People are the board, management and staff. The ones marked public appear on the Team page and the org chart."
					action={newPerson}
				/>
			) : shown.length === 0 ? (
				<EmptyState
					icon={<SearchX />}
					title="No people match your filters"
					description={
						q
							? `Nothing here contains “${q}”.`
							: "Nobody sits in that tier yet."
					}
					action={clearFilters}
				/>
			) : (
				<>
					{q !== "" ? <ReorderOff what="people" /> : null}
					<TableScroll label="People">
						<Table>
							<THead>
								<TR>
									<ReorderHead />
									<TH width={64}>
										<span className="sr-only">Photo</span>
									</TH>
									<TH>Name</TH>
									<TH>Position</TH>
									<TH width={150}>Tier</TH>
									<TH width={120}>Visibility</TH>
									<TH align="right" width={72}>
										Actions
									</TH>
								</TR>
							</THead>
							{tiersShown.map((t) => (
								<TierRows
									key={t}
									tier={t}
									rows={shown.filter((r) => r.tier === t)}
									disabled={q !== ""}
									onDelete={del}
								/>
							))}
						</Table>
					</TableScroll>
				</>
			)}
		</div>
	);
}

// one tbody per tier, so a drag sends that tier's ids only
function TierRows({
	tier,
	rows,
	disabled,
	onDelete,
}: {
	tier: string;
	rows: Row[];
	disabled: boolean;
	onDelete: (row: Row) => void;
}) {
	const reorder = useListReorder({
		rows,
		id: (r: Row) => r.id,
		describe: (r: Row) => r.nameEn ?? `person ${r.id}`,
		disabled,
		save: (ids) => trpcClient.adminPeople.reorder.mutate({ ids }),
	});
	return (
		<TBody>
			<TR className="max-md:border-0 max-md:bg-transparent max-md:p-0">
				<TH
					scope="rowgroup"
					role="rowheader"
					colSpan={7}
					className="bg-admin-neutral-soft/60 max-md:bg-transparent max-md:px-0"
				>
					{TIER_LABELS[tier] ?? tier}
					<SortableStatus status={reorder.status} />
				</TH>
			</TR>
			{reorder.rows.map((r) => (
				<TR
					key={r.id}
					{...reorder.itemProps(r)}
					className={`hover:bg-admin-accent-soft/50 ${dragRow}`}
				>
					<ReorderCell grip={reorder.grip(r)} />
					<TD>
						{r.photoUrl ? (
							<img
								src={r.photoUrl}
								alt=""
								className="size-9 rounded-full object-cover"
							/>
						) : (
							<span className="grid size-9 place-items-center rounded-full bg-admin-neutral-soft text-[13px] font-medium text-admin-ink-muted">
								{(r.nameEn ?? "?").slice(0, 1)}
							</span>
						)}
					</TD>
					<TD label="Name">
						<Link
							to="/admin/people/$id"
							params={{ id: String(r.id) }}
							className="tap-target truncate font-medium text-admin-ink max-md:whitespace-normal transition-colors duration-150 ease-out hover:text-admin-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
						>
							{r.nameEn}
						</Link>
						{r.nameKm ? (
							<span className="ml-2 font-khmer text-[13px] text-admin-ink-muted">
								{r.nameKm}
							</span>
						) : null}
					</TD>
					<TD label="Position" className="text-admin-ink-muted">
						{r.position || "—"}
					</TD>
					<TD label="Tier" className="text-admin-ink-muted">
						{TIER_LABELS[r.tier] ?? r.tier}
					</TD>
					<TD label="Visibility">
						{r.isPublic ? (
							<Badge tone="live">Public</Badge>
						) : (
							<Badge tone="neutral">Internal</Badge>
						)}
					</TD>
					<TD align="right" className="max-md:justify-end">
						<ActionMenu
							label={`Actions for ${r.nameEn}`}
							items={[
								...viewOnSite({
									kind: "person",
									slug: r.slug,
									isPublic: r.isPublic,
								}),
								{
									label: "Delete person",
									danger: true,
									onClick: () => onDelete(r),
								},
							]}
						/>
					</TD>
				</TR>
			))}
		</TBody>
	);
}
