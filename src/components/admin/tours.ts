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
} satisfies Record<string, Tour>;

export type TourId = keyof typeof TOURS;

/** The tour that fits the screen someone is on, or the shell tour. */
export function tourForPath(pathname: string): TourId {
	return pathname.startsWith("/admin/media") ? "media" : "shell";
}
