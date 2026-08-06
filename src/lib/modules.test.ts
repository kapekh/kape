import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
	adminPathEnabled,
	CORE_NAV_PATHS,
	CORE_ROUTERS,
	disallowedSections,
	moduleForAdminPath,
	MODULES,
	MODULES_SETTING,
	routerEnabled,
	sectionsFor,
	serializeModules,
	sourceEnabled,
	taxonomyEnabled,
	visibleAreas,
} from "./modules";
import { NAV_AREA, ROUTER_AREA } from "./permissions";
import { SECTION_DEFS, type SectionNode } from "./sections";

const set = (...ids: string[]) => ({ [MODULES_SETTING]: ids.join(",") });
const ALL = set(...MODULES.map((m) => m.id));
/** An install that answered "none of them". */
const NONE = { [MODULES_SETTING]: "" };
/** A database from before the setting existed. */
const LEGACY = {};

const areaKeys = (s: Record<string, string>) =>
	visibleAreas(s).map((a) => a.key);
const areaLabel = (s: Record<string, string>, key: string) =>
	visibleAreas(s).find((a) => a.key === key)?.label;
const sectionTypes = (s: Record<string, string>) =>
	sectionsFor(s).map((d) => d.type);

describe("module table points at things that exist", () => {
	it("names a router key the tRPC gate knows", () => {
		for (const m of MODULES)
			for (const r of m.routers) expect(ROUTER_AREA).toHaveProperty(r);
	});

	it("names an admin path the permission map knows", () => {
		for (const m of MODULES)
			for (const p of m.navPaths) expect(NAV_AREA).toHaveProperty(p);
	});

	it("names a query source some section actually offers", () => {
		const offered = new Set(
			SECTION_DEFS.flatMap((d) => d.sources ?? []).map((s) => s.value),
		);
		for (const m of MODULES)
			for (const src of m.sources) expect([...offered]).toContain(src);
	});

	it("gives each router, path and source to at most one module", () => {
		const seen = new Set<string>();
		for (const m of MODULES)
			for (const key of [...m.routers, ...m.navPaths, ...m.sources]) {
				expect(seen.has(key), `${key} claimed twice`).toBe(false);
				seen.add(key);
			}
	});

	it("suffixes an area that exists", () => {
		for (const m of MODULES)
			if (m.areaSuffix)
				expect(Object.values(ROUTER_AREA)).toContain(m.areaSuffix.area);
	});
});

/**
 * The drift that will actually happen is a *new* domain feature: an `alumni` area,
 * an `adminAlumni` router, an `/admin/alumni` screen, and nobody remembering to add
 * a MODULES entry. Every check above passes in that world, and the feature ships
 * switched on for every install. These two are the reverse direction.
 */
describe("every area key is claimed, by a module or by the core", () => {
	const claimedRouters = new Set(MODULES.flatMap((m) => m.routers));
	const claimedPaths = new Set(MODULES.flatMap((m) => m.navPaths));

	it("every tRPC router is core or owned", () => {
		const orphans = Object.keys(ROUTER_AREA).filter(
			(k) => !claimedRouters.has(k) && !CORE_ROUTERS.includes(k),
		);
		expect(orphans, "add to MODULES or to CORE_ROUTERS").toEqual([]);
	});

	it("every admin path is core or owned", () => {
		const orphans = Object.keys(NAV_AREA).filter(
			(k) => !claimedPaths.has(k) && !CORE_NAV_PATHS.includes(k),
		);
		expect(orphans, "add to MODULES or to CORE_NAV_PATHS").toEqual([]);
	});

	it("nothing is both core and owned", () => {
		expect(CORE_ROUTERS.filter((k) => claimedRouters.has(k))).toEqual([]);
		expect(CORE_NAV_PATHS.filter((k) => claimedPaths.has(k))).toEqual([]);
	});

	it("the core lists name nothing that has gone away", () => {
		for (const k of CORE_ROUTERS)
			expect(ROUTER_AREA, `${k} is no longer a router`).toHaveProperty(k);
		for (const p of CORE_NAV_PATHS)
			expect(NAV_AREA, `${p} is no longer a screen`).toHaveProperty(p);
	});
});

describe("a missing setting means legacy, not none", () => {
	it("keeps every module on a database that predates the setting", () => {
		expect(sectionTypes(LEGACY).sort()).toEqual(
			SECTION_DEFS.map((d) => d.type).sort(),
		);
		for (const m of MODULES)
			for (const p of m.navPaths)
				expect(adminPathEnabled(LEGACY, p), p).toBe(true);
		for (const m of MODULES)
			for (const r of m.routers) expect(routerEnabled(LEGACY, r), r).toBe(true);
	});

	it("distinguishes an empty answer from no answer", () => {
		expect(adminPathEnabled(LEGACY, "/admin/schools")).toBe(true);
		expect(adminPathEnabled(NONE, "/admin/schools")).toBe(false);
	});

	it("ignores an unknown id without falling back to legacy", () => {
		expect(adminPathEnabled(set("kitchen-sink"), "/admin/schools")).toBe(false);
	});
});

describe("a disabled module contributes nothing", () => {
	const off = set("projects");

	it("no nav entry", () => {
		expect(adminPathEnabled(off, "/admin/schools")).toBe(false);
		expect(adminPathEnabled(off, "/admin/schools/12")).toBe(false);
		expect(adminPathEnabled(off, "/admin/projects")).toBe(true);
	});

	it("no permission area", () => {
		expect(areaKeys(off)).not.toContain("schools");
		expect(areaKeys(off)).toContain("projects");
	});

	it("no catalogue section", () => {
		expect(sectionTypes(off)).not.toContain("orgChart");
		expect(sectionTypes(off)).toContain("projectList");
	});

	it("no tRPC router", () => {
		expect(routerEnabled(off, "adminSchools")).toBe(false);
		expect(routerEnabled(off, "adminProjects")).toBe(true);
	});

	it("no taxonomy of its own, though the terms router is core", () => {
		expect(routerEnabled(NONE, "adminTerms")).toBe(true);
		expect(taxonomyEnabled(NONE, "partner_category")).toBe(false);
		expect(taxonomyEnabled(set("partners"), "partner_category")).toBe(true);
		for (const t of ["location", "publication_category", "doc_category"])
			expect(taxonomyEnabled(NONE, t), t).toBe(true);
	});
});

describe("nothing generic is switched off with the domain", () => {
	it("keeps the core admin reachable with every module off", () => {
		for (const p of CORE_NAV_PATHS)
			expect(adminPathEnabled(NONE, p), p).toBe(true);
	});

	it("keeps the generic permission areas", () => {
		for (const a of [
			"pages",
			"posts",
			"media",
			"forms",
			"messages",
			"navigation",
			"lists",
			"settings",
			"users",
			"people",
		])
			expect(areaKeys(NONE), a).toContain(a);
	});

	it("drops only the domain areas", () => {
		for (const a of ["schools", "offices", "campaigns", "projects", "partners"])
			expect(areaKeys(NONE), a).not.toContain(a);
	});

	it("keeps post content types, which are content and not modules", () => {
		for (const t of [
			"postList",
			"videoGrid",
			"albumGrid",
			"publicationList",
			"people",
		])
			expect(sectionTypes(NONE), t).toContain(t);
		for (const src of ["posts", "videos", "albums", "publications", "people"])
			expect(sourceEnabled(NONE, src as never), src).toBe(true);
	});

	it("keeps every static section", () => {
		for (const d of SECTION_DEFS.filter((x) => x.kind === "static"))
			expect(sectionTypes(NONE), d.type).toContain(d.type);
	});
});

describe("areas shared by two modules survive either one", () => {
	it("partners covers the partner register and the donor register", () => {
		expect(areaKeys(set("partners"))).toContain("partners");
		expect(areaKeys(set("fundraising"))).toContain("partners");
		expect(areaKeys(NONE)).not.toContain("partners");
	});

	it("people survives because the team page is core", () => {
		expect(areaKeys(NONE)).toContain("people");
		expect(adminPathEnabled(NONE, "/admin/people")).toBe(true);
		expect(adminPathEnabled(NONE, "/admin/org-chart")).toBe(false);
	});

	it("says what the people tick actually grants", () => {
		expect(areaLabel(ALL, "people")).toBe("People & org chart");
		expect(areaLabel(NONE, "people")).toBe("People");
	});
});

describe("a section keeps the sources that still resolve", () => {
	const map = (s: Record<string, string>) =>
		sectionsFor(s).find((d) => d.type === "map");

	it("offers both pin sources when both modules are on", () => {
		expect(map(ALL)?.sources?.map((x) => x.value)).toEqual([
			"locations",
			"offices",
		]);
	});

	it("offers only offices when projects is off", () => {
		expect(map(set("offices"))?.sources?.map((x) => x.value)).toEqual([
			"offices",
		]);
	});

	it("leaves the catalogue when both are off", () => {
		expect(map(NONE)).toBeUndefined();
	});
});

/**
 * The picker draws buttons; `sections` reaches the database as free-form JSON from
 * the client, so this is the check that actually holds the line.
 */
describe("the saved envelope, not just the picker", () => {
	const node = (type: string, source?: string): SectionNode => ({
		id: "x",
		type,
		...(source ? { query: { source: source as never } } : {}),
	});

	it("refuses a hand-written section bound to a disabled module", () => {
		expect(
			disallowedSections(NONE, [node("projectList", "projects")]),
		).toHaveLength(1);
		expect(
			disallowedSections(NONE, [node("partners", "partners")]),
		).toHaveLength(1);
		expect(
			disallowedSections(NONE, [node("orgChart", "orgchart")]),
		).toHaveLength(1);
	});

	it("allows the same section once the module is on", () => {
		expect(disallowedSections(ALL, [node("projectList", "projects")])).toEqual(
			[],
		);
	});

	it("refuses a section type that is not in the catalogue", () => {
		expect(disallowedSections(ALL, [node("evalScript")])).toHaveLength(1);
	});

	it("refuses a source the section does not offer, module or no module", () => {
		expect(disallowedSections(ALL, [node("cards", "projects")])).toHaveLength(
			1,
		);
		expect(
			disallowedSections(ALL, [node("albumGrid", "donations" as never)]),
		).toHaveLength(1);
	});

	it("leaves generic content alone", () => {
		expect(
			disallowedSections(NONE, [
				node("richtext"),
				node("postList", "posts"),
				node("people", "people"),
				node("publicationList", "publications"),
			]),
		).toEqual([]);
	});

	it("keeps a page that already has the section editable", () => {
		const placed = [node("partners", "partners")];
		expect(disallowedSections(NONE, placed, placed)).toEqual([]);
	});

	it("still refuses a second one added to that same page", () => {
		const placed = [node("partners", "partners")];
		expect(
			disallowedSections(
				NONE,
				[...placed, node("projectList", "projects")],
				placed,
			),
		).toHaveLength(1);
	});
});

/**
 * Modules are independent checkboxes, so a school form offering projects to link
 * to is a screen from one module reading another's router. A disabled router
 * answers FORBIDDEN, which rejects the whole `Promise.all` and leaves the page on
 * "Loading…" for ever — a worse failure than the missing feature, and invisible to
 * any test that only tries all-on and all-off.
 *
 * So: an admin screen that reaches into another module has to ask first, and the
 * only way to ask is `useModules`.
 */
describe("no admin screen calls another module's router unguarded", () => {
	const owner = new Map<string, string>();
	for (const m of MODULES) for (const r of m.routers) owner.set(r, m.id);

	const routeDir = join(import.meta.dirname, "..", "routes");
	const files = readdirSync(routeDir).filter(
		(n) => n.startsWith("admin.") && n.endsWith(".tsx"),
	);

	it("has admin route files to check", () => {
		expect(files.length).toBeGreaterThan(20);
	});

	for (const file of files) {
		const src = readFileSync(join(routeDir, file), "utf8");
		const path = `/admin/${file
			.replace(/^admin\./, "")
			.replace(/\.tsx$/, "")
			.replace(/\.(index|new|\$\w+)$/, "")
			.replace(/\./g, "/")}`;
		const own = moduleForAdminPath(path)?.id;
		const cross = [
			...new Set(
				[...src.matchAll(/trpcClient\.(admin\w+)\./g)].map((m) => m[1]),
			),
		].filter((r) => owner.has(r) && owner.get(r) !== own);
		if (!cross.length) continue;

		it(`${file} guards ${cross.join(", ")}`, () => {
			expect(
				src.includes('from "#/components/admin/useModules"'),
				`${file} calls ${cross.join(", ")}, which belong to ${cross
					.map((r) => owner.get(r))
					.join(
						", ",
					)}. Wrap the call in useModules().list(...) so the screen still loads when that module is off.`,
			).toBe(true);
		});
	}
});

describe("the setting itself", () => {
	it("restores every module from the value the fixture writes", () => {
		expect(sectionTypes(ALL).sort()).toEqual(
			SECTION_DEFS.map((d) => d.type).sort(),
		);
		expect(areaKeys(ALL).sort()).toEqual(
			[...new Set(Object.values(ROUTER_AREA))].sort(),
		);
	});

	it("keeps a stable order however the ids arrive", () => {
		expect(serializeModules(["orgChart", "projects"])).toBe(
			"projects,orgChart",
		);
		expect(serializeModules([])).toBe("");
	});
});
