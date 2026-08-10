import { useRouterState } from "@tanstack/react-router";
import {
	createContext,
	Fragment,
	type ReactNode,
	useContext,
	useEffect,
} from "react";

import { isFunctional, stripLang } from "./i18n-config";

export type LangInfo = { code: string; name: string; nativeName: string };

/** Values substituted into a string's `{name}` slots. */
export type TParams = Record<string, string | number>;

type Ctx = {
	lang: string;
	languages: LangInfo[];
	// `fallback` is shown when the key isn't in the dictionary (e.g. a not-yet-seeded
	// string), so new UI text degrades to readable English instead of the raw key.
	// `params` fill `{name}` slots — a whole sentence stays one translatable unit
	// instead of being concatenated from fragments, which Khmer word order breaks.
	t: (key: string, fallback?: string, params?: TParams) => string;
};

// unmatched slot stays on screen: a visible {n} gets reported, `undefined` does not
const fill = (text: string, params?: TParams) =>
	params === undefined
		? text
		: text.replace(/\{(\w+)\}/g, (slot, name) =>
				Object.hasOwn(params, name) ? String(params[name]) : slot,
			);

const makeT =
	(strings: Record<string, string>): Ctx["t"] =>
	(key, fallback, params) =>
		fill(strings[key] ?? fallback ?? key, params);

// no dictionary outside a provider, so every lookup resolves to its own fallback
const fallbackT = makeT({});

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

	const t = makeT(strings);

	return (
		<LangContext.Provider value={{ lang, languages, t }}>
			{children}
		</LangContext.Provider>
	);
}

export function useLang(): Ctx {
	const ctx = useContext(LangContext);
	if (!ctx) return { lang: "en", languages: [], t: fallbackT };
	return ctx;
}

export function useT() {
	return useLang().t;
}

/** Renders one button per enabled language; clicking updates the `?lang=` param. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
	const { lang, languages } = useLang();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const list =
		languages.length > 0
			? languages
			: [{ code: "en", name: "English", nativeName: "English" }];

	// Switch language by navigating to the same content path under the new prefix
	// (full load so the header/footer/strings re-render in the new language).
	function switchTo(code: string) {
		const { path } = stripLang(pathname);
		const target = isFunctional(path)
			? path
			: `/${code}${path === "/" ? "" : path}`;
		window.location.assign(target || `/${code}`);
	}

	return (
		<div className={`inline-flex items-center gap-1 text-xs ${className}`}>
			{list.map((l, i) => (
				<Fragment key={l.code}>
					{i > 0 && <span className="opacity-50">|</span>}
					<button
						type="button"
						onClick={() => switchTo(l.code)}
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
