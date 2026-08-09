import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm, toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/campaigns/")({
	component: CampaignsList,
});

type Row = Awaited<
	ReturnType<typeof trpcClient.adminCampaigns.list.query>
>[number];

const money = (n: number, currency: string) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		maximumFractionDigits: 0,
	}).format(n);

const statusStyle: Record<string, string> = {
	active: "bg-[var(--palm)]/15 text-[var(--palm)]",
	draft: "bg-muted text-muted-foreground",
	ended: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

function CampaignsList() {
	const [rows, setRows] = useState<Row[]>([]);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		setRows(await trpcClient.adminCampaigns.list.query());
		setLoading(false);
	}, []);
	useEffect(() => {
		refresh();
	}, [refresh]);

	async function del(id: number) {
		if (
			!(await confirm(
				"Delete this campaign? Pending/failed donation attempts are removed with it. (Campaigns with confirmed gifts can't be deleted.)",
			))
		)
			return;
		try {
			await trpcClient.adminCampaigns.delete.mutate({ id });
			setRows((rs) => rs.filter((r) => r.id !== id));
		} catch (e) {
			toast(
				e instanceof Error ? e.message : "Could not delete this campaign.",
				"error",
			);
		}
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">
						Campaigns
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Fundraising campaigns shown on /donate — {rows.length} total.
					</p>
				</div>
				<Link
					to="/admin/campaigns/new"
					className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
				>
					+ New campaign
				</Link>
			</div>

			<div className="overflow-hidden rounded-xl border border-border bg-card">
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
						{loading ? (
							<tr>
								<td colSpan={6} className="px-4 py-6 text-muted-foreground">
									Loading…
								</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td colSpan={6} className="px-4 py-6 text-muted-foreground">
									No campaigns yet.{" "}
									<Link
										to="/admin/campaigns/new"
										className="text-[var(--accent)] hover:underline"
									>
										Create the first one →
									</Link>
								</td>
							</tr>
						) : (
							rows.map((r) => (
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
										{money(r.raised, r.currency)}
										{r.goalAmount ? (
											<span className="text-muted-foreground">
												{" "}
												/ {money(r.goalAmount, r.currency)}
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
												items={[
													{
														label: "Delete campaign",
														danger: true,
														onClick: () => del(r.id),
													},
												]}
											/>
										</span>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
