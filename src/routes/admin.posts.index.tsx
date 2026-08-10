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
	const shown = ofType.filter((r) =>
		matchesQuery(q, r.title, r.slug, TYPE_LABELS[r.contentType], r.status),
	);
	const heading = label ?? "All posts";
	const noun = label ? label.toLowerCase() : "posts";
	const singular = label ? label.replace(/s$/, "").toLowerCase() : "post";

	const newPost = (
		<Link
			to="/admin/posts/new"
			search={type ? { type } : undefined}
			className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
		>
			+ New {singular}
		</Link>
	);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">
						{heading}
					</h1>
					{type && (
						<Link
							to="/admin/posts"
							className="mt-0.5 inline-block text-xs text-muted-foreground hover:text-[var(--accent)]"
						>
							← All posts
						</Link>
					)}
				</div>
				{newPost}
			</div>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : ofType.length === 0 ? (
				<EmptyState
					title={`No ${noun} yet`}
					description={`${label ?? "Posts"} are the dated content of the site — each one gets its own public page.`}
					action={newPost}
				/>
			) : (
				<>
					<ListSearch
						value={q}
						onChange={setQ}
						label={`Search ${noun}`}
						placeholder="Search by title or slug…"
						status={q ? `${shown.length} of ${ofType.length}` : undefined}
					/>
					{shown.length === 0 ? (
						<EmptyState
							title={`No ${noun} match that search`}
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
						<TableScroll label={heading}>
							<table className="w-full text-sm">
								<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
									<tr>
										<th className="px-4 py-2.5">Title</th>
										{!type && <th className="px-4 py-2.5">Type</th>}
										<th className="px-4 py-2.5">Status</th>
										<th className="px-4 py-2.5">Slug</th>
										<th className="px-4 py-2.5" />
									</tr>
								</thead>
								<tbody>
									{shown.map((r) => (
										<tr
											key={r.id}
											className="border-t border-border hover:bg-muted/30 transition"
										>
											<td className="px-4 py-2.5 font-medium text-foreground">
												{r.title}
											</td>
											{!type && (
												<td className="px-4 py-2.5 text-foreground/70">
													{TYPE_LABELS[r.contentType] ?? r.contentType}
												</td>
											)}
											<td className="px-4 py-2.5">
												<span
													className={`rounded-full px-2 py-0.5 text-xs ${r.status === "published" ? "bg-[var(--palm)]/15 text-[var(--palm)]" : "bg-muted text-muted-foreground"}`}
												>
													{STATUS_LABELS[r.status] ?? r.status}
												</span>
											</td>
											<td className="px-4 py-2.5 text-foreground/60">
												{r.slug}
											</td>
											<td className="px-4 py-2.5 text-right whitespace-nowrap">
												<Link
													to="/admin/posts/$id"
													params={{ id: String(r.id) }}
													className="text-[var(--accent)] font-semibold hover:underline"
												>
													Edit
												</Link>
												<span className="ml-3 inline-flex align-middle">
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
