import { useEffect, useId, useRef, useState } from "react";

export type LangOpt = { code: string; name: string; isDefault: boolean };

// `sort` orders the tabs; `is_default` says which language a record must have. both are set separately in /admin/languages, so the first tab is not the default one
export function defaultLanguage<
	L extends { code: string; isDefault?: boolean },
>(languages: L[]): L | undefined {
	return languages.find((l) => l.isDefault) ?? languages[0];
}

/**
 * One editor's translated fields, per language: seeded blank where a language has
 * no row yet, so a value the editor leaves empty travels as "" and clears its row.
 */
export function useLangText<F extends string>(
	languages: readonly { code: string }[],
	fields: readonly F[],
	initial?: Record<string, Partial<Record<F, string>>>,
) {
	const [text, setText] = useState<Record<string, Record<F, string>>>(() => {
		const seeded: Record<string, Record<F, string>> = {};
		for (const l of languages) {
			const row: Partial<Record<F, string>> = initial?.[l.code] ?? {};
			seeded[l.code] = Object.fromEntries(
				fields.map((f) => [f, row[f] ?? ""]),
			) as Record<F, string>;
		}
		return seeded;
	});

	return {
		text,
		setText: (lang: string, field: F, value: string) =>
			setText((prev) => ({
				...prev,
				[lang]: { ...prev[lang], [field]: value },
			})),
		toTranslations: () =>
			languages.map((l) => ({ lang: l.code, ...text[l.code] })),
	};
}

// values live in the parent form and every panel stays mounted, so a tab change loses nothing; role="tab" is why the arrow keys and roving tabindex are here
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
	const wrap = useRef<HTMLDivElement>(null);
	const activeCode =
		active && languages.some((l) => l.code === active)
			? active
			: languages[0]?.code;

	// a required box in a hidden panel reports its error where nobody can read it,
	// and the browser refuses the submit anyway. `invalid` does not bubble, so this
	// listens in the capture phase and shows the panel that failed
	useEffect(() => {
		const el = wrap.current;
		if (!el) return;
		const reveal = (e: Event) => {
			const panel = (e.target as HTMLElement).closest?.('[role="tabpanel"]');
			const code = panel?.id.startsWith(`${base}-panel-`)
				? panel.id.slice(`${base}-panel-`.length)
				: null;
			if (!code) return;
			setActive(code);
			requestAnimationFrame(() => (e.target as HTMLElement).focus?.());
		};
		el.addEventListener("invalid", reveal, true);
		return () => el.removeEventListener("invalid", reveal, true);
	}, [base]);

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
		<div ref={wrap}>
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
