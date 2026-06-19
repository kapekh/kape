import { createFileRoute } from "@tanstack/react-router";

import { SubPage, Section } from "@/components/SubPage";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/who-we-are/leadership/")({
	loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(
			context.trpc.posts.people.queryOptions({ lang: deps.lang }),
		),
	head: () => ({ meta: [{ title: "Leadership Team — KAPE" }] }),
	component: Leadership,
});

const SECTIONS: [string, string][] = [
	["board", "Board of Directors"],
	["smt", "Senior Management Team"],
	["pm", "Program Managers, Team Leaders & Supervisors"],
];

function Leadership() {
	const people = Route.useLoaderData();
	const { lang, t } = useLang();
	const q = lang && lang !== "en" ? `?lang=${lang}` : "";

	return (
		<SubPage section={t("nav.who")} title={t("nav.who.leader")} badge="Our team">
			{SECTIONS.map(([key, label]) => {
				const group = people.filter((p) => p.section === key);
				if (group.length === 0) return null;
				return (
					<Section key={key} title={label}>
						<div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
							{group.map((p) => (
								<a key={p.id} href={`/who-we-are/leadership/${p.slug}${q}`} className="rounded-2xl border border-border bg-background/40 p-5 text-center hover:border-[var(--accent)] transition">
									<div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-[var(--secondary)]/30 to-[var(--accent)]/20 grid place-items-center text-2xl font-display font-semibold text-primary">
										{p.name.charAt(0)}
									</div>
									<div className="mt-3 font-display font-semibold text-primary text-sm">{p.name}</div>
									<div className="text-xs text-muted-foreground mt-0.5">{p.position}</div>
								</a>
							))}
						</div>
					</Section>
				);
			})}
		</SubPage>
	);
}
