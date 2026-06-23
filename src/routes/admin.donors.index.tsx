import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/donors/")({ component: DonorsList });

type Row = Awaited<ReturnType<typeof trpcClient.adminDonors.list.query>>[number];

function DonorsList() {
	const [rows, setRows] = useState<Row[]>([]);
	const [loading, setLoading] = useState(true);

	async function refresh() {
		setRows(await trpcClient.adminDonors.list.query());
		setLoading(false);
	}
	useEffect(() => {
		refresh();
	}, []);

	async function del(id: number) {
		if (!window.confirm("Delete this donor?")) return;
		await trpcClient.adminDonors.delete.mutate({ id });
		setRows((rs) => rs.filter((r) => r.id !== id));
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">Donors</h1>
					<p className="mt-1 text-sm text-muted-foreground">Organisations that fund KAPE's work — {rows.length} total.</p>
				</div>
				<Link to="/admin/donors/new" className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition">+ New donor</Link>
			</div>

			<div className="overflow-hidden rounded-xl border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-4 py-2.5 w-16" />
							<th className="px-2 py-2.5">Name</th>
							<th className="px-2 py-2.5">URL</th>
							<th className="px-3 py-2.5 text-right">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{loading ? (
							<tr><td colSpan={4} className="px-4 py-6 text-muted-foreground">Loading…</td></tr>
						) : rows.length === 0 ? (
							<tr><td colSpan={4} className="px-4 py-6 text-muted-foreground">No donors yet. <Link to="/admin/donors/new" className="text-[var(--accent)] hover:underline">Add the first donor →</Link></td></tr>
						) : (
							rows.map((r) => (
								<tr key={r.id} className="hover:bg-muted/20">
									<td className="px-4 py-2">
										<div className="h-10 w-14 rounded-md overflow-hidden bg-muted ring-1 ring-border grid place-items-center">
											{r.logoUrl ? <img src={r.logoUrl} alt="" className="h-full w-full object-contain" /> : null}
										</div>
									</td>
									<td className="px-2 py-2">
										<Link to="/admin/donors/$id" params={{ id: String(r.id) }} className="font-medium text-foreground hover:text-[var(--accent)]">{r.name}</Link>
									</td>
									<td className="px-2 py-2 text-foreground/80">{r.url ? r.url : "—"}</td>
									<td className="px-3 py-2 text-right whitespace-nowrap">
										<Link to="/admin/donors/$id" params={{ id: String(r.id) }} className="text-xs font-semibold text-[var(--accent)] hover:underline">Edit</Link>
										<span className="ml-2 inline-flex align-middle"><ActionMenu items={[{ label: "Delete donor", danger: true, onClick: () => del(r.id) }]} /></span>
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
