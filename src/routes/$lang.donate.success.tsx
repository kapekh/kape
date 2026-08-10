import { createFileRoute, redirect } from "@tanstack/react-router";
import { NavLink } from "@/components/NavLink";
import { Card, Section, SubPage } from "@/components/SubPage";
import { useLang } from "@/lib/i18n";
import { localizedHref } from "@/lib/i18n-config";

export const Route = createFileRoute("/$lang/donate/success")({
	validateSearch: (s: Record<string, unknown>) => ({
		order: typeof s.order === "string" ? s.order : "",
	}),
	loaderDeps: ({ search }) => ({ order: search.order }),
	loader: async ({ context, deps, params }) => {
		// Thanking whoever types the URL confirms a payment that may never have
		// happened, so the page exists only for an order the gateway knows.
		const row = deps.order
			? await context.queryClient.ensureQueryData(
					context.trpc.payments.status.queryOptions({ orderId: deps.order }),
				)
			: null;
		if (!row) throw redirect({ href: localizedHref("/donate", params.lang) });
		// head() runs outside the LanguageProvider, so the meta title travels with
		// the loader instead of through useT()
		const i18n = await context.queryClient.ensureQueryData(
			context.trpc.i18n.bootstrap.queryOptions({ lang: params.lang }),
		);
		return {
			status: row.status ?? null,
			metaTitle: i18n.strings["donate.success.metaTitle"],
		};
	},
	head: ({ loaderData }) => ({
		meta: [
			{ title: loaderData?.metaTitle ?? "Thank you for your donation" },
			{ name: "robots", content: "noindex" },
		],
	}),
	component: DonateSuccess,
});

function DonateSuccess() {
	const { status } = Route.useLoaderData();
	const { lang, t } = useLang();
	const paid = status === "paid";

	return (
		<SubPage
			section={t("donate.title", "Donate")}
			title={t("donate.success.title", "Thank you")}
			badge={t("donate.success.badge", "With gratitude")}
			lead={t(
				"donate.success.lead",
				"Your generosity goes straight into the work this campaign names.",
			)}
		>
			<Section
				title={
					paid
						? t("donate.success.confirmed", "Your gift is confirmed")
						: t("donate.success.pending", "We've received your donation")
				}
			>
				<Card accent>
					{paid ? (
						<p className="text-base">
							🎉{" "}
							{t(
								"donate.success.confirmedBody",
								"Your donation has been confirmed. Thank you for your support.",
							)}
						</p>
					) : (
						<p className="text-base">
							{t(
								"donate.success.pendingBody",
								"Thank you! We're finalising the confirmation of your payment. If it was completed, it will be confirmed shortly — no further action is needed.",
							)}
						</p>
					)}
				</Card>
				<div className="mt-6 flex flex-wrap gap-3">
					<NavLink
						href={localizedHref("/", lang)}
						className="inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
					>
						{t("nav.backHome", "Back to home")}
					</NavLink>
					<NavLink
						href={localizedHref("/stories", lang)}
						className="inline-flex items-center rounded-full border border-border px-6 py-2.5 text-sm font-semibold hover:bg-muted transition"
					>
						{t("donate.success.stories", "See the impact")}
					</NavLink>
				</div>
			</Section>
		</SubPage>
	);
}
