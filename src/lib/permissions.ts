/**
 * Area-based permissions for custom roles. A "role" (DB row) grants a set of
 * these areas. The `admin` role is a super-role (all areas, always — special-
 * cased in code so new areas are auto-granted and it can never be locked out).
 *
 * Areas are coarse (one per feature area, not per procedure) so they map cleanly
 * to tRPC routers (server enforcement) and admin nav items (client gating).
 */
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
	| "users";

export const PERMISSION_AREAS: {
	key: PermissionArea;
	label: string;
	group: string;
}[] = [
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

/** tRPC router key → permission area (server-side enforcement in adminProcedure). */
export const ROUTER_AREA: Record<string, PermissionArea> = {
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
	"/admin/settings": "settings",
	"/admin/modules": "settings",
	"/admin/users": "users",
	"/admin/roles": "users",
};
