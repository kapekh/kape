import { useNavigate } from "@tanstack/react-router";
import { Fragment, createContext, useContext, useEffect, type ReactNode } from "react";

export type LangInfo = { code: string; name: string; nativeName: string };

type Ctx = {
	lang: string;
	languages: LangInfo[];
	t: (key: string) => string;
};

const LangContext = createContext<Ctx | null>(null);

/**
 * Language context. The active language, the enabled language list, and the
 * resolved UI-string dictionary all come from the root route loader (which
 * reads them from the DB via tRPC, server-side for SSR). Language is driven by
 * the `?lang=` search param — see __root.tsx.
 */
export function LanguageProvider({
	lang,
	languages,
	strings,
	children,
}: {
	lang: string;
	languages: LangInfo[];
	strings: Record<string, string>;
	children: ReactNode;
}) {
	useEffect(() => {
		if (typeof document !== "undefined") {
			document.documentElement.lang = lang;
			document.documentElement.classList.toggle("lang-km", lang === "km");
		}
	}, [lang]);

	const t = (key: string) => strings[key] ?? key;

	return (
		<LangContext.Provider value={{ lang, languages, t }}>
			{children}
		</LangContext.Provider>
	);
}

export function useLang(): Ctx {
	const ctx = useContext(LangContext);
	if (!ctx) return { lang: "en", languages: [], t: (k) => k };
	return ctx;
}

export function useT() {
	return useLang().t;
}

/** Renders one button per enabled language; clicking updates the `?lang=` param. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
	const { lang, languages } = useLang();
	const navigate = useNavigate();
	const list =
		languages.length > 0
			? languages
			: [{ code: "en", name: "English", nativeName: "English" }];

	return (
		<div className={`inline-flex items-center gap-1 text-xs ${className}`}>
			{list.map((l, i) => (
				<Fragment key={l.code}>
					{i > 0 && <span className="opacity-50">|</span>}
					<button
						type="button"
						onClick={() =>
							navigate({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, lang: l.code }) })
						}
						aria-pressed={lang === l.code}
						className={`px-2 py-0.5 rounded-full transition ${l.code === "km" ? "font-khmer" : ""} ${
							lang === l.code
								? "bg-[var(--secondary)] text-primary font-semibold"
								: "opacity-80 hover:opacity-100"
						}`}
					>
						{l.nativeName}
					</button>
				</Fragment>
			))}
		</div>
	);
}
