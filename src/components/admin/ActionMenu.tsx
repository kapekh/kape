import { useEffect, useRef, useState } from "react";

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
	const btnRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const close = () => setOpen(false);
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
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
	}, [open]);

	function toggle() {
		const r = btnRef.current?.getBoundingClientRect();
		if (r) setPos({ top: r.bottom + 4, left: r.right - 144 }); // 144px = w-36
		setOpen((o) => !o);
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
					style={{
						position: "fixed",
						top: pos.top,
						left: pos.left,
						zIndex: 50,
					}}
					className="thin-scroll w-36 rounded-lg border border-border bg-card py-1 shadow-[var(--shadow-soft)]"
				>
					{items.map((it) => (
						<button
							key={it.label}
							type="button"
							role="menuitem"
							disabled={it.disabled}
							onClick={() => {
								setOpen(false);
								it.onClick();
							}}
							className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-40 ${it.danger ? "text-destructive" : "text-foreground"}`}
						>
							{it.label}
						</button>
					))}
				</div>
			)}
		</>
	);
}
