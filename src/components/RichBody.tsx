import { FORM_ATTR } from "#/lib/richtext/form-node";
import { FormRenderer } from "./FormRenderer";

// the form-embed node is an atom, so non-greedy to the first </div> is safe
const FORM_RE = new RegExp(
	`<div[^>]*\\b${FORM_ATTR}="([^"]*)"[^>]*>[\\s\\S]*?<\\/div>`,
	"g",
);

// real React siblings: portals into dangerouslySetInnerHTML crash on re-render
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
