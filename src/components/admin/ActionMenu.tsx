import { useCallback, useEffect, useRef, useState } from "react";

export type ActionItem = {
	label: string;
	onClick: () => void;
	danger?: boolean;
	disabled?: boolean;
};

/**
 * Compact "⋯" overflow menu for table rows. Destructive actions (Delete) live
 * here so they can't be fat-fingered. Positioned `fixed` from the trigger rect
 * so it escapes the table's overflow clipping; closes on outside-click / scroll
 * / Escape.
 */
export function ActionMenu({
	items,
	label = "Row actions",
}: {
	items: ActionItem[];
	label?: string;
}) {
	const [open, setOpen] = useState(false);
	const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
	const [active, setActive] = useState(0);
	const btnRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

	// Disabled items are skipped rather than focused: a menu that stops on a dead
	// entry reads as broken.
	const enabled = items
		.map((it, i) => (it.disabled ? -1 : i))
		.filter((i) => i >= 0);

	/** Close and hand focus back to the trigger, which is where it came from. */
	const closeToTrigger = useCallback(() => {
		setOpen(false);
		btnRef.current?.focus();
	}, []);

	useEffect(() => {
		if (!open) return;
		const close = () => setOpen(false);
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeToTrigger();
		const onDown = (e: MouseEvent) => {
			const t = e.target as Node;
			if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t))
				setOpen(false);
		};
		window.addEventListener("scroll", close, true);
		window.addEventListener("resize", close);
		document.addEventListener("keydown", onKey);
		document.addEventListener("mousedown", onDown);
		return () => {
			window.removeEventListener("scroll", close, true);
			window.removeEventListener("resize", close);
			document.removeEventListener("keydown", onKey);
			document.removeEventListener("mousedown", onDown);
		};
	}, [open, closeToTrigger]);

	// Focus follows the active index, so `role="menu"` is not claiming movement
	// the menu does not have.
	useEffect(() => {
		if (open) itemRefs.current[active]?.focus();
	}, [open, active]);

	function toggle() {
		const r = btnRef.current?.getBoundingClientRect();
		if (r) setPos({ top: r.bottom + 4, left: r.right - 144 }); // 144px = w-36
		setActive(enabled[0] ?? 0);
		setOpen((o) => !o);
	}

	function step(delta: 1 | -1) {
		if (enabled.length === 0) return;
		const at = enabled.indexOf(active);
		// wraps: past the last item is the first, and vice versa
		const next = (at + delta + enabled.length) % enabled.length;
		setActive(enabled[next]);
	}

	function onMenuKeyDown(e: React.KeyboardEvent) {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			step(1);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			step(-1);
		} else if (e.key === "Home") {
			e.preventDefault();
			setActive(enabled[0] ?? 0);
		} else if (e.key === "End") {
			e.preventDefault();
			setActive(enabled[enabled.length - 1] ?? 0);
		}
	}

	return (
		<>
			<button
				ref={btnRef}
				type="button"
				onClick={toggle}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={label}
				className="rounded-lg border border-border px-2 py-1 leading-none text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
			>
				<span className="text-base">⋯</span>
			</button>
			{open && pos && (
				<div
					ref={menuRef}
					role="menu"
					aria-label={label}
					onKeyDown={onMenuKeyDown}
					style={{
						position: "fixed",
						top: pos.top,
						left: pos.left,
						zIndex: 50,
					}}
					className="thin-scroll w-36 rounded-lg border border-border bg-card py-1 shadow-[var(--shadow-soft)]"
				>
					{items.map((it, i) => (
						<button
							key={it.label}
							ref={(el) => {
								itemRefs.current[i] = el;
							}}
							type="button"
							role="menuitem"
							tabIndex={i === active ? 0 : -1}
							disabled={it.disabled}
							onClick={() => {
								// focus goes back to the trigger BEFORE the action runs, so a
								// dialog the action opens has a live element to return to —
								// unmounting the menu first leaves it nothing but BODY
								closeToTrigger();
								it.onClick();
							}}
							className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-40 ${it.danger ? "text-destructive" : "text-foreground"}`}
						>
							{it.label}
						</button>
					))}
				</div>
			)}
		</>
	);
}
