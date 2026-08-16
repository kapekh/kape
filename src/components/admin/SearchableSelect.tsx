import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { inputClass } from "#/components/ui/input.tsx";

export type SelectOption = { value: string; label: string };

const OPTION =
	"flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150 ease-out";

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
	const triggerRef = useRef<HTMLButtonElement>(null);

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

	// without this the search field unmounts under the caret and focus falls to body
	function close() {
		setOpen(false);
		triggerRef.current?.focus();
	}

	function pick(v: string) {
		onChange(v);
		setQ("");
		setActive(0);
		close();
	}

	function onKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Escape") {
			close();
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
				ref={triggerRef}
				id={id}
				type="button"
				disabled={disabled}
				aria-haspopup="listbox"
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
				className={`${inputClass} flex h-10 items-center justify-between gap-2 text-left`}
			>
				<span className={`truncate ${display ? "" : "text-admin-ink-subtle"}`}>
					{display || placeholder}
				</span>
				<ChevronDown
					aria-hidden="true"
					className={`size-4 shrink-0 text-admin-ink-subtle transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}
				/>
			</button>

			{open && (
				<div className="absolute z-30 mt-1 w-full min-w-[12rem] rounded-xl border border-admin-border bg-admin-panel-raised shadow-[var(--shadow-soft)]">
					<div className="relative border-b border-admin-border p-2">
						<Search
							aria-hidden="true"
							className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-admin-ink-subtle"
						/>
						<input
							ref={inputRef}
							value={q}
							onChange={(e) => {
								setQ(e.target.value);
								setActive(0);
							}}
							onKeyDown={onKeyDown}
							placeholder="Search…"
							className={`${inputClass} h-10 pl-9`}
						/>
					</div>
					<div className="max-h-56 overflow-y-auto p-1">
						{emptyOption !== undefined && (
							<button
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => pick("")}
								className={`${OPTION} ${value === "" ? "font-medium text-admin-accent-ink" : "text-admin-ink-muted hover:bg-admin-accent-soft"}`}
							>
								<span className="truncate">{emptyOption}</span>
								{value === "" && (
									<Check aria-hidden="true" className="ml-auto size-4" />
								)}
							</button>
						)}
						{filtered.length === 0 ? (
							<p className="px-3 py-4 text-[13px] text-admin-ink-muted">
								{options.length === 0
									? "Nothing to choose from yet"
									: `No matches for “${q}”`}
							</p>
						) : (
							filtered.map((o, i) => (
								<button
									key={o.value}
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onMouseEnter={() => setActive(i)}
									onClick={() => pick(o.value)}
									// selected is the check and the accent text; the background is
									// the keyboard cursor alone, or the two states cannot be told apart
									className={`${OPTION} ${o.value === value ? "font-medium text-admin-accent-ink" : "text-admin-ink"} ${i === active ? "bg-admin-accent-soft" : "hover:bg-admin-accent-soft"}`}
								>
									<span className="truncate">{o.label}</span>
									{o.value === value && (
										<Check aria-hidden="true" className="ml-auto size-4" />
									)}
								</button>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
}
