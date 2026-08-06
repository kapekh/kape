import { createFileRoute } from "@tanstack/react-router";
import type { CampaignPublic } from "#/server/repo/campaigns";
import { CampaignCover } from "@/components/donate/CampaignCover";
import { money } from "@/components/donate/CampaignProgress";
import { NavLink } from "@/components/NavLink";
import { DONATE_DEFAULTS } from "@/lib/donate-defaults";
import { useLang } from "@/lib/i18n";
import { detectLang, localizedHref } from "@/lib/i18n-config";
import { siteShortName } from "@/lib/site-identity";

export const Route = createFileRoute("/$lang/donate/")({
	loader: async ({ context, location }) => {
		const lang = detectLang(location.pathname);
		const [campaigns, settings] = await Promise.all([
			context.queryClient.ensureQueryData(
				context.trpc.campaigns.listActive.queryOptions({ lang }),
			),
			context.queryClient.ensureQueryData(
				context.trpc.site.settings.queryOptions(),
			),
		]);
		return { campaigns, settings };
	},
	head: ({ loaderData }) => {
		const settings = loaderData?.settings ?? {};
		return {
			meta: [
				{ title: `Donate to ${siteShortName(settings)}` },
				{
					name: "description",
					content:
						settings.donate_intro?.trim() || DONATE_DEFAULTS.donate_intro,
				},
			],
		};
	},
	component: DonatePage,
});

function DonatePage() {
	const { campaigns, settings } = Route.useLoaderData();
	const { lang } = useLang();
	const s = (key: string) => settings[key] ?? DONATE_DEFAULTS[key] ?? "";

	const featured = campaigns.find((c) => c.featured) ?? campaigns[0] ?? null;
	const rest = featured
		? campaigns.filter((c) => c.id !== featured.id)
		: campaigns;

	// Aggregate social proof across all active campaigns.
	const totalRaised = campaigns.reduce((a, c) => a + c.raised, 0);
	const totalSupporters = campaigns.reduce((a, c) => a + c.supporters, 0);

	return (
		<main>
			{/* Global hub hero — NOT tied to any single campaign */}
			<section
				className="relative overflow-hidden px-6 pt-24 pb-16"
				style={{ background: "var(--gradient-warm)" }}
			>
				<div className="mx-auto max-w-4xl text-center">
					<p className="t-eyebrow text-[oklch(0.3_0.07_255)]/80">
						{s("donate_eyebrow")}
					</p>
					<h1 className="mt-3 t-page-title text-[oklch(0.24_0.09_255)]">
						{s("donate_title")}
					</h1>
					{s("donate_intro") && (
						<p className="mx-auto mt-5 max-w-2xl t-lead text-[oklch(0.3_0.07_255)]/90">
							{s("donate_intro")}
						</p>
					)}

					<div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[oklch(0.24_0.09_255)]">
						<Stat
							value={String(campaigns.length)}
							label={campaigns.length === 1 ? "campaign" : "campaigns"}
						/>
						{totalRaised > 0 && (
							<Stat
								value={money(totalRaised, featured?.currency ?? "USD")}
								label="raised"
							/>
						)}
						{totalSupporters > 0 && (
							<Stat
								value={totalSupporters.toLocaleString()}
								label={totalSupporters === 1 ? "supporter" : "supporters"}
							/>
						)}
					</div>
				</div>
			</section>

			{campaigns.length === 0 ? (
				<div className="mx-auto max-w-2xl px-6 py-24 text-center">
					<h2 className="t-subsection text-primary">
						No active campaigns right now
					</h2>
					<p className="mt-3 text-muted-foreground">
						Please check back soon, or{" "}
						<NavLink
							href={localizedHref("/who-we-are/about", lang)}
							className="text-[var(--accent)] hover:underline"
						>
							learn more about our work
						</NavLink>
						.
					</p>
				</div>
			) : (
				<section className="px-6 py-16">
					<div className="mx-auto max-w-7xl space-y-8">
						{featured && <FeaturedSpotlight campaign={featured} />}
						{rest.length > 0 && (
							<div>
								<h2 className="mb-6 t-subsection text-primary">
									{featured ? "More campaigns" : "Campaigns"}
								</h2>
								<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
									{rest.map((c) => (
										<CampaignCard key={c.id} campaign={c} />
									))}
								</div>
							</div>
						)}
					</div>
				</section>
			)}
		</main>
	);
}

function Stat({ value, label }: { value: string; label: string }) {
	return (
		<div className="text-center">
			<div className="font-display text-2xl font-bold tabular-nums">
				{value}
			</div>
			<div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
		</div>
	);
}

function pctOf(c: CampaignPublic) {
	return c.goalAmount && c.goalAmount > 0
		? Math.min(100, Math.round((c.raised / c.goalAmount) * 100))
		: null;
}

/** Large highlighted card for the featured campaign — split cover / details. */
function FeaturedSpotlight({ campaign }: { campaign: CampaignPublic }) {
	const { lang } = useLang();
	const pct = pctOf(campaign);
	return (
		<NavLink
			href={localizedHref(`/donate/${campaign.slug}`, lang)}
			className="group grid overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-lift)] md:grid-cols-2"
		>
			<div className="relative aspect-[16/10] md:aspect-auto md:min-h-[20rem]">
				<CampaignCover
					coverUrl={campaign.coverUrl}
					slug={campaign.slug}
					alt={campaign.title}
					className="transition-transform duration-500 group-hover:scale-105"
					iconClass="h-24 w-24"
				/>
				<span className="absolute left-4 top-4 rounded-full bg-[var(--gold)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[oklch(0.24_0.09_255)]">
					★ Featured
				</span>
			</div>
			<div className="flex flex-col justify-center p-7 md:p-9">
				<h2 className="t-subsection text-primary group-hover:text-[var(--accent)] transition">
					{campaign.title}
				</h2>
				{campaign.blurb && (
					<p className="mt-2 text-muted-foreground">{campaign.blurb}</p>
				)}
				<div className="mt-5">
					{campaign.raised > 0 ? (
						<>
							{pct != null && (
								<div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
									<div
										className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]"
										style={{ width: `${pct}%` }}
									/>
								</div>
							)}
							<div className="flex items-center justify-between text-sm">
								<span className="font-semibold text-foreground tabular-nums">
									{money(campaign.raised, campaign.currency)}
									<span className="font-normal text-muted-foreground">
										{campaign.goalAmount ? (
											<> of {money(campaign.goalAmount, campaign.currency)}</>
										) : (
											<> raised</>
										)}
									</span>
								</span>
								{campaign.supporters > 0 && (
									<span className="text-muted-foreground">
										{campaign.supporters}{" "}
										{campaign.supporters === 1 ? "supporter" : "supporters"}
									</span>
								)}
							</div>
						</>
					) : (
						// No donations yet — an empty $0 / 0% bar reads as failing, so lead
						// with the goal and an invitation instead.
						<div className="text-sm font-semibold text-[var(--accent)]">
							Be the first to give
							{campaign.goalAmount ? (
								<span className="font-normal text-muted-foreground">
									{" "}
									· {money(campaign.goalAmount, campaign.currency)} goal
								</span>
							) : null}
						</div>
					)}
				</div>
				<span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-lift)] transition group-hover:-translate-y-0.5">
					♡ Donate to this campaign →
				</span>
			</div>
		</NavLink>
	);
}

function CampaignCard({ campaign }: { campaign: CampaignPublic }) {
	const { lang } = useLang();
	const pct = pctOf(campaign);
	return (
		<NavLink
			href={localizedHref(`/donate/${campaign.slug}`, lang)}
			className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
		>
			<div className="relative aspect-[16/10] overflow-hidden">
				<CampaignCover
					coverUrl={campaign.coverUrl}
					slug={campaign.slug}
					alt={campaign.title}
					className="transition-transform duration-500 group-hover:scale-105"
					iconClass="h-16 w-16"
				/>
			</div>
			<div className="flex flex-1 flex-col p-5">
				<h3 className="t-card-title text-primary group-hover:text-[var(--accent)] transition">
					{campaign.title}
				</h3>
				{campaign.blurb && (
					<p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
						{campaign.blurb}
					</p>
				)}
				<div className="mt-auto pt-4">
					{campaign.raised > 0 ? (
						<>
							{pct != null && (
								<div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
									<div
										className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]"
										style={{ width: `${pct}%` }}
									/>
								</div>
							)}
							<div className="flex items-center justify-between text-sm">
								<span className="font-semibold text-foreground tabular-nums">
									{money(campaign.raised, campaign.currency)}{" "}
									<span className="font-normal text-muted-foreground">
										raised
									</span>
								</span>
								<span className="font-semibold text-[var(--accent)]">
									{campaign.supporters > 0
										? `${campaign.supporters} ${campaign.supporters === 1 ? "donor" : "donors"}`
										: "Give →"}
								</span>
							</div>
						</>
					) : (
						// No donations yet — invite the first gift rather than show an empty bar.
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">
								{campaign.goalAmount
									? `${money(campaign.goalAmount, campaign.currency)} goal`
									: "New campaign"}
							</span>
							<span className="font-semibold text-[var(--accent)]">
								Be the first →
							</span>
						</div>
					)}
				</div>
			</div>
		</NavLink>
	);
}
