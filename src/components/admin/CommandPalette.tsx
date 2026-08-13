import { useNavigate } from "@tanstack/react-router";
import { Search, SearchX } from "lucide-react";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { AdminIcon } from "#/components/admin/AdminIcon";
import { matchesQuery } from "#/components/admin/list-ui";
import { EmptyState } from "#/components/ui/empty-state";
import { inputClass } from "#/components/ui/input";
import { useModalPanel } from "#/lib/use-modal-panel";
import { cn } from "#/lib/utils";

/** Structurally the shell's own `NavItem`, which that file keeps to itself. */
export type PaletteNavItem = {
	to: string;
	label: string;
	icon: string;
	exact?: boolean;
	type?: string;
};
export type PaletteNavGroup = { group: string; items: PaletteNavItem[] };

type Hit = { group: string; item: PaletteNavItem };

// the shell's <main> already carries tabindex="-1"
function focusMain() {
	document.getElementById("admin-main")?.focus();
}

export function CommandPalette({
	nav,
	narrow = false,
}: {
	nav: PaletteNavGroup[];
	narrow?: boolean;
}) {
	const [open, setOpen] = useState(false);
	// both start on the server's answer and are corrected on mount, or hydration throws the rail away
	const [mac, setMac] = useState(false);
	const [host, setHost] = useState<HTMLElement | null>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		setMac(/Mac|iPhone|iPad/.test(navigator.userAgent));
		// the rail is translated, which makes it a containing block for fixed children; .admin is where the tokens live
		setHost(triggerRef.current?.closest<HTMLElement>(".admin") ?? null);
	}, []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.altKey || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k")
				return;
			e.preventDefault();
			setOpen((o) => !o);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	return (
		<div className="px-3 pt-4">
			<button
				ref={triggerRef}
				type="button"
				onClick={() => setOpen(true)}
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-label="Search the admin"
				title="Search the admin"
				className={
					narrow
						? "mx-auto grid size-9 place-items-center rounded-lg text-admin-ink-muted transition-colors duration-150 ease-out hover:bg-admin-accent-soft hover:text-admin-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
						: "flex h-9 w-full items-center gap-2 rounded-lg border border-admin-border bg-admin-bg px-3 text-sm text-admin-ink-muted transition-colors duration-150 ease-out hover:border-admin-border-strong hover:bg-admin-accent-soft hover:text-admin-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
				}
			>
				<Search className="h-4 w-4 shrink-0" aria-hidden="true" />
				{!narrow && (
					<>
						<span className="min-w-0 flex-1 truncate text-left">Search</span>
						<kbd className="shrink-0 font-sans text-[13px] text-admin-ink-subtle">
							{mac ? "⌘K" : "Ctrl K"}
						</kbd>
					</>
				)}
			</button>
			{open &&
				host &&
				createPortal(
					<PaletteDialog nav={nav} onClose={() => setOpen(false)} />,
					host,
				)}
		</div>
	);
}

function PaletteDialog({
	nav,
	onClose,
}: {
	nav: PaletteNavGroup[];
	onClose: () => void;
}) {
	const navigate = useNavigate();
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);
	const panelRef = useModalPanel(onClose);
	const inputRef = useRef<HTMLInputElement>(null);
	const titleId = useId();
	const listId = useId();
	const optionId = (i: number) => `${listId}-option-${i}`;

	const hits = useMemo(() => {
		const out: Hit[] = [];
		for (const section of nav)
			for (const item of section.items)
				if (matchesQuery(query, item.label, section.group))
					out.push({ group: section.group, item });
		return out;
	}, [nav, query]);

	// useModalPanel takes the panel first; the query is what the keyboard wants
	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		document
			.getElementById(`${listId}-option-${active}`)
			?.scrollIntoView({ block: "nearest" });
	}, [active, listId]);

	// the opener can be a control on the page we just left; useModalPanel restores it first and only misses when it is gone
	useEffect(
		() => () => {
			queueMicrotask(() => {
				if (document.activeElement === document.body) focusMain();
			});
			setTimeout(() => {
				if (document.activeElement === document.body) focusMain();
			}, 250);
		},
		[],
	);

	function go(hit: Hit) {
		onClose();
		navigate({
			to: hit.item.to,
			search: hit.item.type ? { type: hit.item.type } : {},
		});
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (!hits.length) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActive((i) => (i + 1) % hits.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActive((i) => (i - 1 + hits.length) % hits.length);
		} else if (e.key === "Enter") {
			e.preventDefault();
			const hit = hits[active];
			if (hit) go(hit);
		}
	}

	return (
		<div className="fixed inset-0 z-[150] grid place-items-center p-4">
			<button
				type="button"
				aria-label="Close search"
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
			/>
			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				tabIndex={-1}
				className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-admin-border bg-admin-panel-raised shadow-[var(--shadow-soft)] motion-safe:animate-[mega-content-in_0.18s_ease-out] focus:outline-none"
			>
				<h2 id={titleId} className="sr-only">
					Search the admin
				</h2>
				<div className="flex items-center gap-3 border-b border-admin-border px-4">
					<Search
						className="h-4 w-4 shrink-0 text-admin-ink-subtle"
						aria-hidden="true"
					/>
					<input
						ref={inputRef}
						type="text"
						role="combobox"
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							setActive(0);
						}}
						onKeyDown={onKeyDown}
						placeholder="Search admin screens"
						aria-label="Search admin screens"
						aria-controls={hits.length ? listId : undefined}
						aria-expanded={hits.length > 0}
						aria-autocomplete="list"
						aria-activedescendant={hits.length ? optionId(active) : undefined}
						autoComplete="off"
						className={cn(
							inputClass,
							"h-14 border-0 bg-transparent px-0 focus-visible:ring-0",
						)}
					/>
				</div>

				{hits.length === 0 ? (
					<EmptyState
						className="border-0 bg-transparent py-8"
						icon={<SearchX />}
						title="No screen matches that"
						description="The palette searches admin screens by name. Page, post and record titles are not in it yet."
					/>
				) : (
					<div
						id={listId}
						role="listbox"
						aria-label="Admin screens"
						className="thin-scroll max-h-[min(24rem,50vh)] overflow-y-auto p-2"
					>
						{hits.map((hit, i) => (
							<Fragment key={`${hit.item.to}:${hit.item.type ?? ""}`}>
								{hit.group && hit.group !== hits[i - 1]?.group && (
									<div className="px-3 pb-1 pt-3 text-[13px] font-medium text-admin-ink-muted">
										{hit.group}
									</div>
								)}
								{/* biome-ignore lint/a11y/useKeyWithClickEvents: the combobox input owns the keyboard; an option that answered keys too would be a second tab stop */}
								<div
									id={optionId(i)}
									role="option"
									tabIndex={-1}
									aria-selected={i === active}
									onClick={() => go(hit)}
									onMouseMove={() => setActive(i)}
									className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${
										i === active
											? "bg-admin-accent-soft font-medium text-admin-accent"
											: "text-admin-ink"
									}`}
								>
									<AdminIcon
										name={hit.item.icon}
										className="h-4 w-4 shrink-0 opacity-80"
									/>
									<span className="truncate">{hit.item.label}</span>
								</div>
							</Fragment>
						))}
					</div>
				)}

				<p className="border-t border-admin-border px-4 py-2 text-[13px] text-admin-ink-muted">
					Arrows to move, Enter to open, Esc to close
				</p>
			</div>
		</div>
	);
}
