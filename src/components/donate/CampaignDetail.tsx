import type { getCampaignBySlug } from "#/server/repo/campaigns";
import { NavLink } from "@/components/NavLink";
import { useLang } from "@/lib/i18n";
import { localizedHref } from "@/lib/i18n-config";

import { CampaignCover } from "./CampaignCover";
import { CampaignProgress } from "./CampaignProgress";
import { DonateForm } from "./DonateForm";
import { SupportersWall } from "./SupportersWall";

type CampaignWithSupporters = NonNullable<
	Awaited<ReturnType<typeof getCampaignBySlug>>
>;

/** Full campaign page: hero + two-column (donate form ‹› sticky progress/supporters). */
export function CampaignDetail({
	campaign,
	paymentsConfigured,
	showCrumb = false,
}: {
	campaign: CampaignWithSupporters;
	paymentsConfigured: boolean;
	showCrumb?: boolean;
}) {
	const { lang, t } = useLang();
	const ended = campaign.status !== "active";

	return (
		<article>
			{/* Hero */}
			<header className="relative overflow-hidden">
				<div className="absolute inset-0 -z-10">
					<CampaignCover
						coverUrl={campaign.coverUrl}
						coverWidth={campaign.coverWidth}
						slug={campaign.slug}
						iconClass="h-40 w-40"
					/>
					<div className="absolute inset-0 bg-gradient-to-b from-primary/85 via-primary/70 to-background" />
				</div>
				<div className="mx-auto max-w-7xl px-6 pt-24 pb-32 text-primary-foreground">
					{showCrumb && (
						<nav className="mb-5 flex flex-wrap items-center gap-2 text-xs opacity-85">
							<NavLink
								href={localizedHref("/", lang)}
								className="hover:underline"
							>
								{t("nav.home", "Home")}
							</NavLink>
							<span aria-hidden>/</span>
							<NavLink
								href={localizedHref("/donate", lang)}
								className="hover:underline"
							>
								{t("donate.title", "Donate")}
							</NavLink>
							<span aria-hidden>/</span>
							<span className="truncate">{campaign.title}</span>
						</nav>
					)}
					<div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gold)] backdrop-blur">
						{ended
							? t("donate.closed.badge", "Campaign closed")
							: t("donate.badge", "Stand with us")}
					</div>
					<h1 className="mt-5 max-w-3xl font-display text-4xl md:text-6xl font-semibold tracking-tight [text-shadow:0_2px_24px_rgba(0,0,0,0.3)]">
						{campaign.title}
					</h1>
					{campaign.blurb && (
						<p className="mt-5 max-w-2xl text-lg md:text-xl text-primary-foreground/90 leading-relaxed">
							{campaign.blurb}
						</p>
					)}
				</div>
			</header>

			{/* Body — pulled up over the hero */}
			<div className="px-6 pb-24 -mt-20">
				<div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3 lg:items-start">
					{/* Sticky progress + supporters (first on mobile for context, right on desktop) */}
					<aside className="lg:order-2 lg:sticky lg:top-24 space-y-4">
						{/* with nothing raised and no gift possible, only a goal is left to show */}
						{(paymentsConfigured ||
							campaign.raised > 0 ||
							campaign.goalAmount != null) && (
							<div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
								<CampaignProgress
									campaign={campaign}
									inviting={paymentsConfigured}
								/>
							</div>
						)}
						{campaign.showSupporters &&
							campaign.recentSupporters.length > 0 && (
								<div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
									<h2 className="mb-4 font-display text-lg font-semibold text-primary">
										{t("donate.recentSupporters", "Recent supporters")}
									</h2>
									<SupportersWall supporters={campaign.recentSupporters} />
								</div>
							)}
					</aside>

					{/* Donate form */}
					<div className="lg:order-1 lg:col-span-2 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
						{ended ? (
							<div className="py-8 text-center">
								<h2 className="font-display text-2xl font-semibold text-primary">
									{t("donate.ended.title", "This campaign has ended")}
								</h2>
								<p className="mt-2 text-muted-foreground">
									{t(
										"donate.ended.body",
										"Thank you to everyone who gave. Explore other ways to give.",
									)}
								</p>
								<NavLink
									href={localizedHref("/donate", lang)}
									className="mt-6 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
								>
									{t("donate.ended.cta", "See active campaigns")}
								</NavLink>
							</div>
						) : !paymentsConfigured ? (
							// a form that can only end in a 503 is worse than saying so here
							<div className="py-8 text-center">
								<h2 className="font-display text-2xl font-semibold text-primary">
									{t(
										"donate.unavailable.title",
										"Giving is unavailable right now",
									)}
								</h2>
								<p className="mt-2 text-muted-foreground">
									{t(
										"donate.unavailable.body",
										"Online giving is being set up, so gifts cannot be accepted yet. Please check back soon.",
									)}
								</p>
							</div>
						) : (
							<>
								<h2 className="mb-6 font-display text-2xl font-semibold text-primary">
									{t("donate.form.title", "Make your gift")}
								</h2>
								<DonateForm campaign={campaign} />
							</>
						)}
					</div>
				</div>
			</div>
		</article>
	);
}
