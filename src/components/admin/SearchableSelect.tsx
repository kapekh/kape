import { useEffect, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

/**
 * Reusable searchable single-select (combobox). Type to filter; click or Enter
 * to choose. Use anywhere a list of options is picked — projects, provinces,
 * categories, content types, etc. Value/onChange are plain strings.
 */
export function SearchableSelect({
	id,
	value,
	onChange,
	options,
	placeholder = "Select…",
	emptyOption,
	disabled,
	className,
}: {
	/** Lands on the trigger, so a caption's `htmlFor` names this field. */
	id?: string;
	value: string;
	onChange: (v: string) => void;
	options: SelectOption[];
	placeholder?: string;
	/** When set, shows a "clear" choice at the top that selects "". */
	emptyOption?: string;
	disabled?: boolean;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState("");
	const [active, setActive] = useState(0);
	const rootRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const selected = options.find((o) => o.value === value);
	const display = selected?.label ?? (value || "");

	useEffect(() => {
		if (!open) return;
		inputRef.current?.focus();
		const onDoc = (e: MouseEvent) => {
			if (rootRef.current && !rootRef.current.contains(e.target as Node))
				setOpen(false);
		};
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, [open]);

	const filtered = options.filter((o) => {
		if (!q) return true;
		const s = q.toLowerCase();
		return (
			o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s)
		);
	});

	function pick(v: string) {
		onChange(v);
		setOpen(false);
		setQ("");
		setActive(0);
	}

	function onKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Escape") {
			setOpen(false);
			return;
		}
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActive((a) => Math.min(a + 1, filtered.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActive((a) => Math.max(a - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			const o = filtered[active];
			if (o) pick(o.value);
		}
	}

	return (
		<div ref={rootRef} className={`relative ${className ?? ""}`}>
			<button
				id={id}
				type="button"
				disabled={disabled}
				aria-haspopup="listbox"
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
				className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm transition focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25 disabled:opacity-50"
			>
				<span className={`truncate ${display ? "" : "text-muted-foreground"}`}>
					{display || placeholder}
				</span>
				<span className="shrink-0 text-muted-foreground">▾</span>
			</button>

			{open && (
				<div className="absolute z-30 mt-1 w-full min-w-[12rem] rounded-lg border border-border bg-card shadow-[var(--shadow-soft)]">
					<div className="border-b border-border p-2">
						<input
							ref={inputRef}
							value={q}
							onChange={(e) => {
								setQ(e.target.value);
								setActive(0);
							}}
							onKeyDown={onKeyDown}
							placeholder="Search…"
							className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)]"
						/>
					</div>
					<div className="thin-scroll max-h-56 overflow-y-auto py-1">
						{emptyOption !== undefined && (
							<button
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => pick("")}
								className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-muted ${value === "" ? "font-medium text-[var(--accent)]" : "text-muted-foreground"}`}
							>
								{emptyOption}
							</button>
						)}
						{filtered.length === 0 ? (
							<div className="px-3 py-2 text-sm text-muted-foreground">
								No matches
							</div>
						) : (
							filtered.map((o, i) => (
								<button
									key={o.value}
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onMouseEnter={() => setActive(i)}
									onClick={() => pick(o.value)}
									className={`block w-full truncate px-3 py-1.5 text-left text-sm ${o.value === value ? "bg-[var(--accent)]/10 font-medium text-[var(--accent)]" : i === active ? "bg-muted" : "hover:bg-muted"}`}
								>
									{o.label}
								</button>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
}
