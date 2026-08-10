import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import {
	EmptyState,
	ListSearch,
	ListStatus,
	matchesQuery,
	removeWithRollback,
	TableScroll,
	useListQuery,
} from "#/components/admin/list-ui";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/projects/")({
	component: ProjectsList,
});

type Row = Awaited<
	ReturnType<typeof trpcClient.adminProjects.list.query>
>[number];

function ProjectsList() {
	const load = useCallback(() => trpcClient.adminProjects.list.query(), []);
	const { rows, setRows, state, error, reload } = useListQuery<Row>(load);
	const [q, setQ] = useState("");

	async function del(row: Row) {
		if (!(await confirm("Delete this project?"))) return;
		await removeWithRollback(
			rows,
			setRows,
			(r) => r.id === row.id,
			() => trpcClient.adminProjects.delete.mutate({ id: row.id }),
		);
	}

	const shown = rows.filter((r) =>
		matchesQuery(q, r.code, r.name, r.slug, r.status),
	);

	const newProject = (
		<Link
			to="/admin/projects/new"
			className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
		>
			+ New project
		</Link>
	);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="font-display text-2xl font-semibold text-primary">
					Projects
				</h1>
				{newProject}
			</div>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					title="No projects yet"
					description="A project is a programme of work with its own code, sites and public page."
					action={newProject}
				/>
			) : (
				<>
					<ListSearch
						value={q}
						onChange={setQ}
						label="Search projects"
						placeholder="Search by name, code or slug…"
						status={q ? `${shown.length} of ${rows.length}` : undefined}
					/>
					{shown.length === 0 ? (
						<EmptyState
							title="No projects match that search"
							description={`Nothing here contains “${q}”.`}
							action={
								<button
									type="button"
									onClick={() => setQ("")}
									className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
								>
									Clear search
								</button>
							}
						/>
					) : (
						<TableScroll label="Projects">
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
									{shown.map((r) => (
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
											<td className="px-4 py-2.5 text-foreground/60">
												{r.slug}
											</td>
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
														label={`Actions for ${r.name}`}
														items={[
															{
																label: "Delete",
																danger: true,
																onClick: () => del(r),
															},
														]}
													/>
												</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</TableScroll>
					)}
				</>
			)}
		</div>
	);
}
