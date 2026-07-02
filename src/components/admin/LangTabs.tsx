import { useState } from "react";

/**
 * Tabs for multilingual fields. The field VALUES live in the parent form's state
 * (read/written inside the `children` render fn), NOT in this component — so
 * switching tabs can never lose content. Every language panel stays mounted and
 * is merely hidden when inactive, which also keeps rich-text editors from
 * remounting (no flicker, no lost cursor) on tab change.
 */
export function LangTabs<L extends { code: string; name: string; nativeName?: string }>({
	languages,
	children,
}: {
	languages: L[];
	children: (lang: L) => React.ReactNode;
}) {
	const [active, setActive] = useState<string | null>(null);
	const activeCode = active && languages.some((l) => l.code === active) ? active : languages[0]?.code;

	if (languages.length === 0) return null;

	return (
		<div>
			<div role="tablist" className="mb-4 flex flex-wrap gap-1 border-b border-border">
				{languages.map((l) => {
					const on = activeCode === l.code;
					return (
						<button
							key={l.code}
							type="button"
							role="tab"
							aria-selected={on}
							onClick={() => setActive(l.code)}
							className={`-mb-px flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition ${on ? "border-[var(--accent)] text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
						>
							{l.name}
							<span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{l.code}</span>
						</button>
					);
				})}
			</div>
			{languages.map((l) => (
				<div key={l.code} role="tabpanel" hidden={activeCode !== l.code}>
					{children(l)}
				</div>
			))}
		</div>
	);
}
