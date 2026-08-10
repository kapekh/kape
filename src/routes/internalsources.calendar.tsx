import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { useT } from "#/lib/i18n";

export const Route = createFileRoute("/internalsources/calendar")({
	component: Calendar,
});

type Ev = Awaited<ReturnType<typeof trpcClient.staff.events.query>>[number];

function Calendar() {
	const t = useT();
	const [events, setEvents] = useState<Ev[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		trpcClient.staff.events.query({ lang: "en" }).then((e) => {
			setEvents(e);
			setLoading(false);
		});
	}, []);

	return (
		<div>
			<h1 className="font-display text-2xl font-semibold text-primary mb-6">
				{t("internal.calendar.title", "Calendar of Events")}
			</h1>
			{loading ? (
				<p className="text-sm text-muted-foreground">
					{t("common.loading", "Loading…")}
				</p>
			) : (
				<div className="overflow-hidden rounded-xl border border-border bg-card">
					<table className="w-full text-sm">
						<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
							<tr>
								<th className="px-4 py-2.5">
									{t("internal.calendar.col.program", "Program")}
								</th>
								<th className="px-4 py-2.5">
									{t("internal.calendar.col.event", "Event")}
								</th>
								<th className="px-4 py-2.5">
									{t("internal.calendar.col.start", "Start")}
								</th>
								<th className="px-4 py-2.5">
									{t("internal.calendar.col.end", "End")}
								</th>
							</tr>
						</thead>
						<tbody>
							{events.map((e) => (
								<tr key={e.id} className="border-t border-border">
									<td className="px-4 py-2.5 font-medium">{e.program}</td>
									<td className="px-4 py-2.5">{e.title}</td>
									<td className="px-4 py-2.5 text-foreground/70">{e.start}</td>
									<td className="px-4 py-2.5 text-foreground/70">{e.end}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
