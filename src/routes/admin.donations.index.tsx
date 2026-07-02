import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { DonationStat, DonationsTable, donationTotals, fmtMoney } from "#/components/admin/DonationsTable";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/donations/")({ component: DonationsList });

type Row = Awaited<ReturnType<typeof trpcClient.adminDonations.list.query>>[number];

function DonationsList() {
	const [rows, setRows] = useState<Row[]>([]);
	const [loading, setLoading] = useState(true);
	const [campaign, setCampaign] = useState("all");

	async function refresh() {
		setRows(await trpcClient.adminDonations.list.query());
		setLoading(false);
	}
	useEffect(() => {
		refresh();
	}, []);

	// Distinct campaigns present in the data, for the filter dropdown.
	const campaignOptions = useMemo(() => {
		const seen = new Map<string, string>();
		for (const r of rows) if (r.campaignId != null && r.campaignTitle) seen.set(String(r.campaignId), r.campaignTitle);
		return [...seen.entries()];
	}, [rows]);
	const visibleRows = useMemo(
		() => (campaign === "all" ? rows : campaign === "none" ? rows.filter((r) => r.campaignId == null) : rows.filter((r) => String(r.campaignId) === campaign)),
		[rows, campaign],
	);

	async function markPaid(id: number) {
		if (!(await confirm("Mark this donation as paid? Use this only to reconcile a payment confirmed elsewhere."))) return;
		await trpcClient.adminDonations.markPaid.mutate({ id });
		await refresh();
	}

	const totals = useMemo(() => donationTotals(visibleRows), [visibleRows]);

	return (
		<div>
			<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">Donations</h1>
					<p className="mt-1 text-sm text-muted-foreground">All gifts received via Baray, across every campaign — {rows.length} total.</p>
				</div>
				{campaignOptions.length > 0 && (
					<select value={campaign} onChange={(e) => setCampaign(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
						<option value="all">All campaigns</option>
						{campaignOptions.map(([id, title]) => (
							<option key={id} value={id}>{title}</option>
						))}
						<option value="none">— Unassigned</option>
					</select>
				)}
			</div>

			<div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
				<DonationStat label="Raised (USD)" value={fmtMoney(totals.usd, "USD")} />
				<DonationStat label="Raised (KHR)" value={fmtMoney(totals.khr, "KHR")} />
				<DonationStat label="Confirmed" value={String(totals.paidCount)} />
				<DonationStat label="Pending" value={String(totals.pendingCount)} />
			</div>

			<DonationsTable rows={visibleRows} loading={loading} showCampaign onMarkPaid={markPaid} />
		</div>
	);
}
