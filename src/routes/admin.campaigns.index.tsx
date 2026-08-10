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
import { fmtMoney } from "#/lib/format";
import { useLang } from "#/lib/i18n";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/campaigns/")({
	component: CampaignsList,
});

type Row = Awaited<
	ReturnType<typeof trpcClient.adminCampaigns.list.query>
>[number];

const statusStyle: Record<string, string> = {
	active: "bg-[var(--palm)]/15 text-[var(--palm)]",
	draft: "bg-muted text-muted-foreground",
	ended: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

function CampaignsList() {
	const { lang } = useLang();
	const load = useCallback(() => trpcClient.adminCampaigns.list.query(), []);
	const { rows, setRows, state, error, reload } = useListQuery<Row>(load);
	const [q, setQ] = useState("");

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

	const shown = rows.filter((r) => matchesQuery(q, r.title, r.status));

	const newCampaign = (
		<Link
			to="/admin/campaigns/new"
			className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
		>
			+ New campaign
		</Link>
	);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">
						Campaigns
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Fundraising campaigns shown on /donate
						{state === "ready" ? ` — ${rows.length} total.` : "."}
					</p>
				</div>
				{newCampaign}
			</div>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					title="No campaigns yet"
					description="A campaign is a fundraising goal with its own page on /donate and its own donation record."
					action={newCampaign}
				/>
			) : (
				<>
					<ListSearch
						value={q}
						onChange={setQ}
						label="Search campaigns"
						placeholder="Search by title or status…"
						status={q ? `${shown.length} of ${rows.length}` : undefined}
					/>
					{shown.length === 0 ? (
						<EmptyState
							title="No campaigns match that search"
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
						<TableScroll label="Campaigns">
							<table className="w-full text-sm">
								<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
									<tr>
										<th className="px-4 py-2.5 w-16" />
										<th className="px-2 py-2.5">Title</th>
										<th className="px-2 py-2.5">Status</th>
										<th className="px-2 py-2.5 text-right">Raised</th>
										<th className="px-2 py-2.5 text-right">Supporters</th>
										<th className="px-3 py-2.5 text-right">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{shown.map((r) => (
										<tr key={r.id} className="hover:bg-muted/20">
											<td className="px-4 py-2">
												<div className="h-10 w-14 rounded-md overflow-hidden bg-muted ring-1 ring-border grid place-items-center">
													{r.coverUrl ? (
														<img
															src={r.coverUrl}
															alt=""
															className="h-full w-full object-cover"
														/>
													) : null}
												</div>
											</td>
											<td className="px-2 py-2">
												<Link
													to="/admin/campaigns/$id"
													params={{ id: String(r.id) }}
													className="font-medium text-foreground hover:text-[var(--accent)]"
												>
													{r.title}
												</Link>
												{r.featured ? (
													<span className="ml-2 text-xs font-semibold text-[var(--accent)]">
														★ Featured
													</span>
												) : null}
											</td>
											<td className="px-2 py-2">
												<span
													className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyle[r.status] ?? ""}`}
												>
													{r.status}
												</span>
											</td>
											<td className="px-2 py-2 text-right tabular-nums text-foreground/90">
												{fmtMoney(r.raised, r.currency, lang)}
												{r.goalAmount ? (
													<span className="text-muted-foreground">
														{" "}
														/ {fmtMoney(r.goalAmount, r.currency, lang)}
													</span>
												) : null}
											</td>
											<td className="px-2 py-2 text-right tabular-nums text-foreground/80">
												{r.supporters}
											</td>
											<td className="px-3 py-2 text-right whitespace-nowrap">
												<Link
													to="/admin/campaigns/$id/donations"
													params={{ id: String(r.id) }}
													className="text-xs font-semibold text-[var(--accent)] hover:underline"
												>
													Donations
												</Link>
												<Link
													to="/admin/campaigns/$id"
													params={{ id: String(r.id) }}
													className="ml-3 text-xs font-semibold text-[var(--accent)] hover:underline"
												>
													Edit
												</Link>
												<span className="ml-2 inline-flex align-middle">
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
