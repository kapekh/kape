import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/offices/")({
	component: OfficesList,
});

type Row = Awaited<
	ReturnType<typeof trpcClient.adminOffices.list.query>
>[number];

function OfficesList() {
	const [rows, setRows] = useState<Row[]>([]);
	const [provinces, setProvinces] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);

	async function refresh() {
		const [o, prov] = await Promise.all([
			trpcClient.adminOffices.list.query(),
			trpcClient.terms.list.query({ taxonomy: "location" }),
		]);
		setRows(o);
		setProvinces(Object.fromEntries(prov.map((p) => [p.key, p.label])));
		setLoading(false);
	}
	useEffect(() => {
		refresh();
	}, []);

	async function del(id: number) {
		if (!(await confirm("Delete this office?"))) return;
		await trpcClient.adminOffices.delete.mutate({ id });
		setRows((rs) => rs.filter((r) => r.id !== id));
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">
						Offices
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Office locations — {rows.length} total.
					</p>
				</div>
				<Link
					to="/admin/offices/new"
					className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
				>
					+ New office
				</Link>
			</div>

			<div className="overflow-hidden rounded-xl border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-4 py-2.5 w-16" />
							<th className="px-2 py-2.5">Name</th>
							<th className="px-2 py-2.5">Province</th>
							<th className="px-2 py-2.5">Phone</th>
							<th className="px-2 py-2.5">HQ</th>
							<th className="px-3 py-2.5 text-right">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{loading ? (
							<tr>
								<td colSpan={6} className="px-4 py-6 text-muted-foreground">
									Loading…
								</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td colSpan={6} className="px-4 py-6 text-muted-foreground">
									No offices yet.{" "}
									<Link
										to="/admin/offices/new"
										className="text-[var(--accent)] hover:underline"
									>
										Add the first office →
									</Link>
								</td>
							</tr>
						) : (
							rows.map((r) => (
								<tr key={r.id} className="hover:bg-muted/20">
									<td className="px-4 py-2">
										<div className="h-10 w-14 rounded-md overflow-hidden bg-muted ring-1 ring-border">
											{r.imageUrl ? (
												<img
													src={r.imageUrl}
													alt=""
													className="h-full w-full object-cover"
												/>
											) : null}
										</div>
									</td>
									<td className="px-2 py-2">
										<Link
											to="/admin/offices/$id"
											params={{ id: String(r.id) }}
											className="font-medium text-foreground hover:text-[var(--accent)]"
										>
											{r.name}
										</Link>
									</td>
									<td className="px-2 py-2 text-foreground/80">
										{r.province ? (provinces[r.province] ?? r.province) : "—"}
									</td>
									<td className="px-2 py-2 text-foreground/80">
										{r.phone || "—"}
									</td>
									<td className="px-2 py-2">
										{r.isHq ? (
											<span className="inline-flex rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
												HQ
											</span>
										) : null}
									</td>
									<td className="px-3 py-2 text-right whitespace-nowrap">
										<Link
											to="/admin/offices/$id"
											params={{ id: String(r.id) }}
											className="text-xs font-semibold text-[var(--accent)] hover:underline"
										>
											Edit
										</Link>
										<span className="ml-2 inline-flex align-middle">
											<ActionMenu
												items={[
													{
														label: "Delete office",
														danger: true,
														onClick: () => del(r.id),
													},
												]}
											/>
										</span>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
