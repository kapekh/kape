import type { CampaignPublic } from "#/server/repo/campaigns";

export const money = (n: number, currency: string) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		currencyDisplay: "narrowSymbol",
		maximumFractionDigits: currency === "KHR" ? 0 : 0,
	}).format(n);

/** Raised / goal progress bar + supporter count. Goal is optional. */
export function CampaignProgress({ campaign }: { campaign: Pick<CampaignPublic, "currency" | "goalAmount" | "raised" | "supporters"> }) {
	const { currency, goalAmount, raised, supporters } = campaign;
	const pct = goalAmount && goalAmount > 0 ? Math.min(100, Math.round((raised / goalAmount) * 100)) : null;

	// Before the first gift, showing "$0 · 0% funded" reads as a stalled campaign.
	// Lead with the goal and an invitation instead.
	if (raised <= 0) {
		return (
			<div>
				<div className="font-display text-2xl font-semibold text-primary">Be the first to give</div>
				<div className="mt-1 text-sm text-muted-foreground">
					{goalAmount ? <>Help reach the <span className="font-medium text-foreground">{money(goalAmount, currency)}</span> goal.</> : <>Your gift gets this campaign moving.</>}
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="flex items-end justify-between gap-4">
				<div>
					<div className="font-display text-3xl font-semibold text-primary tabular-nums">{money(raised, currency)}</div>
					<div className="text-sm text-muted-foreground">
						raised{goalAmount ? <> of <span className="font-medium text-foreground">{money(goalAmount, currency)}</span> goal</> : null}
					</div>
				</div>
				<div className="text-right">
					<div className="font-display text-2xl font-semibold text-primary tabular-nums">{supporters.toLocaleString()}</div>
					<div className="text-sm text-muted-foreground">{supporters === 1 ? "supporter" : "supporters"}</div>
				</div>
			</div>
			{pct != null && (
				<div className="mt-4">
					<div className="h-3 w-full overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-[width] duration-700"
							style={{ width: `${pct}%` }}
						/>
					</div>
					<div className="mt-1.5 text-xs font-semibold text-[var(--accent)]">{pct}% funded</div>
				</div>
			)}
		</div>
	);
}
