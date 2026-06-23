import { sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import {
	foreignKey,
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	unique,
} from "drizzle-orm/sqlite-core";

import type { SectionNode } from "#/lib/sections";

/**
 * KAPE CMS schema — single source of truth (Drizzle / SQLite).
 *
 * Model: blog **posts** (one table, `content_type` + `meta` JSON) + rich-text **pages** +
 * an admin-built **nav_items** tree. All translatable TEXT lives in `translations` so languages
 * can be added at runtime with no migration. See docs/CONTENT-MODEL.md.
 *
 * Part-B seams baked in now: `tenant_id` on every content/config table (single default tenant),
 * and `posts.content_type` is an FK to `content_types` (a seed table), not a hardcoded enum.
 */

const timestamps = {
	createdAt: text("created_at")
		.notNull()
		.default(sql`(datetime('now'))`),
	updatedAt: text("updated_at")
		.notNull()
		.default(sql`(datetime('now'))`),
};

/** Multi-tenant seam. One row for now; everything references it. */
export const tenants = sqliteTable("tenants", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	slug: text("slug").notNull().unique(),
	name: text("name").notNull(),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(datetime('now'))`),
});

/** Runtime-managed languages. Adding a language = INSERT here (+ translations). */
export const languages = sqliteTable("languages", {
	code: text("code").primaryKey(), // BCP-47: 'en','km','fr'
	name: text("name").notNull(), // 'English'
	nativeName: text("native_name").notNull(), // 'ខ្មែរ'
	isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
	enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
	rtl: integer("rtl", { mode: "boolean" }).notNull().default(false),
	sort: integer("sort").notNull().default(0),
});

/** Content-type registry (seed today; gains user-defined fields in Part B P9). */
export const contentTypes = sqliteTable("content_types", {
	key: text("key").primaryKey(), // 'news','story','job',...
	name: text("name").notNull(),
	isSystem: integer("is_system", { mode: "boolean" }).notNull().default(true),
	sort: integer("sort").notNull().default(0),
});

/** Every translatable field of every entity (EAV). Resolved with fallback to the default language. */
export const translations = sqliteTable(
	"translations",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		tenantId: integer("tenant_id")
			.notNull()
			.default(1)
			.references(() => tenants.id),
		entityType: text("entity_type").notNull(), // 'post' | 'page' | 'nav_item' | 'media'
		entityId: integer("entity_id").notNull(),
		field: text("field").notNull(), // 'title' | 'body' | 'excerpt' | 'label' | 'caption' | 'alt'
		lang: text("lang")
			.notNull()
			.references(() => languages.code),
		value: text("value").notNull(),
	},
	(t) => [
		unique("uq_translation").on(t.entityType, t.entityId, t.field, t.lang),
		index("ix_translation_entity").on(t.entityType, t.entityId),
	],
);

/** UI chrome strings (replaces the hardcoded i18n.tsx dictionary). */
export const uiStrings = sqliteTable(
	"ui_strings",
	{
		tenantId: integer("tenant_id")
			.notNull()
			.default(1)
			.references(() => tenants.id),
		key: text("key").notNull(), // 'nav.home'
		lang: text("lang")
			.notNull()
			.references(() => languages.code),
		value: text("value").notNull(),
	},
	(t) => [primaryKey({ columns: [t.tenantId, t.key, t.lang] })],
);

/** Object metadata; bytes live in R2. alt/caption are translatable via `translations`. */
export const media = sqliteTable("media", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	tenantId: integer("tenant_id")
		.notNull()
		.default(1)
		.references(() => tenants.id),
	r2Key: text("r2_key").notNull(),
	url: text("url"),
	contentType: text("content_type"),
	size: integer("size"),
	width: integer("width"),
	height: integer("height"),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(datetime('now'))`),
});

/** All listable content. Translatable title/excerpt/body live in `translations`. */
export const posts = sqliteTable(
	"posts",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		tenantId: integer("tenant_id")
			.notNull()
			.default(1)
			.references(() => tenants.id),
		contentType: text("content_type")
			.notNull()
			.references(() => contentTypes.key),
		slug: text("slug").notNull(),
		status: text("status").notNull().default("draft"), // draft|published|archived
		coverMediaId: integer("cover_media_id").references(() => media.id),
		author: text("author"),
		publishedAt: text("published_at"),
		deadline: text("deadline"), // nullable; jobs/announcements auto-hide past this
		meta: text("meta", { mode: "json" }).$type<Record<string, unknown>>(),
		...timestamps,
	},
	(t) => [
		unique("uq_post_slug").on(t.tenantId, t.slug),
		index("ix_post_type_status").on(t.tenantId, t.contentType, t.status),
	],
);

/** Standalone rich-text pages. Translatable title/body live in `translations`. */
export const pages = sqliteTable(
	"pages",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		tenantId: integer("tenant_id")
			.notNull()
			.default(1)
			.references(() => tenants.id),
		slug: text("slug").notNull(), // canonical FULL path (e.g. "who-we-are/about"); unique; the lookup key
		// Notion-style page tree. `parentId` is the structural parent; `segment` is the
		// editable last path part (e.g. "about"); `slug` is recomputed = parent.slug + "/" + segment.
		parentId: integer("parent_id").references((): AnySQLiteColumn => pages.id),
		segment: text("segment"), // editable last path segment (null only for legacy rows before backfill)
		sortOrder: integer("sort_order").notNull().default(0), // order among siblings
		status: text("status").notNull().default("draft"),
		heroMediaId: integer("hero_media_id").references(() => media.id),
		sections: text("sections", { mode: "json" }).$type<SectionNode[]>(), // page-builder section tree
		...timestamps,
	},
	(t) => [unique("uq_page_slug").on(t.tenantId, t.slug)],
);

/** Admin-built navigation tree. Translatable `label` lives in `translations`. */
export const navItems = sqliteTable(
	"nav_items",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		tenantId: integer("tenant_id")
			.notNull()
			.default(1)
			.references(() => tenants.id),
		parentId: integer("parent_id"),
		sort: integer("sort").notNull().default(0),
		targetKind: text("target_kind").notNull(), // page | post_list | post | url | view
		targetRef: text("target_ref").notNull(),
		visible: integer("visible", { mode: "boolean" }).notNull().default(true),
		imageMediaId: integer("image_media_id").references(() => media.id), // mega-menu card background
		...timestamps,
	},
	(t) => [
		foreignKey({
			columns: [t.parentId],
			foreignColumns: [t.id],
			name: "fk_nav_parent",
		}),
		index("ix_nav_parent").on(t.tenantId, t.parentId),
	],
);

/** Ordered media attached to a post (galleries/albums). */
export const postMedia = sqliteTable(
	"post_media",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		postId: integer("post_id")
			.notNull()
			.references(() => posts.id),
		mediaId: integer("media_id")
			.notNull()
			.references(() => media.id),
		sort: integer("sort").notNull().default(0),
	},
	(t) => [unique("uq_post_media").on(t.postId, t.mediaId)],
);

/** Old slug -> entity, so editing a slug 301s instead of 404ing. */
export const slugRedirects = sqliteTable(
	"slug_redirects",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		tenantId: integer("tenant_id")
			.notNull()
			.default(1)
			.references(() => tenants.id),
		entityType: text("entity_type").notNull(), // 'post' | 'page'
		fromSlug: text("from_slug").notNull(),
		toEntityId: integer("to_entity_id").notNull(),
		createdAt: text("created_at")
			.notNull()
			.default(sql`(datetime('now'))`),
	},
	(t) => [unique("uq_redirect").on(t.tenantId, t.entityType, t.fromSlug)],
);

/**
 * Incremental-SSG render cache: resolved route data keyed by path+lang. Populated
 * read-through on first request (and by scripts/prerender.ts); invalidated by tag
 * when content changes. `tags` is a `|`-delimited tag list for LIKE-based busting.
 */
export const renderCache = sqliteTable("render_cache", {
	key: text("key").primaryKey(), // `${lang}::${path}`
	data: text("data").notNull(), // JSON-serialized resolved route
	tags: text("tags").notNull().default("||"), // |tag1|tag2|
	createdAt: text("created_at")
		.notNull()
		.default(sql`(datetime('now'))`),
});

/** Staff directory (genuinely tabular; bilingual via explicit columns per spec). */
export const staff = sqliteTable("staff", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	tenantId: integer("tenant_id")
		.notNull()
		.default(1)
		.references(() => tenants.id),
	staffNo: text("staff_no"),
	nameKm: text("name_km"),
	nameEn: text("name_en"),
	sex: text("sex"),
	phone: text("phone"),
	email: text("email"),
	program: text("program"),
	photoMediaId: integer("photo_media_id").references(() => media.id),
	sort: integer("sort").notNull().default(0),
});

/* ---- Form capture ---- */

export const contactSubmissions = sqliteTable("contact_submissions", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	tenantId: integer("tenant_id")
		.notNull()
		.default(1)
		.references(() => tenants.id),
	name: text("name").notNull(),
	email: text("email").notNull(),
	phone: text("phone"),
	message: text("message").notNull(),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(datetime('now'))`),
});

export const newsletterSubscribers = sqliteTable(
	"newsletter_subscribers",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		tenantId: integer("tenant_id")
			.notNull()
			.default(1)
			.references(() => tenants.id),
		email: text("email").notNull(),
		createdAt: text("created_at")
			.notNull()
			.default(sql`(datetime('now'))`),
	},
	(t) => [unique("uq_subscriber_email").on(t.tenantId, t.email)],
);

export const alumniRegistrations = sqliteTable("alumni_registrations", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	tenantId: integer("tenant_id")
		.notNull()
		.default(1)
		.references(() => tenants.id),
	name: text("name").notNull(),
	email: text("email").notNull(),
	phone: text("phone"),
	graduationYear: integer("graduation_year"),
	program: text("program"),
	message: text("message"),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(datetime('now'))`),
});

/** Per-day visitor counter (per-doc read/download counts live in posts.meta). */
export const visitorDaily = sqliteTable(
	"visitor_daily",
	{
		tenantId: integer("tenant_id")
			.notNull()
			.default(1)
			.references(() => tenants.id),
		date: text("date").notNull(), // 'YYYY-MM-DD'
		count: integer("count").notNull().default(0),
	},
	(t) => [primaryKey({ columns: [t.tenantId, t.date] })],
);

/** CMS / staff users. Passwords hashed with argon2id (Bun.password). */
export const users = sqliteTable(
	"users",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		tenantId: integer("tenant_id")
			.notNull()
			.default(1)
			.references(() => tenants.id),
		email: text("email").notNull(),
		passwordHash: text("password_hash").notNull(),
		name: text("name"),
		role: text("role").notNull().default("editor"), // admin | staff | editor
		createdAt: text("created_at")
			.notNull()
			.default(sql`(datetime('now'))`),
	},
	(t) => [unique("uq_user_email").on(t.tenantId, t.email)],
);

/**
 * Auth sessions. The JWT carries { sid, uid }; this row makes revocation
 * possible — a token is only valid while its session exists, is unexpired,
 * and is not revoked.
 */
export const sessions = sqliteTable(
	"sessions",
	{
		id: text("id").primaryKey(), // random UUID; the JWT `sid`
		userId: integer("user_id")
			.notNull()
			.references(() => users.id),
		userAgent: text("user_agent"),
		createdAt: text("created_at")
			.notNull()
			.default(sql`(datetime('now'))`),
		expiresAt: text("expires_at").notNull(),
		revokedAt: text("revoked_at"),
	},
	(t) => [index("ix_session_user").on(t.userId)],
);

/**
 * Managed reference lists (taxonomies). e.g. taxonomy="program" → terms NGS,
 * HCC, … Relation meta-fields (event.program, job.location, *.category) select
 * a term `key`; admins manage each list on its own page (e.g. /admin/locations).
 */
export const terms = sqliteTable(
	"terms",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		tenantId: integer("tenant_id")
			.notNull()
			.default(1)
			.references(() => tenants.id),
		taxonomy: text("taxonomy").notNull(), // 'program' | 'location' | 'publication_category' | 'doc_category'
		key: text("key").notNull(), // value stored in meta
		label: text("label").notNull(),
		sort: integer("sort").notNull().default(0),
	},
	(t) => [
		unique("uq_term").on(t.tenantId, t.taxonomy, t.key),
		index("ix_term_taxonomy").on(t.tenantId, t.taxonomy),
	],
);

/* ---------------- Structured entities (admin-managed, no hardcoded content) ---------------- */

/** Global site config: key → value (contact, socials, copyright, youtube, …). */
export const siteSettings = sqliteTable(
	"site_settings",
	{
		tenantId: integer("tenant_id").notNull().default(1).references(() => tenants.id),
		key: text("key").notNull(),
		value: text("value").notNull().default(""),
	},
	(t) => [primaryKey({ columns: [t.tenantId, t.key] })],
);

/** Homepage impact counters. `label` is translated via translations(entity='stat'). */
export const stats = sqliteTable("stats", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	tenantId: integer("tenant_id").notNull().default(1).references(() => tenants.id),
	value: integer("value").notNull().default(0),
	sort: integer("sort").notNull().default(0),
});

/** Homepage hero slideshow. kicker/title/caption translated via translations(entity='hero_slide'). */
export const heroSlides = sqliteTable("hero_slides", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	tenantId: integer("tenant_id").notNull().default(1).references(() => tenants.id),
	mediaId: integer("media_id").references(() => media.id),
	kind: text("kind").notNull().default("image"), // image | video
	videoUrl: text("video_url"),
	sort: integer("sort").notNull().default(0),
});

/** Partner/donor organisations. category references a `partner_category` term. */
export const partners = sqliteTable("partners", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	tenantId: integer("tenant_id").notNull().default(1).references(() => tenants.id),
	name: text("name").notNull(),
	category: text("category").notNull().default("partner"), // term key (partner_category)
	logoMediaId: integer("logo_media_id").references(() => media.id),
	url: text("url"),
	sort: integer("sort").notNull().default(0),
});

/**
 * Hierarchical management / organizational chart. A self-referencing tree:
 * `parentId` is the node this person reports to (null = top of the chart).
 * `personId` optionally links a `person` post so the node shows that profile's
 * photo and links to their page; otherwise `name`/`title` are typed directly.
 */
export const orgNodes = sqliteTable(
	"org_nodes",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		tenantId: integer("tenant_id").notNull().default(1).references(() => tenants.id),
		parentId: integer("parent_id"),
		name: text("name").notNull(),
		title: text("title"), // role / position
		personId: integer("person_id").references(() => posts.id), // optional link to a person post
		sort: integer("sort").notNull().default(0),
		posX: integer("pos_x"), // saved canvas position (null = auto-layout)
		posY: integer("pos_y"),
		...timestamps,
	},
	(t) => [
		foreignKey({ columns: [t.parentId], foreignColumns: [t.id], name: "fk_org_parent" }),
		index("ix_org_parent").on(t.tenantId, t.parentId),
	],
);

/** Funders. Many-to-many with projects via project_donors. */
export const donors = sqliteTable("donors", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	tenantId: integer("tenant_id").notNull().default(1).references(() => tenants.id),
	name: text("name").notNull(),
	logoMediaId: integer("logo_media_id").references(() => media.id),
	url: text("url"),
	sort: integer("sort").notNull().default(0),
});

/** Projects (the "programs": NGS, NGPRC, …). name/summary/body translated. */
export const projects = sqliteTable(
	"projects",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		tenantId: integer("tenant_id").notNull().default(1).references(() => tenants.id),
		code: text("code").notNull(), // NGS, HCC, …
		slug: text("slug").notNull(),
		status: text("status").notNull().default("current"), // current | past
		logoMediaId: integer("logo_media_id").references(() => media.id),
		sort: integer("sort").notNull().default(0),
	},
	(t) => [unique("uq_project_slug").on(t.tenantId, t.slug)],
);

export const projectDonors = sqliteTable(
	"project_donors",
	{
		projectId: integer("project_id").notNull().references(() => projects.id),
		donorId: integer("donor_id").notNull().references(() => donors.id),
	},
	(t) => [primaryKey({ columns: [t.projectId, t.donorId] })],
);

/** Map pins for a project (About page). */
export const projectLocations = sqliteTable("project_locations", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	tenantId: integer("tenant_id").notNull().default(1).references(() => tenants.id),
	projectId: integer("project_id").references(() => projects.id),
	schoolName: text("school_name"),
	lat: text("lat").notNull(),
	lng: text("lng").notNull(),
	sort: integer("sort").notNull().default(0),
});

/** Provincial / head offices (Contact map + cards). province references a `province` term. */
export const offices = sqliteTable("offices", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	tenantId: integer("tenant_id").notNull().default(1).references(() => tenants.id),
	name: text("name").notNull(),
	province: text("province"), // term key
	address: text("address"),
	phone: text("phone"),
	email: text("email"),
	lat: text("lat"),
	lng: text("lng"),
	imageMediaId: integer("image_media_id").references(() => media.id),
	isHq: integer("is_hq", { mode: "boolean" }).notNull().default(false),
	sort: integer("sort").notNull().default(0),
});

/** Schools KAPE supports. Belongs to a project; province via `location` term. */
export const schools = sqliteTable("schools", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	tenantId: integer("tenant_id").notNull().default(1).references(() => tenants.id),
	name: text("name").notNull(),
	code: text("code"), // optional school/EMIS code
	level: text("level"), // preschool | primary | secondary | high | higher
	province: text("province"), // location term key
	projectId: integer("project_id").references(() => projects.id),
	coverMediaId: integer("cover_media_id").references(() => media.id),
	address: text("address"),
	lat: text("lat"),
	lng: text("lng"),
	sort: integer("sort").notNull().default(0),
});

export type Post = typeof posts.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type NavItem = typeof navItems.$inferSelect;
export type Language = typeof languages.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type School = typeof schools.$inferSelect;
