import { Link } from "@tanstack/react-router";

import { ActionMenu } from "./ActionMenu";

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
	new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "KHR" ? 0 : 2 }).format(n);

export function fmtDate(s: string) {
	const d = new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`);
	return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
}

function StatusBadge({ status }: { status: string }) {
	const map: Record<string, string> = {
		paid: "bg-[var(--palm)]/15 text-[var(--palm)]",
		pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
		failed: "bg-destructive/15 text-destructive",
	};
	return (
		<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${map[status] ?? "bg-muted text-muted-foreground"}`}>
			{status}
		</span>
	);
}

export function DonationStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border border-border bg-card px-4 py-3">
			<div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
			<div className="mt-1 font-display text-xl font-semibold text-primary tabular-nums">{value}</div>
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
	const cols = showCampaign ? 7 : 6;
	return (
		<div className="overflow-hidden rounded-xl border border-border bg-card">
			<table className="w-full text-sm">
				<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
					<tr>
						<th className="px-4 py-2.5">Date</th>
						<th className="px-2 py-2.5">Donor</th>
						{showCampaign && <th className="px-2 py-2.5">Campaign</th>}
						<th className="px-2 py-2.5 text-right">Amount</th>
						<th className="px-2 py-2.5">Status</th>
						<th className="px-2 py-2.5">Method</th>
						<th className="px-3 py-2.5 text-right">Actions</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{loading ? (
						<tr><td colSpan={cols} className="px-4 py-6 text-muted-foreground">Loading…</td></tr>
					) : rows.length === 0 ? (
						<tr><td colSpan={cols} className="px-4 py-6 text-muted-foreground">{emptyText}</td></tr>
					) : (
						rows.map((r) => (
							<tr key={r.id} className="hover:bg-muted/20 align-top">
								<td className="px-4 py-2.5 whitespace-nowrap text-foreground/80">{fmtDate(r.createdAt)}</td>
								<td className="px-2 py-2.5">
									<div className="font-medium text-foreground">{r.donorName || "Anonymous"}</div>
									{r.donorEmail && <div className="text-xs text-muted-foreground">{r.donorEmail}</div>}
									{r.message && <div className="mt-0.5 max-w-xs truncate text-xs italic text-muted-foreground" title={r.message}>“{r.message}”</div>}
								</td>
								{showCampaign && (
									<td className="px-2 py-2.5 text-foreground/80">
										{r.campaignId != null ? (
											<Link to="/admin/campaigns/$id" params={{ id: String(r.campaignId) }} className="hover:text-[var(--accent)]">{r.campaignTitle}</Link>
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</td>
								)}
								<td className="px-2 py-2.5 text-right font-semibold tabular-nums text-foreground">{fmtMoney(parseFloat(r.amount) || 0, r.currency)}</td>
								<td className="px-2 py-2.5"><StatusBadge status={r.status} /></td>
								<td className="px-2 py-2.5 capitalize text-foreground/80">{r.bank || "—"}</td>
								<td className="px-3 py-2.5 text-right whitespace-nowrap">
									{r.status === "pending" ? (
										<ActionMenu items={[{ label: "Mark as paid", onClick: () => onMarkPaid(r.id) }]} />
									) : (
										<span className="text-xs text-muted-foreground">—</span>
									)}
								</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}

/** USD/KHR confirmed totals + counts from a set of rows. */
export function donationTotals(rows: DonationRow[]) {
	const paid = rows.filter((r) => r.status === "paid");
	const sum = (cur: string) => paid.filter((r) => r.currency === cur).reduce((a, r) => a + (parseFloat(r.amount) || 0), 0);
	return { usd: sum("USD"), khr: sum("KHR"), paidCount: paid.length, pendingCount: rows.filter((r) => r.status === "pending").length };
}
