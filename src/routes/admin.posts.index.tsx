import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/posts/")({
	validateSearch: (s: Record<string, unknown>): { type?: string } => ({ type: typeof s.type === "string" ? s.type : undefined }),
	component: PostsList,
});

type Row = Awaited<ReturnType<typeof trpcClient.adminPosts.list.query>>[number];

const TYPE_LABELS: Record<string, string> = {
	news: "News", story: "Stories", video: "Videos", album: "Galleries",
	publication: "Publications", job: "Careers", event: "Events", document: "Documents",
	announcement: "Announcements", internal_news: "Internal news",
};
const STATUS_LABELS: Record<string, string> = { draft: "Draft", published: "Published", archived: "Archived" };

function PostsList() {
	const { type } = Route.useSearch();
	const [rows, setRows] = useState<Row[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		trpcClient.adminPosts.list.query().then((r) => {
			setRows(r);
			setLoading(false);
		});
	}, []);

	async function del(id: number) {
		if (!window.confirm("Delete this post?")) return;
		await trpcClient.adminPosts.delete.mutate({ id });
		setRows((rs) => rs.filter((r) => r.id !== id));
	}

	const shown = type ? rows.filter((r) => r.contentType === type) : rows;
	const heading = type ? TYPE_LABELS[type] ?? type : "All posts";

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">{heading}</h1>
					{type && <Link to="/admin/posts" className="mt-0.5 inline-block text-xs text-muted-foreground hover:text-[var(--accent)]">← All posts</Link>}
				</div>
				<Link to="/admin/posts/new" search={type ? { type } : undefined} className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90">
					+ New {type ? (TYPE_LABELS[type] ?? "post").replace(/s$/, "").toLowerCase() : "post"}
				</Link>
			</div>
			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : shown.length === 0 ? (
				<p className="text-sm text-muted-foreground">No {type ? (TYPE_LABELS[type] ?? "posts").toLowerCase() : "posts"} yet.</p>
			) : (
				<div className="overflow-hidden rounded-xl border border-border bg-card">
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
								<tr key={r.id} className="border-t border-border hover:bg-muted/30 transition">
									<td className="px-4 py-2.5 font-medium text-foreground">{r.title}</td>
									{!type && <td className="px-4 py-2.5 text-foreground/70">{TYPE_LABELS[r.contentType] ?? r.contentType}</td>}
									<td className="px-4 py-2.5">
										<span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "published" ? "bg-[var(--palm)]/15 text-[var(--palm)]" : "bg-muted text-muted-foreground"}`}>{STATUS_LABELS[r.status] ?? r.status}</span>
									</td>
									<td className="px-4 py-2.5 text-foreground/60">{r.slug}</td>
									<td className="px-4 py-2.5 text-right whitespace-nowrap">
										<Link to="/admin/posts/$id" params={{ id: String(r.id) }} className="text-[var(--accent)] font-semibold hover:underline">Edit</Link>
										<span className="ml-3 inline-flex align-middle"><ActionMenu items={[{ label: "Delete", danger: true, onClick: () => del(r.id) }]} /></span>
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
