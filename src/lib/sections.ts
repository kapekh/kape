/**
 * Page-builder schema (shared by client + server). A page is an ordered list of
 * SectionNodes. Each node names a section template (`type`) + a layout variant,
 * carries static authored `props`, and — for dynamic sections — a `query` that the
 * route loader resolves server-side into `props.data` (keeps SSR + SEO intact).
 */

export type QuerySource =
	| "posts"
	| "projects"
	| "offices"
	| "locations"
	| "people"
	| "albums"
	| "videos"
	| "publications"
	| "staff"
	| "events"
	| "documents"
	| "partners"
	| "orgchart";

export type SectionQuery = {
	source: QuerySource;
	contentType?: string; // for source=posts (news|story|job|video|album|publication|person…)
	status?: string;
	category?: string; // meta.category filter (publications/documents) or project status
	limit?: number;
	sort?: "newest" | "oldest";
};

export type SectionNode = {
	id: string; // stable key for the editor
	type: string; // section template key (into the registry)
	layout?: string; // layout variant within the template
	props?: Record<string, unknown>; // authored static content (+ resolved `data` for dynamic)
	query?: SectionQuery; // dynamic data source (resolved server-side)
};

export type PageSections = SectionNode[];

/** Field kinds the admin section-form renders. */
export type FieldKind =
	| "text"
	| "textarea"
	| "richtext"
	| "image"
	| "url"
	| "items"
	| "cards"
	| "select"
	| "form";

export type SectionField = {
	key: string;
	label: string;
	kind: FieldKind;
	help?: string;
	options?: { value: string; label: string }[]; // for kind=select
	itemFields?: SectionField[]; // for kind=items (repeater)
};

export type SectionLayout = { value: string; label: string };

export type SectionDef = {
	type: string;
	label: string;
	kind: "static" | "dynamic";
	description: string;
	layouts: SectionLayout[];
	fields: SectionField[]; // authored props
	/** dynamic sources this section can bind to (dynamic only). */
	sources?: { value: QuerySource; label: string; contentType?: string }[];
};

/** The catalogue of section templates, harvested from the existing site. */
export const SECTION_DEFS: SectionDef[] = [
	/* ---------------- Static ---------------- */
	{
		type: "hero",
		label: "Hero",
		kind: "static",
		description: "Page-top banner with heading, lead and call-to-action.",
		layouts: [
			{ value: "banner", label: "Banner (centered over image)" },
			{ value: "split", label: "Split (text + side image)" },
			{ value: "carousel", label: "Carousel (slides)" },
		],
		fields: [
			{ key: "eyebrow", label: "Eyebrow", kind: "text" },
			{ key: "title", label: "Title", kind: "text" },
			{ key: "lead", label: "Lead", kind: "textarea" },
			{ key: "image", label: "Background / side image", kind: "image" },
			{ key: "ctaLabel", label: "Button label", kind: "text" },
			{ key: "ctaHref", label: "Button link", kind: "url" },
			{
				key: "slides",
				label: "Slides (carousel)",
				kind: "items",
				itemFields: [
					{ key: "image", label: "Image", kind: "image" },
					{ key: "title", label: "Title", kind: "text" },
					{ key: "caption", label: "Caption", kind: "text" },
				],
			},
		],
	},
	{
		type: "richtext",
		label: "Rich text",
		kind: "static",
		description: "Formatted prose content.",
		layouts: [
			{ value: "default", label: "Full width" },
			{ value: "narrow", label: "Narrow (readable)" },
		],
		fields: [{ key: "body", label: "Body", kind: "richtext" }],
	},
	{
		type: "cards",
		label: "Feature cards",
		kind: "static",
		description: "A grid of titled cards with a short description.",
		layouts: [
			{ value: "cols-2", label: "2 columns" },
			{ value: "cols-3", label: "3 columns" },
			{ value: "cols-4", label: "4 columns" },
		],
		fields: [
			{ key: "title", label: "Section title", kind: "text" },
			{ key: "items", label: "Cards", kind: "cards" },
		],
	},
	{
		type: "stats",
		label: "Stats band",
		kind: "static",
		description: "Big number + label counters on a color band.",
		layouts: [
			{ value: "band", label: "Color band" },
			{ value: "plain", label: "Plain" },
		],
		fields: [
			{ key: "title", label: "Title", kind: "text" },
			{
				key: "valueSize",
				label: "Number size",
				kind: "select",
				options: [
					{ value: "sm", label: "Small" },
					{ value: "md", label: "Medium" },
					{ value: "lg", label: "Large" },
					{ value: "xl", label: "Extra large" },
				],
			},
			{
				key: "labelSize",
				label: "Label size",
				kind: "select",
				options: [
					{ value: "xs", label: "Extra small" },
					{ value: "sm", label: "Small" },
					{ value: "md", label: "Medium" },
				],
			},
			{
				key: "items",
				label: "Stats",
				kind: "items",
				itemFields: [
					{ key: "value", label: "Value", kind: "text" },
					{ key: "label", label: "Label", kind: "text" },
				],
			},
		],
	},
	{
		type: "cta",
		label: "Call-to-action band",
		kind: "static",
		description: "Headline + buttons on a full-width band.",
		layouts: [{ value: "band", label: "Color band" }],
		fields: [
			{ key: "title", label: "Title", kind: "text" },
			{ key: "body", label: "Text", kind: "textarea" },
			{ key: "ctaLabel", label: "Primary button", kind: "text" },
			{ key: "ctaHref", label: "Primary link", kind: "url" },
			{ key: "cta2Label", label: "Secondary button", kind: "text" },
			{ key: "cta2Href", label: "Secondary link", kind: "url" },
		],
	},
	{
		type: "resources",
		label: "Resource cards",
		kind: "static",
		description: "Author-listed PDF / video / image links.",
		layouts: [
			{ value: "cols-1", label: "List" },
			{ value: "cols-2", label: "2 columns" },
		],
		fields: [
			{ key: "title", label: "Section title", kind: "text" },
			{
				key: "items",
				label: "Resources",
				kind: "items",
				itemFields: [
					{
						key: "kind",
						label: "Kind (pdf/video/image)",
						kind: "select",
						options: [
							{ value: "pdf", label: "PDF" },
							{ value: "video", label: "Video" },
							{ value: "image", label: "Image" },
						],
					},
					{ key: "title", label: "Title", kind: "text" },
					{ key: "meta", label: "Meta", kind: "text" },
					{ key: "href", label: "Link", kind: "url" },
				],
			},
		],
	},
	{
		type: "split",
		label: "Text + media",
		kind: "static",
		description: "Two-column text beside an image.",
		layouts: [
			{ value: "media-right", label: "Media on right" },
			{ value: "media-left", label: "Media on left" },
		],
		fields: [
			{ key: "title", label: "Title", kind: "text" },
			{ key: "body", label: "Body", kind: "richtext" },
			{ key: "image", label: "Image", kind: "image" },
		],
	},
	{
		type: "pills",
		label: "Pill links",
		kind: "static",
		description: "Groups of pill-style links (e.g. partner categories).",
		layouts: [{ value: "groups", label: "Grouped" }],
		fields: [
			{ key: "title", label: "Section title", kind: "text" },
			{
				key: "groups",
				label: "Groups",
				kind: "items",
				itemFields: [
					{ key: "heading", label: "Group heading", kind: "text" },
					{
						key: "links",
						label: "Links (label|href, comma-separated)",
						kind: "textarea",
					},
				],
			},
		],
	},
	{
		type: "form",
		label: "Form",
		kind: "static",
		description:
			"Embed a built form, or a quick contact / subscribe / sign-up form.",
		layouts: [
			{ value: "contact", label: "Contact (name, email, phone, message)" },
			{ value: "subscribe", label: "Subscribe (email)" },
			{ value: "signup", label: "Sign-up (name, email, message)" },
		],
		fields: [
			{
				key: "formSlug",
				label: "Built form",
				kind: "form",
				help: "Pick a form from /admin/forms — it brings its own title, intro and submit button. Leave empty to use a quick layout below.",
			},
			{ key: "title", label: "Title", kind: "text" },
			{ key: "body", label: "Intro", kind: "textarea" },
			{ key: "submitLabel", label: "Submit button", kind: "text" },
		],
	},

	/* ---------------- Dynamic ---------------- */
	{
		type: "postList",
		label: "Post list",
		kind: "dynamic",
		description: "Lists posts of a chosen content type.",
		layouts: [
			{ value: "featured", label: "Featured + sidebar" },
			{ value: "grid-2", label: "2-column cards" },
			{ value: "grid-3", label: "3-column cards" },
			{ value: "list", label: "Simple list" },
		],
		sources: [
			{ value: "posts", label: "News", contentType: "news" },
			{ value: "posts", label: "Impact stories", contentType: "story" },
			{ value: "posts", label: "Jobs", contentType: "job" },
		],
		fields: [
			{ key: "title", label: "Section title", kind: "text" },
			{ key: "moreHref", label: "“See all” link", kind: "url" },
		],
	},
	{
		type: "videoGrid",
		label: "Video gallery",
		kind: "dynamic",
		description: "Grid of videos (YouTube).",
		layouts: [{ value: "grid-3", label: "3-column" }],
		sources: [{ value: "videos", label: "Videos", contentType: "video" }],
		fields: [{ key: "title", label: "Section title", kind: "text" }],
	},
	{
		type: "albumGrid",
		label: "Photo albums",
		kind: "dynamic",
		description: "Grid of photo albums.",
		layouts: [{ value: "grid-3", label: "3-column" }],
		sources: [{ value: "albums", label: "Albums", contentType: "album" }],
		fields: [{ key: "title", label: "Section title", kind: "text" }],
	},
	{
		type: "publicationList",
		label: "Publication / document list",
		kind: "dynamic",
		description: "Downloadable publications or documents.",
		layouts: [
			{ value: "grid-2", label: "2-column cards" },
			{ value: "list", label: "List" },
		],
		sources: [
			{
				value: "publications",
				label: "Publications",
				contentType: "publication",
			},
		],
		fields: [
			{ key: "title", label: "Section title", kind: "text" },
			{ key: "category", label: "Category filter", kind: "text" },
		],
	},
	{
		type: "people",
		label: "People directory",
		kind: "dynamic",
		description: "Leadership / staff avatar grid.",
		layouts: [{ value: "grid", label: "Avatar grid" }],
		sources: [{ value: "people", label: "Leadership", contentType: "person" }],
		fields: [{ key: "title", label: "Section title", kind: "text" }],
	},
	{
		type: "map",
		label: "Map with pins",
		kind: "dynamic",
		description: "Leaflet map of project sites or offices.",
		layouts: [{ value: "default", label: "Map" }],
		sources: [
			{ value: "locations", label: "Project locations" },
			{ value: "offices", label: "Offices" },
		],
		fields: [{ key: "title", label: "Section title", kind: "text" }],
	},
	{
		type: "directory",
		label: "Directory table",
		kind: "dynamic",
		description: "Tabular listing (staff / events / documents).",
		layouts: [{ value: "table", label: "Table" }],
		sources: [
			{ value: "staff", label: "Staff" },
			{ value: "events", label: "Events" },
			{ value: "documents", label: "Documents" },
		],
		fields: [{ key: "title", label: "Section title", kind: "text" }],
	},
	{
		type: "partners",
		label: "Partners",
		kind: "dynamic",
		description: "Partner links grouped by category.",
		layouts: [{ value: "groups", label: "Grouped pills" }],
		sources: [{ value: "partners", label: "Partners" }],
		fields: [{ key: "title", label: "Section title", kind: "text" }],
	},
];

export const sectionDef = (type: string): SectionDef | undefined =>
	SECTION_DEFS.find((d) => d.type === type);
