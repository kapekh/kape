import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import type { SectionNode } from "#/lib/sections";

import { SectionRenderer } from "../sections/SectionRenderer";

/** The shape a page takes, so the largest area on screen says what a section is. */
function EmptyPreview() {
	const block = "rounded-xl border border-dashed border-admin-border";
	return (
		<div className="mx-auto max-w-3xl px-6 py-12 text-center">
			<div aria-hidden="true" className="space-y-3 text-left">
				<div className={`${block} grid h-32 place-items-center bg-admin-panel`}>
					<span className="text-[13px] text-admin-ink-subtle">
						Hero — a headline and a picture
					</span>
				</div>
				<div className="grid gap-3 sm:grid-cols-3">
					{["Cards", "Posts", "Partners"].map((label) => (
						<div
							key={label}
							className={`${block} grid h-20 place-items-center bg-admin-panel text-[13px] text-admin-ink-subtle`}
						>
							{label}
						</div>
					))}
				</div>
				<div className={`${block} grid h-16 place-items-center bg-admin-panel`}>
					<span className="text-[13px] text-admin-ink-subtle">
						Call to action
					</span>
				</div>
			</div>
			<p className="mt-6 text-base font-semibold text-admin-ink">
				Nothing to preview yet
			</p>
			<p className="mt-1 text-sm text-admin-ink-muted">
				Add a section on the left and it appears here, in the order visitors
				will read it. Nothing here is saved until you save the page.
			</p>
		</div>
	);
}

export function PagePreview({ sections }: { sections: SectionNode[] }) {
	const [resolved, setResolved] = useState<SectionNode[]>(sections);
	const [loading, setLoading] = useState(false);
	const key = JSON.stringify(sections);

	// biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the serialised sections; the array identity changes every render
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
	}, [key]);

	if (!sections.length) {
		return <EmptyPreview />;
	}

	return (
		<div className="relative">
			{loading && (
				<div className="absolute right-4 top-4 z-10 rounded-full bg-admin-accent px-3 py-1 text-[13px] font-medium text-accent-foreground shadow-[var(--shadow-soft)]">
					Updating…
				</div>
			)}
			<div className="origin-top">
				<SectionRenderer sections={resolved} />
			</div>
		</div>
	);
}
