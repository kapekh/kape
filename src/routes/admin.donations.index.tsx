import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import {
	DonationStat,
	DonationsTable,
	donationTotals,
	fmtMoney,
} from "#/components/admin/DonationsTable";
import { ListStatus, useListQuery } from "#/components/admin/list-ui";
import { PageHeader } from "#/components/ui/page-header.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/donations/")({
	component: DonationsList,
});

type Row = Awaited<
	ReturnType<typeof trpcClient.adminDonations.list.query>
>[number];

function DonationsList() {
	const load = useCallback(() => trpcClient.adminDonations.list.query(), []);
	const { rows, state, error, reload } = useListQuery<Row>(load);
	const [campaign, setCampaign] = useState("all");

	// Distinct campaigns present in the data, for the filter dropdown.
	const campaignOptions = useMemo(() => {
		const seen = new Map<string, string>();
		for (const r of rows)
			if (r.campaignId != null && r.campaignTitle)
				seen.set(String(r.campaignId), r.campaignTitle);
		return [...seen.entries()];
	}, [rows]);
	const visibleRows = useMemo(
		() =>
			campaign === "all"
				? rows
				: campaign === "none"
					? rows.filter((r) => r.campaignId == null)
					: rows.filter((r) => String(r.campaignId) === campaign),
		[rows, campaign],
	);

	async function markPaid(id: number) {
		if (
			!(await confirm(
				"Mark this donation as paid? Use this only to reconcile a payment confirmed elsewhere.",
			))
		)
			return;
		await trpcClient.adminDonations.markPaid.mutate({ id });
		await reload();
	}

	const totals = useMemo(() => donationTotals(visibleRows), [visibleRows]);

	return (
		<div>
			<PageHeader
				title="Donations"
				description="Every gift received through Baray, across all campaigns."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Donations" }]}
				toolbar={
					state === "ready" && campaignOptions.length > 0 ? (
						<>
							<label
								htmlFor="donation-campaign"
								className="text-[13px] font-medium text-admin-ink"
							>
								Campaign
							</label>
							{/* `appearance-none` drops the grey button the native control paints
							    and no token reaches; the chevron has to come back by hand */}
							<span className="relative inline-flex items-center">
								<select
									id="donation-campaign"
									value={campaign}
									onChange={(e) => setCampaign(e.target.value)}
									className="h-10 appearance-none rounded-lg border border-admin-border bg-admin-panel pl-3 pr-9 text-sm text-admin-ink transition-colors duration-150 ease-out focus-visible:border-admin-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/40"
								>
									<option value="all">All campaigns</option>
									{campaignOptions.map(([id, title]) => (
										<option key={id} value={id}>
											{title}
										</option>
									))}
									<option value="none">— Unassigned</option>
								</select>
								<ChevronDown
									aria-hidden="true"
									className="pointer-events-none absolute right-3 size-4 text-admin-ink-muted"
								/>
							</span>
							<output className="text-[13px] text-admin-ink-muted">
								{campaign === "all"
									? `${rows.length} ${rows.length === 1 ? "donation" : "donations"}`
									: `${visibleRows.length} of ${rows.length}`}
							</output>
						</>
					) : undefined
				}
			/>

			{state === "error" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : (
				<>
					<div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
						<DonationStat
							label="Raised (USD)"
							value={fmtMoney(totals.usd, "USD")}
						/>
						<DonationStat
							label="Raised (KHR)"
							value={fmtMoney(totals.khr, "KHR")}
						/>
						<DonationStat label="Confirmed" value={String(totals.paidCount)} />
						<DonationStat label="Pending" value={String(totals.pendingCount)} />
					</div>

					<DonationsTable
						rows={visibleRows}
						loading={state === "pending"}
						showCampaign
						onMarkPaid={markPaid}
					/>
				</>
			)}
		</div>
	);
}
