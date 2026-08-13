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
import type { ResolvedPage, ResolvedPost } from "#/server/repo/content";
import { parseFieldTarget } from "#/server/repo/admin";

const state = vi.hoisted(() => ({
	me: null as { permissions: string[]; isSuperAdmin: boolean } | null,
	saved: [] as Record<string, unknown>[],
	conflict: false,
}));

vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: {
		auth: { me: { query: () => Promise.resolve(state.me) } },
		adminPages: {
			updateField: {
				mutate: (input: Record<string, unknown>) => {
					if (state.conflict) return Promise.reject(new Error("CONFLICT"));
					state.saved.push(input);
					return Promise.resolve({
						wrote: "translation",
						cleared: false,
						updatedAt: "2026-08-13T09:00:00Z",
					});
				},
			},
		},
	},
}));

vi.mock("@/components/NavLink", () => ({
	NavLink: ({ href, children, ...rest }: Record<string, unknown>) => (
		<a href={String(href ?? "")} {...rest}>
			{children as ReactNode}
		</a>
	),
}));

import { cmsMark } from "./sections/SectionRenderer";
import { InlineEditBar } from "./InlineEditBar";
import {
	type PageRecord,
	pageRecord,
	postRecord,
	SubPage,
	useRecordMark,
} from "./SubPage";

const PAGE_ID = 40;
const POST_ID = 2;
/** A record a listing on the same page pulled in, which owns its own rows. */
const LISTED_POST_ID = 7;
const PAGE_LOADED_AT = "2026-08-13 05:00:00";
const POST_LOADED_AT = "2026-08-13 06:00:00";

const BODY_SOURCE =
	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Global observances."}]}]}';

const page = (over: Partial<ResolvedPage> = {}): PageRecord =>
	pageRecord({
		id: PAGE_ID,
		title: "International Days",
		excerpt: "Global observances marked through the year.",
		body: BODY_SOURCE,
		i18nFallback: [],
		updatedAt: PAGE_LOADED_AT,
		...over,
	});

const post = (over: Partial<ResolvedPost> = {}): PageRecord =>
	postRecord({
		id: POST_ID,
		title: "Kang Meas District Receives a Library",
		excerpt: "The BMZ-EYE project handed over a modern library.",
		i18nFallback: [],
		updatedAt: POST_LOADED_AT,
		...over,
	});

/**
 * The two files this job owns, assembled the way `$.tsx` assembles them: the
 * record's own title and lead in `SubPage`, its body beside them, and one row a
 * listing drew from another record.
 */
function Probe({ record, lang = "en" }: { record: PageRecord; lang?: string }) {
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
				<Route record={record} lang={lang} />
				<InlineEditBar />
			</InlineEditProvider>
		</LanguageProvider>
	);
}

function Route({ record, lang }: { record: PageRecord; lang: string }) {
	const mark = useRecordMark(record);
	return (
		<SubPage
			section="Calendar"
			title={record.fields.title ?? ""}
			lead={record.fields.excerpt}
			record={record}
			titleField="title"
			leadField="excerpt"
		>
			{record.fields.body !== undefined && (
				// the rendered html, while the row holds the ProseMirror source
				<div {...mark("body")} className="prose-body">
					<p>Global observances.</p>
				</div>
			)}
			<h3
				{...cmsMark(
					{ entity: "post", entityId: LISTED_POST_ID, lang },
					"field:title",
				)}
			>
				A listed record
			</h3>
		</SubPage>
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
async function editing(record: PageRecord, lang = "en") {
	const view = render(<Probe record={record} lang={lang} />);
	fireEvent.click(await screen.findByLabelText(/edit text/i));
	return view;
}

const markersOf = (root: HTMLElement, record: PageRecord): string[] =>
	[
		...root.querySelectorAll(
			`[data-cms-entity="${record.entity}"][data-cms-entity-id="${record.entityId}"][data-cms-target]`,
		),
	].map((n) => n.getAttribute("data-cms-target") ?? "");

const click = (root: HTMLElement, selector: string) => {
	const node = root.querySelector<HTMLElement>(selector);
	if (!node) throw new Error(`no node for ${selector}`);
	node.focus();
	fireEvent.click(node);
	return node;
};

const clickField = (root: HTMLElement, record: PageRecord, field: string) =>
	click(
		root,
		`[data-cms-entity="${record.entity}"][data-cms-entity-id="${record.entityId}"][data-cms-target="field:${field}"]`,
	);

afterEach(cleanup);

beforeEach(() => {
	state.me = null;
	state.saved = [];
	state.conflict = false;
	localStorage.clear();
	setHint(false);
});

describe("the fields a page and a post carry", () => {
	it("marks every field the payload holds the source of, and only those", () => {
		for (const record of [page(), post()]) {
			const { container } = render(<Probe record={record} />);
			const marked = markersOf(container, record);

			expect(marked).toEqual(
				Object.keys(record.fields).map((f) => `field:${f}`),
			);
			for (const target of marked) {
				const parsed = parseFieldTarget(target);
				expect(parsed.kind).toBe("field");
				expect(record.fields[(parsed as { field: string }).field]).toBeTypeOf(
					"string",
				);
			}
			cleanup();
		}
	});

	it("opens a box on each of them and on nothing else", async () => {
		signIn(["pages", "posts"]);
		for (const record of [page(), post()]) {
			const { container } = await editing(record);
			const opens: string[] = [];
			for (const target of markersOf(container, record)) {
				click(container, `[data-cms-target="${target}"]`);
				const box = screen.queryByRole("textbox");
				if (!box) continue;
				opens.push(target);
				fireEvent.keyDown(box, { key: "Escape" });
			}
			expect(opens).toEqual(Object.keys(record.fields).map((f) => `field:${f}`));

			// the row a listing drew belongs to that record, not to this page
			click(
				container,
				`[data-cms-entity-id="${LISTED_POST_ID}"][data-cms-target="field:title"]`,
			);
			expect(screen.queryByRole("textbox")).toBeNull();
			cleanup();
			// the switch remembers itself, and the next render would toggle it off
			localStorage.clear();
		}
	});

	it("marks an album's title without offering to edit it", async () => {
		signIn(["pages", "posts"]);
		// an album's rows are a post's, but its fields are a later job
		const album: PageRecord = {
			entity: "post",
			entityId: 10,
			fields: {},
			fallback: [],
			updatedAt: null,
		};
		const { container } = await editing(album);
		const h1 = container.querySelector("h1[data-cms-target]");

		expect(h1?.getAttribute("data-cms-target")).toBe("field:title");
		expect(h1?.getAttribute("tabindex")).toBeNull();
		expect(container.querySelector("style")).toBeNull();
		clickField(container, album, "title");
		expect(screen.queryByRole("textbox")).toBeNull();
	});
});

describe("editing a page's own text on the page it is printed on", () => {
	it("offers nothing to a visitor, and nothing to an admin without the entity", async () => {
		const { container } = render(<Probe record={page()} />);
		expect(container.querySelector("style")).toBeNull();
		clickField(container, page(), "title");
		expect(screen.queryByRole("textbox")).toBeNull();

		cleanup();
		// pages, on a post: the same refusal the server makes for the other router
		signIn(["pages"]);
		const view = await editing(post());
		expect(view.container.querySelector("style")).toBeNull();
		clickField(view.container, post(), "title");
		expect(screen.queryByRole("textbox")).toBeNull();
	});

	it("saves a page title against the version the payload carried", async () => {
		signIn(["pages"]);
		const record = page();
		const { container } = await editing(record);
		clickField(container, record, "title");

		const box = screen.getByRole("textbox") as HTMLInputElement;
		expect(box.value).toBe("International Days");
		fireEvent.change(box, { target: { value: "International Days 2026" } });
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() =>
			expect(state.saved).toEqual([
				{
					entity: "page",
					entityId: PAGE_ID,
					lang: "en",
					target: "field:title",
					value: "International Days 2026",
					expectedUpdatedAt: PAGE_LOADED_AT,
				},
			]),
		);
	});

	it("saves a post title against the post's own version", async () => {
		signIn(["posts"]);
		const record = post();
		const { container } = await editing(record);
		clickField(container, record, "title");
		fireEvent.change(screen.getByRole("textbox"), {
			target: { value: "Kang Meas opens its library" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() =>
			expect(state.saved).toEqual([
				{
					entity: "post",
					entityId: POST_ID,
					lang: "en",
					target: "field:title",
					value: "Kang Meas opens its library",
					expectedUpdatedAt: POST_LOADED_AT,
				},
			]),
		);
	});

	it("edits the stored body, not the html on screen", async () => {
		signIn(["pages"]);
		const record = page();
		const { container } = await editing(record);
		const node = clickField(container, record, "body");

		expect(node.textContent).toBe("Global observances.");
		const box = screen.getByRole("textbox") as HTMLTextAreaElement;
		expect(box.tagName).toBe("TEXTAREA");
		expect(box.value).toBe(BODY_SOURCE);
	});

	it("opens empty and quotes English where the field fell back", async () => {
		signIn(["pages"]);
		const record = page({ i18nFallback: ["excerpt"] });
		const { container } = await editing(record, "km");
		clickField(container, record, "excerpt");

		expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
		expect(screen.getByText(/showing “Global observances/)).toBeTruthy();

		fireEvent.change(screen.getByRole("textbox"), {
			target: { value: "ទិវាអន្តរជាតិ" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save" }));
		await waitFor(() =>
			expect(state.saved[0]).toMatchObject({
				entity: "page",
				lang: "km",
				target: "field:excerpt",
				value: "ទិវាអន្តរជាតិ",
			}),
		);
	});

	it("says so when someone else changed the post first", async () => {
		signIn(["posts"]);
		const record = post();
		const { container } = await editing(record);
		clickField(container, record, "title");
		state.conflict = true;
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(
			await screen.findByText(/Someone else changed this record/),
		).toBeTruthy();
	});
});
