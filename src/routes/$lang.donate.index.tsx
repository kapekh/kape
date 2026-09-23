import { createFileRoute } from "@tanstack/react-router";
import type { CampaignPublic } from "#/server/repo/campaigns";
import { CampaignCover } from "@/components/donate/CampaignCover";
import { money } from "@/components/donate/CampaignProgress";
import { Slot } from "@/components/donate/Slot";
import { NavLink } from "@/components/NavLink";
import {
	DONATE_DEFAULTS,
	donatePaymentsConfigured,
} from "@/lib/donate-defaults";
import { useLang } from "@/lib/i18n";
import { detectLang, localizedHref } from "@/lib/i18n-config";
import { siteShortName } from "@/lib/site-identity";

export const Route = createFileRoute("/$lang/donate/")({
	loader: async ({ context, location }) => {
		const lang = detectLang(location.pathname);
		const [campaigns, settings, i18n] = await Promise.all([
			context.queryClient.ensureQueryData(
				context.trpc.campaigns.listActive.queryOptions({ lang }),
			),
			context.queryClient.ensureQueryData(
				context.trpc.site.settings.queryOptions(),
			),
			// head() runs outside the LanguageProvider, so the meta title travels
			// with the loader instead of through useT()
			context.queryClient.ensureQueryData(
				context.trpc.i18n.bootstrap.queryOptions({ lang }),
			),
		]);
		return {
			campaigns,
			settings,
			metaTitle: i18n.strings["donate.metaTitleHub"],
		};
	},
	head: ({ loaderData }) => {
		const settings = loaderData?.settings ?? {};
		return {
			meta: [
				{
					title: (loaderData?.metaTitle ?? "Donate to {site}").replace(
						"{site}",
						siteShortName(settings),
					),
				},
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
	const { lang, t } = useLang();
	const s = (key: string) => settings[key] ?? DONATE_DEFAULTS[key] ?? "";
	const paymentsReady = donatePaymentsConfigured(settings);

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
					<p className="t-eyebrow text-warm-foreground-muted/80">
						{s("donate_eyebrow")}
					</p>
					<h1 className="mt-3 t-page-title text-warm-foreground">
						{s("donate_title")}
					</h1>
					{/* the intro invites a choice and the stat counts it: neither belongs
					    on a hub with nothing to choose from */}
					{campaigns.length > 0 && s("donate_intro") && (
						<p className="mx-auto mt-5 max-w-2xl t-lead text-warm-foreground-muted/90">
							{s("donate_intro")}
						</p>
					)}

					{campaigns.length > 0 && (
						<div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-warm-foreground">
							<Stat
								value={String(campaigns.length)}
								label={t(
									campaigns.length === 1
										? "donate.stat.campaign"
										: "donate.stat.campaigns",
									campaigns.length === 1 ? "campaign" : "campaigns",
								)}
							/>
							{totalRaised > 0 && (
								<Stat
									value={money(totalRaised, featured?.currency ?? "USD")}
									label={t("donate.raised", "raised")}
								/>
							)}
							{totalSupporters > 0 && (
								<Stat
									value={totalSupporters.toLocaleString()}
									label={t(
										totalSupporters === 1
											? "donate.supporter"
											: "donate.supporters",
										totalSupporters === 1 ? "supporter" : "supporters",
									)}
								/>
							)}
						</div>
					)}
				</div>
			</section>

			{!paymentsReady && (
				// with nothing below it, this panel owes the footer the space the
				// empty-campaigns panel used to give it
				<section
					className={`px-6 pt-12 ${campaigns.length > 0 ? "pb-2" : "pb-24"}`}
				>
					<div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card px-6 py-8 text-center shadow-[var(--shadow-soft)]">
						<h2 className="t-subsection text-primary">
							{t("donate.unavailable.title", "Giving is unavailable right now")}
						</h2>
						<p className="mt-2 text-muted-foreground">
							{t(
								"donate.unavailable.body",
								"Online giving is being set up, so gifts cannot be accepted yet. Please check back soon.",
							)}
						</p>
					</div>
				</section>
			)}

			{campaigns.length === 0 && paymentsReady ? (
				<div className="mx-auto max-w-2xl px-6 py-24 text-center">
					<h2 className="t-subsection text-primary">
						{t("donate.empty.title", "No active campaigns right now")}
					</h2>
					<p className="mt-3 text-muted-foreground">
						<Slot
							text={t(
								"donate.empty.body",
								"Please check back soon, or {link}.",
							)}
							name="link"
						>
							<NavLink
								href={localizedHref("/who-we-are/about", lang)}
								className="text-[var(--accent-ink)] hover:underline"
							>
								{t("donate.empty.link", "learn more about our work")}
							</NavLink>
						</Slot>
					</p>
				</div>
			) : campaigns.length > 0 ? (
				<section className="px-6 py-16">
					<div className="mx-auto max-w-7xl space-y-8">
						{featured && (
							<FeaturedSpotlight campaign={featured} inviting={paymentsReady} />
						)}
						{rest.length > 0 && (
							<div>
								<h2 className="mb-6 t-subsection text-primary">
									{featured
										? t("donate.more", "More campaigns")
										: t("donate.campaigns", "Campaigns")}
								</h2>
								<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
									{rest.map((c) => (
										<CampaignCard
											key={c.id}
											campaign={c}
											inviting={paymentsReady}
										/>
									))}
								</div>
							</div>
						)}
					</div>
				</section>
			) : null}
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
function FeaturedSpotlight({
	campaign,
	inviting,
}: {
	campaign: CampaignPublic;
	inviting: boolean;
}) {
	const { lang, t } = useLang();
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
				<span className="absolute left-4 top-4 rounded-full bg-[var(--gold)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-warm-foreground">
					★ {t("donate.featured", "Featured")}
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
										{" "}
										{campaign.goalAmount
											? t("donate.ofGoal", "of {goal}", {
													goal: money(campaign.goalAmount, campaign.currency),
												})
											: t("donate.raised", "raised")}
									</span>
								</span>
								{campaign.supporters > 0 && (
									<span className="text-muted-foreground">
										{campaign.supporters}{" "}
										{t(
											campaign.supporters === 1
												? "donate.supporter"
												: "donate.supporters",
											campaign.supporters === 1 ? "supporter" : "supporters",
										)}
									</span>
								)}
							</div>
						</>
					) : (
						// an empty $0 / 0% bar reads as failing, so lead with the goal
						<div className="text-sm font-semibold text-[var(--accent)]">
							{inviting && t("donate.beFirst", "Be the first to give")}
							{campaign.goalAmount ? (
								<span className="font-normal text-muted-foreground">
									{inviting ? " · " : ""}
									{t("donate.goal", "{amount} goal", {
										amount: money(campaign.goalAmount, campaign.currency),
									})}
								</span>
							) : null}
						</div>
					)}
				</div>
				{inviting && (
					<span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-lift)] transition group-hover:-translate-y-0.5">
						♡ {t("donate.cta.campaign", "Donate to this campaign")} →
					</span>
				)}
			</div>
		</NavLink>
	);
}

function CampaignCard({
	campaign,
	inviting,
}: {
	campaign: CampaignPublic;
	inviting: boolean;
}) {
	const { lang, t } = useLang();
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
										{t("donate.raised", "raised")}
									</span>
								</span>
								<span className="font-semibold text-[var(--accent)]">
									{campaign.supporters > 0
										? `${campaign.supporters} ${t(
												campaign.supporters === 1
													? "donate.donor"
													: "donate.donors",
												campaign.supporters === 1 ? "donor" : "donors",
											)}`
										: inviting && <>{t("donate.give", "Give")} →</>}
								</span>
							</div>
						</>
					) : (
						// no gift yet, so the goal stands in for an empty bar
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">
								{campaign.goalAmount
									? t("donate.goal", "{amount} goal", {
											amount: money(campaign.goalAmount, campaign.currency),
										})
									: t("donate.new", "New campaign")}
							</span>
							{inviting && (
								<span className="font-semibold text-[var(--accent)]">
									{t("donate.beFirstShort", "Be the first")} →
								</span>
							)}
						</div>
					)}
				</div>
			</div>
		</NavLink>
	);
}
