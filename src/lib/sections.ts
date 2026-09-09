export type QuerySource =
	| "posts"
	| "projects"
	| "offices"
	| "locations"
	| "people"
	| "albums"
	| "videos"
	| "publications"
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

/** Field kinds the admin section-form renders. */
type FieldKind =
	| "text"
	| "textarea"
	| "richtext"
	| "image"
	| "url"
	| "items"
	| "cards"
	| "select"
	| "colour"
	| "form"
	| "person";

export type SectionField = {
	key: string;
	label: string;
	kind: FieldKind;
	help?: string;
	options?: { value: string; label: string }[]; // for kind=select
	itemFields?: SectionField[]; // for kind=items (repeater)
};

type SectionLayout = { value: string; label: string };

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

const EYEBROW: SectionField = {
	key: "eyebrow",
	label: "Eyebrow",
	kind: "text",
};

// brand bands flip every colour token inside the section, see .section-band
export const SECTION_TONES: { value: string; label: string }[] = [
	{ value: "", label: "Default" },
	{ value: "card", label: "Card" },
	{ value: "muted", label: "Muted" },
	{ value: "primary", label: "Primary" },
	{ value: "accent", label: "Accent" },
	{ value: "dark", label: "Dark" },
];

const TONE: SectionField = {
	key: "tone",
	label: "Background",
	kind: "select",
	options: SECTION_TONES,
};

const TONE_COLOUR: SectionField = {
	key: "toneColor",
	label: "Custom background",
	kind: "colour",
	help: "Any colour. It overrides the background above, and the text on it is lightened or darkened to stay legible. Empty uses the background above.",
};

/** Both background controls; every section that offers one offers the other. */
const TONE_FIELDS: SectionField[] = [TONE, TONE_COLOUR];

// empty = the whole list on one page; the page number comes off ?page=
const PER_PAGE: SectionField = {
	key: "perPage",
	label: "Posts per page",
	kind: "select",
	help: "Off shows every post on one page. Any other value adds numbered pages under the list.",
	options: [
		{ value: "", label: "Off (one page)" },
		{ value: "6", label: "6" },
		{ value: "9", label: "9" },
		{ value: "12", label: "12" },
		{ value: "15", label: "15" },
		{ value: "18", label: "18" },
		{ value: "24", label: "24" },
	],
};

const CENTER: SectionField = {
	key: "center",
	label: "Heading alignment",
	kind: "select",
	options: [
		{ value: "", label: "Left" },
		{ value: "center", label: "Centered" },
	],
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
			{
				key: "imageCaption",
				label: "Image caption",
				kind: "text",
				help: "Shown under the image. Leave empty for no caption.",
			},
			{ key: "ctaLabel", label: "Button label", kind: "text" },
			{ key: "ctaHref", label: "Button link", kind: "url" },
			{ key: "cta2Label", label: "Secondary button", kind: "text" },
			{ key: "cta2Href", label: "Secondary link", kind: "url" },
			{
				key: "slides",
				label: "Slides (carousel)",
				kind: "items",
				itemFields: [
					{ key: "image", label: "Image", kind: "image" },
					{ key: "kicker", label: "Kicker", kind: "text" },
					{ key: "title", label: "Title", kind: "text" },
					{ key: "caption", label: "Caption", kind: "text" },
				],
			},
			{
				key: "stats",
				label: "Inline stats (carousel)",
				kind: "items",
				itemFields: [
					{ key: "value", label: "Value", kind: "text" },
					{ key: "label", label: "Label", kind: "text" },
				],
			},
			...TONE_FIELDS,
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
		fields: [
			EYEBROW,
			{ key: "title", label: "Section title", kind: "text" },
			{ key: "body", label: "Body", kind: "richtext" },
			{
				key: "personId",
				label: "Portrait",
				kind: "person",
				help: "Their photo sits at the top right of the text, with their name and job title under it in each language. Only people shown on the public team can be picked.",
			},
			...TONE_FIELDS,
		],
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
			{ value: "logos", label: "Logo wall (small, whole tile links)" },
		],
		fields: [
			EYEBROW,
			{ key: "title", label: "Section title", kind: "text" },
			{ key: "items", label: "Cards", kind: "cards" },
			...TONE_FIELDS,
			CENTER,
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
			EYEBROW,
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
			{ key: "image", label: "Band background image", kind: "image" },
			{
				key: "imageCaption",
				label: "Image caption",
				kind: "text",
				help: "Shown under the image. Leave empty for no caption.",
			},
			{
				key: "items",
				label: "Stats",
				kind: "items",
				itemFields: [
					{ key: "icon", label: "Icon", kind: "image" },
					{ key: "value", label: "Value", kind: "text" },
					{ key: "label", label: "Label", kind: "text" },
				],
			},
			...TONE_FIELDS,
		],
	},
	{
		type: "cta",
		label: "Call-to-action band",
		kind: "static",
		description: "Headline + buttons on a full-width band.",
		layouts: [{ value: "band", label: "Color band" }],
		fields: [
			EYEBROW,
			{ key: "title", label: "Title", kind: "text" },
			{ key: "body", label: "Text", kind: "textarea" },
			{ key: "ctaLabel", label: "Primary button", kind: "text" },
			{ key: "ctaHref", label: "Primary link", kind: "url" },
			{ key: "cta2Label", label: "Secondary button", kind: "text" },
			{ key: "cta2Href", label: "Secondary link", kind: "url" },
			...TONE_FIELDS,
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
			EYEBROW,
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
			...TONE_FIELDS,
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
			EYEBROW,
			{ key: "title", label: "Title", kind: "text" },
			{ key: "body", label: "Body", kind: "richtext" },
			{
				key: "personId",
				label: "Person",
				kind: "person",
				help: "Their photo fills the media column, with their name and job title under it in each language. Only people shown on the public team can be picked.",
			},
			{
				key: "image",
				label: "Image",
				kind: "image",
				help: "Used when no person is picked above.",
			},
			{
				key: "imageCaption",
				label: "Image caption",
				kind: "text",
				help: "Shown under the image. Leave empty for no caption. A picked person captions themselves.",
			},
			{ key: "statValue", label: "Overlay stat value", kind: "text" },
			{ key: "statLabel", label: "Overlay stat label", kind: "text" },
			...TONE_FIELDS,
		],
	},
	{
		type: "pills",
		label: "Pill links",
		kind: "static",
		description: "Groups of pill-style links (e.g. partner categories).",
		layouts: [{ value: "groups", label: "Grouped" }],
		fields: [
			EYEBROW,
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
			...TONE_FIELDS,
		],
	},
	{
		type: "form",
		label: "Form",
		kind: "static",
		description: "Embed a built form, or the quick contact form.",
		layouts: [
			{ value: "contact", label: "Contact (name, email, phone, message)" },
		],
		fields: [
			{
				key: "formSlug",
				label: "Built form",
				kind: "form",
				help: "Pick a form from /admin/forms — it brings its own title, intro and submit button. Leave empty for the quick contact form, which emails the site inbox.",
			},
			EYEBROW,
			{ key: "title", label: "Title", kind: "text" },
			{ key: "body", label: "Intro", kind: "textarea" },
			...TONE_FIELDS,
		],
	},
	{
		type: "certificates",
		label: "Certificate grid",
		kind: "static",
		description: "Accreditations and credentials: an image with a PDF link.",
		layouts: [
			{ value: "cols-2", label: "2 columns" },
			{ value: "cols-3", label: "3 columns" },
			{ value: "cols-4", label: "4 columns" },
		],
		fields: [
			EYEBROW,
			{ key: "title", label: "Section title", kind: "text" },
			{
				key: "items",
				label: "Certificates",
				kind: "items",
				itemFields: [
					{ key: "image", label: "Certificate image", kind: "image" },
					{ key: "title", label: "Title", kind: "text" },
					{ key: "issuer", label: "Issuer", kind: "text" },
					{ key: "year", label: "Year", kind: "text" },
					{ key: "caption", label: "Caption", kind: "text" },
					{ key: "fileUrl", label: "PDF link", kind: "url" },
				],
			},
			...TONE_FIELDS,
			CENTER,
		],
	},
	{
		type: "siteMap",
		label: "Site map",
		kind: "static",
		description:
			"The published navigation tree with each entry's description. Content comes from the nav, not from fields.",
		layouts: [
			{ value: "columns", label: "Columns" },
			{ value: "list", label: "Indented list" },
		],
		fields: [
			EYEBROW,
			{ key: "title", label: "Section title", kind: "text" },
			...TONE_FIELDS,
			CENTER,
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
			{ value: "table", label: "Table (jobs: location + deadline)" },
		],
		sources: [
			{ value: "posts", label: "News", contentType: "news" },
			{ value: "posts", label: "Impact stories", contentType: "story" },
			{ value: "posts", label: "Jobs", contentType: "job" },
		],
		fields: [
			EYEBROW,
			{ key: "title", label: "Section title", kind: "text" },
			{ key: "moreHref", label: "“See all” link", kind: "url" },
			PER_PAGE,
			...TONE_FIELDS,
		],
	},
	{
		type: "videoGrid",
		label: "Video gallery",
		kind: "dynamic",
		description: "Grid of videos (YouTube).",
		layouts: [{ value: "grid-3", label: "3-column" }],
		sources: [{ value: "videos", label: "Videos", contentType: "video" }],
		fields: [
			EYEBROW,
			{ key: "title", label: "Section title", kind: "text" },
			{ key: "moreHref", label: "“All videos” link", kind: "url" },
			...TONE_FIELDS,
		],
	},
	{
		type: "albumGrid",
		label: "Photo albums",
		kind: "dynamic",
		description: "Grid of photo albums.",
		layouts: [{ value: "grid-3", label: "3-column" }],
		sources: [{ value: "albums", label: "Albums", contentType: "album" }],
		fields: [
			EYEBROW,
			{ key: "title", label: "Section title", kind: "text" },
			...TONE_FIELDS,
		],
	},
	{
		type: "publicationList",
		label: "Publication / document list",
		kind: "dynamic",
		description: "Downloadable publications or documents.",
		layouts: [
			{ value: "grid-2", label: "2-column cards" },
			{ value: "grid-3", label: "3-column cards" },
			{ value: "grid-4", label: "4-column cards" },
			{ value: "grid-5", label: "5-column cards" },
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
			EYEBROW,
			{ key: "title", label: "Section title", kind: "text" },
			{ key: "category", label: "Category filter", kind: "text" },
			...TONE_FIELDS,
		],
	},
	{
		type: "people",
		label: "People directory",
		kind: "dynamic",
		description: "Leadership / staff avatar grid.",
		layouts: [{ value: "grid", label: "Avatar grid" }],
		sources: [{ value: "people", label: "Leadership", contentType: "person" }],
		fields: [
			EYEBROW,
			{ key: "title", label: "Section title", kind: "text" },
			...TONE_FIELDS,
		],
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
		fields: [
			EYEBROW,
			{ key: "title", label: "Section title", kind: "text" },
			...TONE_FIELDS,
		],
	},
	{
		type: "partners",
		label: "Partners",
		kind: "dynamic",
		description:
			"Partner links grouped by category, or a scrolling logo strip.",
		layouts: [
			{ value: "groups", label: "Grouped pills" },
			{ value: "marquee", label: "Scrolling logo strip" },
		],
		sources: [{ value: "partners", label: "Partners" }],
		fields: [
			EYEBROW,
			{ key: "title", label: "Section title", kind: "text" },
			...TONE_FIELDS,
		],
	},
	{
		type: "projectList",
		label: "Project list",
		kind: "dynamic",
		description:
			"Programs and projects as cards. Set the category filter to `current` or `past` to split the landing pages.",
		layouts: [
			{ value: "grid-2", label: "2-column cards" },
			{ value: "grid-3", label: "3-column cards" },
			{ value: "list", label: "Simple list" },
		],
		sources: [{ value: "projects", label: "Projects" }],
		fields: [
			EYEBROW,
			{ key: "title", label: "Section title", kind: "text" },
			{ key: "moreHref", label: "“See all” link", kind: "url" },
			...TONE_FIELDS,
		],
	},
	{
		type: "orgChart",
		label: "Organization chart",
		kind: "dynamic",
		description: "The management hierarchy as an interactive chart.",
		layouts: [{ value: "default", label: "Chart" }],
		sources: [{ value: "orgchart", label: "Organization chart" }],
		fields: [
			EYEBROW,
			{ key: "title", label: "Section title", kind: "text" },
			...TONE_FIELDS,
		],
	},
];

export const sectionDef = (type: string): SectionDef | undefined =>
	SECTION_DEFS.find((d) => d.type === type);

const TEXT_KINDS = new Set<FieldKind>(["text", "textarea", "richtext"]);

/** True for a field whose value is one colour, not text: a custom background. */
export const isColourField = (type: string, key: string): boolean =>
	sectionDef(type)?.fields.find((f) => f.key === key)?.kind === "colour";

// one value for every language, so it never goes in the i18n overlay
export function choiceField(
	type: string,
	key: string,
): SectionField | undefined {
	const field = sectionDef(type)?.fields.find((f) => f.key === key);
	return field?.kind === "select" ? field : undefined;
}

// one file for every language, so it never goes in the i18n overlay
export function imageField(
	type: string,
	key: string,
): SectionField | undefined {
	const field = sectionDef(type)?.fields.find((f) => f.key === key);
	return field?.kind === "image" ? field : undefined;
}

// what MediaPicker stores: the media row's url, which is a path under this site
// unless object storage is configured, and then an absolute one
const SITE_PATH = /^\/[^/\s][^\s]*$/;
const ABSOLUTE = /^https?:\/\/[^\s]+$/i;

/** Why this is not an image address, or null when it is one. Empty clears the field. */
export function checkImageValue(value: string): string | null {
	if (!value || SITE_PATH.test(value) || ABSOLUTE.test(value)) return null;
	return `"${value}" is not an image address. Pick one from the media library, or give a path on this site like /uploads/photo.jpg, or a full https:// address.`;
}

/** The fields a section offers for per-language translation, given its current props. */
export function translatableFields(
	type: string,
	props: Record<string, unknown> = {},
): SectionField[] {
	const def = sectionDef(type);
	if (!def) return [];
	// a built form supplies its own title, intro and button, so only the slug is left to translate
	const formPicked =
		def.type === "form" &&
		typeof props.formSlug === "string" &&
		props.formSlug.length > 0;
	return def.fields.filter(
		(f) => TEXT_KINDS.has(f.kind) && !(formPicked && f.key !== "formSlug"),
	);
}
