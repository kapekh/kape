import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone, Plus, SearchX } from "lucide-react";
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
import { Badge, type BadgeTone } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { PageHeader } from "#/components/ui/page-header.tsx";
import { Table, TBody, TD, TH, THead, TR } from "#/components/ui/table.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { fmtMoney } from "#/lib/format";
import { useLang } from "#/lib/i18n";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/campaigns/")({
	component: CampaignsList,
});

type Row = Awaited<
	ReturnType<typeof trpcClient.adminCampaigns.list.query>
>[number];

const statusTone: Record<string, BadgeTone> = {
	active: "live",
	draft: "draft",
	ended: "warning",
};

function CampaignsList() {
	const { lang } = useLang();
	const load = useCallback(() => trpcClient.adminCampaigns.list.query(), []);
	const { rows, setRows, state, error, reload } = useListQuery<Row>(load);
	const [q, setQ] = useState("");
	const [status, setStatus] = useState("");

	async function del(row: Row) {
		if (
			!(await confirm(
				"Delete this campaign? Pending/failed donation attempts are removed with it. (Campaigns with confirmed gifts can't be deleted.)",
			))
		)
			return;
		await removeWithRollback(
			rows,
			setRows,
			(r) => r.id === row.id,
			() => trpcClient.adminCampaigns.delete.mutate({ id: row.id }),
		);
	}

	const statuses = [...new Set(rows.map((r) => r.status))].sort();
	const ofStatus = status ? rows.filter((r) => r.status === status) : rows;
	const shown = ofStatus.filter((r) => matchesQuery(q, r.title, r.status));
	const filtered = q !== "" || status !== "";
	// read as `featured desc, sort asc`: only one flag's group is in sort order
	const groups = [true, false].filter((f) =>
		shown.some((r) => !!r.featured === f),
	);

	const newCampaign = (
		<Button asChild>
			<Link to="/admin/campaigns/new">
				<Plus aria-hidden="true" />
				New campaign
			</Link>
		</Button>
	);

	const clearFilters = (
		<Button
			type="button"
			variant="secondary"
			onClick={() => {
				setQ("");
				setStatus("");
			}}
		>
			{status ? "Clear filters" : "Clear search"}
		</Button>
	);

	return (
		<div>
			<PageHeader
				title="Campaigns"
				description="Fundraising campaigns shown on /donate."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Campaigns" }]}
				actions={newCampaign}
				toolbar={
					state === "ready" && rows.length > 0 ? (
						<>
							<ListSearch
								value={q}
								onChange={setQ}
								label="Search campaigns"
								placeholder="Search by title or status…"
								status={
									filtered
										? `${shown.length} of ${rows.length}`
										: `${rows.length} ${rows.length === 1 ? "campaign" : "campaigns"}`
								}
							/>
							<fieldset className="flex flex-wrap items-center gap-2">
								<legend className="sr-only">Filter by status</legend>
								<Button
									type="button"
									size="sm"
									variant={status === "" ? "primary" : "secondary"}
									aria-pressed={status === ""}
									onClick={() => setStatus("")}
								>
									All
								</Button>
								{statuses.map((s) => (
									<Button
										key={s}
										type="button"
										size="sm"
										variant={status === s ? "primary" : "secondary"}
										aria-pressed={status === s}
										onClick={() => setStatus(s)}
										className="capitalize"
									>
										{s}
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
					icon={<Megaphone />}
					title="No campaigns yet"
					description="A campaign is a fundraising goal with its own page on /donate and its own donation record."
					action={newCampaign}
				/>
			) : shown.length === 0 ? (
				<EmptyState
					icon={<SearchX />}
					title="No campaigns match your filters"
					description={
						q
							? `Nothing here contains “${q}”.`
							: "No campaign carries that status yet."
					}
					action={clearFilters}
				/>
			) : (
				<>
					{filtered ? (
						<ReorderOff what="campaigns" clear="the search and filters" />
					) : null}
					<TableScroll label="Campaigns">
						<Table>
							<THead>
								<TR>
									<ReorderHead />
									<TH width={72}>
										<span className="sr-only">Cover</span>
									</TH>
									<TH>Title</TH>
									<TH width={120}>Status</TH>
									<TH align="right" width={180}>
										Raised
									</TH>
									<TH align="right" width={120}>
										Supporters
									</TH>
									<TH align="right" width={140}>
										Actions
									</TH>
								</TR>
							</THead>
							{groups.map((featured) => (
								<FeaturedRows
									key={String(featured)}
									featured={featured}
									rows={shown.filter((r) => !!r.featured === featured)}
									disabled={filtered}
									lang={lang}
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

function FeaturedRows({
	featured,
	rows,
	disabled,
	lang,
	onDelete,
}: {
	featured: boolean;
	rows: Row[];
	disabled: boolean;
	lang: string;
	onDelete: (row: Row) => void;
}) {
	const reorder = useListReorder({
		rows,
		id: (r: Row) => r.id,
		describe: (r: Row) => r.title,
		disabled,
		save: (ids) => trpcClient.adminCampaigns.reorder.mutate({ ids }),
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
					{featured ? "Featured" : "Not featured"}
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
						<div className="grid h-10 w-14 place-items-center overflow-hidden rounded-lg bg-admin-neutral-soft ring-1 ring-admin-border">
							{r.coverUrl ? (
								<img
									src={r.coverUrl}
									alt=""
									className="h-full w-full object-cover"
								/>
							) : null}
						</div>
					</TD>
					<TD label="Title">
						<div className="flex min-w-0 items-center gap-2">
							<Link
								to="/admin/campaigns/$id"
								params={{ id: String(r.id) }}
								className="tap-target truncate font-medium text-admin-ink max-md:whitespace-normal transition-colors duration-150 ease-out hover:text-admin-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
							>
								{r.title}
							</Link>
							{r.featured ? (
								<Badge tone="accent" dot={false}>
									Featured
								</Badge>
							) : null}
						</div>
					</TD>
					<TD label="Status">
						<Badge tone={statusTone[r.status] ?? "neutral"}>
							<span className="capitalize">{r.status}</span>
						</Badge>
					</TD>
					<TD label="Raised" align="right" className="tabular-nums">
						{fmtMoney(r.raised, r.currency, lang)}
						{r.goalAmount ? (
							<span className="text-admin-ink-muted">
								{" "}
								/ {fmtMoney(r.goalAmount, r.currency, lang)}
							</span>
						) : null}
					</TD>
					<TD
						label="Supporters"
						align="right"
						className="tabular-nums text-admin-ink-muted"
					>
						{r.supporters}
					</TD>
					<TD align="right" className="max-md:justify-end">
						<div className="flex items-center justify-end gap-1">
							<Button asChild variant="ghost" size="sm">
								<Link
									to="/admin/campaigns/$id/donations"
									params={{ id: String(r.id) }}
								>
									Donations
								</Link>
							</Button>
							<ActionMenu
								label={`Actions for ${r.title}`}
								items={[
									{
										label: "Delete campaign",
										danger: true,
										onClick: () => onDelete(r),
									},
								]}
							/>
						</div>
					</TD>
				</TR>
			))}
		</TBody>
	);
}
