import { createFileRoute, notFound } from "@tanstack/react-router";

import { CampaignDetail } from "@/components/donate/CampaignDetail";
import { detectLang } from "@/lib/i18n-config";

export const Route = createFileRoute("/$lang/donate/$campaign")({
	loader: async ({ context, location, params }) => {
		const lang = detectLang(location.pathname);
		const detail = await context.queryClient.ensureQueryData(
			context.trpc.campaigns.bySlug.queryOptions({
				slug: params.campaign,
				lang,
			}),
		);
		if (!detail) throw notFound();
		return { detail };
	},
	head: ({ loaderData }) => ({
		meta: [
			{ title: loaderData ? `${loaderData.detail.title} — Donate` : "Donate" },
			{
				name: "description",
				content: loaderData?.detail.blurb ?? "Support this campaign.",
			},
		],
	}),
	component: CampaignPage,
});

function CampaignPage() {
	const { detail } = Route.useLoaderData();
	return (
		<main>
			<CampaignDetail campaign={detail} showCrumb />
		</main>
	);
}
