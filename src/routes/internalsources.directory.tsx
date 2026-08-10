import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { useT } from "#/lib/i18n";

export const Route = createFileRoute("/internalsources/directory")({
	component: Directory,
});

type Staff = Awaited<
	ReturnType<typeof trpcClient.staff.directory.query>
>[number];

function Directory() {
	const t = useT();
	const [rows, setRows] = useState<Staff[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		trpcClient.staff.directory.query().then((r) => {
			setRows(r);
			setLoading(false);
		});
	}, []);

	return (
		<div>
			<h1 className="font-display text-2xl font-semibold text-primary mb-6">
				{t("internal.directory.title", "Staff Directory")}
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
								<th className="px-3 py-2.5" />
								<th className="px-3 py-2.5">
									{t("internal.directory.col.id", "ID")}
								</th>
								<th className="px-3 py-2.5">
									{t("internal.directory.col.nameKm", "Name (KH)")}
								</th>
								<th className="px-3 py-2.5">
									{t("internal.directory.col.nameEn", "Name (EN)")}
								</th>
								<th className="px-3 py-2.5">
									{t("internal.directory.col.sex", "Sex")}
								</th>
								<th className="px-3 py-2.5">
									{t("internal.directory.col.phone", "Phone")}
								</th>
								<th className="px-3 py-2.5">
									{t("internal.directory.col.email", "Email")}
								</th>
								<th className="px-3 py-2.5">
									{t("internal.directory.col.program", "Program")}
								</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((r) => (
								<tr key={r.id} className="border-t border-border">
									<td className="px-3 py-2">
										{r.photoUrl ? (
											<img
												src={r.photoUrl}
												alt={r.nameEn ?? ""}
												className="h-9 w-9 rounded-full object-cover"
											/>
										) : (
											<span className="grid h-9 w-9 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
												{(r.nameEn ?? "?").slice(0, 1)}
											</span>
										)}
									</td>
									<td className="px-3 py-2.5 font-mono">{r.staffNo}</td>
									<td className="px-3 py-2.5 font-khmer">{r.nameKm}</td>
									<td className="px-3 py-2.5">{r.nameEn}</td>
									<td className="px-3 py-2.5">{r.sex}</td>
									<td className="px-3 py-2.5 text-foreground/70">{r.phone}</td>
									<td className="px-3 py-2.5 text-foreground/70">{r.email}</td>
									<td className="px-3 py-2.5">{r.program}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
