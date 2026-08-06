/** Minimal 24×24 stroke icons (currentColor) for the admin sidebar. */
const PATHS: Record<string, string> = {
	dashboard: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
	modules: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5",
	posts: "M4 4h16v16H4zM8 9h8M8 13h8M8 17h5",
	pages: "M6 3h9l5 5v13H6zM15 3v5h5",
	projects: "M3 7h6l2 2h10v10H3zM3 7V5h6l2 2",
	nav: "M4 6h16M4 12h16M4 18h16",
	hero: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6",
	stats: "M4 20V10M10 20V4M16 20v-7M22 20H2",
	announcements: "M6 9v6h3l6 4V5L9 9zM18 9a4 4 0 0 1 0 6",
	partners:
		"M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20a7 7 0 0 1 14 0M17 11a3 3 0 1 0-1-5.8M22 20a7 7 0 0 0-5-6.7",
	donors:
		"M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z",
	donations:
		"M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
	campaigns: "M3 11l16-7-4 16-4-6-8-3zM11 14l8-10",
	offices:
		"M12 21c4-4 7-7.5 7-11a7 7 0 1 0-14 0c0 3.5 3 7 7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
	staff:
		"M4 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
	media:
		"M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M9 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z",
	languages:
		"M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
	settings:
		"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5a7.5 7.5 0 0 0 0-3l1.9-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-2.6-1.5L13.9 2h-3.8l-.5 2.5a7.5 7.5 0 0 0-2.6 1.5l-2.3-.9-2 3.4L4.6 10.5a7.5 7.5 0 0 0 0 3l-1.9 1.5 2 3.4 2.3-.9a7.5 7.5 0 0 0 2.6 1.5l.5 2.5h3.8l.5-2.5a7.5 7.5 0 0 0 2.6-1.5l2.3.9 2-3.4z",
	tag: "M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9zM7.5 7.5h.01",
	news: "M4 5h13v15H5a1 1 0 0 1-1-1zM17 8h3v10a2 2 0 0 1-2 2M7 9h7M7 13h7M7 17h4",
	story:
		"M12 6c-2-1.5-5-2-8-1v13c3-1 6-.5 8 1 2-1.5 5-2 8-1V5c-3-1-6-.5-8 1zM12 6v13",
	video: "M4 5h16v14H4zM4 9h16M8 5v4M16 5v4M10 12.5l4 2-4 2z",
	gallery:
		"M8 3h13v13H8zM3 8v12a1 1 0 0 0 1 1h12M11.5 8.5a1.3 1.3 0 1 1-2.6 0 1.3 1.3 0 0 1 2.6 0zM21 12l-4-3.5-6 5.5",
	team: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16.5 11.2a3 3 0 0 0-1-5.9M21 20a6 6 0 0 0-3.5-5.5",
	publication: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h5M10 17h5",
	career: "M3 8h18v11H3zM8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18",
	event: "M4 5h16v15H4zM4 9h16M8 3v4M16 3v4M8.5 13h2v2h-2z",
	document: "M7 3h7l5 5v13H7zM14 3v5h5M10 12h6M10 16h4",
	footer: "M4 5h16v14H4zM4 15h16M7 17.5h4",
	message: "M4 5h16v11H8l-4 4zM8 9h8M8 12h5",
	forms:
		"M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 8h6M9 12h6M9 16h4",
};

export function AdminIcon({
	name,
	className,
}: {
	name: string;
	className?: string;
}) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.7}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden="true"
		>
			<path d={PATHS[name] ?? PATHS.tag} />
		</svg>
	);
}
