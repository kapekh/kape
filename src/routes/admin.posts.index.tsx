import { createFileRoute, Link } from "@tanstack/react-router";
import { Newspaper, Plus, SearchX } from "lucide-react";
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

const TYPE_LABELS: Record<string, string> = {
	news: "News",
	story: "Stories",
	video: "Videos",
	album: "Galleries",
	publication: "Publications",
	job: "Careers",
	event: "Events",
	document: "Documents",
	announcement: "Announcements",
	internal_news: "Internal news",
};
const STATUS_LABELS: Record<string, string> = {
	draft: "Draft",
	published: "Published",
	archived: "Archived",
};
const STATUS_TONES: Record<string, "live" | "draft" | "neutral"> = {
	published: "live",
	draft: "draft",
	archived: "neutral",
};

export const Route = createFileRoute("/admin/posts/")({
	// A type nobody defined is dropped rather than honoured, so the screen falls
	// back to all posts. It used to be printed straight into the h1 and offered a
	// "+ New …" button for a content type that does not exist.
	validateSearch: (s: Record<string, unknown>): { type?: string } => {
		const type = typeof s.type === "string" ? s.type : undefined;
		return type && type in TYPE_LABELS ? { type } : {};
	},
	component: PostsList,
});

type Row = Awaited<ReturnType<typeof trpcClient.adminPosts.list.query>>[number];

function PostsList() {
	const { type: requested } = Route.useSearch();
	// A type nobody defined means "all posts", not "a type with nothing in it".
	// Normalised here as well as in `validateSearch` so the screen behaves the
	// same whether the value arrives from a typed link or straight off the URL.
	const type = requested && requested in TYPE_LABELS ? requested : undefined;
	const load = useCallback(() => trpcClient.adminPosts.list.query(), []);
	const { rows, setRows, state, error, reload } = useListQuery<Row>(load);
	const [q, setQ] = useState("");
	const [status, setStatus] = useState("");

	async function del(row: Row) {
		if (!(await confirm("Delete this post?"))) return;
		await removeWithRollback(
			rows,
			setRows,
			(r) => r.id === row.id,
			() => trpcClient.adminPosts.delete.mutate({ id: row.id }),
		);
	}

	const label = type ? TYPE_LABELS[type] : undefined;
	const ofType = type ? rows.filter((r) => r.contentType === type) : rows;
	const statuses = [...new Set(ofType.map((r) => r.status))].sort();
	const ofStatus = status ? ofType.filter((r) => r.status === status) : ofType;
	const shown = ofStatus.filter((r) =>
		matchesQuery(q, r.title, r.slug, TYPE_LABELS[r.contentType], r.status),
	);
	const filtered = q !== "" || status !== "";
	const heading = label ?? "All posts";
	const noun = label ? label.toLowerCase() : "posts";
	const singular = label ? label.replace(/s$/, "").toLowerCase() : "post";

	const newPost = (
		<Button asChild>
			<Link to="/admin/posts/new" search={type ? { type } : undefined}>
				<Plus aria-hidden="true" />
				New {singular}
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
				title={heading}
				description="Dated content. Each one gets its own public page."
				breadcrumb={
					type
						? [
								{ label: "Admin", to: "/admin" },
								{ label: "All posts", to: "/admin/posts" },
								{ label: heading },
							]
						: [{ label: "Admin", to: "/admin" }, { label: heading }]
				}
				actions={newPost}
				toolbar={
					state === "ready" && ofType.length > 0 ? (
						<>
							<ListSearch
								value={q}
								onChange={setQ}
								label={`Search ${noun}`}
								placeholder="Search by title or slug…"
								status={
									filtered
										? `${shown.length} of ${ofType.length}`
										: `${ofType.length} ${ofType.length === 1 ? singular : noun}`
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
									>
										{STATUS_LABELS[s] ?? s}
									</Button>
								))}
							</fieldset>
						</>
					) : undefined
				}
			/>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : ofType.length === 0 ? (
				<EmptyState
					icon={<Newspaper />}
					title={`No ${noun} yet`}
					description={`${label ?? "Posts"} are the dated content of the site — each one gets its own public page.`}
					action={newPost}
				/>
			) : shown.length === 0 ? (
				<EmptyState
					icon={<SearchX />}
					title={`No ${noun} match your filters`}
					description={
						q
							? `Nothing here contains “${q}”.`
							: `No ${singular} carries that status yet.`
					}
					action={clearFilters}
				/>
			) : (
				<TableScroll label={heading}>
					<Table>
						<THead>
							<TR>
								<TH>Title</TH>
								{!type && <TH width={140}>Type</TH>}
								<TH width={140}>Status</TH>
								<TH>Slug</TH>
								<TH align="right" width={72}>
									Actions
								</TH>
							</TR>
						</THead>
						<TBody>
							{shown.map((r) => (
								<TR key={r.id} className="hover:bg-admin-accent-soft/50">
									<TD label="Title">
										<Link
											to="/admin/posts/$id"
											params={{ id: String(r.id) }}
											className="block truncate font-medium text-admin-ink max-md:whitespace-normal transition-colors duration-150 ease-out hover:text-admin-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
										>
											{r.title}
										</Link>
									</TD>
									{!type && (
										<TD label="Type" className="text-admin-ink-muted">
											{TYPE_LABELS[r.contentType] ?? r.contentType}
										</TD>
									)}
									<TD label="Status">
										<Badge tone={STATUS_TONES[r.status] ?? "neutral"}>
											{STATUS_LABELS[r.status] ?? r.status}
										</Badge>
									</TD>
									<TD label="Slug" className="text-admin-ink-muted">
										{r.slug}
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
							))}
						</TBody>
					</Table>
				</TableScroll>
			)}
		</div>
	);
}
