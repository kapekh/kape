import { createFileRoute } from "@tanstack/react-router";

import { SubPage, Section } from "@/components/SubPage";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/opportunities/careers")({
	loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(
			context.trpc.posts.jobs.queryOptions({ lang: deps.lang }),
		),
	head: () => ({
		meta: [
			{ title: "Job Vacancies & Careers — KAPE" },
			{ name: "description", content: "Current job vacancies and bidding announcements at KAPE." },
		],
	}),
	component: Careers,
});

function Careers() {
	const jobs = Route.useLoaderData();
	const { t } = useLang();

	return (
		<SubPage section={t("nav.opps")} title={t("nav.opps.careers")} lead="Open positions and public bidding announcements." badge="Join us">
			<Section title="Current openings">
				{jobs.length === 0 ? (
					<p className="text-muted-foreground">No open positions right now — please check back soon.</p>
				) : (
					<div className="overflow-hidden rounded-2xl border border-border">
						<table className="w-full text-sm">
							<thead className="bg-[var(--secondary)]/10 text-[var(--secondary)]">
								<tr>
									<th className="text-left px-4 py-3">Position</th>
									<th className="text-left px-4 py-3">Location</th>
									<th className="text-left px-4 py-3">Deadline</th>
									<th className="px-4 py-3" />
								</tr>
							</thead>
							<tbody>
								{jobs.map((j) => (
									<tr key={j.id} className="border-t border-border">
										<td className="px-4 py-3 font-medium text-foreground">{j.title}</td>
										<td className="px-4 py-3 text-foreground/70">{j.location}</td>
										<td className="px-4 py-3 text-foreground/70">{j.deadline}</td>
										<td className="px-4 py-3 text-right">
											<a href="mailto:kape@kapekh.org" className="text-[var(--accent)] font-semibold hover:underline">Apply →</a>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Section>
		</SubPage>
	);
}
