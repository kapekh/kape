/**
 * A campaign's visual. Uses the uploaded cover photo when present; otherwise
 * renders an on-brand gradient with a thematic education icon chosen
 * deterministically from the slug — so a cover is never bare or broken.
 */

// Paths are 24×24 stroke icons (currentColor).
const ICONS: string[] = [
	"M3 5l9-2 9 2v3l-9 2-9-2zM12 10v8M7 11v5l5 2 5-2v-5", // graduation cap
	"M4 5h7a2 2 0 0 1 2 2v12a3 3 0 0 0-3-2H4zM20 5h-7a2 2 0 0 0-2 2v12a3 3 0 0 1 3-2h6z", // open book
	"M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z", // heart
	"M9 18a3 3 0 1 0 6 0M12 3a6 6 0 0 0-3 11v2h6v-2a6 6 0 0 0-3-11z", // lightbulb / idea
	"M3 13h4l2 5 4-12 2 7h6", // growth pulse
	"M12 2l2.5 5.5L20 8l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z", // star
];
const GRADIENTS: [string, string][] = [
	["var(--primary)", "var(--accent)"],
	["var(--accent)", "var(--secondary)"],
	["var(--secondary)", "var(--primary)"],
	["var(--palm)", "var(--accent)"],
];

function hash(s: string) {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
	return Math.abs(h);
}

export function CampaignCover({
	coverUrl,
	slug,
	alt = "",
	className = "",
	iconClass = "h-20 w-20",
}: {
	coverUrl: string | null;
	slug: string;
	alt?: string;
	className?: string;
	iconClass?: string;
}) {
	if (coverUrl) {
		return <img src={coverUrl} alt={alt} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
	}
	const h = hash(slug);
	const icon = ICONS[h % ICONS.length];
	const [from, to] = GRADIENTS[h % GRADIENTS.length];
	return (
		<div
			className={`relative grid h-full w-full place-items-center overflow-hidden ${className}`}
			style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
			aria-hidden
		>
			{/* soft decorative blobs */}
			<span className="absolute -left-6 -top-6 h-28 w-28 rounded-full bg-white/15 blur-xl" />
			<span className="absolute -bottom-8 -right-4 h-32 w-32 rounded-full bg-black/10 blur-xl" />
			<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className={`relative text-white/90 ${iconClass}`}>
				<path d={icon} />
			</svg>
		</div>
	);
}
