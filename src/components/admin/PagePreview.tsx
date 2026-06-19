import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import type { SectionNode } from "#/lib/sections";

import { SectionRenderer } from "../sections/SectionRenderer";

/**
 * Live preview of the page-builder sections. Resolves dynamic queries + rich text
 * server-side (debounced) so the preview is faithful to what the public page renders.
 */
export function PagePreview({ sections }: { sections: SectionNode[] }) {
	const [resolved, setResolved] = useState<SectionNode[]>(sections);
	const [loading, setLoading] = useState(false);
	const key = JSON.stringify(sections);

	useEffect(() => {
		if (!sections.length) {
			setResolved([]);
			return;
		}
		setLoading(true);
		const t = setTimeout(() => {
			trpcClient.adminPages.preview
				.query({ sections, lang: "en" })
				.then((r) => setResolved(r as SectionNode[]))
				.catch(() => setResolved(sections))
				.finally(() => setLoading(false));
		}, 350);
		return () => clearTimeout(t);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);

	if (!sections.length) {
		return (
			<div className="grid h-64 place-items-center text-sm text-muted-foreground">
				Add a section to see a live preview.
			</div>
		);
	}

	return (
		<div className="relative">
			{loading && (
				<div className="absolute right-3 top-3 z-10 rounded-full bg-primary/90 px-3 py-1 text-xs font-medium text-primary-foreground">
					Updating…
				</div>
			)}
			<div className="origin-top">
				<SectionRenderer sections={resolved} />
			</div>
		</div>
	);
}
