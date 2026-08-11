import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, School, SearchX } from "lucide-react";
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
import { useModules } from "#/components/admin/useModules";
import { Button } from "#/components/ui/button.tsx";
import { PageHeader } from "#/components/ui/page-header.tsx";
import { Table, TBody, TD, TH, THead, TR } from "#/components/ui/table.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/schools/")({
	component: SchoolsList,
});

type Row = Awaited<
	ReturnType<typeof trpcClient.adminSchools.list.query>
>[number];
const LEVEL_LABELS: Record<string, string> = {
	preschool: "Preschool",
	primary: "Primary",
	secondary: "Secondary",
	high: "High school",
	higher: "Higher education",
};

function SchoolsList() {
	const [provinces, setProvinces] = useState<Record<string, string>>({});
	const [projects, setProjects] = useState<Record<number, string>>({});
	const [media, setMedia] = useState<Record<number, string>>({});
	const modules = useModules();

	const load = useCallback(async () => {
		const [s, prov, proj] = await Promise.all([
			trpcClient.adminSchools.list.query(),
			trpcClient.terms.list.query({ taxonomy: "location" }),
			modules.list("projects", () => trpcClient.adminProjects.list.query()),
		]);
		setProvinces(Object.fromEntries(prov.map((p) => [p.key, p.label])));
		setProjects(Object.fromEntries(proj.map((p) => [p.id, p.code])));
		// Resolve only the cover images actually referenced by the rows.
		const coverIds = [
			...new Set(
				s.map((x) => x.coverMediaId).filter((v): v is number => v != null),
			),
		];
		const m = await trpcClient.adminMedia.byIds.query({ ids: coverIds });
		setMedia(Object.fromEntries(m.map((x) => [x.id, x.url ?? ""])));
		return s;
	}, [modules]);
	const { rows, setRows, state, error, reload } = useListQuery<Row>(load);
	const [q, setQ] = useState("");
	const [level, setLevel] = useState("");

	async function del(row: Row) {
		if (!(await confirm("Delete this school?"))) return;
		await removeWithRollback(
			rows,
			setRows,
			(r) => r.id === row.id,
			() => trpcClient.adminSchools.delete.mutate({ id: row.id }),
		);
	}

	const levelLabel = (r: Row) =>
		r.level ? (LEVEL_LABELS[r.level] ?? r.level) : "";
	const provinceLabel = (r: Row) =>
		r.province ? (provinces[r.province] ?? r.province) : "";
	const projectLabel = (r: Row) =>
		r.projectId != null ? (projects[r.projectId] ?? "") : "";
	const levels = [
		...new Set(rows.map((r) => r.level).filter((l): l is string => !!l)),
	].sort();
	const ofLevel = level ? rows.filter((r) => r.level === level) : rows;
	const shown = ofLevel.filter((r) =>
		matchesQuery(
			q,
			r.name,
			r.code,
			levelLabel(r),
			provinceLabel(r),
			projectLabel(r),
		),
	);
	const filtered = q !== "" || level !== "";

	const newSchool = (
		<Button asChild>
			<Link to="/admin/schools/new">
				<Plus aria-hidden="true" />
				New school
			</Link>
		</Button>
	);

	const clearFilters = (
		<Button
			type="button"
			variant="secondary"
			onClick={() => {
				setQ("");
				setLevel("");
			}}
		>
			{level ? "Clear filters" : "Clear search"}
		</Button>
	);

	return (
		<div>
			<PageHeader
				title="Schools"
				description="The sites this organisation supports, each with a level, a province and an optional project."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Schools" }]}
				actions={newSchool}
				toolbar={
					state === "ready" && rows.length > 0 ? (
						<>
							<ListSearch
								value={q}
								onChange={setQ}
								label="Search schools"
								placeholder="Search by name, code, province or project…"
								status={
									filtered
										? `${shown.length} of ${rows.length}`
										: `${rows.length} ${rows.length === 1 ? "school" : "schools"}`
								}
							/>
							{levels.length > 1 && (
								<fieldset className="flex flex-wrap items-center gap-2">
									<legend className="sr-only">Filter by level</legend>
									<Button
										type="button"
										size="sm"
										variant={level === "" ? "primary" : "secondary"}
										aria-pressed={level === ""}
										onClick={() => setLevel("")}
									>
										All
									</Button>
									{levels.map((l) => (
										<Button
											key={l}
											type="button"
											size="sm"
											variant={level === l ? "primary" : "secondary"}
											aria-pressed={level === l}
											onClick={() => setLevel(l)}
										>
											{LEVEL_LABELS[l] ?? l}
										</Button>
									))}
								</fieldset>
							)}
						</>
					) : undefined
				}
			/>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					icon={<School />}
					title="No schools yet"
					description="Schools are the sites this organisation supports, each with a level, a province and an optional project."
					action={newSchool}
				/>
			) : shown.length === 0 ? (
				<EmptyState
					icon={<SearchX />}
					title="No schools match your filters"
					description={
						q
							? `Nothing here contains “${q}”.`
							: "No school sits at that level yet."
					}
					action={clearFilters}
				/>
			) : (
				<TableScroll label="Schools">
					<Table>
						<THead>
							<TR>
								<TH width={72}>
									<span className="sr-only">Cover</span>
								</TH>
								<TH>Name</TH>
								<TH width={160}>Level</TH>
								<TH>Province</TH>
								<TH width={140}>Project</TH>
								<TH align="right" width={72}>
									Actions
								</TH>
							</TR>
						</THead>
						<TBody>
							{shown.map((r) => (
								<TR key={r.id} className="hover:bg-admin-accent-soft/50">
									<TD>
										<div className="h-10 w-14 overflow-hidden rounded-lg bg-admin-neutral-soft ring-1 ring-admin-border">
											{r.coverMediaId && media[r.coverMediaId] ? (
												<img
													src={media[r.coverMediaId]}
													alt=""
													className="h-full w-full object-cover"
												/>
											) : null}
										</div>
									</TD>
									<TD label="Name">
										<Link
											to="/admin/schools/$id"
											params={{ id: String(r.id) }}
											className="truncate font-medium text-admin-ink max-md:whitespace-normal transition-colors duration-150 ease-out hover:text-admin-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
										>
											{r.name}
										</Link>
										{r.code ? (
											<span className="ml-2 text-[13px] text-admin-ink-muted">
												{r.code}
											</span>
										) : null}
									</TD>
									<TD label="Level" className="text-admin-ink-muted">
										{levelLabel(r) || "—"}
									</TD>
									<TD label="Province" className="text-admin-ink-muted">
										{provinceLabel(r) || "—"}
									</TD>
									<TD label="Project" className="text-admin-ink-muted">
										{projectLabel(r) || "—"}
									</TD>
									<TD align="right" className="max-md:justify-end">
										<ActionMenu
											label={`Actions for ${r.name}`}
											items={[
												{
													label: "Delete school",
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
