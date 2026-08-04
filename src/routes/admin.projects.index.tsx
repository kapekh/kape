import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/projects/")({
	component: ProjectsList,
});

type Row = Awaited<
	ReturnType<typeof trpcClient.adminProjects.list.query>
>[number];

function ProjectsList() {
	const [rows, setRows] = useState<Row[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		trpcClient.adminProjects.list.query().then((r) => {
			setRows(r);
			setLoading(false);
		});
	}, []);

	async function del(id: number) {
		if (!(await confirm("Delete this project?"))) return;
		await trpcClient.adminProjects.delete.mutate({ id });
		setRows((rs) => rs.filter((r) => r.id !== id));
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="font-display text-2xl font-semibold text-primary">
					Projects
				</h1>
				<Link
					to="/admin/projects/new"
					className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
				>
					+ New project
				</Link>
			</div>
			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : (
				<div className="overflow-hidden rounded-xl border border-border bg-card">
					<table className="w-full text-sm">
						<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
							<tr>
								<th className="px-4 py-2.5">Code</th>
								<th className="px-4 py-2.5">Name</th>
								<th className="px-4 py-2.5">Status</th>
								<th className="px-4 py-2.5">Slug</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{rows.map((r) => (
								<tr key={r.id} className="border-t border-border">
									<td className="px-4 py-2.5 font-mono">{r.code}</td>
									<td className="px-4 py-2.5 font-medium text-foreground">
										{r.name}
									</td>
									<td className="px-4 py-2.5">
										<span
											className={`rounded-full px-2 py-0.5 text-xs capitalize ${r.status === "current" ? "bg-[var(--palm)]/15 text-[var(--palm)]" : "bg-muted text-muted-foreground"}`}
										>
											{r.status}
										</span>
									</td>
									<td className="px-4 py-2.5 text-foreground/60">{r.slug}</td>
									<td className="px-4 py-2.5 text-right whitespace-nowrap">
										<Link
											to="/admin/projects/$id"
											params={{ id: String(r.id) }}
											className="text-[var(--accent)] font-semibold hover:underline"
										>
											Edit
										</Link>
										<span className="ml-3 inline-flex align-middle">
											<ActionMenu
												items={[
													{
														label: "Delete",
														danger: true,
														onClick: () => del(r.id),
													},
												]}
											/>
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
