import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";

type PageOpt = { id: number; title: string; slug: string };

/** Titlebar control for jumping between pages (or creating one) from the editor. */
export function PageSwitcher() {
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const m = pathname.match(/\/admin\/pages\/(\d+)/);
	const current = m ? m[1] : "new";
	const [pages, setPages] = useState<PageOpt[]>([]);

	useEffect(() => {
		trpcClient.adminPages.list.query().then((rows) => setPages(rows as PageOpt[]));
	}, []);

	return (
		<div className="flex min-w-0 items-center gap-2">
			<span className="hidden text-xs font-medium uppercase tracking-wide text-muted-foreground sm:inline">Page</span>
			<div className="relative min-w-0">
				<select
					value={current}
					onChange={(e) => {
						const v = e.target.value;
						if (v === "new") navigate({ to: "/admin/pages/new" });
						else navigate({ to: "/admin/pages/$id", params: { id: v } });
					}}
					className="max-w-[280px] truncate appearance-none rounded-lg border border-border bg-card py-1.5 pl-3 pr-8 text-sm font-semibold text-primary hover:border-[var(--accent)] focus:border-[var(--accent)] focus:outline-none transition"
				>
					{current === "new" && <option value="new">New page…</option>}
					{pages.map((p) => (
						<option key={p.id} value={String(p.id)}>{p.title || p.slug}</option>
					))}
				</select>
				<svg className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
					<path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</div>
			<button
				type="button"
				onClick={() => navigate({ to: "/admin/pages/new" })}
				title="New page"
				className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border text-primary hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
			>
				<svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
					<path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
				</svg>
			</button>
		</div>
	);
}
