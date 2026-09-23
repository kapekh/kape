import { eq, type SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";

import {
	campaigns,
	donors,
	forms,
	heroSlides,
	navItems,
	offices,
	pages,
	partners,
	people,
	postMedia,
	posts,
	projectLocations,
	projects,
	schools,
	siteSettings,
} from "../schema";
import { defaultLangText } from "./i18n";

export type MediaUsage = {
	kind: string;
	label: string;
	href: string | null;
	/** inside someone's content, so a delete cannot clear it and is refused */
	blocking: boolean;
};

export type MediaRef = {
	kind: string;
	table: SQLiteTable;
	column: SQLiteColumn;
	rowId: SQLiteColumn;
	label?: SQLiteColumn;
	/** the row's name is a `translations` row, so the default language names it */
	labelEntity?: string;
	labelField?: string;
	tenant?: SQLiteColumn;
	join?: { table: SQLiteTable; on: SQL };
	href?: (rowId: number) => string;
	/** notNull, so it cannot be cleared - the referring row goes instead. */
	clearBy?: "row";
};
// the "Used in" panel and deleteMedia both walk this; media-refs.test.ts fails if the schema grows a reference missing here
export const MEDIA_REFS: MediaRef[] = [
	{
		kind: "Post cover",
		table: posts,
		column: posts.coverMediaId,
		rowId: posts.id,
		label: posts.slug,
		tenant: posts.tenantId,
		href: (r) => `/admin/posts/${r}`,
	},
	{
		kind: "Post gallery",
		table: postMedia,
		column: postMedia.mediaId,
		rowId: postMedia.postId,
		label: posts.slug,
		// post_media has no tenantId of its own; the join carries the scope
		tenant: posts.tenantId,
		join: { table: posts, on: eq(posts.id, postMedia.postId) },
		href: (r) => `/admin/posts/${r}`,
		clearBy: "row",
	},
	{
		kind: "Page hero",
		table: pages,
		column: pages.heroMediaId,
		rowId: pages.id,
		label: pages.slug,
		tenant: pages.tenantId,
		href: (r) => `/admin/pages/${r}`,
	},
	{
		kind: "Navigation card",
		table: navItems,
		column: navItems.imageMediaId,
		rowId: navItems.id,
		label: navItems.targetRef,
		tenant: navItems.tenantId,
		href: () => "/admin/nav",
	},
	{
		kind: "Person photo",
		table: people,
		column: people.photoMediaId,
		rowId: people.id,
		labelEntity: "person",
		tenant: people.tenantId,
		href: (r) => `/admin/people/${r}`,
	},
	{
		kind: "Campaign cover",
		table: campaigns,
		column: campaigns.coverMediaId,
		rowId: campaigns.id,
		labelEntity: "campaign",
		labelField: "title",
		tenant: campaigns.tenantId,
		href: (r) => `/admin/campaigns/${r}`,
	},
	{
		kind: "Partner logo",
		table: partners,
		column: partners.logoMediaId,
		rowId: partners.id,
		label: partners.name,
		tenant: partners.tenantId,
		href: (r) => `/admin/partners/${r}`,
	},
	{
		kind: "Donor logo",
		table: donors,
		column: donors.logoMediaId,
		rowId: donors.id,
		label: donors.name,
		tenant: donors.tenantId,
		href: (r) => `/admin/donors/${r}`,
	},
	{
		kind: "Project logo",
		table: projects,
		column: projects.logoMediaId,
		rowId: projects.id,
		label: projects.code,
		tenant: projects.tenantId,
		href: (r) => `/admin/projects/${r}`,
	},
	{
		kind: "Project map photo",
		table: projectLocations,
		column: projectLocations.photoMediaId,
		rowId: projectLocations.projectId,
		label: projectLocations.schoolName,
		tenant: projectLocations.tenantId,
		href: (r) => `/admin/projects/${r}`,
	},
	{
		kind: "Office photo",
		table: offices,
		column: offices.imageMediaId,
		rowId: offices.id,
		labelEntity: "office",
		tenant: offices.tenantId,
		href: (r) => `/admin/offices/${r}`,
	},
	{
		kind: "School photo",
		table: schools,
		column: schools.coverMediaId,
		rowId: schools.id,
		labelEntity: "school",
		tenant: schools.tenantId,
		href: (r) => `/admin/schools/${r}`,
	},
	{
		kind: "Homepage hero",
		table: heroSlides,
		column: heroSlides.mediaId,
		rowId: heroSlides.id,
		tenant: heroSlides.tenantId,
	},
];
// not foreign keys: the URL is a substring of someone's content, so a delete cannot clear it
export type MediaTextRef = {
	kind: string;
	table: SQLiteTable;
	/** searched for the url */
	column: SQLiteColumn;
	rowId: SQLiteColumn;
	label?: SQLiteColumn | SQL<string | null>;
	/** when the row's own key names the place better than any column does */
	place?: (rowId: string) => string;
	tenant: SQLiteColumn;
	/**
	 * The only rows of a column many unrelated things share, named by `rowId`.
	 * A list rather than a condition so media-sinks.test.ts can read it back and
	 * fail on a row holding a url that this list forgot.
	 */
	keys?: string[];
	href: (rowId: string) => string;
};

/**
 * Settings that hold a media url: three typed or pasted into the settings page's
 * text fields, and every footer social's logo, picked, inside one JSON row.
 */
const SETTING_SINKS: Record<string, { place: string; href: string }> = {
	logo_url: { place: "Site logo", href: "/admin/settings" },
	favicon_url: { place: "Favicon", href: "/admin/settings" },
	og_image: { place: "Social share image", href: "/admin/settings" },
	footer_socials: { place: "Footer social link", href: "/admin/footer" },
};

export const MEDIA_TEXT_REFS: MediaTextRef[] = [
	{
		// a publication's or document's PDF is a url in posts.meta.fileUrl, not a
		// foreign key, so nothing else on this list sees it
		kind: "Attached file",
		table: posts,
		column: posts.meta,
		rowId: posts.id,
		label: posts.slug,
		tenant: posts.tenantId,
		href: (r) => `/admin/posts/${r}`,
	},
	{
		kind: "Page content",
		table: pages,
		column: pages.sections,
		rowId: pages.id,
		label: pages.slug,
		tenant: pages.tenantId,
		href: (r) => `/admin/pages/${r}`,
	},
	{
		kind: "Form content",
		table: forms,
		column: forms.fields,
		rowId: forms.id,
		label: defaultLangText("form", forms.id, "title"),
		tenant: forms.tenantId,
		href: (r) => `/admin/forms/${r}`,
	},
	{
		kind: "Site setting",
		table: siteSettings,
		column: siteSettings.value,
		rowId: siteSettings.key,
		label: siteSettings.key,
		place: (key) => SETTING_SINKS[key]?.place ?? key,
		tenant: siteSettings.tenantId,
		keys: Object.keys(SETTING_SINKS),
		href: (key) => SETTING_SINKS[key]?.href ?? "/admin/settings",
	},
];

/** Where a `translations` row's entity lives, for labelling a body-text hit. */
export const TRANSLATED_ENTITIES: Record<
	string,
	{
		kind: string;
		table: SQLiteTable;
		id: SQLiteColumn;
		label: SQLiteColumn | SQL<string | null>;
		tenant: SQLiteColumn;
		href: (rowId: number) => string;
	}
> = {
	post: {
		kind: "Post text",
		table: posts,
		id: posts.id,
		label: posts.slug,
		tenant: posts.tenantId,
		href: (r) => `/admin/posts/${r}`,
	},
	page: {
		kind: "Page text",
		table: pages,
		id: pages.id,
		label: pages.slug,
		tenant: pages.tenantId,
		href: (r) => `/admin/pages/${r}`,
	},
	project: {
		kind: "Project text",
		table: projects,
		id: projects.id,
		label: projects.code,
		tenant: projects.tenantId,
		href: (r) => `/admin/projects/${r}`,
	},
	person: {
		kind: "Person text",
		table: people,
		id: people.id,
		label: defaultLangText("person", people.id, "name"),
		tenant: people.tenantId,
		href: (r) => `/admin/people/${r}`,
	},
	campaign: {
		kind: "Campaign text",
		table: campaigns,
		id: campaigns.id,
		label: campaigns.slug,
		tenant: campaigns.tenantId,
		href: (r) => `/admin/campaigns/${r}`,
	},
	form: {
		kind: "Form text",
		table: forms,
		id: forms.id,
		label: forms.slug,
		tenant: forms.tenantId,
		href: (r) => `/admin/forms/${r}`,
	},
};
