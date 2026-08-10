/**
 * Default UI chrome strings (EN + KH), seeded into the `ui_strings` table.
 *
 * This is the *bootstrap* dictionary for a fresh install: the words the shipped
 * components put on screen before anyone has written a page. It holds every key
 * a component renders through `t()` and nothing else — no sample navigation, no
 * homepage copy, nothing about any one organisation, sector or country. An
 * example site's dictionary belongs in its own seed under src/server/seed/.
 *
 * At runtime the app reads UI strings from the DB, so adding a language is pure
 * data (INSERT rows) — no code change. Keep keys stable; components reference them.
 *
 * The keys live in one module per slice under ./ui-strings/, so eight jobs can
 * each add their own without editing one file in eight places. A key belongs in
 * the same change as the component that renders it: seed it earlier and it is
 * dead weight nobody can see is dead. `ui-strings/dictionary.test.ts` enforces
 * both that rule and the absence of a key defined by two modules at once.
 */
import { common } from "./ui-strings/common";
import { donate } from "./ui-strings/donate";
import { forms } from "./ui-strings/forms";
import { internal } from "./ui-strings/internal";
import { nav } from "./ui-strings/nav";
import { pages } from "./ui-strings/pages";
import { sections } from "./ui-strings/sections";
import { site } from "./ui-strings/site";

export type UiString = { en: string; km?: string };

/** Slice name → the keys that slice owns. Ordered as INVENTORY.md's slice table. */
export const uiStringModules: Record<string, Record<string, UiString>> = {
	common,
	nav,
	forms,
	pages,
	sections,
	site,
	donate,
	internal,
};

/**
 * Keys defined by more than one module, as `key: moduleA, moduleB`.
 *
 * A spread merge lets the last module silently win, which is how a component
 * ends up rendering another slice's words. Reported rather than thrown so the
 * failure is one named test instead of every importer crashing at load.
 */
export function duplicateUiStringKeys(): Record<string, string[]> {
	const owners: Record<string, string[]> = {};
	for (const [module, strings] of Object.entries(uiStringModules))
		for (const key of Object.keys(strings))
			owners[key] = [...(owners[key] ?? []), module];
	return Object.fromEntries(
		Object.entries(owners).filter(([, from]) => from.length > 1),
	);
}

export const defaultUiStrings: Record<string, UiString> = Object.assign(
	{},
	...Object.values(uiStringModules),
);
