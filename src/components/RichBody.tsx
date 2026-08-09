import { FORM_ATTR } from "#/lib/richtext/form-node";
import { FormRenderer } from "./FormRenderer";

// Matches the neutral marker emitted by the FormEmbed rich-text node:
// <div data-form-embed="slug" class="form-embed">▤ Form: slug</div>
// The node is an atom (no nested divs), so a non-greedy match to the first
// </div> is safe.
const FORM_RE = new RegExp(
	`<div[^>]*\\b${FORM_ATTR}="([^"]*)"[^>]*>[\\s\\S]*?<\\/div>`,
	"g",
);

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
	if (!html.includes(FORM_ATTR)) {
		return (
			// biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored, server-rendered by renderBody's allow-list
			<div className={className} dangerouslySetInnerHTML={{ __html: html }} />
		);
	}

	const parts: React.ReactNode[] = [];
	let last = 0;
	let i = 0;
	// matchAll clones the regex, so the shared global FORM_RE keeps no lastIndex between calls
	for (const m of html.matchAll(FORM_RE)) {
		const before = html.slice(last, m.index);
		if (before.trim())
			parts.push(
				// biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored, server-rendered by renderBody's allow-list
				<div key={`h${i}`} dangerouslySetInnerHTML={{ __html: before }} />,
			);
		parts.push(<FormRenderer key={`f${i}`} slug={m[1]} />);
		last = m.index + m[0].length;
		i++;
	}
	const after = html.slice(last);
	if (after.trim())
		parts.push(
			// biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored, server-rendered by renderBody's allow-list
			<div key={`h${i}`} dangerouslySetInnerHTML={{ __html: after }} />,
		);

	return <div className={className}>{parts}</div>;
}
