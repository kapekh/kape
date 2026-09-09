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
import { ROW_FIELDS } from "#/lib/record-fields";
import type { SectionNode } from "#/lib/sections";

const state = vi.hoisted(() => ({
	me: null as { permissions: string[]; isSuperAdmin: boolean } | null,
	saved: [] as Record<string, unknown>[],
}));

vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: {
		auth: { me: { query: () => Promise.resolve(state.me) } },
		adminPages: {
			updateField: {
				mutate: (input: Record<string, unknown>) => {
					state.saved.push(input);
					return Promise.resolve({
						wrote: "translation",
						cleared: false,
						updatedAt: "2026-09-01T02:00:00Z",
					});
				},
			},
		},
	},
}));

vi.mock("../NavLink", () => ({
	NavLink: ({ href, children, ...rest }: Record<string, unknown>) => (
		<a href={String(href ?? "")} {...rest}>
			{children as ReactNode}
		</a>
	),
}));

import { InlineEditBar } from "../InlineEditBar";
import { rowEditTarget, SectionRenderer } from "./SectionRenderer";

const PAGE_ID = 60;
const PERSON_AT = "2026-08-01T09:00:00Z";
const POST_AT = "2026-08-02T09:00:00Z";

const person = {
	id: 4,
	slug: "heang",
	name: "Heang Koy",
	position: "Program Manager",
	section: "team",
	photoUrl: null,
	i18nFallback: [] as string[],
	updatedAt: PERSON_AT,
};

const post = {
	id: 12,
	slug: "a-story",
	contentType: "news",
	publishedAt: "2026-01-01",
	title: "A listed story",
	excerpt: "What it was about",
	image: null,
	i18nFallback: [] as string[],
	updatedAt: POST_AT,
};

const sections = (): SectionNode[] => [
	{ id: "team", type: "people", props: { title: "Team", data: [person] } },
	{
		id: "news",
		type: "postList",
		layout: "grid-3",
		props: { title: "News", linkBase: "/news", data: [post] },
	},
];

function Probe({
	nodes,
	lang = "en",
}: {
	nodes: SectionNode[];
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
					sections={nodes}
					entity="page"
					entityId={PAGE_ID}
					lang={lang}
				/>
				<InlineEditBar />
			</InlineEditProvider>
		</LanguageProvider>
	);
}

const setHint = (on: boolean) => {
	// biome-ignore lint/suspicious/noDocumentCookie: the hint cookie is what gates the editor
	document.cookie = `${ADMIN_HINT_COOKIE}=${on ? "1" : ""}; Max-Age=${on ? 60 : 0}`;
};

const signIn = (permissions: string[]) => {
	state.me = { permissions, isSuperAdmin: false };
	setHint(true);
};

/** Sign in, render, turn the switch on. */
async function editing(nodes: SectionNode[], lang = "en") {
	const view = render(<Probe nodes={nodes} lang={lang} />);
	fireEvent.click(await screen.findByLabelText(/edit this page/i));
	return view;
}

/** The marked node for one field of one listed record. */
const marked = (root: HTMLElement, entity: string, id: number, field: string) =>
	root.querySelector<HTMLElement>(
		`[data-cms-entity="${entity}"][data-cms-entity-id="${id}"][data-cms-target="field:${field}"]`,
	);

const open = (node: HTMLElement) => {
	node.focus();
	fireEvent.mouseDown(node);
	return node;
};

const typeAndSave = (node: HTMLElement, value: string) => {
	node.textContent = value;
	fireEvent.keyDown(node, { key: "Enter", ctrlKey: true });
};

const nodeFor = (attrs: Record<string, string>): Element => {
	const el = document.createElement("div");
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
	return el;
};

const PAGE = { entity: "page", entityId: PAGE_ID, lang: "en" };
const EVERYTHING: ReadonlySet<string> = new Set(Object.keys(ROW_FIELDS));

afterEach(cleanup);

beforeEach(() => {
	state.me = null;
	state.saved = [];
	localStorage.clear();
	setHint(false);
});

describe("what a row marker resolves to", () => {
	it("refuses a field outside the allowlist", () => {
		expect(
			rowEditTarget(
				nodeFor({
					"data-cms-entity": "post",
					"data-cms-entity-id": "12",
					"data-cms-target": "field:body",
					"data-cms-source": "prosemirror json",
				}),
				PAGE,
				EVERYTHING,
			),
		).toBeNull();
	});

	it("leaves the page's own record to the layer that owns it", () => {
		expect(
			rowEditTarget(
				nodeFor({
					"data-cms-entity": "page",
					"data-cms-entity-id": String(PAGE_ID),
					"data-cms-target": "field:title",
					"data-cms-source": "This page",
				}),
				PAGE,
				EVERYTHING,
			),
		).toBeNull();
	});

	it("refuses an entity the editor may not edit", () => {
		expect(
			rowEditTarget(
				nodeFor({
					"data-cms-entity": "person",
					"data-cms-entity-id": "4",
					"data-cms-target": "field:name",
					"data-cms-source": "Heang Koy",
				}),
				PAGE,
				new Set(["post"]),
			),
		).toBeNull();
	});

	it("takes a name and a position in any language, each holding its own row", () => {
		const name = {
			"data-cms-entity": "person",
			"data-cms-entity-id": "4",
			"data-cms-target": "field:name",
			"data-cms-source": "Heang Koy",
		};
		expect(rowEditTarget(nodeFor(name), PAGE, EVERYTHING)).toBeTruthy();
		expect(
			rowEditTarget(nodeFor(name), { ...PAGE, lang: "fr" }, EVERYTHING),
		).toBeTruthy();
		expect(
			rowEditTarget(
				nodeFor({ ...name, "data-cms-target": "field:position" }),
				{ ...PAGE, lang: "fr" },
				EVERYTHING,
			),
		).toBeTruthy();
	});

	it("warns about nothing shared on a position, and a one-line field is one line", () => {
		const target = rowEditTarget(
			nodeFor({
				"data-cms-entity": "person",
				"data-cms-entity-id": "4",
				"data-cms-target": "field:position",
				"data-cms-source": "Program Manager",
			}),
			PAGE,
			EVERYTHING,
		);
		expect(target?.label).toBe("Position");
		expect(target?.multiline).toBe(false);
		expect(target?.note).toBeUndefined();
	});
});

describe("editing a listed record where it is read", () => {
	it("marks nothing editable for a visitor", () => {
		const { container } = render(<Probe nodes={sections()} />);
		const name = marked(container, "person", person.id, "name");
		expect(name?.getAttribute("data-cms-source")).toBeNull();
		expect(name?.getAttribute("tabindex")).toBeNull();
	});

	it("types a person's name straight into the team grid", async () => {
		signIn(["people"]);
		const { container } = await editing(sections());
		const name = marked(container, "person", person.id, "name");
		if (!name) throw new Error("the person's name is not marked");

		expect(name.getAttribute("data-cms-source")).toBe(person.name);
		open(name);
		expect(name.getAttribute("contenteditable")).not.toBeNull();

		typeAndSave(name, "Koy Heang");
		await waitFor(() =>
			expect(state.saved).toEqual([
				{
					entity: "person",
					entityId: person.id,
					lang: "en",
					target: "field:name",
					value: "Koy Heang",
					expectedUpdatedAt: PERSON_AT,
				},
			]),
		);
	});

	it("types a post title straight into the listing", async () => {
		signIn(["posts"]);
		const { container } = await editing(sections());
		const title = marked(container, "post", post.id, "title");
		if (!title) throw new Error("the post title is not marked");

		typeAndSave(open(title), "A retitled story");
		await waitFor(() =>
			expect(state.saved[0]).toMatchObject({
				entity: "post",
				entityId: post.id,
				target: "field:title",
				value: "A retitled story",
				expectedUpdatedAt: POST_AT,
			}),
		);
	});

	it("opens a name and a position in a third language, each told it fell back", async () => {
		signIn(["people"]);
		const nodes = sections();
		const team = nodes[0].props as { data: (typeof person)[] };
		team.data = [{ ...person, i18nFallback: ["name", "position"] }];
		const { container } = await editing(nodes, "fr");
		const name = marked(container, "person", person.id, "name");
		if (!name) throw new Error("the person's name is not marked");
		expect(name.getAttribute("data-cms-source")).toBe(person.name);
		expect(name.hasAttribute("data-cms-fell-back")).toBe(true);
		const position = marked(container, "person", person.id, "position");
		expect(position?.getAttribute("data-cms-source")).toBe(person.position);
		expect(position?.hasAttribute("data-cms-fell-back")).toBe(true);
	});

	it("offers a person nothing to an editor who only holds posts", async () => {
		signIn(["posts"]);
		const { container } = await editing(sections());
		expect(
			marked(container, "person", person.id, "name")?.getAttribute(
				"data-cms-source",
			),
		).toBeNull();
		expect(
			marked(container, "post", post.id, "title")?.getAttribute(
				"data-cms-source",
			),
		).toBe(post.title);
	});

	it("empties a name that fell back, so Khmer cannot save the English one", async () => {
		signIn(["people"]);
		const nodes = sections();
		const team = nodes[0].props as { data: (typeof person)[] };
		team.data = [{ ...person, i18nFallback: ["name"] }];
		const { container } = await editing(nodes, "km");
		const name = marked(container, "person", person.id, "name");
		if (!name) throw new Error("the person's name is not marked");

		open(name);
		expect(name.textContent).toBe("");
		expect(screen.getByText(/showing “Heang Koy”/)).toBeTruthy();

		typeAndSave(name, "ហៀង គយ");
		await waitFor(() =>
			expect(state.saved[0]).toMatchObject({
				lang: "km",
				target: "field:name",
				value: "ហៀង គយ",
			}),
		);
	});
});
