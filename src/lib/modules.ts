/**
 * Which domain features this install actually asked for.
 *
 * A fresh install is a CMS: pages, posts, media, forms, navigation, users and
 * settings. Everything below is a domain entity some organisations keep and most
 * do not, so it is off until an operator turns it on in /admin/modules. Nothing
 * is deleted by turning one off - the tables, the routes and the rows all stay,
 * and turning it back on returns them.
 *
 * `MODULES` is the only table here. Which nav items disappear, which tRPC routers
 * refuse, which permission areas the role editor still offers and which catalogue
 * sections stay placeable are all derived from it, so there is one list to edit
 * and nothing to keep in step by hand. The keys it points at (`ROUTER_AREA`,
 * `NAV_AREA`, `QuerySource`) are checked against their sources in modules.test.ts.
 */
import {
	NAV_AREA,
	PERMISSION_AREAS,
	type PermissionArea,
	ROUTER_AREA,
} from "./permissions";
import {
	type QuerySource,
	SECTION_DEFS,
	type SectionDef,
	type SectionNode,
} from "./sections";
import type { SiteSettings } from "./site-identity";

export type ModuleId =
	| "projects"
	| "schools"
	| "fundraising"
	| "partners"
	| "offices"
	| "orgChart";

export type ModuleDef = {
	id: ModuleId;
	label: string;
	description: string;
	/** tRPC router keys this module owns (into ROUTER_AREA). */
	routers: string[];
	/** /admin paths this module owns (into NAV_AREA / the sidebar). */
	navPaths: string[];
	/** Page-builder query sources this module owns (into QuerySource). */
	sources: QuerySource[];
	/** `terms.taxonomy` values this module owns. The terms router is core. */
	taxonomies?: string[];
	/**
	 * What this module adds to another area's label while it is on. `people` reads
	 * "People & org chart" only where there is an org chart to manage.
	 */
	areaSuffix?: { area: PermissionArea; text: string };
};

/**
 * Routers and admin paths no module owns, and which every install therefore has.
 *
 * Not decoration: `modules.test.ts` asserts this list and `MODULES` between them
 * account for every key in `ROUTER_AREA` and `NAV_AREA` exactly once. Without it,
 * the next domain feature — an area, a router, a screen, and nobody remembering
 * `MODULES` — ships switched on for every install with the suite green.
 *
 * Keyed on `ROUTER_AREA` rather than on the tRPC router itself, because that is
 * what the gate reads and importing the router here would drag the database into
 * a unit test. A router in neither map is already denied to everyone but a super
 * administrator, by `adminProcedure`'s deny-by-default.
 */
export const CORE_ROUTERS = [
	"adminPages",
	"adminPosts",
	"adminMedia",
	"adminForms",
	"adminMessages",
	"adminNav",
	"adminTerms",
	"adminSettings",
	"adminLanguages",
	"adminHero",
	"adminStats",
	"adminUsers",
	"adminRoles",
	"adminPeople",
];

/**
 * Query sources no module owns. The third axis, and the only one that reaches the
 * public site: a section in the catalogue can be placed on a public page, so a
 * source nobody owns is a table any install can publish rows out of.
 *
 * `staff`, `events` and `documents` are the staff portal's, and the portal is out
 * of this job's scope, so they are core for now and section 7 of the report says
 * what moving them costs. Naming them here is the point: they are a decision
 * somebody made, not an omission.
 */
export const CORE_SOURCES: QuerySource[] = [
	"posts",
	"videos",
	"albums",
	"publications",
	"people",
	"staff",
	"events",
	"documents",
];

/** Taxonomies no module owns: they categorise content types every install has. */
export const CORE_TAXONOMIES = [
	"location",
	"publication_category",
	"doc_category",
];

export const CORE_NAV_PATHS = [
	"/admin/pages",
	"/admin/posts",
	"/admin/media",
	"/admin/forms",
	"/admin/messages",
	"/admin/nav",
	"/admin/footer",
	"/admin/locations",
	"/admin/publication-categories",
	"/admin/doc-categories",
	"/admin/languages",
	"/admin/settings",
	"/admin/modules",
	"/admin/users",
	"/admin/roles",
	"/admin/people",
];

export const MODULES: ModuleDef[] = [
	{
		id: "projects",
		label: "Projects",
		description:
			"A register of programmes and projects, their sites on a map, and the /projects listing.",
		routers: ["adminProjects"],
		navPaths: ["/admin/projects"],
		sources: ["projects", "locations"],
	},
	{
		id: "schools",
		label: "Schools",
		description:
			"A register of schools, each with a level, a province and an optional project.",
		routers: ["adminSchools"],
		navPaths: ["/admin/schools"],
		sources: [],
	},
	{
		id: "fundraising",
		label: "Campaigns, donations and donors",
		description:
			"Fundraising campaigns, the donations received against them, and the donor register.",
		routers: ["adminCampaigns", "adminDonations", "adminDonors"],
		navPaths: ["/admin/campaigns", "/admin/donations", "/admin/donors"],
		sources: [],
	},
	{
		id: "partners",
		label: "Partners",
		description:
			"Partner and funder organisations, grouped by category, for a logo wall or a link list.",
		routers: ["adminPartners"],
		navPaths: ["/admin/partners", "/admin/partner-categories"],
		sources: ["partners"],
		taxonomies: ["partner_category"],
	},
	{
		id: "offices",
		label: "Offices",
		description:
			"Office locations with addresses and map pins, shown on the contact page.",
		routers: ["adminOffices"],
		navPaths: ["/admin/offices"],
		sources: ["offices"],
	},
	{
		id: "orgChart",
		label: "Organisation chart",
		description:
			"The reporting hierarchy as an interactive chart. The team page itself is always available.",
		routers: ["adminOrg"],
		navPaths: ["/admin/org-chart"],
		sources: ["orgchart"],
		areaSuffix: { area: "people", text: "org chart" },
	},
];

/** The `site_settings` row: a comma-separated list of module ids. */
export const MODULES_SETTING = "enabled_modules";

const ALL_IDS = new Set<string>(MODULES.map((m) => m.id));
const ALL_MODULE_IDS = MODULES.map((m) => m.id);

export const moduleDef = (id: ModuleId) => MODULES.find((m) => m.id === id);

/**
 * A **missing** row means this database predates modules, so everything it might
 * already hold stays switched on. Losing nine admin screens on the first deploy,
 * with the rows all still there and nothing saying why, reads to an operator as
 * the CMS having eaten their site.
 *
 * An **empty** row means an install that was asked and answered "none of them".
 * The installer writes one, so on a database this product created the absence of
 * a row is never ambiguous; `backfillModules` narrows a legacy install's row down
 * to the features it actually has rows for.
 */
export function enabledModules(s: SiteSettings): Set<ModuleId> {
	const raw = s[MODULES_SETTING];
	if (raw === undefined) return new Set(ALL_MODULE_IDS);
	const ids = raw
		.split(",")
		.map((p) => p.trim())
		.filter((p): p is ModuleId => ALL_IDS.has(p));
	return new Set(ids);
}

export const serializeModules = (ids: Iterable<ModuleId>) =>
	MODULES.filter((m) => new Set(ids).has(m.id))
		.map((m) => m.id)
		.join(",");

export const isModuleEnabled = (s: SiteSettings, id: ModuleId) =>
	enabledModules(s).has(id);

export const moduleForRouter = (routerKey: string) =>
	MODULES.find((m) => m.routers.includes(routerKey));

/** The module owning `/admin/x`, matching the path itself and anything under it. */
export const moduleForAdminPath = (pathname: string) =>
	MODULES.find((m) =>
		m.navPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`)),
	);

const enabledFor = (s: SiteSettings, m: ModuleDef | undefined) =>
	!m || enabledModules(s).has(m.id);

/** Server-side gate: may this tRPC router answer at all on this install? */
export const routerEnabled = (s: SiteSettings, routerKey: string) =>
	enabledFor(s, moduleForRouter(routerKey));

/** Route + sidebar gate: does this install have this admin screen? */
export const adminPathEnabled = (s: SiteSettings, pathname: string) =>
	enabledFor(s, moduleForAdminPath(pathname));

const moduleForSource = (source: QuerySource) =>
	MODULES.find((m) => m.sources.includes(source));

export const sourceEnabled = (s: SiteSettings, source: QuerySource) =>
	enabledFor(s, moduleForSource(source));

/**
 * The terms router is core, because most taxonomies belong to content types every
 * install has. A taxonomy that exists only to categorise a module's records goes
 * with the module, or a role holding `lists` keeps writing partner categories on a
 * site with no partners.
 */
export const taxonomyEnabled = (s: SiteSettings, taxonomy: string) =>
	enabledFor(
		s,
		MODULES.find((m) => m.taxonomies?.includes(taxonomy)),
	);

/**
 * Permission areas the role editor should still offer.
 *
 * Derived rather than owned: an area is dropped only when every router and every
 * nav path that maps to it has become unreachable. `partners` covers the partner
 * register and the donor register, which are two modules, and `people` covers the
 * team page, which is core, as well as the org chart, which is not. Neither
 * mapping had to be rewritten to make the modules line up.
 */
export function visibleAreas(s: SiteSettings) {
	const on = enabledModules(s);
	const reachable = new Set<PermissionArea>();
	for (const [key, area] of Object.entries(ROUTER_AREA))
		if (routerEnabled(s, key)) reachable.add(area);
	for (const [path, area] of Object.entries(NAV_AREA))
		if (adminPathEnabled(s, path)) reachable.add(area);
	// The label has to describe what the tick actually grants, so a module that
	// adds a screen to somebody else's area adds its words to that area's label.
	const suffix = (area: PermissionArea) =>
		MODULES.filter((m) => on.has(m.id) && m.areaSuffix?.area === area)
			.map((m) => ` & ${m.areaSuffix?.text}`)
			.join("");
	return PERMISSION_AREAS.filter((a) => reachable.has(a.key)).map((a) => ({
		...a,
		label: a.label + suffix(a.key),
	}));
}

/**
 * The page-builder catalogue for this install. A dynamic section whose sources
 * all belong to disabled modules leaves the catalogue; one that keeps a source
 * stays, offering only the sources that still resolve. `map` is the case that
 * matters: project locations and offices are separate modules.
 *
 * Sections already placed on a page keep rendering - the renderer registry is not
 * filtered, only the picker. Turning a module off hides a feature; it never edits
 * anyone's pages.
 */
export function sectionsFor(s: SiteSettings): SectionDef[] {
	const out: SectionDef[] = [];
	for (const def of SECTION_DEFS) {
		if (!def.sources?.length) {
			out.push(def);
			continue;
		}
		const sources = def.sources.filter((src) => sourceEnabled(s, src.value));
		if (sources.length) out.push({ ...def, sources });
	}
	return out;
}

/** What a section node is, for the purpose of deciding whether it may be saved. */
const nodeShape = (n: SectionNode) => `${n.type}::${n.query?.source ?? ""}`;

/**
 * Whether a page may be saved with these sections, at the point the data enters
 * the database rather than at the point the picker draws a button.
 *
 * The picker is a convenience; `sections` arrives from the client as free-form
 * JSON, so without this a hand-written request places a `projectList` on the home
 * page of an install that has no projects module and the public site renders rows
 * out of a table the operator cannot see. Guarding only the UI made the gate a
 * suggestion.
 *
 * `existing` is the page's stored sections, and shapes already in it are allowed
 * through unchanged. That is the seam holding: a page authored while a module was
 * on stays editable and keeps rendering after the module goes off, and only a
 * *new* binding to a disabled module is refused.
 */
export function disallowedSections(
	s: SiteSettings,
	next: SectionNode[],
	existing: SectionNode[] = [],
): string[] {
	const grandfathered = new Set(existing.map(nodeShape));
	const out: string[] = [];
	for (const node of next) {
		if (grandfathered.has(nodeShape(node))) continue;
		const def = SECTION_DEFS.find((d) => d.type === node.type);
		if (!def) {
			out.push(`"${node.type}" is not a section this site has.`);
			continue;
		}
		const source = node.query?.source;
		// A dynamic section with no query at all still belongs to whatever offers it:
		// `{type:"projectList"}` renders nothing but saves, and the gate is supposed to
		// refuse the binding rather than trust that it looks empty.
		if (!source) {
			if (
				def.sources?.length &&
				!def.sources.some((o) => sourceEnabled(s, o.value))
			)
				out.push(
					`The ${def.label} section belongs to a module this site has not turned on.`,
				);
			continue;
		}
		if (!def.sources?.some((o) => o.value === source)) {
			out.push(`The ${def.label} section cannot read "${source}".`);
			continue;
		}
		if (!sourceEnabled(s, source as QuerySource))
			out.push(
				`The ${def.label} section reads "${source}", which belongs to a module this site has not turned on.`,
			);
	}
	return out;
}
