export type TourStep = {
	/** CSS selector for the thing being pointed at. Omitted, the card sits centred. */
	target?: string;
	title: string;
	body: string;
};

export type Tour = { title: string; steps: TourStep[] };

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
				target: "[data-slot=page-header]",
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
				body: "Your details, the light and dark theme, signing out, and this tour whenever you want it again.",
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
				target: '[data-slot=page-header] input[type="search"]',
				title: "Search and totals",
				body: "Matches the file's stored name and its address. The count beside it is the whole library, not the search.",
			},
			{
				target: "[data-slot=page-header] fieldset",
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

/** The tour that fits the screen someone is on, or the shell tour. */
export function tourForPath(pathname: string): TourId {
	if (pathname.startsWith("/admin/media")) return "media";
	if (pathname.startsWith("/admin/settings")) return "settings";
	if (pathname.startsWith("/admin/modules")) return "modules";
	if (
		/^\/admin\/(posts|projects|campaigns|people|schools|offices|partners)\/./.test(
			pathname,
		)
	)
		return "editor";
	return "shell";
}
