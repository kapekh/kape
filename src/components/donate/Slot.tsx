import type { ReactNode } from "react";

// the sentence stays one key, so a translator can move the slot where Khmer word order puts it
export function Slot({
	text,
	name,
	children,
}: {
	text: string;
	name: string;
	children: ReactNode;
}) {
	// an edited string that lost its slot still renders the link, at the end
	const [before, after] = text.split(`{${name}}`);
	return (
		<>
			{before}
			{children}
			{after}
		</>
	);
}
