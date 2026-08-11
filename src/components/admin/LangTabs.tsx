import { useId, useRef, useState } from "react";

/**
 * Tabs for multilingual fields. The field VALUES live in the parent form's state
 * (read/written inside the `children` render fn), NOT in this component — so
 * switching tabs can never lose content. Every language panel stays mounted and
 * is merely hidden when inactive, which also keeps rich-text editors from
 * remounting (no flicker, no lost cursor) on tab change.
 *
 * Roving tabindex, `aria-controls` and arrow-key movement are all here because
 * `role="tab"` promises them: a tablist that only responds to Tab makes a screen
 * reader announce "tab, 1 of 3" and then not move when the user presses Right.
 */
export function LangTabs<
	L extends { code: string; name: string; nativeName?: string },
>({
	languages,
	children,
}: {
	languages: L[];
	children: (lang: L) => React.ReactNode;
}) {
	const [active, setActive] = useState<string | null>(null);
	const base = useId();
	const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const activeCode =
		active && languages.some((l) => l.code === active)
			? active
			: languages[0]?.code;

	if (languages.length === 0) return null;

	const tabId = (code: string) => `${base}-tab-${code}`;
	const panelId = (code: string) => `${base}-panel-${code}`;
	const index = languages.findIndex((l) => l.code === activeCode);

	/** Moves selection and focus together, which is the pattern `role="tab"` implies. */
	const go = (to: number) => {
		const next = languages[(to + languages.length) % languages.length];
		if (!next) return;
		setActive(next.code);
		tabRefs.current[languages.indexOf(next)]?.focus();
	};

	function onKeyDown(e: React.KeyboardEvent) {
		if (e.key === "ArrowRight") {
			e.preventDefault();
			go(index + 1);
		} else if (e.key === "ArrowLeft") {
			e.preventDefault();
			go(index - 1);
		} else if (e.key === "Home") {
			e.preventDefault();
			go(0);
		} else if (e.key === "End") {
			e.preventDefault();
			go(languages.length - 1);
		}
	}

	return (
		<div>
			<div
				role="tablist"
				aria-label="Language"
				onKeyDown={onKeyDown}
				className="mb-6 flex flex-wrap gap-1 border-b border-admin-border"
			>
				{languages.map((l, i) => {
					const on = activeCode === l.code;
					return (
						<button
							key={l.code}
							ref={(el) => {
								tabRefs.current[i] = el;
							}}
							id={tabId(l.code)}
							type="button"
							role="tab"
							aria-selected={on}
							aria-controls={panelId(l.code)}
							// only the selected tab is a tab stop; the arrows move within
							tabIndex={on ? 0 : -1}
							onClick={() => setActive(l.code)}
							className={`-mb-px flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-admin-focus/50 ${on ? "border-admin-accent bg-admin-accent-soft text-admin-ink" : "border-transparent text-admin-ink-muted hover:bg-admin-accent-soft hover:text-admin-ink"}`}
						>
							{l.name}
							<span
								className={`rounded-full px-2 py-1 text-xs font-medium uppercase leading-none ${on ? "bg-admin-accent text-accent-foreground" : "bg-admin-neutral-soft text-admin-ink-muted"}`}
							>
								{l.code}
							</span>
						</button>
					);
				})}
			</div>
			{languages.map((l) => (
				<div
					key={l.code}
					id={panelId(l.code)}
					role="tabpanel"
					aria-labelledby={tabId(l.code)}
					hidden={activeCode !== l.code}
				>
					{children(l)}
				</div>
			))}
		</div>
	);
}
