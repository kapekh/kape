// MODULES is the only list to edit; the nav, the routers, the role editor and the catalogue all derive from it
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
	// people reads "People & org chart" only where there is an org chart
	areaSuffix?: { area: PermissionArea; text: string };
};

// keyed on ROUTER_AREA, not the router: that is what the gate reads and importing it would drag the database into a unit test
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
	"staff",
];

export const CORE_SOURCES: QuerySource[] = [
	"posts",
	"videos",
	"albums",
	"publications",
	"people",
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
	"/admin/ui-strings",
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

// a missing row predates modules, so everything stays on; an empty row is an install that answered "none"
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

// a taxonomy that only categorises a module's records goes with the module
export const taxonomyEnabled = (s: SiteSettings, taxonomy: string) =>
	enabledFor(
		s,
		MODULES.find((m) => m.taxonomies?.includes(taxonomy)),
	);

// derived: an area is dropped only when every router and nav path mapping to it is unreachable
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

// only the picker is filtered, never the renderer, so turning a module off never edits anyone's pages
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

// sections arrives from the client as free-form JSON, so the picker is a convenience and this is the gate; stored shapes pass, so a page stays editable after its module goes off
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
		// a section with no query still belongs to whatever offers it, so refuse the binding rather than trust that it looks empty
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
