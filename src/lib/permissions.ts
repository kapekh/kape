// areas are coarse, one per feature area, so they map onto tRPC routers and nav items; admin is special-cased and can never be locked out
export type PermissionArea =
	| "pages"
	| "posts"
	| "projects"
	| "media"
	| "forms"
	| "campaigns"
	| "people"
	| "partners"
	| "schools"
	| "offices"
	| "messages"
	| "navigation"
	| "lists"
	| "settings"
	| "users"
	| "portal";

export const PERMISSION_AREAS: {
	key: PermissionArea;
	label: string;
	group: string;
}[] = [
	{
		key: "portal",
		label: "Staff portal (internal news, documents, calendar, directory)",
		group: "Staff",
	},
	{ key: "pages", label: "Pages", group: "Content" },
	{ key: "posts", label: "Posts (news, stories, videos…)", group: "Content" },
	{ key: "projects", label: "Projects", group: "Content" },
	{ key: "media", label: "Media library", group: "Content" },
	{ key: "forms", label: "Forms & submissions", group: "Content" },
	{ key: "campaigns", label: "Campaigns & donations", group: "Fundraising" },
	// "& org chart" is appended by the orgChart module while it is on — see
	// visibleAreas in modules.ts. The tick must not promise a screen that is off.
	{ key: "people", label: "People", group: "Records" },
	{ key: "partners", label: "Partners & donors", group: "Records" },
	{ key: "schools", label: "Schools", group: "Records" },
	{ key: "offices", label: "Offices", group: "Records" },
	{ key: "messages", label: "Contact messages", group: "Records" },
	{ key: "navigation", label: "Header, footer & menus", group: "Site" },
	{ key: "lists", label: "Lists & categories", group: "Site" },
	{ key: "settings", label: "Site settings & languages", group: "Site" },
	{ key: "users", label: "Users & roles", group: "Site" },
];

export const ALL_AREAS: PermissionArea[] = PERMISSION_AREAS.map((a) => a.key);

/** The portal is not an admin screen: holding it alone opens /internalsources, never /admin. */
export const ADMIN_AREAS: PermissionArea[] = ALL_AREAS.filter(
	(a) => a !== "portal",
);

export const hasAdminArea = (permissions: readonly string[]) =>
	permissions.some((a) => a !== "portal");

export type Caller = {
	permissions: readonly string[];
	isSuperAdmin: boolean;
};

/**
 * Areas a caller is asking to put on a role but does not hold themselves.
 * Without this the `users` area buys every other one: edit your own role,
 * tick everything, save.
 */
export function ungrantableAreas(
	caller: Caller,
	requested: readonly string[],
): string[] {
	if (caller.isSuperAdmin) return [];
	return requested.filter((a) => !caller.permissions.includes(a));
}

/**
 * The one rule behind every users-and-roles decision: you may hand out, and
 * touch, only what you hold. A role or an account whose reach exceeds the
 * caller's is out of reach, whichever direction the edit would move it.
 */
export const withinReach = (caller: Caller, held: Caller) =>
	caller.isSuperAdmin ||
	(!held.isSuperAdmin &&
		ungrantableAreas(caller, held.permissions).length === 0);

/** tRPC router key → permission area (server-side enforcement in adminProcedure). */
export const ROUTER_AREA: Record<string, PermissionArea> = {
	staff: "portal",
	adminPages: "pages",
	adminPosts: "posts",
	adminProjects: "projects",
	adminMedia: "media",
	adminForms: "forms",
	adminCampaigns: "campaigns",
	adminDonations: "campaigns",
	adminPeople: "people",
	adminOrg: "people",
	adminPartners: "partners",
	adminDonors: "partners",
	adminSchools: "schools",
	adminOffices: "offices",
	adminMessages: "messages",
	adminNav: "navigation",
	adminTerms: "lists",
	adminSettings: "settings",
	adminLanguages: "settings",
	adminHero: "settings",
	adminStats: "settings",
	adminUsers: "users",
	adminRoles: "users",
};

/** /admin route path → permission area (client nav gating + route guard). */
export const NAV_AREA: Record<string, PermissionArea> = {
	"/admin/pages": "pages",
	"/admin/posts": "posts",
	"/admin/projects": "projects",
	"/admin/media": "media",
	"/admin/forms": "forms",
	"/admin/campaigns": "campaigns",
	"/admin/donations": "campaigns",
	"/admin/people": "people",
	"/admin/org-chart": "people",
	"/admin/partners": "partners",
	"/admin/donors": "partners",
	"/admin/schools": "schools",
	"/admin/offices": "offices",
	"/admin/messages": "messages",
	"/admin/nav": "navigation",
	"/admin/footer": "navigation",
	"/admin/locations": "lists",
	"/admin/publication-categories": "lists",
	"/admin/doc-categories": "lists",
	"/admin/partner-categories": "lists",
	"/admin/languages": "settings",
	"/admin/ui-strings": "settings",
	"/admin/settings": "settings",
	"/admin/modules": "settings",
	"/admin/users": "users",
	"/admin/roles": "users",
};
