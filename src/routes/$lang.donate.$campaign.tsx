import { createFileRoute, notFound } from "@tanstack/react-router";

import { CampaignDetail } from "@/components/donate/CampaignDetail";
import { donatePaymentsConfigured } from "@/lib/donate-defaults";
import { detectLang } from "@/lib/i18n-config";

export const Route = createFileRoute("/$lang/donate/$campaign")({
	loader: async ({ context, location, params }) => {
		const lang = detectLang(location.pathname);
		// head() runs outside the LanguageProvider, so the meta strings travel
		// with the loader instead of through useT()
		const [detail, i18n, settings] = await Promise.all([
			context.queryClient.ensureQueryData(
				context.trpc.campaigns.bySlug.queryOptions({
					slug: params.campaign,
					lang,
				}),
			),
			context.queryClient.ensureQueryData(
				context.trpc.i18n.bootstrap.queryOptions({ lang }),
			),
			// same query the root route runs: dedup and link batching keep it one request
			context.queryClient.ensureQueryData(
				context.trpc.site.settings.queryOptions(),
			),
		]);
		if (!detail) throw notFound();
		return {
			detail,
			paymentsConfigured: donatePaymentsConfigured(settings),
			meta: {
				title: i18n.strings["donate.metaTitleCampaign"],
				description: i18n.strings["donate.metaDescription"],
			},
		};
	},
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData
					? (loaderData.meta.title ?? "{title} — Donate").replace(
							"{title}",
							loaderData.detail.title,
						)
					: "Donate",
			},
			{
				name: "description",
				content:
					loaderData?.detail.blurb ??
					loaderData?.meta.description ??
					"Support this campaign.",
			},
		],
	}),
	component: CampaignPage,
});

function CampaignPage() {
	const { detail, paymentsConfigured } = Route.useLoaderData();
	return (
		<main>
			<CampaignDetail
				campaign={detail}
				paymentsConfigured={paymentsConfigured}
				showCrumb
			/>
		</main>
	);
}
