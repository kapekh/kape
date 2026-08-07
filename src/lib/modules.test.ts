import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
	adminPathEnabled,
	CORE_NAV_PATHS,
	CORE_ROUTERS,
	CORE_SOURCES,
	CORE_TAXONOMIES,
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

/**
 * The third axis, and the one that reaches the public site. A router or a nav path
 * nobody claims costs an operator a screen they should not have; a *source* nobody
 * claims is a section in the catalogue, placeable on a public page, reading a table
 * out of a feature this install never asked for.
 */
describe("every query source is claimed, by a module or by the core", () => {
	const claimed = new Set<string>(MODULES.flatMap((m) => m.sources));
	const offered = [
		...new Set(
			SECTION_DEFS.flatMap((d) => d.sources ?? []).map((s) => s.value),
		),
	];
	const orphans = (sources: string[]) =>
		sources.filter(
			(s) => !claimed.has(s) && !CORE_SOURCES.includes(s as never),
		);

	it("every source a section offers is core or owned", () => {
		expect(orphans(offered), "add to MODULES or to CORE_SOURCES").toEqual([]);
	});

	it("every source the server will resolve is core or owned", () => {
		const resolver = readFileSync(
			join(import.meta.dirname, "..", "server", "repo", "sections.ts"),
			"utf8",
		);
		const cases = [...resolver.matchAll(/case "(\w+)":/g)].map((m) => m[1]);
		expect(
			cases.length,
			"resolveQuery no longer reads like this",
		).toBeGreaterThan(10);
		expect(orphans(cases), "add to MODULES or to CORE_SOURCES").toEqual([]);
	});

	it("nothing is both core and owned", () => {
		expect(CORE_SOURCES.filter((s) => claimed.has(s))).toEqual([]);
	});

	it("the core list names nothing no section offers", () => {
		for (const s of CORE_SOURCES)
			expect(offered, `${s} is no longer a source`).toContain(s);
	});

	it("leaves only core sources placeable with every module off", () => {
		const left = sectionsFor(NONE)
			.flatMap((d) => d.sources ?? [])
			.map((s) => s.value);
		expect(orphans([...new Set(left)])).toEqual([]);
	});
});

describe("every taxonomy is claimed, by a module or by the core", () => {
	const claimed = new Set(MODULES.flatMap((m) => m.taxonomies ?? []));
	const srcDir = join(import.meta.dirname, "..");
	const used = new Set<string>();
	for (const name of readdirSync(srcDir, { recursive: true }) as string[]) {
		if (!/\.tsx?$/.test(name) || name.includes(".test.")) continue;
		for (const m of readFileSync(join(srcDir, name), "utf8").matchAll(
			/taxonomy: "(\w+)"/g,
		))
			used.add(m[1]);
	}

	it("finds the taxonomies the tree uses", () => {
		expect(used.size).toBeGreaterThan(2);
	});

	it("every taxonomy the tree writes is core or owned", () => {
		expect(
			[...used].filter((t) => !claimed.has(t) && !CORE_TAXONOMIES.includes(t)),
			"add to MODULES or to CORE_TAXONOMIES",
		).toEqual([]);
	});

	it("a module names a taxonomy something actually uses", () => {
		for (const m of MODULES)
			for (const t of m.taxonomies ?? [])
				expect([...used], `${m.id} owns ${t}, which nothing writes`).toContain(
					t,
				);
	});

	it("nothing is both core and owned", () => {
		expect(CORE_TAXONOMIES.filter((t) => claimed.has(t))).toEqual([]);
	});
});

/**
 * `canSee` in admin.tsx returns true when a path has no NAV_AREA entry, so a new
 * admin screen nobody mapped is visible to every admin user whatever their role -
 * and, being outside NAV_AREA, invisible to the partition above as well.
 */
describe("every admin screen has a permission area", () => {
	const routeDir = join(import.meta.dirname, "..", "routes");
	const files = readdirSync(routeDir).filter(
		(n) => n.startsWith("admin.") && n.endsWith(".tsx"),
	);
	/** The shell, the dashboard, and the account page every signed-in user owns. */
	const UNMAPPED = ["admin.tsx", "admin.index.tsx", "admin.account.tsx"];
	const base = (f: string) => `/admin/${f.split(".")[1]}`;

	it("every admin route file maps to an area", () => {
		const orphans = files
			.filter((f) => !UNMAPPED.includes(f))
			.filter((f) => !(base(f) in NAV_AREA));
		expect(
			[...new Set(orphans.map(base))],
			"add to NAV_AREA in permissions.ts, and to MODULES or CORE_NAV_PATHS",
		).toEqual([]);
	});

	it("the exempt list names files that exist", () => {
		for (const f of UNMAPPED) expect(files, f).toContain(f);
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

	it("refuses a disabled module's section that carries no query at all", () => {
		for (const type of ["projectList", "partners", "orgChart", "map"])
			expect(disallowedSections(NONE, [node(type)]), type).toHaveLength(1);
		expect(disallowedSections(ALL, [node("projectList")])).toEqual([]);
		expect(disallowedSections(set("offices"), [node("map")])).toEqual([]);
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

	const routersCalled = (text: string) => [
		...new Set(
			[...text.matchAll(/trpcClient\.(admin\w+)\./g)].map((m) => m[1]),
		),
	];

	/** `modules.list("fundraising", () => trpcClient.adminDonors.list…)`, the guard. */
	const GUARDED =
		/\.list\(\s*"(\w+)"\s*,\s*\(\)\s*=>\s*trpcClient\.(admin\w+)\./g;

	for (const file of files) {
		const src = readFileSync(join(routeDir, file), "utf8");
		const path = `/admin/${file
			.replace(/^admin\./, "")
			.replace(/\.tsx$/, "")
			.replace(/\.(index|new|\$\w+)$/, "")
			.replace(/\./g, "/")}`;
		const own = moduleForAdminPath(path)?.id;
		const foreign = (rs: string[]) =>
			rs.filter((r) => owner.has(r) && owner.get(r) !== own);
		const cross = foreign(routersCalled(src));
		if (!cross.length) continue;

		it(`${file} guards ${cross.join(", ")}`, () => {
			// Remove every call that is wrapped, and named after the module that owns
			// what it calls; a call still standing is one this screen makes whatever
			// the install has. Checking for the import instead passed on a file that
			// imported `useModules` and then called the router anyway.
			const unguarded = src.replace(GUARDED, (whole, id, router) =>
				owner.get(router) === id ? "" : whole,
			);
			const how = `${file} calls ${cross.join(", ")}, which belong to ${[
				...new Set(cross.map((r) => owner.get(r))),
			].join(
				", ",
			)}. Wrap each call as modules.list("<module>", () => trpcClient.<router>…) so the screen still loads when that module is off.`;
			expect(foreign(routersCalled(unguarded)), how).toEqual([]);
			expect(src.includes("useModules()"), how).toBe(true);
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
