// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ADMIN_HINT_COOKIE } from "#/lib/admin-hint";
import { LanguageProvider } from "#/lib/i18n";
import { InlineEditProvider } from "#/lib/inline-edit";

const state = vi.hoisted(() => ({
	me: null as { permissions: string[]; isSuperAdmin: boolean } | null,
	saved: [] as Record<string, unknown>[],
	source: { value: "", fellBack: false },
}));

vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: {
		auth: { me: { query: () => Promise.resolve(state.me) } },
		adminPages: {
			richFieldSource: { query: () => Promise.resolve(state.source) },
			updateField: {
				mutate: (input: Record<string, unknown>) => {
					state.saved.push(input);
					return Promise.resolve({
						wrote: "translation",
						cleared: false,
						updatedAt: "2026-10-05T09:00:00Z",
					});
				},
			},
		},
	},
}));

// tiptap needs a real layout engine; the box stands in for its onChange
vi.mock("./admin/RichTextEditor", () => ({
	RichTextEditor: ({
		value,
		onChange,
	}: {
		value: string;
		onChange: (v: string) => void;
	}) => (
		<textarea
			aria-label="Rich text"
			value={value}
			onChange={(e) => onChange(e.target.value)}
		/>
	),
}));

import { InlineEditBar } from "./InlineEditBar";
import { InlineRichText } from "./InlineRichText";

const EN_DOC = '{"type":"doc","content":[]}';
const EDITED_DOC = '{"type":"doc","content":[{"type":"paragraph"}]}';

function Probe({ lang = "en" }: { lang?: string }) {
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
				<InlineRichText
					html="<p>Holiday table</p>"
					className="prose-body"
					entity="post"
					entityId={7}
					target="field:body"
					label="Body"
				/>
				<InlineEditBar />
			</InlineEditProvider>
		</LanguageProvider>
	);
}

const signIn = (permissions: string[]) => {
	state.me = { permissions, isSuperAdmin: false };
	// biome-ignore lint/suspicious/noDocumentCookie: the hint cookie is what gates the editor
	document.cookie = `${ADMIN_HINT_COOKIE}=1; Max-Age=60`;
};

async function switchOn(lang?: string) {
	render(<Probe lang={lang} />);
	fireEvent.click(await screen.findByLabelText(/edit this page/i));
}

beforeEach(() => {
	state.saved = [];
	state.source = { value: EN_DOC, fellBack: false };
	localStorage.clear();
});
afterEach(() => {
	cleanup();
	state.me = null;
	// biome-ignore lint/suspicious/noDocumentCookie: clears the hint between cases
	document.cookie = `${ADMIN_HINT_COOKIE}=; Max-Age=0`;
});

describe("rich text in place", () => {
	it("is plain text for a visitor", () => {
		render(<Probe />);
		expect(screen.getByText("Holiday table")).toBeTruthy();
		expect(screen.queryByRole("button", { name: /edit body/i })).toBeNull();
	});

	it("offers nothing to an editor without the record's area", async () => {
		signIn(["pages"]);
		await switchOn();
		expect(screen.queryByRole("button", { name: /edit body/i })).toBeNull();
	});

	it("saves the edited document to that one field in the page's language", async () => {
		signIn(["posts"]);
		await switchOn();
		fireEvent.click(screen.getByRole("button", { name: /edit body/i }));
		fireEvent.change(await screen.findByLabelText("Rich text"), {
			target: { value: EDITED_DOC },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save" }));
		await waitFor(() => expect(state.saved).toHaveLength(1));
		expect(state.saved[0]).toMatchObject({
			entity: "post",
			entityId: 7,
			lang: "en",
			target: "field:body",
			value: EDITED_DOC,
		});
	});

	it("never copies an untouched fallback into the other language", async () => {
		signIn(["posts"]);
		state.source = { value: EN_DOC, fellBack: true };
		await switchOn("km");
		fireEvent.click(screen.getByRole("button", { name: /edit body/i }));
		expect(await screen.findByText(/no ខ្មែរ text is stored/i)).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Save" }));
		await waitFor(() =>
			expect(screen.queryByLabelText("Rich text")).toBeNull(),
		);
		expect(state.saved).toEqual([]);
	});
});
