import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Plus } from "lucide-react";
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
			<span className="hidden text-[13px] font-medium text-admin-ink-muted sm:inline">
				Page
			</span>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				aria-haspopup="listbox"
				aria-expanded={open}
				className="flex h-8 min-w-0 max-w-[280px] items-center gap-2 rounded-lg border border-admin-border bg-admin-panel px-3 text-sm font-medium text-admin-ink transition-colors duration-150 ease-out hover:border-admin-accent focus-visible:border-admin-accent focus-visible:ring-2 focus-visible:ring-admin-focus/40 focus-visible:outline-none"
			>
				<span className="min-w-0 truncate">{currentLabel}</span>
				<ChevronDown
					aria-hidden="true"
					className="size-4 shrink-0 text-admin-ink-muted"
				/>
			</button>

			{open && (
				<div className="absolute left-0 top-full z-30 mt-2 w-[300px] max-w-[80vw] overflow-hidden rounded-xl border border-admin-border bg-admin-panel-raised shadow-[var(--shadow-lift)]">
					<div className="border-b border-admin-border p-2">
						<input
							ref={inputRef}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={onKeyDown}
							placeholder="Search pages…"
							className="h-8 w-full rounded-lg border border-admin-border bg-admin-panel px-3 text-sm text-admin-ink transition-colors duration-150 ease-out placeholder:text-admin-ink-subtle focus-visible:border-admin-accent focus-visible:ring-2 focus-visible:ring-admin-focus/40 focus-visible:outline-none"
						/>
					</div>
					<div
						role="listbox"
						aria-label="Pages"
						className="max-h-72 overflow-y-auto py-1"
					>
						{filtered.length === 0 ? (
							<p className="px-3 py-3 text-center text-[13px] text-admin-ink-muted">
								No pages match “{query}”.
							</p>
						) : (
							filtered.map((p, i) => {
								const isCurrent = String(p.id) === current;
								return (
									<button
										key={p.id}
										type="button"
										role="option"
										aria-selected={isCurrent}
										onMouseEnter={() => setActive(i)}
										onClick={() => choose(p)}
										className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors duration-150 ease-out ${i === active ? "bg-admin-accent-soft" : ""} ${isCurrent ? "text-admin-accent-ink" : "text-admin-ink"}`}
									>
										<span className="w-full truncate text-sm font-medium">
											{p.title || p.slug || "Untitled page"}
										</span>
										<span className="w-full truncate font-mono text-[13px] text-admin-ink-muted">
											/{p.slug}
										</span>
									</button>
								);
							})
						)}
					</div>
					<button
						type="button"
						onClick={() => {
							setOpen(false);
							navigate({ to: "/admin/pages/new" });
						}}
						className="flex w-full items-center gap-2 border-t border-admin-border px-3 py-2 text-sm font-medium text-admin-ink transition-colors duration-150 ease-out hover:bg-admin-accent-soft"
					>
						<Plus aria-hidden="true" className="size-4 shrink-0" />
						New page…
					</button>
				</div>
			)}

			<button
				type="button"
				onClick={() => navigate({ to: "/admin/pages/new" })}
				title="New page"
				aria-label="New page"
				className="grid size-8 shrink-0 place-items-center rounded-lg border border-admin-border text-admin-ink transition-colors duration-150 ease-out hover:border-admin-accent hover:text-admin-accent-ink focus-visible:ring-2 focus-visible:ring-admin-focus/40 focus-visible:outline-none"
			>
				<Plus aria-hidden="true" className="size-4" />
			</button>
		</div>
	);
}
