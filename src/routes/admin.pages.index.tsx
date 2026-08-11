import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Plus, SearchX } from "lucide-react";
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
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { PageHeader } from "#/components/ui/page-header.tsx";
import { Table, TBody, TD, TH, THead, TR } from "#/components/ui/table.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/pages/")({
	component: PagesList,
});

type Row = Awaited<ReturnType<typeof trpcClient.adminPages.list.query>>[number];

function PagesList() {
	const load = useCallback(() => trpcClient.adminPages.list.query(), []);
	const { rows, setRows, state, error, reload } = useListQuery<Row>(load);
	const [q, setQ] = useState("");
	const [status, setStatus] = useState("");

	async function del(row: Row) {
		if (
			!(await confirm(
				"Delete this page? Its child pages move up to its parent.",
			))
		)
			return;
		await removeWithRollback(
			rows,
			setRows,
			(r) => r.id === row.id,
			() => trpcClient.adminPages.delete.mutate({ id: row.id }),
		);
	}

	const titleById = new Map(rows.map((r) => [r.id, r.title]));
	const sorted = [...rows].sort((a, b) => a.slug.localeCompare(b.slug));
	const statuses = [...new Set(rows.map((r) => r.status))].sort();
	const ofStatus = status ? sorted.filter((r) => r.status === status) : sorted;
	const shown = ofStatus.filter((r) =>
		matchesQuery(q, r.title, r.slug, r.status),
	);
	const filtered = q !== "" || status !== "";

	const newPage = (
		<Button asChild>
			<Link to="/admin/pages/new">
				<Plus aria-hidden="true" />
				New page
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
				title="Pages"
				description="Every page and its URL. Set a page's parent and URL segment in the editor."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Pages" }]}
				actions={newPage}
				toolbar={
					state === "ready" && rows.length > 0 ? (
						<>
							<ListSearch
								value={q}
								onChange={setQ}
								label="Search pages"
								placeholder="Search by title or URL…"
								status={
									filtered
										? `${shown.length} of ${sorted.length}`
										: `${sorted.length} pages`
								}
							/>
							<fieldset className="mb-4 flex flex-wrap items-center gap-2">
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
					icon={<FileText />}
					title="No pages yet"
					description="Pages are the fixed parts of the site — About, Contact, a programme overview. Each one gets a URL you choose."
					action={newPage}
				/>
			) : shown.length === 0 ? (
				<EmptyState
					icon={<SearchX />}
					title="No pages match your filters"
					description={
						q
							? `Nothing here contains “${q}”.`
							: "No page carries that status yet."
					}
					action={clearFilters}
				/>
			) : (
				<TableScroll label="Pages">
					<Table>
						<THead>
							<TR>
								<TH>Title</TH>
								<TH>URL</TH>
								<TH width={120}>Status</TH>
								<TH align="right" width={72}>
									Actions
								</TH>
							</TR>
						</THead>
						<TBody>
							{shown.map((r) => {
								const parts = r.slug.split("/");
								const depth = Math.max(0, parts.length - 1);
								const parent =
									r.parentId != null ? titleById.get(r.parentId) : undefined;
								return (
									<TR key={r.id} className="hover:bg-admin-accent-soft/50">
										<TD label="Title">
											<div className="flex items-center gap-2">
												{parts.slice(0, depth).map((_, i) => (
													<span
														key={parts.slice(0, i + 1).join("/")}
														aria-hidden="true"
														className="hidden h-6 w-3 shrink-0 border-l border-admin-border md:block"
													/>
												))}
												<div className="min-w-0">
													<Link
														to="/admin/pages/$id"
														params={{ id: String(r.id) }}
														className="block truncate font-medium text-admin-ink max-md:whitespace-normal transition-colors duration-150 ease-out hover:text-admin-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
													>
														{r.title}
													</Link>
													{parent && (
														<span className="block truncate text-[13px] text-admin-ink-muted">
															{parent}
														</span>
													)}
												</div>
											</div>
										</TD>
										<TD label="URL" className="font-mono text-admin-ink-muted">
											/{r.slug}
										</TD>
										<TD label="Status">
											<Badge tone={r.status === "published" ? "live" : "draft"}>
												<span className="capitalize">{r.status}</span>
											</Badge>
										</TD>
										<TD align="right" className="max-md:justify-end">
											<ActionMenu
												label={`Actions for ${r.title}`}
												items={[
													{
														label: "Delete",
														danger: true,
														onClick: () => del(r),
													},
												]}
											/>
										</TD>
									</TR>
								);
							})}
						</TBody>
					</Table>
				</TableScroll>
			)}
		</div>
	);
}
