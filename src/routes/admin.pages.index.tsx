import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PageTree, type PageTreeRow } from "#/components/admin/PageTree";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/pages/")({
	component: PagesList,
});

function PagesList() {
	const [rows, setRows] = useState<PageTreeRow[]>([]);
	const [loading, setLoading] = useState(true);

	function refresh() {
		return trpcClient.adminPages.list.query().then((r) => {
			setRows(r);
			setLoading(false);
		});
	}
	useEffect(() => {
		refresh();
	}, []);

	async function del(id: number) {
		if (!window.confirm("Delete this page? Its child pages move up to its parent.")) return;
		await trpcClient.adminPages.delete.mutate({ id });
		await refresh();
	}

	async function move(id: number, parentId: number | null, index: number) {
		// Optimistic-ish: reorder on the server, then refetch the authoritative tree.
		await trpcClient.adminPages.move.mutate({ id, parentId, index });
		await refresh();
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">Pages</h1>
					<p className="mt-0.5 text-sm text-muted-foreground">Drag a page onto another to nest it, or onto an edge to reorder. URLs follow the tree.</p>
				</div>
				<Link to="/admin/pages/new" className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90">
					+ New page
				</Link>
			</div>
			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : rows.length === 0 ? (
				<p className="text-sm text-muted-foreground">No pages yet.</p>
			) : (
				<div className="rounded-xl border border-border bg-card p-2">
					<PageTree rows={rows} onMove={move} onDelete={del} />
				</div>
			)}
		</div>
	);
}
