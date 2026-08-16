import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone, Plus, SearchX } from "lucide-react";
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
				<TableScroll label="Campaigns">
					<Table>
						<THead>
							<TR>
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
						<TBody>
							{shown.map((r) => (
								<TR key={r.id} className="hover:bg-admin-accent-soft/50">
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
														onClick: () => del(r),
													},
												]}
											/>
										</div>
									</TD>
								</TR>
							))}
						</TBody>
					</Table>
				</TableScroll>
			)}
		</div>
	);
}
