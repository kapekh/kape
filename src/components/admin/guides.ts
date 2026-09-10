import type { TourId } from "./tours";

export type Guide = {
	id: TourId;
	/** The screen the guide walks; Start opens it first. */
	path: string;
	summary: string;
	/** Guides that need a record open say so, and Start lands on the list. */
	note?: string;
};

export const GUIDE_GROUPS: { label: string; guides: Guide[] }[] = [
	{
		label: "Getting around",
		guides: [
			{
				id: "shell",
				path: "/admin",
				summary:
					"The sidebar, the top bar, and how to check your work on the site.",
			},
			{
				id: "dashboard",
				path: "/admin",
				summary:
					"What needs attention, visits, and the two things you do most.",
			},
			{
				id: "account",
				path: "/admin/account",
				summary:
					"Changing your own password. Everything else is set by your role.",
			},
		],
	},
	{
		label: "Content",
		guides: [
			{
				id: "pages",
				path: "/admin/pages",
				summary:
					"Fixed parts of the site: where a page sits and when it is visible.",
			},
			{
				id: "pageBuilder",
				path: "/admin/pages",
				summary:
					"Stacking sections, setting the address, and the portrait on a text-and-media section.",
				note: "Open a page first",
			},
			{
				id: "posts",
				path: "/admin/posts",
				summary:
					"News, stories, videos and the rest: one list, filtered by kind.",
			},
			{
				id: "announcements",
				path: "/admin/posts?type=announcement",
				summary:
					"Announcements and job vacancies: the home-page popup, the careers list, and the deadline that hides them.",
			},
			{
				id: "editor",
				path: "/admin/posts/new",
				summary:
					"Writing in two languages, filing the record, and when Save is greyed out.",
			},
			{
				id: "media",
				path: "/admin/media",
				summary:
					"Uploading, finding a file, and checking where it is used before deleting.",
			},
			{
				id: "forms",
				path: "/admin/forms",
				summary: "Building a form and placing it on a page.",
			},
			{
				id: "formBuilder",
				path: "/admin/forms",
				summary: "Fields, deadlines, and what happens after someone submits.",
				note: "Open a form first",
			},
			{
				id: "formResponses",
				path: "/admin/forms",
				summary: "Reading and exporting what people sent.",
				note: "Open a form's responses first",
			},
			{
				id: "messages",
				path: "/admin/messages",
				summary:
					"Contact-form messages: search, reply through your mail app, delete.",
			},
		],
	},
	{
		label: "Records",
		guides: [
			{
				id: "people",
				path: "/admin/people",
				summary:
					"The team page: tiers, public or internal, and job titles per language.",
			},
			{
				id: "projects",
				path: "/admin/projects",
				summary: "Programmes with their own page, code and schools.",
			},
			{
				id: "schools",
				path: "/admin/schools",
				summary: "Schools by level, province and project.",
			},
			{
				id: "partners",
				path: "/admin/partners",
				summary: "The logo wall, and where its categories come from.",
			},
			{
				id: "donors",
				path: "/admin/donors",
				summary: "Organisations that fund the work.",
			},
			{
				id: "offices",
				path: "/admin/offices",
				summary: "The contact page and the map: HQ, provinces and pins.",
			},
			{
				id: "terms",
				path: "/admin/locations",
				summary: "The lists other screens pick from: locations and categories.",
			},
		],
	},
	{
		label: "Fundraising",
		guides: [
			{
				id: "campaigns",
				path: "/admin/campaigns",
				summary:
					"Goals, what counts as raised, and why a campaign with gifts cannot be deleted.",
			},
			{
				id: "campaignDonations",
				path: "/admin/campaigns",
				summary: "One campaign's gifts and totals.",
				note: "Open a campaign's donations first",
			},
			{
				id: "donations",
				path: "/admin/donations",
				summary: "Every gift, by campaign; pending is not money yet.",
			},
		],
	},
	{
		label: "Site",
		guides: [
			{
				id: "nav",
				path: "/admin/nav",
				summary: "The top bar, the donate button and the menu.",
			},
			{
				id: "footer",
				path: "/admin/footer",
				summary: "Every footer section in one form.",
			},
			{
				id: "orgChart",
				path: "/admin/org-chart",
				summary: "Boxes, who reports to whom, and linking a box to a person.",
			},
			{
				id: "languages",
				path: "/admin/languages",
				summary: "Adding a language and choosing the default.",
			},
			{
				id: "uiStrings",
				path: "/admin/ui-strings",
				summary: "The words the site says itself, per language.",
			},
			{
				id: "settings",
				path: "/admin/settings",
				summary: "Identity, brand, and settings this site invented.",
			},
			{
				id: "modules",
				path: "/admin/modules",
				summary: "Switching whole areas off and on without losing anything.",
			},
		],
	},
	{
		label: "Team",
		guides: [
			{
				id: "users",
				path: "/admin/users",
				summary:
					"Adding colleagues, what they can reach, and how far your own reach goes.",
			},
			{
				id: "roles",
				path: "/admin/roles",
				summary: "A role is a set of areas; the built-in ones and yours.",
			},
			{
				id: "roleEditor",
				path: "/admin/roles",
				summary: "Ticking the areas a role can manage.",
				note: "Open a role first",
			},
		],
	},
];
