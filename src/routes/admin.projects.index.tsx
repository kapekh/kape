import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderKanban, Plus, SearchX } from "lucide-react";
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
import { viewOnSite } from "#/components/admin/view-on-site";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { PageHeader } from "#/components/ui/page-header.tsx";
import { Table, TBody, TD, TH, THead, TR } from "#/components/ui/table.tsx";
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
	const [status, setStatus] = useState("");

	async function del(row: Row) {
		if (!(await confirm("Delete this project?"))) return;
		await removeWithRollback(
			rows,
			setRows,
			(r) => r.id === row.id,
			() => trpcClient.adminProjects.delete.mutate({ id: row.id }),
		);
	}

	const slugById = new Map(rows.map((r) => [r.id, r.slug]));
	const statuses = [...new Set(rows.map((r) => r.status))].sort();
	const ofStatus = status ? rows.filter((r) => r.status === status) : rows;
	const shown = ofStatus.filter((r) =>
		matchesQuery(q, r.code, r.name, r.slug, r.status),
	);
	const filtered = q !== "" || status !== "";

	const newProject = (
		<Button asChild>
			<Link to="/admin/projects/new">
				<Plus aria-hidden="true" />
				New project
			</Link>
		</Button>
	);

	const clearFilters = (
		<Button
			type="button"
			variant="secondary"
			onClick={() => {
				setQ("");
				setStatus("");
			}}
		>
			{status ? "Clear filters" : "Clear search"}
		</Button>
	);

	return (
		<div>
			<PageHeader
				title="Projects"
				description="A project is a programme of work with its own code, sites and public page."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Projects" }]}
				actions={newProject}
				toolbar={
					state === "ready" && rows.length > 0 ? (
						<>
							<ListSearch
								value={q}
								onChange={setQ}
								label="Search projects"
								placeholder="Search by name, code or slug…"
								status={
									filtered
										? `${shown.length} of ${rows.length}`
										: `${rows.length} ${rows.length === 1 ? "project" : "projects"}`
								}
							/>
							<fieldset className="flex flex-wrap items-center gap-2">
								<legend className="sr-only">Filter by status</legend>
								<Button
									type="button"
									size="sm"
									variant={status === "" ? "primary" : "secondary"}
									aria-pressed={status === ""}
									onClick={() => setStatus("")}
								>
									All
								</Button>
								{statuses.map((s) => (
									<Button
										key={s}
										type="button"
										size="sm"
										variant={status === s ? "primary" : "secondary"}
										aria-pressed={status === s}
										onClick={() => setStatus(s)}
										className="capitalize"
									>
										{s}
									</Button>
								))}
							</fieldset>
						</>
					) : undefined
				}
			/>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					icon={<FolderKanban />}
					title="No projects yet"
					description="A project is a programme of work with its own code, sites and public page."
					action={newProject}
				/>
			) : shown.length === 0 ? (
				<EmptyState
					icon={<SearchX />}
					title="No projects match your filters"
					description={
						q
							? `Nothing here contains “${q}”.`
							: "No project carries that status yet."
					}
					action={clearFilters}
				/>
			) : (
				<TableScroll label="Projects">
					<Table>
						<THead>
							<TR>
								<TH width={120}>Code</TH>
								<TH>Name</TH>
								<TH width={120}>Status</TH>
								<TH>Slug</TH>
								<TH align="right" width={72}>
									Actions
								</TH>
							</TR>
						</THead>
						<TBody>
							{shown.map((r) => (
								<TR key={r.id} className="hover:bg-admin-accent-soft/50">
									<TD label="Code" className="font-mono text-admin-ink-muted">
										{r.code}
									</TD>
									<TD label="Name">
										<Link
											to="/admin/projects/$id"
											params={{ id: String(r.id) }}
											className="tap-target block truncate font-medium text-admin-ink max-md:whitespace-normal transition-colors duration-150 ease-out hover:text-admin-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
										>
											{r.name}
										</Link>
									</TD>
									<TD label="Status">
										<Badge tone={r.status === "current" ? "live" : "neutral"}>
											<span className="capitalize">{r.status}</span>
										</Badge>
									</TD>
									<TD label="Slug" className="text-admin-ink-muted">
										{r.slug}
									</TD>
									<TD align="right" className="max-md:justify-end">
										<ActionMenu
											label={`Actions for ${r.name}`}
											items={[
												...viewOnSite({
													kind: "project",
													slug: r.slug,
													parentSlug: slugById.get(r.parentId ?? -1),
												}),
												{
													label: "Delete",
													danger: true,
													onClick: () => del(r),
												},
											]}
										/>
									</TD>
								</TR>
							))}
						</TBody>
					</Table>
				</TableScroll>
			)}
		</div>
	);
}
