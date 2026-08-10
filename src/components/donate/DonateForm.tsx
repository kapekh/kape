import { useMemo, useState } from "react";

import type { CampaignPublic } from "#/server/repo/campaigns";
import { useT } from "@/lib/i18n";

import { money } from "./CampaignProgress";
import { Slot } from "./Slot";

type Visibility = "name" | "custom" | "anonymous";

export const MIN: Record<string, number> = { USD: 0.03, KHR: 100 };
// a number input only accepts min + n*step, so a step that does not divide the
// gap to a round amount rejects every round amount
export const STEP: Record<string, number> = { USD: 0.01, KHR: 100 };

export function DonateForm({ campaign }: { campaign: CampaignPublic }) {
	const t = useT();
	const cur = campaign.currency;
	const presets = campaign.presets.length
		? campaign.presets
		: [25, 50, 100, 250];
	const tiers = useMemo(
		() => [...campaign.impactTiers].sort((a, b) => a.amount - b.amount),
		[campaign.impactTiers],
	);

	// Amounts shown as selectable cards: tier amounts (with their labels) merged
	// with any presets that don't have a tier (label-less). One unified picker.
	const options = useMemo(() => {
		const byAmount = new Map<number, string | null>();
		for (const p of presets) byAmount.set(p, byAmount.get(p) ?? null);
		for (const t of tiers) byAmount.set(t.amount, t.label);
		return [...byAmount.entries()]
			.sort((a, b) => a[0] - b[0])
			.map(([amount, label]) => ({ amount, label }));
	}, [presets, tiers]);
	const defaultAmount =
		options.find((o) => o.label)?.amount ??
		options[1]?.amount ??
		options[0]?.amount ??
		50;

	const [amount, setAmount] = useState<number>(defaultAmount);
	const [custom, setCustom] = useState("");
	const [visibility, setVisibility] = useState<Visibility>("name");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [message, setMessage] = useState("");
	const [confirm, setConfirm] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const value = custom ? Number(custom) || 0 : amount;

	// Highest impact tier the current amount unlocks (for the custom-amount hint + confirm).
	const impact = useMemo(() => {
		let hit: { amount: number; label: string } | null = null;
		for (const t of tiers) if (value >= t.amount) hit = t;
		return hit;
	}, [tiers, value]);

	const anonymous = t("donate.anonymous", "Anonymous");
	const credited =
		visibility === "anonymous"
			? anonymous
			: visibility === "custom"
				? displayName.trim() || anonymous
				: name.trim() || anonymous;

	function review(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		if (value < MIN[cur]) {
			setError(
				t("donate.minimum", "Minimum donation is {amount}.", {
					amount: money(MIN[cur], cur),
				}),
			);
			return;
		}
		setConfirm(true);
	}

	async function pay() {
		setBusy(true);
		setError(null);
		try {
			const res = await fetch("/api/pay/donate", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					campaign: campaign.slug,
					amount: value,
					name,
					email,
					message,
					visibility,
					displayName,
				}),
			});
			const data = (await res.json().catch(() => ({}))) as {
				redirectUrl?: string;
				error?: string;
			};
			if (res.ok && data.redirectUrl) {
				window.location.href = data.redirectUrl;
				return;
			}
			setError(
				data.error ||
					t("error.generic", "Something went wrong. Please try again."),
			);
			setConfirm(false);
		} catch {
			setError(
				t(
					"error.networkConnection",
					"Network error. Please check your connection and try again.",
				),
			);
			setConfirm(false);
		} finally {
			setBusy(false);
		}
	}

	const field =
		"w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";
	const seg = (active: boolean) =>
		`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`;

	return (
		<form className="space-y-7" onSubmit={review}>
			{/* Step 1 — amount as impact */}
			<fieldset>
				<legend className="flex items-baseline gap-2 mb-3">
					<span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)] text-xs font-bold text-accent-foreground">
						1
					</span>
					<span className="text-sm font-semibold text-primary">
						{t("donate.step1", "Choose your impact")}
					</span>
				</legend>
				<div className="grid gap-2.5">
					{options.map((o) => {
						const active = !custom && amount === o.amount;
						return (
							<button
								key={o.amount}
								type="button"
								onClick={() => {
									setAmount(o.amount);
									setCustom("");
								}}
								aria-pressed={active}
								className={`group flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${active ? "border-[var(--accent)] bg-[var(--accent)]/8 ring-1 ring-[var(--accent)]" : "border-border bg-background/40 hover:border-[var(--accent)]/50"}`}
							>
								<span
									className={`grid h-5 w-5 flex-none place-items-center rounded-full border-2 transition ${active ? "border-[var(--accent)]" : "border-border group-hover:border-[var(--accent)]/60"}`}
								>
									{active && (
										<span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
									)}
								</span>
								<span className="font-display text-lg font-bold tabular-nums text-primary w-20 flex-none">
									{money(o.amount, cur)}
								</span>
								{o.label ? (
									<span className="text-sm text-foreground/80">{o.label}</span>
								) : (
									<span className="text-sm text-muted-foreground">
										{t("donate.oneTime", "One-time gift")}
									</span>
								)}
							</button>
						);
					})}
				</div>
				{campaign.allowCustom && (
					<div className="mt-2.5">
						<div
							className={`flex items-center gap-2 rounded-2xl border p-1.5 pl-4 transition ${custom ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-border"}`}
						>
							<span className="font-display text-lg font-bold text-primary">
								{cur === "USD" ? "$" : "៛"}
							</span>
							<input
								name="custom-amount"
								type="number"
								min={MIN[cur]}
								step={STEP[cur]}
								value={custom}
								onChange={(e) => setCustom(e.target.value)}
								placeholder={t("donate.otherAmount", "Other amount")}
								className="w-full bg-transparent py-2 text-base focus:outline-none"
							/>
						</div>
						{custom && impact && (
							<p className="mt-2 text-sm text-[var(--accent)]">
								✨{" "}
								<Slot text={t("donate.funds", "Funds {tier}")} name="tier">
									<span className="font-semibold">{impact.label}</span>
								</Slot>
							</p>
						)}
					</div>
				)}
			</fieldset>

			{/* Step 2 — credit + details */}
			<fieldset>
				<legend className="flex items-baseline gap-2 mb-3">
					<span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)] text-xs font-bold text-accent-foreground">
						2
					</span>
					<span className="text-sm font-semibold text-primary">
						{t("donate.step2", "Your details")}
					</span>
				</legend>
				<div className="space-y-3">
					<div className="grid sm:grid-cols-2 gap-3">
						<input
							name="donor-name"
							autoComplete="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={
								visibility === "name"
									? t("forms.yourName", "Your name")
									: t("donate.yourNameOptional", "Your name (optional)")
							}
							className={field}
						/>
						<input
							name="donor-email"
							type="email"
							autoComplete="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder={t("donate.receiptEmail", "Email for your receipt")}
							className={field}
						/>
					</div>
					<textarea
						name="donor-message"
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						rows={2}
						placeholder={t(
							"donate.messageOptional",
							"Leave a message of support (optional)",
						)}
						className={field}
					/>

					<div>
						<div className="text-xs font-medium text-muted-foreground mb-1.5">
							{t("donate.wallAs", "Show me on the supporters wall as…")}
						</div>
						<div className="flex gap-1 rounded-xl border border-border p-1">
							<button
								type="button"
								onClick={() => setVisibility("name")}
								className={seg(visibility === "name")}
							>
								{t("donate.wall.name", "My name")}
							</button>
							<button
								type="button"
								onClick={() => setVisibility("custom")}
								className={seg(visibility === "custom")}
							>
								{t("donate.wall.custom", "Custom")}
							</button>
							<button
								type="button"
								onClick={() => setVisibility("anonymous")}
								className={seg(visibility === "anonymous")}
							>
								{anonymous}
							</button>
						</div>
						{visibility === "custom" && (
							<input
								name="display-name"
								value={displayName}
								onChange={(e) => setDisplayName(e.target.value)}
								placeholder={t(
									"donate.customNamePlaceholder",
									"e.g. A family or a team name",
								)}
								className={`mt-2 ${field}`}
							/>
						)}
					</div>
				</div>
			</fieldset>

			{error && (
				<div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
					{error}
				</div>
			)}

			<button
				type="submit"
				className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] text-accent-foreground px-8 py-4 text-base font-bold shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5 active:translate-y-0"
			>
				♡{" "}
				{t("donate.submit", "Donate {amount}", {
					amount: money(value > 0 ? value : 0, cur),
				})}
			</button>
			<p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
				<svg
					aria-hidden="true"
					viewBox="0 0 24 24"
					className="h-3.5 w-3.5"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				>
					<path
						d="M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7z"
						strokeLinejoin="round"
					/>
				</svg>
				{t(
					"donate.secured",
					"Secured by {provider} — KHQR, card, or mobile wallet",
					{
						provider: t("donate.provider", "Baray"),
					},
				)}
			</p>

			{/* Confirm modal */}
			{confirm && (
				<div className="fixed inset-0 z-50 grid place-items-center p-4">
					<button
						type="button"
						aria-label={t("dialog.close", "Close")}
						className="absolute inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => !busy && setConfirm(false)}
					/>
					<div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
						<h3 className="font-display text-xl font-semibold text-primary">
							{t("donate.confirm.title", "Confirm your gift")}
						</h3>
						<div className="mt-4 rounded-2xl bg-[var(--accent)]/8 p-4 text-center">
							<div className="font-display text-4xl font-bold text-primary tabular-nums">
								{money(value, cur)}
							</div>
							{impact && (
								<div className="mt-1 text-sm text-foreground/70">
									{t("donate.funds", "Funds {tier}", { tier: impact.label })}
								</div>
							)}
						</div>
						<dl className="mt-4 space-y-2 text-sm">
							<Row
								label={t("donate.confirm.campaign", "Campaign")}
								value={campaign.title}
							/>
							<Row
								label={t("donate.confirm.creditedAs", "Credited as")}
								value={credited}
							/>
							{message && (
								<Row
									label={t("forms.message", "Message")}
									value={`“${message}”`}
								/>
							)}
						</dl>
						{error && (
							<div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
								{error}
							</div>
						)}
						<div className="mt-6 flex gap-3">
							<button
								type="button"
								onClick={() => setConfirm(false)}
								disabled={busy}
								className="flex-none rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted transition disabled:opacity-50"
							>
								{t("dialog.back", "Back")}
							</button>
							<button
								type="button"
								onClick={pay}
								disabled={busy}
								className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--accent)] text-accent-foreground px-6 py-2.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-60"
							>
								{busy
									? t("donate.redirecting", "Redirecting…")
									: t("donate.confirmPay", "Confirm & pay")}
							</button>
						</div>
					</div>
				</div>
			)}
		</form>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="text-right font-medium text-foreground">{value}</dd>
		</div>
	);
}
