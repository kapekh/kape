import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/schools/")({ component: SchoolsList });

type Row = Awaited<ReturnType<typeof trpcClient.adminSchools.list.query>>[number];
const LEVEL_LABELS: Record<string, string> = { preschool: "Preschool", primary: "Primary", secondary: "Secondary", high: "High school", higher: "Higher education" };

function SchoolsList() {
	const [rows, setRows] = useState<Row[]>([]);
	const [provinces, setProvinces] = useState<Record<string, string>>({});
	const [projects, setProjects] = useState<Record<number, string>>({});
	const [media, setMedia] = useState<Record<number, string>>({});
	const [loading, setLoading] = useState(true);

	async function refresh() {
		const [s, prov, proj, m] = await Promise.all([
			trpcClient.adminSchools.list.query(),
			trpcClient.terms.list.query({ taxonomy: "location" }),
			trpcClient.adminProjects.list.query(),
			trpcClient.adminMedia.list.query(),
		]);
		setRows(s);
		setProvinces(Object.fromEntries(prov.map((p) => [p.key, p.label])));
		setProjects(Object.fromEntries(proj.map((p) => [p.id, p.code])));
		setMedia(Object.fromEntries(m.map((x) => [x.id, x.url ?? ""])));
		setLoading(false);
	}
	useEffect(() => {
		refresh();
	}, []);

	async function del(id: number) {
		if (!window.confirm("Delete this school?")) return;
		await trpcClient.adminSchools.delete.mutate({ id });
		setRows((rs) => rs.filter((r) => r.id !== id));
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">Schools</h1>
					<p className="mt-1 text-sm text-muted-foreground">Schools KAPE supports — {rows.length} total.</p>
				</div>
				<Link to="/admin/schools/new" className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition">+ New school</Link>
			</div>

			<div className="overflow-hidden rounded-xl border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-4 py-2.5 w-16" />
							<th className="px-2 py-2.5">Name</th>
							<th className="px-2 py-2.5">Level</th>
							<th className="px-2 py-2.5">Province</th>
							<th className="px-2 py-2.5">Project</th>
							<th className="px-3 py-2.5 text-right">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{loading ? (
							<tr><td colSpan={6} className="px-4 py-6 text-muted-foreground">Loading…</td></tr>
						) : rows.length === 0 ? (
							<tr><td colSpan={6} className="px-4 py-6 text-muted-foreground">No schools yet. <Link to="/admin/schools/new" className="text-[var(--accent)] hover:underline">Add the first school →</Link></td></tr>
						) : (
							rows.map((r) => (
								<tr key={r.id} className="hover:bg-muted/20">
									<td className="px-4 py-2">
										<div className="h-10 w-14 rounded-md overflow-hidden bg-muted ring-1 ring-border">
											{r.coverMediaId && media[r.coverMediaId] ? <img src={media[r.coverMediaId]} alt="" className="h-full w-full object-cover" /> : null}
										</div>
									</td>
									<td className="px-2 py-2">
										<Link to="/admin/schools/$id" params={{ id: String(r.id) }} className="font-medium text-foreground hover:text-[var(--accent)]">{r.name}</Link>
										{r.code ? <span className="ml-2 text-xs text-muted-foreground">{r.code}</span> : null}
									</td>
									<td className="px-2 py-2 text-foreground/80">{r.level ? (LEVEL_LABELS[r.level] ?? r.level) : "—"}</td>
									<td className="px-2 py-2 text-foreground/80">{r.province ? (provinces[r.province] ?? r.province) : "—"}</td>
									<td className="px-2 py-2 text-foreground/80">{r.projectId != null ? (projects[r.projectId] ?? "—") : "—"}</td>
									<td className="px-3 py-2 text-right whitespace-nowrap">
										<Link to="/admin/schools/$id" params={{ id: String(r.id) }} className="text-xs font-semibold text-[var(--accent)] hover:underline">Edit</Link>
										<span className="ml-2 inline-flex align-middle"><ActionMenu items={[{ label: "Delete school", danger: true, onClick: () => del(r.id) }]} /></span>
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
