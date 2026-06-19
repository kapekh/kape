/** Minimal 24×24 stroke icons (currentColor) for the admin sidebar. */
const PATHS: Record<string, string> = {
	dashboard: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
	posts: "M4 4h16v16H4zM8 9h8M8 13h8M8 17h5",
	pages: "M6 3h9l5 5v13H6zM15 3v5h5",
	projects: "M3 7h6l2 2h10v10H3zM3 7V5h6l2 2",
	nav: "M4 6h16M4 12h16M4 18h16",
	hero: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6",
	stats: "M4 20V10M10 20V4M16 20v-7M22 20H2",
	announcements: "M6 9v6h3l6 4V5L9 9zM18 9a4 4 0 0 1 0 6",
	partners: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20a7 7 0 0 1 14 0M17 11a3 3 0 1 0-1-5.8M22 20a7 7 0 0 0-5-6.7",
	donors: "M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z",
	offices: "M12 21c4-4 7-7.5 7-11a7 7 0 1 0-14 0c0 3.5 3 7 7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
	staff: "M4 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
	media: "M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M9 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z",
	languages: "M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
	settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5a7.5 7.5 0 0 0 0-3l1.9-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-2.6-1.5L13.9 2h-3.8l-.5 2.5a7.5 7.5 0 0 0-2.6 1.5l-2.3-.9-2 3.4L4.6 10.5a7.5 7.5 0 0 0 0 3l-1.9 1.5 2 3.4 2.3-.9a7.5 7.5 0 0 0 2.6 1.5l.5 2.5h3.8l.5-2.5a7.5 7.5 0 0 0 2.6-1.5l2.3.9 2-3.4z",
	tag: "M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9zM7.5 7.5h.01",
};

export function AdminIcon({ name, className }: { name: string; className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
			<path d={PATHS[name] ?? PATHS.tag} />
		</svg>
	);
}
