// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ADMIN_HINT_COOKIE } from "#/lib/admin-hint";
import { LanguageProvider } from "#/lib/i18n";
import { InlineEditProvider } from "#/lib/inline-edit";
import {
	SECTION_DEFS,
	type SectionField,
	type SectionNode,
} from "#/lib/sections";
import { applySectionValue, parseFieldTarget } from "#/server/repo/admin";

const state = vi.hoisted(() => ({
	me: null as { permissions: string[]; isSuperAdmin: boolean } | null,
	saved: [] as Record<string, unknown>[],
	conflict: false,
}));

vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: {
		auth: { me: { query: () => Promise.resolve(state.me) } },
		adminPages: {
			get: {
				query: () => Promise.resolve({ updatedAt: "2026-08-13T00:00:00Z" }),
			},
			updateField: {
				mutate: (input: Record<string, unknown>) => {
					if (state.conflict) return Promise.reject(new Error("CONFLICT"));
					state.saved.push(input);
					return Promise.resolve({
						wrote: "section",
						cleared: false,
						updatedAt: "2026-08-13T01:00:00Z",
					});
				},
			},
		},
	},
}));

vi.mock("#/components/NavLink", () => ({
	NavLink: ({ href, children, ...rest }: Record<string, unknown>) => (
		<a href={String(href ?? "")} {...rest}>
			{children as ReactNode}
		</a>
	),
}));
vi.mock("../NavLink", () => ({
	NavLink: ({ href, children, ...rest }: Record<string, unknown>) => (
		<a href={String(href ?? "")} {...rest}>
			{children as ReactNode}
		</a>
	),
}));
// siteMap draws the published nav out of the root route's loader
vi.mock("@tanstack/react-router", async (actual) => ({
	...(await actual<Record<string, unknown>>()),
	useLoaderData: () => ({ nav: [] }),
}));
vi.mock("../MapView", () => ({ MapView: () => <div /> }));
vi.mock("../PublicOrgChart", () => ({ PublicOrgChart: () => <div /> }));
vi.mock("../ContactForm", () => ({ ContactForm: () => <form /> }));
vi.mock("../FormRenderer", () => ({ FormRenderer: () => <form /> }));

import { InlineEditBar } from "../InlineEditBar";
import { fieldEditTarget, SectionRenderer } from "./SectionRenderer";

const PAGE_ID = 43;

// the stats count-up gates on scrolling into view, which jsdom has no notion of
vi.stubGlobal(
	"IntersectionObserver",
	class {
		observe() {}
		unobserve() {}
		disconnect() {}
	},
);

/** Text for one field, so every marker on the probe page addresses something. */
function sample(field: SectionField, prefix: string): unknown {
	switch (field.kind) {
		case "image":
			return "/uploads/probe.jpg";
		case "url":
			return "/probe";
		case "select":
			return field.options?.[0]?.value ?? "";
		case "form":
			return ""; // a picked form leaves only its slug translatable
		case "items":
			return [0, 1].map((n) =>
				Object.fromEntries(
					(field.itemFields ?? []).map((f) => [f.key, sample(f, `Item ${n}`)]),
				),
			);
		case "cards":
			return [0, 1].map((n) => ({
				title: `Card ${n}`,
				body: `Card ${n} body`,
			}));
		default:
			return `${prefix} ${field.key}`;
	}
}

/**
 * Every section type in every layout it offers, every field filled: J04's probe
 * page, built from the definitions rather than from a database copy. A layout is
 * its own case because several draw different markup, and so different markers.
 */
function probeSections(): SectionNode[] {
	return SECTION_DEFS.flatMap((def) =>
		(def.layouts.length ? def.layouts : [{ value: "", label: "" }]).map((l) =>
			probeSection(def, l.value),
		),
	);
}

function probeSection(
	def: (typeof SECTION_DEFS)[number],
	layout: string,
): SectionNode {
	return {
		id: layout ? `s-${def.type}-${layout}` : `s-${def.type}`,
		type: def.type,
		layout: layout || undefined,
		props: {
			...Object.fromEntries(
				def.fields.map((f) => [f.key, sample(f, def.label)]),
			),
			// the accent syntax the editor has to keep, D6
			...(def.type === "hero" ? { title: "Every *section* type" } : {}),
			// dynamic sections draw rows belonging to other records. orgChart is left
			// unbound: bound, it hands its heading to PublicOrgChart, which J04 left
			// unmarked because that file is not the renderer's
			data:
				def.kind === "dynamic" && def.type !== "orgChart"
					? [
							{
								id: 2,
								slug: "probe-post",
								title: "A listed record",
								name: "A listed record",
								summary: "Listed summary",
								excerpt: "Listed excerpt",
								coverUrl: null,
								publishedAt: "2026-01-01",
								contentType: "news",
							},
						]
					: undefined,
		},
	};
}

function Probe({
	sections,
	lang = "en",
}: {
	sections: SectionNode[];
	lang?: string;
}) {
	return (
		<LanguageProvider
			lang={lang}
			languages={[
				{ code: "en", name: "English", nativeName: "English" },
				{ code: "km", name: "Khmer", nativeName: "ខ្មែរ" },
			]}
			strings={{}}
			stringsFallback={[]}
		>
			<InlineEditProvider>
				<SectionRenderer
					sections={sections}
					entity="page"
					entityId={PAGE_ID}
					lang={lang}
				/>
				<InlineEditBar />
			</InlineEditProvider>
		</LanguageProvider>
	);
}

const targetsIn = (root: HTMLElement): string[] =>
	[...root.querySelectorAll("[data-cms-target]")].map(
		(n) => n.getAttribute("data-cms-target") ?? "",
	);

const setHint = (on: boolean) => {
	// biome-ignore lint/suspicious/noDocumentCookie: the hint cookie is what gates the editor
	document.cookie = `${ADMIN_HINT_COOKIE}=${on ? "1" : ""}; Max-Age=${on ? 60 : 0}`;
};

const signIn = (permissions: string[]) => {
	state.me = { permissions, isSuperAdmin: false };
	setHint(true);
};

/** Sign in, render, turn the switch on. */
async function editing(sections: SectionNode[], lang = "en") {
	const view = render(<Probe sections={sections} lang={lang} />);
	fireEvent.click(await screen.findByLabelText(/edit text/i));
	return view;
}

/** `hero`, `props.lead` → the address of the lead on the first hero on the probe. */
const address = (sections: SectionNode[], type: string, path: string) =>
	`section:${sections.find((s) => s.type === type)?.id}:${path}`;

const clickTarget = (root: HTMLElement, target: string) => {
	const node = root.querySelector<HTMLElement>(`[data-cms-target="${target}"]`);
	if (!node) throw new Error(`no marker for ${target}`);
	node.focus();
	fireEvent.click(node);
	return node;
};

afterEach(cleanup);

beforeEach(() => {
	state.me = null;
	state.saved = [];
	state.conflict = false;
	localStorage.clear();
	setHint(false);
});

describe("the markers J04 emits and the address J03 parses", () => {
	it("agrees on every field of every section type", () => {
		const sections = probeSections();
		const { container } = render(<Probe sections={sections} />);
		const targets = targetsIn(container);

		const refused = targets.filter((t) => {
			try {
				parseFieldTarget(t);
				return false;
			} catch {
				return true;
			}
		});
		expect(refused).toEqual([]);
		// every type marks something, so a template cannot go dark unnoticed
		const typeOf = new Map(sections.map((s) => [s.id, s.type]));
		const marked = new Set(
			targets
				.map((t) => typeOf.get(/^section:([^:]+):/.exec(t)?.[1] ?? ""))
				.filter((type): type is string => !!type),
		);
		expect([...marked].sort()).toEqual(SECTION_DEFS.map((d) => d.type).sort());
	});

	it("writes each marked address back to the field the marker sat on", () => {
		const sections = probeSections();
		const { container } = render(<Probe sections={sections} />);
		const id = { entity: "page", entityId: PAGE_ID, lang: "en" };
		const opens: string[] = [];
		const writes: string[] = [];
		const refused: string[] = [];

		for (const target of new Set(targetsIn(container))) {
			const parsed = parseFieldTarget(target);
			if (parsed.kind === "field") continue; // another record's row, J07's
			if (fieldEditTarget(sections, id, target)?.shown) opens.push(target);
			try {
				const written = applySectionValue(
					sections,
					parsed,
					"en",
					"probe value",
				);
				expect(fieldEditTarget(written, id, target)?.shown).toBe("probe value");
				writes.push(target);
			} catch (err) {
				refused.push(`${target} -> ${(err as Error).message}`);
			}
		}

		// no box opens on a field the write path would refuse, and none is withheld
		// from a field it would take
		expect(opens).toEqual(writes);
		expect(refused).toEqual([]);
	});

	it("edits the stored source of a title, not the accent spans on screen", () => {
		const sections = probeSections();
		const { container } = render(<Probe sections={sections} />);
		const title = address(sections, "hero", "props.title");
		const heading = container.querySelector(`[data-cms-target="${title}"]`);

		expect(heading?.textContent).toBe("Every section type");
		expect(
			fieldEditTarget(
				sections,
				{ entity: "page", entityId: PAGE_ID, lang: "en" },
				title,
			)?.shown,
		).toBe("Every *section* type");
	});
});

describe("editing a section field on the public page", () => {
	it("offers nothing to a visitor, and nothing to an admin without pages", async () => {
		const sections = probeSections();
		const { container } = render(<Probe sections={sections} />);
		expect(container.querySelector("style")).toBeNull();
		clickTarget(container, address(sections, "hero", "props.title"));
		expect(screen.queryByRole("textbox")).toBeNull();

		cleanup();
		signIn(["settings"]);
		const view = await editing(sections);
		expect(view.container.querySelector("style")).toBeNull();
		clickTarget(view.container, address(sections, "hero", "props.title"));
		expect(screen.queryByRole("textbox")).toBeNull();
	});

	it("opens the box on the field that was clicked and saves that one address", async () => {
		signIn(["pages"]);
		const sections = probeSections();
		const { container } = await editing(sections);
		const lead = address(sections, "hero", "props.lead");
		clickTarget(container, lead);

		const box = screen.getByRole("textbox") as HTMLTextAreaElement;
		expect(box.value).toBe("Hero lead");
		fireEvent.change(box, { target: { value: "A new lead" } });
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() =>
			expect(state.saved).toEqual([
				{
					entity: "page",
					entityId: PAGE_ID,
					lang: "en",
					target: lead,
					value: "A new lead",
					expectedUpdatedAt: "2026-08-13T00:00:00Z",
				},
			]),
		);
	});

	it("saves one repeater item field", async () => {
		signIn(["pages"]);
		const sections = probeSections();
		const { container } = await editing(sections);
		const card = address(sections, "cards", "props.items[1].body");
		clickTarget(container, card);

		expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
			"Card 1 body",
		);
		fireEvent.change(screen.getByRole("textbox"), {
			target: { value: "Second card, rewritten" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() =>
			expect(state.saved[0]).toMatchObject({
				target: card,
				value: "Second card, rewritten",
			}),
		);
	});

	it("opens empty and quotes the default language where the text fell back", async () => {
		signIn(["pages"]);
		const sections = probeSections();
		const hero = sections.find((s) => s.type === "hero");
		if (hero?.props) hero.props.i18nFallback = ["title", "lead"];
		const lead = address(sections, "hero", "props.lead");
		const { container } = await editing(sections, "km");
		clickTarget(container, lead);

		expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
		expect(screen.getByText(/showing “Hero lead”/)).toBeTruthy();

		fireEvent.change(screen.getByRole("textbox"), {
			target: { value: "អត្ថបទខ្មែរ" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save" }));
		await waitFor(() =>
			expect(state.saved[0]).toMatchObject({
				lang: "km",
				target: lead,
				value: "អត្ថបទខ្មែរ",
			}),
		);
	});

	it("closes on Escape and puts the focus back where it was", async () => {
		signIn(["pages"]);
		const sections = probeSections();
		const { container } = await editing(sections);
		const node = clickTarget(
			container,
			address(sections, "cta", "props.ctaLabel"),
		);
		const box = screen.getByRole("textbox");
		box.focus();
		expect(document.activeElement).toBe(box);

		fireEvent.keyDown(box, { key: "Escape" });
		expect(screen.queryByRole("textbox")).toBeNull();
		expect(document.activeElement).toBe(node);
	});

	it("says so when someone else changed the page first", async () => {
		signIn(["pages"]);
		const sections = probeSections();
		const { container } = await editing(sections);
		clickTarget(container, address(sections, "cta", "props.ctaLabel"));
		state.conflict = true;
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(
			await screen.findByText(/Someone else changed this record/),
		).toBeTruthy();
	});
});
