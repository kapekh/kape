import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// each case runs in a Bun subprocess: bun:sqlite is a Bun builtin
const dir = mkdtempSync(join(tmpdir(), "updatefield-"));
const dbPath = join(dir, "updatefield.db");
const root = process.cwd();

afterAll(() => rmSync(dir, { recursive: true, force: true }));

execFileSync("bun", ["src/server/install.ts"], {
	env: {
		...process.env,
		DATABASE_PATH: dbPath,
		SITE_NAME: "Test Org",
		ADMIN_EMAIL: "owner@test.example",
		ADMIN_PASSWORD: "test-install-password",
		SSG_CACHE: "off",
	},
	encoding: "utf8",
});

/** Run one snippet against the installed database; `body` returns the JSON result. */
function run<T>(body: string): T {
	const out = execFileSync(
		"bun",
		[
			"-e",
			`import { db } from "${root}/src/server/db.ts";
			 import * as admin from "${root}/src/server/repo/admin.ts";
			 import { getPageBySlug } from "${root}/src/server/repo/content.ts";
			 import * as people from "${root}/src/server/repo/people.ts";
			 db.$client
				.query("insert or ignore into languages (code, name, native_name, is_default, enabled, rtl, sort) values ('km','Khmer','ខ្មែរ',0,1,0,1)")
				.run();
			 const rows = (id) =>
				db.$client
					.query("select id, lang, field, value from translations where entity_type = 'page' and entity_id = ? order by lang, field")
					.all(id);
			 const sections = (id) =>
				JSON.parse(db.$client.query("select sections from pages where id = ?").get(id).sections);
			 const refusal = async (p) => {
				try { await p; return ""; } catch (e) { return e.message; }
			 };
			 /** A page with two languages of rows, a hero and a cards repeater, both overlaid in Khmer. */
			 const fixture = async (segment) =>
				admin.createPage(db, {
					slug: "",
					segment,
					parentId: null,
					status: "published",
					coverMediaId: null,
					sections: [
						{
							id: "hero",
							type: "hero",
							layout: "banner",
							props: {
								title: "Our work",
								lead: "What we do",
								image: "/uploads/hero.jpg",
								i18n: { km: { title: "ការងាររបស់យើង" } },
							},
						},
						{
							id: "b0",
							type: "cards",
							layout: "cols-2",
							props: {
								title: "Pillars",
								items: [
									{ title: "One", body: "First", image: "/uploads/a.jpg" },
									{ title: "Two", body: "Second" },
								],
								i18n: {
									km: {
										title: "សសរស្តម្ភ",
										items: [
											{ title: "មួយ", body: "ទីមួយ", image: "/uploads/a.jpg" },
											{ title: "ពីរ", body: "ទីពីរ" },
										],
									},
								},
							},
						},
					],
					translations: [
						{ lang: "en", title: "Fixture", excerpt: "En excerpt", body: "En body" },
						{ lang: "km", title: "ចំណងជើង", excerpt: "សេចក្តីសង្ខេប", body: "តួអត្ថបទ" },
					],
				});
			 const result = await (async () => { ${body} })();
			 console.log(JSON.stringify(result));
			 process.exit(0);`,
		],
		{
			env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
			encoding: "utf8",
		},
	);
	return JSON.parse(out.trim().split("\n").at(-1) ?? "null") as T;
}

type Row = { id: number; lang: string; field: string; value: string };

describe("updateField, field: targets", () => {
	it("writes one row and leaves every other row byte for byte", () => {
		const seen = run<{ before: Row[]; after: Row[] }>(`
			const id = await fixture("j03-untouched");
			const before = rows(id);
			await admin.updateField(db, {
				entity: "page", entityId: id, lang: "km",
				target: "field:title", value: "ចំណងជើងថ្មី",
			});
			return { before, after: rows(id) };
		`);
		expect(seen.after).toHaveLength(seen.before.length);
		const changed = seen.after.filter(
			(r, i) => r.value !== seen.before[i].value,
		);
		expect(changed).toEqual([
			{
				id: changed[0]?.id,
				lang: "km",
				field: "title",
				value: "ចំណងជើងថ្មី",
			},
		]);
		// same rows, same ids: the row was updated in place, not deleted and reinserted
		expect(seen.after.map((r) => [r.id, r.lang, r.field])).toEqual(
			seen.before.map((r) => [r.id, r.lang, r.field]),
		);
	});

	it("clears by removing the row, as the wholesale path stores no empty value", () => {
		const seen = run<{ before: Row[]; after: Row[] }>(`
			const id = await fixture("j03-clear");
			const before = rows(id);
			await admin.updateField(db, {
				entity: "page", entityId: id, lang: "km",
				target: "field:excerpt", value: "   ",
			});
			return { before, after: rows(id) };
		`);
		expect(
			seen.before.some((r) => r.lang === "km" && r.field === "excerpt"),
		).toBe(true);
		expect(
			seen.after.some((r) => r.lang === "km" && r.field === "excerpt"),
		).toBe(false);
		expect(seen.after).toHaveLength(seen.before.length - 1);
	});

	it("refuses a field the entity does not translate, writing nothing", () => {
		const seen = run<{ refused: string; count: number; before: number }>(`
			const id = await fixture("j03-unknown-field");
			const before = rows(id).length;
			const refused = await refusal(admin.updateField(db, {
				entity: "page", entityId: id, lang: "en",
				target: "field:author", value: "Someone",
			}));
			return { refused, count: rows(id).length, before };
		`);
		expect(seen.refused).toContain("author");
		expect(seen.count).toBe(seen.before);
	});
});

describe("updateField, section targets", () => {
	it("writes a section prop in the default language and leaves the overlay alone", () => {
		const seen = run<{ hero: Record<string, unknown>; rendered: string }>(`
			const id = await fixture("j03-section-prop");
			await admin.updateField(db, {
				entity: "page", entityId: id, lang: "en",
				target: "section:hero:props.title", value: "Our work, renamed",
			});
			const page = await getPageBySlug(db, "j03-section-prop", "en");
			return {
				hero: sections(id)[0].props,
				rendered: page.sections[0].props.title,
			};
		`);
		expect(seen.hero.title).toBe("Our work, renamed");
		expect(seen.hero.i18n).toEqual({ km: { title: "ការងាររបស់យើង" } });
		expect(seen.hero.image).toBe("/uploads/hero.jpg");
		expect(seen.rendered).toBe("Our work, renamed");
	});

	it("writes a non-default language into the overlay, not over the default text", () => {
		const seen = run<{
			hero: Record<string, unknown>;
			km: string;
			en: string;
		}>(`
			const id = await fixture("j03-section-overlay");
			await admin.updateField(db, {
				entity: "page", entityId: id, lang: "km",
				target: "section:hero:props.lead", value: "អ្វីដែលយើងធ្វើ",
			});
			const kmPage = await getPageBySlug(db, "j03-section-overlay", "km");
			const enPage = await getPageBySlug(db, "j03-section-overlay", "en");
			return {
				hero: sections(id)[0].props,
				km: kmPage.sections[0].props.lead,
				en: enPage.sections[0].props.lead,
			};
		`);
		expect(seen.hero.lead).toBe("What we do");
		expect(seen.hero.i18n).toEqual({
			km: { title: "ការងាររបស់យើង", lead: "អ្វីដែលយើងធ្វើ" },
		});
		expect(seen.km).toBe("អ្វីដែលយើងធ្វើ");
		expect(seen.en).toBe("What we do");
	});

	it("writes a background to the shared props whatever language is showing", () => {
		const seen = run<{ b0: Record<string, unknown>; km: string; en: string }>(`
			const id = await fixture("j03-section-tone");
			await admin.updateField(db, {
				entity: "page", entityId: id, lang: "km",
				target: "section:b0:props.tone", value: "primary",
			});
			const kmPage = await getPageBySlug(db, "j03-section-tone", "km");
			const enPage = await getPageBySlug(db, "j03-section-tone", "en");
			return {
				b0: sections(id)[1].props,
				km: kmPage.sections[1].props.tone,
				en: enPage.sections[1].props.tone,
			};
		`);
		expect(seen.b0.tone).toBe("primary");
		// a choice is one value for the site: it never lands in the overlay
		expect(seen.b0.i18n).toMatchObject({ km: { title: "សសរស្តម្ភ" } });
		expect(
			(seen.b0.i18n as Record<string, Record<string, unknown>>).km.tone,
		).toBeUndefined();
		expect(seen.km).toBe("primary");
		expect(seen.en).toBe("primary");
	});

	it("clears a background back to the default by dropping the key", () => {
		const seen = run<Record<string, unknown>>(`
			const id = await fixture("j03-section-tone-clear");
			await admin.updateField(db, {
				entity: "page", entityId: id, lang: "en",
				target: "section:b0:props.tone", value: "muted",
			});
			await admin.updateField(db, {
				entity: "page", entityId: id, lang: "en",
				target: "section:b0:props.tone", value: "",
			});
			return sections(id)[1].props;
		`);
		expect("tone" in seen).toBe(false);
	});

	it("refuses a background the section does not offer, writing nothing", () => {
		const seen = run<{ refused: string; props: Record<string, unknown> }>(`
			const id = await fixture("j03-section-tone-bad");
			const refused = await refusal(admin.updateField(db, {
				entity: "page", entityId: id, lang: "en",
				target: "section:b0:props.tone", value: "neon",
			}));
			return { refused, props: sections(id)[1].props };
		`);
		expect(seen.refused).toContain("neon");
		expect("tone" in seen.props).toBe(false);
	});

	it("stores an editor's own background colour, shared across languages", () => {
		const seen = run<{ props: Record<string, unknown>; km: string }>(`
			const id = await fixture("j03-section-colour");
			await admin.updateField(db, {
				entity: "page", entityId: id, lang: "km",
				target: "section:b0:props.toneColor", value: "#2e7d32",
			});
			const kmPage = await getPageBySlug(db, "j03-section-colour", "km");
			return { props: sections(id)[1].props, km: kmPage.sections[1].props.toneColor };
		`);
		expect(seen.props.toneColor).toBe("#2e7d32");
		expect(seen.km).toBe("#2e7d32");
	});

	it("refuses a background colour CSS cannot parse, writing nothing", () => {
		const seen = run<{ refused: string; props: Record<string, unknown> }>(`
			const id = await fixture("j03-section-colour-bad");
			const refused = await refusal(admin.updateField(db, {
				entity: "page", entityId: id, lang: "en",
				target: "section:b0:props.toneColor", value: "red; } body { display:none",
			}));
			return { refused, props: sections(id)[1].props };
		`);
		expect(seen.refused).toMatch(/could end the style rule/);
		expect("toneColor" in seen.props).toBe(false);
	});

	it("blanking a translated section field falls the language back to the default", () => {
		const seen = run<{ i18n: unknown; km: string }>(`
			const id = await fixture("j03-section-fallback");
			await admin.updateField(db, {
				entity: "page", entityId: id, lang: "km",
				target: "section:hero:props.title", value: "",
			});
			const kmPage = await getPageBySlug(db, "j03-section-fallback", "km");
			return { i18n: sections(id)[0].props.i18n, km: kmPage.sections[0].props.title };
		`);
		expect(seen.i18n).toBeUndefined();
		expect(seen.km).toBe("Our work");
	});

	it("writes one repeater item and leaves its siblings and shared keys intact", () => {
		const seen = run<{ items: Record<string, unknown>[]; rendered: string }>(`
			const id = await fixture("j03-item");
			await admin.updateField(db, {
				entity: "page", entityId: id, lang: "en",
				target: "section:b0:props.items[1].body", value: "Second, rewritten",
			});
			const page = await getPageBySlug(db, "j03-item", "en");
			return {
				items: sections(id)[1].props.items,
				rendered: page.sections[1].props.items[1].body,
			};
		`);
		expect(seen.items).toEqual([
			{ title: "One", body: "First", image: "/uploads/a.jpg" },
			{ title: "Two", body: "Second, rewritten" },
		]);
		expect(seen.rendered).toBe("Second, rewritten");
	});

	it("edits a translated repeater item through the whole-array overlay", () => {
		const seen = run<{
			overlay: Record<string, unknown>[];
			shared: Record<string, unknown>[];
			km: string;
		}>(`
			const id = await fixture("j03-item-km");
			await admin.updateField(db, {
				entity: "page", entityId: id, lang: "km",
				target: "section:b0:props.items[0].title", value: "មួយថ្មី",
			});
			const kmPage = await getPageBySlug(db, "j03-item-km", "km");
			const props = sections(id)[1].props;
			return {
				overlay: props.i18n.km.items,
				shared: props.items,
				km: kmPage.sections[1].props.items[0].title,
			};
		`);
		expect(seen.overlay[0].title).toBe("មួយថ្មី");
		expect(seen.overlay[1]).toEqual({ title: "ពីរ", body: "ទីពីរ" });
		expect(seen.shared[0]).toEqual({
			title: "One",
			body: "First",
			image: "/uploads/a.jpg",
		});
		expect(seen.km).toBe("មួយថ្មី");
	});
});

describe("updateField refusals", () => {
	it("refuses an address that does not parse, and writes nothing", () => {
		const seen = run<{ refused: string[]; before: unknown; after: unknown }>(`
			const id = await fixture("j03-bad-target");
			const before = { rows: rows(id).length, sections: JSON.stringify(sections(id)) };
			const refused = [];
			for (const target of ["title", "section:hero:title", "section:hero:props.title[0]", "field:", "section:he ro:props.title"]) {
				refused.push(await refusal(admin.updateField(db, {
					entity: "page", entityId: id, lang: "en", target, value: "x",
				})));
			}
			return { refused, before, after: { rows: rows(id).length, sections: JSON.stringify(sections(id)) } };
		`);
		for (const message of seen.refused)
			expect(message).toContain("is not a field address");
		expect(seen.after).toEqual(seen.before);
	});

	it("refuses a section id the page does not carry, and writes nothing", () => {
		const seen = run<{ refused: string; before: string; after: string }>(`
			const id = await fixture("j03-no-section");
			const before = JSON.stringify(sections(id));
			const refused = await refusal(admin.updateField(db, {
				entity: "page", entityId: id, lang: "en",
				target: "section:nope:props.title", value: "x",
			}));
			return { refused, before, after: JSON.stringify(sections(id)) };
		`);
		expect(seen.refused).toContain('No section "nope"');
		expect(seen.after).toBe(seen.before);
	});

	it("refuses a prop the section does not offer as translatable text", () => {
		const seen = run<{ href: string; refused: string }>(`
			const id = await fixture("j03-not-text");
			const refused = await refusal(admin.updateField(db, {
				entity: "page", entityId: id, lang: "en",
				target: "section:hero:props.ctaHref", value: "/somewhere",
			}));
			return { refused, href: sections(id)[0].props.ctaHref ?? "" };
		`);
		expect(seen.refused).toContain("not translatable text");
		expect(seen.href).toBe("");
	});

	it("writes an image to the shared props whatever language is showing", () => {
		const seen = run<{
			hero: Record<string, unknown>;
			km: string;
			en: string;
		}>(`
			const id = await fixture("j03-section-image");
			await admin.updateField(db, {
				entity: "page", entityId: id, lang: "km",
				target: "section:hero:props.image", value: "/uploads/new-hero.jpg",
			});
			const kmPage = await getPageBySlug(db, "j03-section-image", "km");
			const enPage = await getPageBySlug(db, "j03-section-image", "en");
			return {
				hero: sections(id)[0].props,
				km: kmPage.sections[0].props.image,
				en: enPage.sections[0].props.image,
			};
		`);
		expect(seen.hero.image).toBe("/uploads/new-hero.jpg");
		// one file for every reader: it never lands in the overlay
		expect(seen.hero.i18n).toEqual({ km: { title: "ការងាររបស់យើង" } });
		expect(seen.km).toBe("/uploads/new-hero.jpg");
		expect(seen.en).toBe("/uploads/new-hero.jpg");
	});

	it("writes a repeater item's image to the shared array, not the overlay", () => {
		const seen = run<{
			items: Record<string, unknown>[];
			overlay: Record<string, unknown>[];
		}>(`
			const id = await fixture("j03-item-image");
			await admin.updateField(db, {
				entity: "page", entityId: id, lang: "km",
				target: "section:b0:props.items[0].image", value: "/uploads/swapped.jpg",
			});
			const props = sections(id)[1].props;
			return { items: props.items, overlay: props.i18n.km.items };
		`);
		expect(seen.items[0].image).toBe("/uploads/swapped.jpg");
		expect(seen.items[0].title).toBe("One");
		expect(seen.overlay[0].title).toBe("មួយ");
		expect(seen.overlay[0].image).toBe("/uploads/a.jpg");
	});

	it("clears an image by dropping the key", () => {
		const seen = run<Record<string, unknown>>(`
			const id = await fixture("j03-image-clear");
			await admin.updateField(db, {
				entity: "page", entityId: id, lang: "en",
				target: "section:hero:props.image", value: "",
			});
			return sections(id)[0].props;
		`);
		expect("image" in seen).toBe(false);
	});

	it("refuses anything that is not an image address, writing nothing", () => {
		const seen = run<{ refused: string[]; image: string }>(`
			const id = await fixture("j03-image-junk");
			const refused = [];
			for (const value of ["javascript:alert(1)", "//evil.example/x.jpg", "uploads/x.jpg"])
				refused.push(await refusal(admin.updateField(db, {
					entity: "page", entityId: id, lang: "en",
					target: "section:hero:props.image", value,
				})));
			return { refused, image: sections(id)[0].props.image };
		`);
		for (const why of seen.refused)
			expect(why).toContain("not an image address");
		expect(seen.image).toBe("/uploads/hero.jpg");
	});

	it("refuses an item index past the end of the repeater", () => {
		const seen = run<{ refused: string; count: number }>(`
			const id = await fixture("j03-item-range");
			const refused = await refusal(admin.updateField(db, {
				entity: "page", entityId: id, lang: "en",
				target: "section:b0:props.items[7].title", value: "x",
			}));
			return { refused, count: sections(id)[1].props.items.length };
		`);
		expect(seen.refused).toContain("past the end");
		expect(seen.count).toBe(2);
	});

	it("refuses a language this site does not have", () => {
		const seen = run<{ refused: string; count: number }>(`
			const id = await fixture("j03-bad-lang");
			const refused = await refusal(admin.updateField(db, {
				entity: "page", entityId: id, lang: "fr",
				target: "field:title", value: "Titre",
			}));
			return { refused, count: rows(id).length };
		`);
		expect(seen.refused).toContain("fr");
		expect(seen.count).toBe(6);
	});
});

describe("updateField conflict refusal", () => {
	it("refuses the second write carrying the version the first one replaced", () => {
		const seen = run<{
			first: unknown;
			second: string;
			value: string;
			count: number;
		}>(`
			const id = await fixture("j03-stale");
			const loaded = (await admin.getPageForEdit(db, id)).updatedAt;
			const first = await admin.updateField(db, {
				entity: "page", entityId: id, lang: "en",
				target: "field:title", value: "First writer",
				expectedUpdatedAt: loaded,
			});
			const second = await refusal(admin.updateField(db, {
				entity: "page", entityId: id, lang: "en",
				target: "field:title", value: "Second writer",
				expectedUpdatedAt: loaded,
			}));
			const row = rows(id).find((r) => r.lang === "en" && r.field === "title");
			return { first, second, value: row.value, count: rows(id).length };
		`);
		expect(seen.first).toMatchObject({ wrote: "translation", cleared: false });
		expect(seen.second).toBe("CONFLICT");
		expect(seen.value).toBe("First writer");
		expect(seen.count).toBe(6);
	});

	it("refuses a stale section write, leaving the sections as the first writer left them", () => {
		const seen = run<{ second: string; title: string }>(`
			const id = await fixture("j03-stale-section");
			const loaded = (await admin.getPageForEdit(db, id)).updatedAt;
			await admin.updateField(db, {
				entity: "page", entityId: id, lang: "en",
				target: "section:hero:props.title", value: "First writer",
				expectedUpdatedAt: loaded,
			});
			const second = await refusal(admin.updateField(db, {
				entity: "page", entityId: id, lang: "en",
				target: "section:hero:props.title", value: "Second writer",
				expectedUpdatedAt: loaded,
			}));
			return { second, title: sections(id)[0].props.title };
		`);
		expect(seen.second).toBe("CONFLICT");
		expect(seen.title).toBe("First writer");
	});
});

describe("updateField across entities", () => {
	it("writes a post field without touching the page rows", () => {
		const seen = run<{ post: unknown[]; result: unknown }>(`
			const postId = await admin.createPost(db, {
				contentType: "news",
				slug: "j03-post",
				status: "published",
				translations: [
					{ lang: "en", title: "En title", excerpt: "", body: "En body" },
					{ lang: "km", title: "ចំណងជើង", excerpt: "", body: "តួ" },
				],
			});
			const result = await admin.updateField(db, {
				entity: "post", entityId: postId, lang: "km",
				target: "field:title", value: "ចំណងជើងថ្មី",
			});
			const post = db.$client
				.query("select lang, field, value from translations where entity_type = 'post' and entity_id = ? order by lang, field")
				.all(postId);
			return { post, result };
		`);
		expect(seen.post).toEqual([
			{ lang: "en", field: "body", value: "En body" },
			{ lang: "en", field: "title", value: "En title" },
			{ lang: "km", field: "body", value: "តួ" },
			{ lang: "km", field: "title", value: "ចំណងជើងថ្មី" },
		]);
		expect(seen.result).toMatchObject({ wrote: "translation" });
	});

	it("refuses a section target on an entity that carries no sections", () => {
		const seen = run<string>(`
			const postId = await admin.createPost(db, {
				contentType: "news", slug: "j03-post-sections", status: "published",
				translations: [{ lang: "en", title: "T", excerpt: "", body: "B" }],
			});
			return refusal(admin.updateField(db, {
				entity: "post", entityId: postId, lang: "en",
				target: "section:hero:props.title", value: "x",
			}));
		`);
		expect(seen).toContain("Only a page carries sections");
	});

	it("refuses a compare-and-swap against a table with no version column", () => {
		const seen = run<{ refused: string; written: unknown }>(`
			const projectId = await admin.createProject(db, {
				code: "J03", slug: "j03-project", status: "current",
				startDate: "", endDate: "", targetAreas: [], snapshots: [],
				sort: 0, donorIds: [], locations: [],
				translations: [{ lang: "en", name: "Name", summary: "Sum", body: "Body" }],
			});
			const refused = await refusal(admin.updateField(db, {
				entity: "project", entityId: projectId, lang: "en",
				target: "field:name", value: "Renamed",
				expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
			}));
			const written = await admin.updateField(db, {
				entity: "project", entityId: projectId, lang: "en",
				target: "field:name", value: "Renamed",
			});
			return { refused, written };
		`);
		expect(seen.refused).toContain("no version column");
		expect(seen.written).toMatchObject({
			wrote: "translation",
			updatedAt: null,
		});
	});

	it("writes a person's name to the column for that language, and refuses to empty the default one", () => {
		const seen = run<{
			km: { name_en: string; name_km: string | null; position: string | null };
			en: { name_en: string; name_km: string | null; position: string | null };
			refused: string;
			rows: unknown[];
		}>(`
			const personId = await people.createPerson(db, {
				nameEn: "Sok Dara", nameKm: null, position: "Teacher", tier: "staff",
				isPublic: true, slug: "sok-dara", photoMediaId: null, staffNo: null,
				sex: null, phone: null, email: null, program: null, sort: 0,
				bio: { en: "", km: "" },
			});
			const row = () => db.$client
				.query("select name_en, name_km, position from people where id = ?")
				.get(personId);
			await admin.updateField(db, {
				entity: "person", entityId: personId, lang: "km",
				target: "field:name", value: "សុខ ដារ៉ា",
			});
			const km = row();
			await admin.updateField(db, {
				entity: "person", entityId: personId, lang: "en",
				target: "field:position", value: "Head teacher",
			});
			const en = row();
			const refused = await refusal(admin.updateField(db, {
				entity: "person", entityId: personId, lang: "en",
				target: "field:name", value: "   ",
			}));
			const rows = db.$client
				.query("select field, lang from translations where entity_type = 'person' and entity_id = ?")
				.all(personId);
			return { km, en, refused, rows };
		`);
		// the Khmer name lands in its own column, and neither name is a translations row
		expect(seen.km).toMatchObject({ name_en: "Sok Dara", name_km: "សុខ ដារ៉ា" });
		expect(seen.en).toMatchObject({ position: "Head teacher" });
		expect(seen.rows).toEqual([]);
		expect(seen.refused).toContain("needs a name in the default language");
	});

	it("refuses a name in a language people has no column for", () => {
		const seen = run<{ refused: string; row: { name_en: string } }>(`
			db.$client
				.query("insert or ignore into languages (code, name, native_name, is_default, enabled, rtl, sort) values ('fr','French','Français',0,1,0,2)")
				.run();
			const personId = await people.createPerson(db, {
				nameEn: "Mao Sy", nameKm: null, position: null, tier: "staff",
				isPublic: true, slug: "mao-sy", photoMediaId: null, staffNo: null,
				sex: null, phone: null, email: null, program: null, sort: 0,
				bio: { en: "", km: "" },
			});
			const refused = await refusal(admin.updateField(db, {
				entity: "person", entityId: personId, lang: "fr",
				target: "field:name", value: "Mao Sy",
			}));
			const row = db.$client
				.query("select name_en from people where id = ?")
				.get(personId);
			return { refused, row };
		`);
		expect(seen.refused).toContain('there is none for "fr"');
		expect(seen.row).toMatchObject({ name_en: "Mao Sy" });
	});
});
