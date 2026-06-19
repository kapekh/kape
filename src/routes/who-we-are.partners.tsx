import { createFileRoute } from "@tanstack/react-router";

import { Section, SubPage } from "@/components/SubPage";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/who-we-are/partners")({
	loader: async ({ context }) => {
		const [partners, cats] = await Promise.all([
			context.queryClient.ensureQueryData(context.trpc.site.partners.queryOptions()),
			context.queryClient.ensureQueryData(context.trpc.terms.list.queryOptions({ taxonomy: "partner_category" })),
		]);
		return { partners, cats };
	},
	head: () => ({ meta: [{ title: "Our Partners — KAPE" }] }),
	component: Partners,
});

function Partners() {
	const { partners, cats } = Route.useLoaderData();
	const { t } = useLang();
	const labelOf = (key: string) => cats.find((c) => c.key === key)?.label ?? key;
	const groups: Record<string, typeof partners> = {};
	for (const p of partners) (groups[p.category] ??= []).push(p);

	return (
		<SubPage section={t("nav.who")} title={t("nav.who.partners")} lead="KAPE collaborates with governments, foundations and grassroots organisations to deliver lasting impact." badge="Together">
			{Object.keys(groups).length === 0 ? (
				<p className="text-muted-foreground">No partners listed yet.</p>
			) : (
				cats
					.filter((c) => groups[c.key]?.length)
					.map((c) => (
						<Section key={c.key} title={labelOf(c.key)}>
							<div className="flex flex-wrap gap-3">
								{groups[c.key].map((p) => (
									<a
										key={p.id}
										href={p.url || "#"}
										target="_blank"
										rel="noopener noreferrer"
										className="rounded-xl border border-border bg-background/40 px-4 py-3 text-sm font-medium text-primary hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
									>
										{p.name}
									</a>
								))}
							</div>
						</Section>
					))
			)}
		</SubPage>
	);
}
