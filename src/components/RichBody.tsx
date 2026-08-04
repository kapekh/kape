import { FormRenderer } from "./FormRenderer";

// Matches the neutral marker emitted by the FormEmbed rich-text node:
// <div data-kape-form="slug" class="kape-form-embed">▤ Form: slug</div>
// The node is an atom (no nested divs), so a non-greedy match to the first
// </div> is safe.
const FORM_RE = /<div[^>]*\bdata-kape-form="([^"]*)"[^>]*>[\s\S]*?<\/div>/g;

/**
 * Renders authored rich-text HTML, but turns embedded form markers into real
 * <FormRenderer/> React nodes inline. This keeps forms as first-class React
 * siblings (no portals into dangerouslySetInnerHTML, which crashes on
 * re-render) — so a form can live anywhere prose renders.
 */
export function RichBody({
	html,
	className,
}: {
	html: string;
	className?: string;
}) {
	if (!html) return null;
	if (!html.includes("data-kape-form")) {
		// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted, server-rendered
		return (
			<div className={className} dangerouslySetInnerHTML={{ __html: html }} />
		);
	}

	const parts: React.ReactNode[] = [];
	let last = 0;
	let i = 0;
	let m: RegExpExecArray | null;
	FORM_RE.lastIndex = 0;
	// eslint-disable-next-line no-cond-assign
	while ((m = FORM_RE.exec(html)) !== null) {
		const before = html.slice(last, m.index);
		// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted, server-rendered
		if (before.trim())
			parts.push(
				<div key={`h${i}`} dangerouslySetInnerHTML={{ __html: before }} />,
			);
		parts.push(<FormRenderer key={`f${i}`} slug={m[1]} />);
		last = m.index + m[0].length;
		i++;
	}
	const after = html.slice(last);
	// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted, server-rendered
	if (after.trim())
		parts.push(
			<div key={`h${i}`} dangerouslySetInnerHTML={{ __html: after }} />,
		);

	return <div className={className}>{parts}</div>;
}
