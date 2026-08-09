import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
	DonationStat,
	DonationsTable,
	donationTotals,
	fmtMoney,
} from "#/components/admin/DonationsTable";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/campaigns/$id/donations")({
	component: CampaignDonations,
});

type Row = Awaited<
	ReturnType<typeof trpcClient.adminCampaigns.donations.query>
>[number];

function CampaignDonations() {
	const { id } = Route.useParams();
	const cid = Number(id);
	const [rows, setRows] = useState<Row[]>([]);
	const [title, setTitle] = useState("");
	const [currency, setCurrency] = useState("USD");
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		const [donations, campaign] = await Promise.all([
			trpcClient.adminCampaigns.donations.query({ id: cid }),
			trpcClient.adminCampaigns.get.query({ id: cid }),
		]);
		setRows(donations);
		setTitle(campaign?.title ?? "Campaign");
		setCurrency(campaign?.currency ?? "USD");
		setLoading(false);
	}, [cid]);
	useEffect(() => {
		refresh();
	}, [refresh]);

	async function markPaid(donationId: number) {
		if (
			!(await confirm(
				"Mark this donation as paid? Use this only to reconcile a payment confirmed elsewhere.",
			))
		)
			return;
		await trpcClient.adminDonations.markPaid.mutate({ id: donationId });
		await refresh();
	}

	const totals = useMemo(() => donationTotals(rows), [rows]);
	const raised = currency === "KHR" ? totals.khr : totals.usd;

	return (
		<div>
			<div className="mb-6">
				<Link
					to="/admin/campaigns"
					className="text-xs font-semibold text-muted-foreground hover:text-foreground"
				>
					← Campaigns
				</Link>
				<div className="mt-1 flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="font-display text-2xl font-semibold text-primary">
							{title} — donations
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Gifts owned by this campaign — {rows.length} total.
						</p>
					</div>
					<Link
						to="/admin/campaigns/$id"
						params={{ id }}
						className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition"
					>
						Edit campaign
					</Link>
				</div>
			</div>

			<div className="mb-6 grid grid-cols-3 gap-3">
				<DonationStat
					label={`Raised (${currency})`}
					value={fmtMoney(raised, currency)}
				/>
				<DonationStat label="Confirmed" value={String(totals.paidCount)} />
				<DonationStat label="Pending" value={String(totals.pendingCount)} />
			</div>

			<DonationsTable
				rows={rows}
				loading={loading}
				emptyText="No donations to this campaign yet."
				onMarkPaid={markPaid}
			/>
		</div>
	);
}
