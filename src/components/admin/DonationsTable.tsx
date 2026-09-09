import { Link } from "@tanstack/react-router";
import { HandCoins } from "lucide-react";
import { Badge, type BadgeTone } from "#/components/ui/badge.tsx";
import { EmptyState } from "#/components/ui/empty-state.tsx";
import { Table, TBody, TD, TH, THead, TR } from "#/components/ui/table.tsx";
import { ActionMenu } from "./ActionMenu";
import { ListStatus, TableScroll } from "./list-ui";

export type DonationRow = {
	id: number;
	createdAt: string;
	donorName: string | null;
	donorEmail: string | null;
	message: string | null;
	amount: string;
	currency: string;
	status: string;
	bank: string | null;
	campaignId: number | null;
	campaignTitle?: string | null;
};

export const fmtMoney = (n: number, currency: string) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		maximumFractionDigits: currency === "KHR" ? 0 : 2,
	}).format(n);

function fmtDate(s: string) {
	const d = new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`);
	return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
}

const STATUS_TONE: Record<string, BadgeTone> = {
	paid: "live",
	pending: "warning",
	failed: "danger",
};

export function DonationStat({
	label,
	value,
}: {
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-xl border border-admin-border bg-admin-panel px-4 py-3">
			<div className="text-[13px] text-admin-ink-muted">{label}</div>
			<div className="mt-1 text-xl font-semibold text-admin-ink tabular-nums">
				{value}
			</div>
		</div>
	);
}

/** Shared donations table. `showCampaign` adds a campaign column (global view). */
export function DonationsTable({
	rows,
	loading,
	showCampaign = false,
	emptyText = "No donations yet.",
	onMarkPaid,
}: {
	rows: DonationRow[];
	loading: boolean;
	showCampaign?: boolean;
	emptyText?: string;
	onMarkPaid: (id: number) => void;
}) {
	if (loading) return <ListStatus state="pending" onRetry={() => {}} />;

	if (rows.length === 0)
		return <EmptyState icon={<HandCoins />} title={emptyText} />;

	return (
		<TableScroll label="Donations">
			<Table>
				<THead>
					<TR>
						<TH>Date</TH>
						<TH>Donor</TH>
						{showCampaign && <TH>Campaign</TH>}
						<TH align="right">Amount</TH>
						<TH width={120}>Status</TH>
						<TH width={120}>Method</TH>
						<TH align="right" width={72}>
							Actions
						</TH>
					</TR>
				</THead>
				<TBody>
					{rows.map((r) => (
						<TR key={r.id} className="hover:bg-admin-accent-soft/50">
							<TD
								label="Date"
								className="whitespace-nowrap text-admin-ink-muted"
							>
								{fmtDate(r.createdAt)}
							</TD>
							<TD label="Donor">
								<span className="block font-medium text-admin-ink">
									{r.donorName || "Anonymous"}
								</span>
								{r.donorEmail && (
									<span className="block text-[13px] text-admin-ink-muted">
										{r.donorEmail}
									</span>
								)}
								{r.message && (
									<span
										className="mt-0.5 block max-w-xs truncate text-[13px] italic text-admin-ink-subtle"
										title={r.message}
									>
										“{r.message}”
									</span>
								)}
							</TD>
							{showCampaign && (
								<TD label="Campaign" className="text-admin-ink-muted">
									{r.campaignId != null ? (
										<Link
											to="/admin/campaigns/$id"
											params={{ id: String(r.campaignId) }}
											className="rounded transition-colors duration-150 ease-out hover:text-admin-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
										>
											{r.campaignTitle}
										</Link>
									) : (
										<span className="text-admin-ink-subtle">—</span>
									)}
								</TD>
							)}
							<TD
								label="Amount"
								align="right"
								className="font-medium tabular-nums text-admin-ink"
							>
								{fmtMoney(parseFloat(r.amount) || 0, r.currency)}
							</TD>
							<TD label="Status">
								<Badge tone={STATUS_TONE[r.status] ?? "neutral"}>
									<span className="capitalize">{r.status}</span>
								</Badge>
							</TD>
							<TD label="Method" className="capitalize text-admin-ink-muted">
								{r.bank || "—"}
							</TD>
							<TD align="right" className="max-md:justify-end">
								{r.status === "pending" ? (
									<ActionMenu
										label={`Actions for the donation from ${r.donorName || "Anonymous"}`}
										items={[
											{
												label: "Mark as paid",
												onClick: () => onMarkPaid(r.id),
											},
										]}
									/>
								) : (
									<span className="text-[13px] text-admin-ink-subtle">—</span>
								)}
							</TD>
						</TR>
					))}
				</TBody>
			</Table>
		</TableScroll>
	);
}

/** USD/KHR confirmed totals + counts from a set of rows. */
export function donationTotals(rows: DonationRow[]) {
	const paid = rows.filter((r) => r.status === "paid");
	const sum = (cur: string) =>
		paid
			.filter((r) => r.currency === cur)
			.reduce((a, r) => a + (parseFloat(r.amount) || 0), 0);
	return {
		usd: sum("USD"),
		khr: sum("KHR"),
		paidCount: paid.length,
		pendingCount: rows.filter((r) => r.status === "pending").length,
	};
}
