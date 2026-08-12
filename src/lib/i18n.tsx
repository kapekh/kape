import { useRouterState } from "@tanstack/react-router";
import {
	createContext,
	Fragment,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

import { isFunctional, stripLang } from "./i18n-config";

export type LangInfo = { code: string; name: string; nativeName: string };

/** Values substituted into a string's `{name}` slots. */
export type TParams = Record<string, string | number>;

type Ctx = {
	lang: string;
	languages: LangInfo[];
	// params keep a sentence one translatable unit; khmer word order breaks concatenation
	t: (key: string, fallback?: string, params?: TParams) => string;
	// keys serving the default language: an inline editor must not save over that row
	stringsFallback: Set<string>;
	/** Stored values, slots unfilled: what an inline editor puts in its box. */
	strings: Record<string, string>;
	/** Show a saved string at once, without a reload the site cannot afford mid-edit. */
	setString: (key: string, value: string) => void;
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

export function LanguageProvider({
	lang,
	languages,
	strings,
	stringsFallback = [],
	children,
}: {
	lang: string;
	languages: LangInfo[];
	strings: Record<string, string>;
	stringsFallback?: string[];
	children: ReactNode;
}) {
	const [edited, setEdited] = useState<Record<string, string>>({});

	useEffect(() => {
		if (typeof document !== "undefined") {
			document.documentElement.lang = lang;
			document.documentElement.classList.toggle("lang-km", lang === "km");
		}
	}, [lang]);

	const setString = useCallback(
		(key: string, value: string) =>
			setEdited((prev) => ({ ...prev, [key]: value })),
		[],
	);

	const value = useMemo<Ctx>(() => {
		const merged = { ...strings, ...edited };
		const fallback = new Set(stringsFallback);
		// a key just written in this language is no longer serving the default one
		for (const key of Object.keys(edited)) fallback.delete(key);
		return {
			lang,
			languages,
			t: makeT(merged),
			stringsFallback: fallback,
			strings: merged,
			setString,
		};
	}, [lang, languages, strings, stringsFallback, edited, setString]);

	return (
		<LangContext.Provider value={value}>{children}</LangContext.Provider>
	);
}

export function useLang(): Ctx {
	const ctx = useContext(LangContext);
	if (!ctx)
		return {
			lang: "en",
			languages: [],
			t: fallbackT,
			stringsFallback: new Set<string>(),
			strings: {},
			setString: () => {},
		};
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
