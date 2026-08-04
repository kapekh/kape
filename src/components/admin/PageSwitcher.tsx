import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";

type PageOpt = { id: number; title: string; slug: string };

/** Titlebar control for jumping between pages (or creating one) from the editor. */
export function PageSwitcher() {
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const m = pathname.match(/\/admin\/pages\/(\d+)/);
	const current = m ? m[1] : "new";
	const [pages, setPages] = useState<PageOpt[]>([]);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);
	const wrapRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		trpcClient.adminPages.list
			.query()
			.then((rows) => setPages(rows as PageOpt[]));
	}, []);

	const currentLabel =
		current === "new"
			? "New page…"
			: pages.find((p) => String(p.id) === current)?.title ||
				pages.find((p) => String(p.id) === current)?.slug ||
				"Untitled page";

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return pages;
		return pages.filter(
			(p) =>
				(p.title || "").toLowerCase().includes(q) ||
				(p.slug || "").toLowerCase().includes(q),
		);
	}, [pages, query]);

	// Close on outside click / Escape.
	useEffect(() => {
		if (!open) return;
		const onDown = (e: MouseEvent) => {
			if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
				setOpen(false);
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [open]);

	// Focus the search input and reset state when opening.
	useEffect(() => {
		if (open) {
			setQuery("");
			setActive(0);
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [open]);

	// Keep the active item in range as the filter narrows.
	useEffect(() => {
		setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)));
	}, [filtered.length]);

	function choose(p: PageOpt) {
		setOpen(false);
		navigate({ to: "/admin/pages/$id", params: { id: String(p.id) } });
	}

	function onKeyDown(e: React.KeyboardEvent) {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActive((a) => Math.min(a + 1, filtered.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActive((a) => Math.max(a - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			const p = filtered[active];
			if (p) choose(p);
		} else if (e.key === "Escape") {
			e.preventDefault();
			setOpen(false);
		}
	}

	return (
		<div ref={wrapRef} className="relative flex min-w-0 items-center gap-2">
			<span className="hidden text-xs font-medium uppercase tracking-wide text-muted-foreground sm:inline">
				Page
			</span>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				aria-haspopup="listbox"
				aria-expanded={open}
				className="flex min-w-0 max-w-[280px] items-center gap-2 rounded-lg border border-border bg-card py-1.5 pl-3 pr-2.5 text-sm font-semibold text-primary hover:border-[var(--accent)] focus:border-[var(--accent)] focus:outline-none transition"
			>
				<span className="min-w-0 truncate">{currentLabel}</span>
				<svg
					className="h-3 w-3 shrink-0 text-muted-foreground"
					viewBox="0 0 12 12"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
				>
					<path
						d="M3 4.5L6 7.5L9 4.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>

			{open && (
				<div className="absolute left-0 top-full z-30 mt-1.5 w-[300px] max-w-[80vw] overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-lift)]">
					<div className="border-b border-border p-2">
						<input
							ref={inputRef}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={onKeyDown}
							placeholder="Search pages…"
							className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[var(--accent)] focus:outline-none"
						/>
					</div>
					<ul
						role="listbox"
						className="thin-scroll max-h-72 overflow-y-auto py-1"
					>
						{filtered.length === 0 ? (
							<li className="px-3 py-3 text-center text-xs text-muted-foreground">
								No pages match “{query}”.
							</li>
						) : (
							filtered.map((p, i) => {
								const isCurrent = String(p.id) === current;
								return (
									<li key={p.id}>
										<button
											type="button"
											role="option"
											aria-selected={isCurrent}
											onMouseEnter={() => setActive(i)}
											onClick={() => choose(p)}
											className={`flex w-full flex-col items-start gap-0.5 px-3 py-1.5 text-left transition ${i === active ? "bg-muted" : ""} ${isCurrent ? "text-[var(--accent)]" : "text-foreground"}`}
										>
											<span className="w-full truncate text-sm font-medium">
												{p.title || p.slug || "Untitled page"}
											</span>
											<span className="w-full truncate font-mono text-[11px] text-muted-foreground">
												/{p.slug}
											</span>
										</button>
									</li>
								);
							})
						)}
					</ul>
					<button
						type="button"
						onClick={() => {
							setOpen(false);
							navigate({ to: "/admin/pages/new" });
						}}
						className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-sm font-semibold text-primary hover:bg-muted transition"
					>
						<svg
							className="h-4 w-4 shrink-0"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.8"
						>
							<path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
						</svg>
						New page…
					</button>
				</div>
			)}

			<button
				type="button"
				onClick={() => navigate({ to: "/admin/pages/new" })}
				title="New page"
				className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border text-primary hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
			>
				<svg
					className="h-4 w-4"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
				>
					<path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
				</svg>
			</button>
		</div>
	);
}
