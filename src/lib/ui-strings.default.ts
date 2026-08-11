// one module per slice; a key belongs in the same change as the component that renders it
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

// a spread merge lets the last module silently win; reported, not thrown, so it is one named test
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
