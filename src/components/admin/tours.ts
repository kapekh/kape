export type TourStep = {
	/**
	 * CSS selector for the thing being pointed at, or several in the order they
	 * should be tried. Omitted, or none of them on screen, the card sits centred.
	 */
	target?: string | string[];
	title: string;
	body: string;
};

export type Tour = { title: string; steps: TourStep[] };

const HEADER = "[data-slot=page-header]";
const ACTIONS = "[data-slot=page-actions]";
const TOOLBAR = ["[data-slot=page-toolbar]", HEADER];
const CHIPS = ["[data-slot=page-header] fieldset", HEADER];
// an empty list has no table and no row menu, which is when a tour is most likely
const TABLE = ["[data-slot=table]", HEADER];
const ROW_MENU = ["button[aria-haspopup=menu]", "[data-slot=table]", HEADER];
const SEARCH = ["[data-slot=page-header] input[type=search]", HEADER];

export const TOURS = {
	shell: {
		title: "Around the admin",
		steps: [
			{
				target: '[aria-label="Admin navigation"]',
				title: "Everything is in here",
				body: "Screens are grouped, and one group opens at a time. You only see the areas your role can reach, so a short list is normal.",
			},
			{
				target: HEADER,
				title: "Every screen names itself",
				body: "The title says where you are, the line under it says what the screen is for, and the breadcrumb takes you back up.",
			},
			{
				target: 'a[href="/"][target="_blank"]',
				title: "Check your work",
				body: "Opens the public site in a new tab. Saving is not the last step - looking at the page is.",
			},
			{
				target: 'button[aria-label="Account"]',
				title: "Your account",
				body: "Your details, the light and dark theme, and signing out.",
			},
			{
				target: "[data-tour=tour-button]",
				title: "This tour, on any screen",
				body: "Tour walks you through whatever screen you are on. N moves forward, P goes back, Escape ends it.",
			},
		],
	},
	dashboard: {
		title: "The dashboard",
		steps: [
			{
				target: ACTIONS,
				title: "The two things you do most",
				body: "A post is dated content that gets its own public page. A page is a fixed part of the site, like About or Contact.",
			},
			{
				target: "[data-tour=dash-attention]",
				title: "What is waiting for you",
				body: "It turns amber when something needs a decision: drafts nobody published, or an empty media library. All clear means there is nothing to do here.",
			},
			{
				target: "[data-tour=dash-traffic]",
				title: "Visits, last fourteen days",
				body: "Hover a bar for that day's count. The numbers come from the site itself, so they start the day it went live.",
			},
			{
				target: '[aria-label="Admin navigation"]',
				title: "Everything else is in the sidebar",
				body: "Grouped by what it does, and only the areas your role can reach. Press Tour on any screen for that screen's walkthrough.",
			},
		],
	},
	messages: {
		title: "Messages",
		steps: [
			{
				target: SEARCH,
				title: "Search reads the message too",
				body: 'Name, email, phone and the words people wrote. It matches word by word, so "hun sen" finds a message signed Sen Hun.',
			},
			{
				target: ROW_MENU,
				title: "Reply goes through your email",
				body: "The Reply button opens your mail app with the address and subject filled in. Nothing is sent from here, so your reply lives in your sent folder.",
			},
			{
				target: HEADER,
				title: "Deleting is the only edit",
				body: "A message cannot be changed, only removed. Nothing here reaches the sender, so delete once you have replied.",
			},
		],
	},
	forms: {
		title: "Forms",
		steps: [
			{
				target: ACTIONS,
				title: "Build a form, then place it",
				body: "A form is built here and shown on the site by adding a Form section to a page. One form can sit on several pages.",
			},
			{
				target: TABLE,
				title: "Responses is a link",
				body: "The number in that column opens what people sent. Fields counts the questions the form asks.",
			},
			{
				target: TABLE,
				title: "Closed is not a status you set",
				body: "Active, draft and closed: a form is closed when it is active but its deadline has passed. Change the deadline to reopen it.",
			},
		],
	},
	formBuilder: {
		title: "Building a form",
		steps: [
			{
				target: "[data-tour=editor-main]",
				title: "Title, name, then the questions",
				body: "The form name is the address it is stored under. Leave it blank and it follows the title; a name already in use is refused as you type.",
			},
			{
				target: "[data-tour=editor-main]",
				title: "Fields are the questions",
				body: "Pick a type per field, reorder with the arrows. Content and section types are for instructions and headings, not answers. Renaming a field's label keeps the answers already collected.",
			},
			{
				target: "[data-tour=editor-aside]",
				title: "Open or shut, and what happens after",
				body: "Draft hides the form. A deadline closes it at the end of that day. The success message and the notify email are what happens once someone presses submit.",
			},
			{
				target: "form button[type=submit]",
				title: "Save when you are ready",
				body: "Greyed out means nothing has changed yet. Leaving with unsaved work asks first.",
			},
		],
	},
	formResponses: {
		title: "Responses",
		steps: [
			{
				target: TABLE,
				title: "One column per question",
				body: "The columns follow the form, so changing the form changes this table. Instructions and headings are left out because nobody answers them.",
			},
			{
				target: ACTIONS,
				title: "Export takes everything",
				body: "The CSV holds every response, not the ones your search narrowed to. Rich text answers are flattened to plain text.",
			},
			{
				target: SEARCH,
				title: "Search reads the answers",
				body: "Every answer and the date, not just names. A response can only be deleted, never edited.",
			},
		],
	},
	pages: {
		title: "Pages",
		steps: [
			{
				target: TABLE,
				title: "The indent is the address",
				body: "Rows sort by URL, so a child page sits under its parent with its parent's title beneath it. Where a page sits is set in the editor, not here.",
			},
			{
				target: CHIPS,
				title: "Draft means nobody can see it",
				body: "A draft page is not on the site at all. Published puts it at the URL in the next column.",
			},
			{
				target: ROW_MENU,
				title: "Deleting keeps the children",
				body: "Child pages move up to the parent of the page you removed rather than disappearing with it.",
			},
		],
	},
	pageBuilder: {
		title: "Building a page",
		steps: [
			{
				target: "[data-tour=page-sections]",
				title: "A page is a stack of sections",
				body: "Add one to start, click a row to open it, reorder with the arrows. Static sections hold words you write; dynamic ones pull in posts or projects as they change.",
			},
			{
				target: ["#page-segment", "[data-tour=page-settings]"],
				title: "The parent and the segment make the URL",
				body: "The line under the box shows the address you are about to get. Changing it changes where the page lives, and any link pointing at the old address stops working.",
			},
			{
				target: "[data-tour=page-save]",
				title: "The preview is not saved",
				body: "The right half redraws as you edit, in English and approximately. Nothing reaches the site until Save page, and Draft keeps it off the site entirely.",
			},
		],
	},
	posts: {
		title: "Posts",
		steps: [
			{
				target: "[aria-label='Admin navigation']",
				title: "One list, filtered by kind",
				body: "News, stories, videos and the rest are all posts. The sidebar entries open this same list already narrowed to one kind.",
			},
			{
				target: CHIPS,
				title: "Draft, published, archived",
				body: "Only published posts are on the site. Archived keeps a post out of the way without deleting it.",
			},
			{
				target: TABLE,
				title: "The slug is the public address",
				body: "The title links to the editor. The slug is the last part of the URL visitors see, so changing it breaks links people already have.",
			},
		],
	},
	projects: {
		title: "Projects",
		steps: [
			{
				target: TABLE,
				title: "A project groups the work",
				body: "It has its own code, its own public page, and schools can be attached to it. The code is what other screens show.",
			},
			{
				target: CHIPS,
				title: "Current is the live one",
				body: "Only current shows as live. Every other status reads as ordinary grey, and none of them hide the project's page.",
			},
			{
				target: ACTIONS,
				title: "Switching projects off",
				body: "If this whole area is not something you use, Site then Modules removes it from the sidebar without deleting anything.",
			},
		],
	},
	media: {
		title: "The media library",
		steps: [
			{
				target: '[data-tour="media-upload"]',
				title: "Two ways to add files",
				body: "This button takes several files at once. You can also drag files straight onto the page from your desktop.",
			},
			{
				target: SEARCH,
				title: "Search and totals",
				body: "Matches the file's stored name and its address. The count beside it is the whole library, not the search.",
			},
			{
				target: CHIPS,
				title: "Narrow it down",
				body: "Images or files. Videos sit under Files for now.",
			},
			{
				target: '[data-tour="media-tile"]',
				title: "Open one before you delete it",
				body: "A tile opens its details: size, address, a copy button, and Used in - every page and post pointing at this file. Unused means safe to remove.",
			},
		],
	},
	campaigns: {
		title: "Campaigns",
		steps: [
			{
				target: TABLE,
				title: "Raised against the goal",
				body: "The figure counts confirmed gifts only, in the campaign's own currency. Featured pushes a campaign to the top of the donate page.",
			},
			{
				target: TABLE,
				title: "Donations sits next to the menu",
				body: "That button opens every gift this campaign received, with its own totals.",
			},
			{
				target: ROW_MENU,
				title: "Money protects the record",
				body: "A campaign that has taken a confirmed gift cannot be deleted. Ended keeps it and its history while closing it to new giving.",
			},
		],
	},
	campaignDonations: {
		title: "This campaign's donations",
		steps: [
			{
				target: HEADER,
				title: "Scoped to one campaign",
				body: "Three totals and every gift this campaign owns. The all-campaigns view is under Fundraising then Donations.",
			},
			{
				target: TABLE,
				title: "Pending is not money yet",
				body: "Pending means the payment was started and never confirmed. Only confirmed gifts count towards the raised figure.",
			},
			{
				target: ROW_MENU,
				title: "Mark as paid is for reconciling",
				body: "Use it only for a payment you have confirmed elsewhere, such as a bank transfer. It changes the record, it does not take any money.",
			},
		],
	},
	donations: {
		title: "Donations",
		steps: [
			{
				target: ["#donation-campaign", HEADER],
				title: "Filter by campaign",
				body: "The totals above follow this filter rather than the whole list. Unassigned holds gifts that arrived without a campaign.",
			},
			{
				target: TABLE,
				title: "Raised counts confirmed gifts only",
				body: "USD and KHR are kept apart and never added together. Pending and failed attempts are listed but counted nowhere.",
			},
			{
				target: TABLE,
				title: "Records here are read-only",
				body: "Gifts arrive from the payment provider, so nothing on this screen creates or deletes one. A pending row can be marked paid, and that is all.",
			},
		],
	},
	schools: {
		title: "Schools",
		steps: [
			{
				target: TOOLBAR,
				title: "Search or filter by level",
				body: "Search covers the name, the code, the province and the project. The level chips only appear once the list holds more than one level.",
			},
			{
				target: TABLE,
				title: "Province comes from Locations",
				body: "The province and the level are labels from your own lists, so renaming an entry under Lists then Locations renames it here too.",
			},
			{
				target: ACTIONS,
				title: "Projects can be switched off",
				body: "The project column is empty when the Projects module is off. Nothing is lost - switching it back on brings the links back.",
			},
		],
	},
	people: {
		title: "People",
		steps: [
			{
				target: CHIPS,
				title: "Tier is the grouping",
				body: "Board, senior management, programme managers, team and staff. The public team page is built in this order.",
			},
			{
				target: TABLE,
				title: "Public or internal",
				body: "Public puts the person on the team page and makes them available to the org chart. Internal keeps the record here only.",
			},
			{
				target: ACTIONS,
				title: "The org chart draws on this list",
				body: "A box in Site then Org Chart can be linked to a person here, which gives it their photo and profile.",
			},
		],
	},
	partners: {
		title: "Partners",
		steps: [
			{
				target: TABLE,
				title: "Category comes from your own list",
				body: "The chips and the column read from Lists then Partner categories. A category deleted there leaves its raw key showing on the partner.",
			},
			{
				target: TABLE,
				title: "The logo is the whole row on the site",
				body: "Partners appear on the public partners page as a wall of logos, so a missing logo leaves a gap with a name in it.",
			},
			{
				target: ACTIONS,
				title: "Partners and donors are separate lists",
				body: "A donor funds the work and has its own screen under Records. An organisation you both work with and take money from belongs in both.",
			},
		],
	},
	donors: {
		title: "Donors",
		steps: [
			{
				target: TABLE,
				title: "Organisations that fund the work",
				body: "They appear on the public partners and donors panels. Individual gifts are not here - those live under Fundraising then Donations.",
			},
			{
				target: ACTIONS,
				title: "A logo and a link is the whole record",
				body: "The logo is shown as it is, not cropped, so a wide logo stays wide. The URL opens in a new tab from the public site.",
			},
			{
				target: ROW_MENU,
				title: "Deleting is immediate",
				body: "The row goes as soon as you confirm and comes back if the server refuses. Nothing else on the site points at a donor.",
			},
		],
	},
	offices: {
		title: "Offices",
		steps: [
			{
				target: TABLE,
				title: "HQ is a badge, not a sort",
				body: "One office carries the HQ mark. The contact page leads with it and the map centres on it.",
			},
			{
				target: TABLE,
				title: "Province comes from Locations",
				body: "It reads from Lists then Locations, the same list the schools use.",
			},
			{
				target: ACTIONS,
				title: "The map pin is set in the editor",
				body: "Open an office to drop its pin. Without one the office is listed on the contact page but never on the map.",
			},
		],
	},
	nav: {
		title: "The site header",
		steps: [
			{
				target: "[data-tour=nav-settings]",
				title: "The donate button and the top bar",
				body: "Four fields, saved on their own with the button below them. A link is a site path starting with a slash, or a full address.",
			},
			{
				target: "[data-tour=nav-menu]",
				title: "The menu saves item by item",
				body: "Each item is saved as you edit it, so there is no save button for the menu as a whole. Reorder with the up and down arrows, one move at a time.",
			},
			{
				target: "[data-tour=nav-menu]",
				title: "Children turn an item into a dropdown",
				body: "Give an item a child and it stops linking anywhere - its label becomes the heading of the dropdown. Deleting it deletes its children with it.",
			},
		],
	},
	footer: {
		title: "The site footer",
		steps: [
			{
				target: "#footer-form",
				title: "Every section, one form",
				body: "Brand, contact, links, calendar buttons, newsletter, social and the copyright line are all one page and one save.",
			},
			{
				target: "#footer-form",
				title: "Links are label and path pairs",
				body: "Add a row, type what it should say and where it goes. A site path starts with a slash; anything else needs the full address. The first calendar button is the highlighted one.",
			},
			{
				target: "header button[form=footer-form]",
				title: "The save sits in the top bar",
				body: "It follows you as you scroll and is greyed out until something changes.",
			},
		],
	},
	orgChart: {
		title: "The org chart",
		steps: [
			{
				target: "[data-tour=org-add]",
				title: "Add a box, then place it",
				body: "Each box is a position, not an account. Linking one to a person from Records gives it their photo and profile.",
			},
			{
				target: [".react-flow", "[data-tour=org-canvas]"],
				title: "Drag to arrange, drag to connect",
				body: "Move a box and its position is saved at once. Drag from a box's bottom dot to another box's top dot to say who reports to whom. Scroll to zoom, drag the background to pan.",
			},
			{
				target: [".react-flow", "[data-tour=org-canvas]"],
				title: "Deleting takes the reports with it",
				body: "Removing a box removes everyone under it, and it cannot be undone. Move them first if you want to keep them.",
			},
		],
	},
	languages: {
		title: "Languages",
		steps: [
			{
				target: "[data-tour=lang-add]",
				title: "A code and two names",
				body: "The code is the ISO one, like fr. The native name is what visitors see in the language switcher.",
			},
			{
				target: "[data-tour=lang-table]",
				title: "Enabled saves as you tick it",
				body: "There is no save button on this table. Untranslated content falls back to the default language rather than going blank.",
			},
			{
				target: "[data-tour=lang-table]",
				title: "Some languages need a developer",
				body: "A language the site cannot serve yet is marked in red and cannot be made the default. You can still translate content into it, ready for the day it is switched on.",
			},
		],
	},
	uiStrings: {
		title: "UI strings",
		steps: [
			{
				target: "#ui-search",
				title: "The words the site says itself",
				body: "Menu labels, buttons, form messages. Search matches the key and every translation, and the tickbox narrows it to what this site has changed.",
			},
			{
				target: "[data-tour=ui-group]",
				title: "The grey text is the shipped default",
				body: "An empty box is not a missing string - it means the default is being used. Type over it only where this site needs different words.",
			},
			{
				target: "[data-tour=ui-group]",
				title: "Each row saves itself",
				body: "The Save button belongs to that row and counts the languages you changed. Enter in any box does the same thing.",
			},
		],
	},
	users: {
		title: "Users",
		steps: [
			{
				target: TABLE,
				title: "The role decides what they reach",
				body: "An account with no role reaches nothing. Roles are built under Site then Roles.",
			},
			{
				target: ROW_MENU,
				title: "Resetting a password signs them out",
				body: "You set the new password here and tell them yourself. Every session they have open ends immediately.",
			},
			{
				target: ROW_MENU,
				title: "Deleting is immediate too",
				body: "The account loses access at once. Their content stays where it is - nothing they wrote is removed with them.",
			},
		],
	},
	roles: {
		title: "Roles",
		steps: [
			{
				target: TABLE,
				title: "A role is a set of areas",
				body: "Access counts the areas it can manage. Administrator holds all of them, including areas added later.",
			},
			{
				target: TABLE,
				title: "Built-in roles have no menu",
				body: "They can be renamed and re-scoped but not deleted, so their rows carry no actions button at all.",
			},
			{
				target: TABLE,
				title: "Users counts who holds it",
				body: "Change a role and everyone in that column is affected the next time they load a screen.",
			},
		],
	},
	roleEditor: {
		title: "What a role can reach",
		steps: [
			{
				target: "[data-tour=editor-main]",
				title: "Tick the areas, nothing else",
				body: "Each box is one area of the admin. Someone holding this role sees only the ticked ones in their sidebar.",
			},
			{
				target: "[data-tour=editor-main]",
				title: "Switched-off modules are not listed",
				body: "Only areas whose module is on appear here, and a grant for a module that is off is kept through a save rather than dropped.",
			},
			{
				target: "[data-tour=editor-aside]",
				title: "The name is what staff see",
				body: "The counter under it says how many areas are ticked. Administrator cannot be limited, so its boxes are replaced by a note.",
			},
		],
	},
	terms: {
		title: "A list other screens use",
		steps: [
			{
				target: "[data-tour=terms-add]",
				title: "A key and a label",
				body: "The key is what gets stored on the records. The label is what people read. Enter in either box adds the item.",
			},
			{
				target: TABLE,
				title: "Edit in place, save the row",
				body: "Both cells can be typed into, and nothing changes until that row's Save. There is no save for the page.",
			},
			{
				target: TABLE,
				title: "Changing a key moves the records",
				body: "Records store the key, so renaming one leaves them pointing at nothing and showing the raw key instead. Rename the label freely; think twice about the key.",
			},
		],
	},
	settings: {
		title: "Site settings",
		steps: [
			{
				target: 'nav[aria-label="Settings sections"]',
				title: "Four sections, one page",
				body: "The rail follows you as you scroll and marks a section that has unsaved changes.",
			},
			{
				target: '[data-tour="save-bar"]',
				title: "Each section saves itself",
				body: "The bar stays with you at the bottom of the screen. Saving Identity leaves everything in Brand alone, and the count tells you how many fields are going.",
			},
			{
				target: "#add-setting",
				title: "Settings this site invented",
				body: "A key and a value. Use it when a developer asks for one by name - a typo here makes a second setting rather than changing the first.",
			},
			{
				target: "#all-settings",
				title: "Everything stored, including the fields above",
				body: "The same values, raw. Editing here is the long way round for anything that has its own field, and the row menu deletes for good.",
			},
		],
	},
	modules: {
		title: "Modules",
		steps: [
			{
				target: '[data-tour="module-card"]',
				title: "Extras you can switch off",
				body: "Each card says which screens it owns. Off, they leave the sidebar and the page builder's section list.",
			},
			{
				target: '[data-tour="module-save"]',
				title: "Nothing moves until you save",
				body: "A line appears first naming exactly what is about to leave or come back. Records are never deleted, so switching one back on returns everything.",
			},
		],
	},
	account: {
		title: "My account",
		steps: [
			{
				target: "[data-tour=account-password]",
				title: "Your own login, nothing else",
				body: "Your email, name and role are set by whoever manages Users. This screen changes your password only.",
			},
			{
				target: "[data-tour=account-password]",
				title: "Eight characters, twice",
				body: "The current password is checked first, and the two new ones have to match. Everything else you can reach is decided by your role.",
			},
		],
	},
	editor: {
		title: "Writing and saving",
		steps: [
			{
				target: '[data-tour="editor-main"] > *:first-child',
				title: "The words people will read",
				body: "Where a field has language tabs, what you type is kept when you switch and both languages are saved together - a tab you never open is not an empty one.",
			},
			{
				target: '[data-tour="editor-aside"]',
				title: "How it is filed",
				body: "Everything that is not the words themselves - the image, the status, the web address - sits beside them rather than under them, and follows you down the page.",
			},
			{
				target: "form button[type=submit]",
				title: "Save when you are ready",
				body: "Greyed out means nothing has changed yet. Hover it and it tells you why. Leaving with unsaved work asks first.",
			},
		],
	},
} satisfies Record<string, Tour>;

export type TourId = keyof typeof TOURS;

const SCREENS: Record<string, TourId> = {
	messages: "messages",
	posts: "posts",
	projects: "projects",
	media: "media",
	campaigns: "campaigns",
	donations: "donations",
	schools: "schools",
	people: "people",
	partners: "partners",
	donors: "donors",
	offices: "offices",
	nav: "nav",
	footer: "footer",
	"org-chart": "orgChart",
	languages: "languages",
	"ui-strings": "uiStrings",
	users: "users",
	settings: "settings",
	modules: "modules",
	account: "account",
	locations: "terms",
	"publication-categories": "terms",
	"doc-categories": "terms",
	"partner-categories": "terms",
};

// screens whose /new and /<id> are the shared record editor
const RECORD_EDITORS = new Set([
	"posts",
	"projects",
	"campaigns",
	"people",
	"schools",
	"offices",
	"partners",
	"donors",
	"users",
]);

/** The tour that fits the screen someone is on. */
export function tourForPath(pathname: string): TourId {
	const [, , screen, id, sub] = pathname.split("/");
	if (!screen) return "dashboard";
	if (screen === "forms")
		return sub === "submissions"
			? "formResponses"
			: id
				? "formBuilder"
				: "forms";
	if (screen === "pages") return id ? "pageBuilder" : "pages";
	if (screen === "roles") return id ? "roleEditor" : "roles";
	if (screen === "campaigns" && sub === "donations") return "campaignDonations";
	if (id && RECORD_EDITORS.has(screen)) return "editor";
	return SCREENS[screen] ?? "shell";
}
