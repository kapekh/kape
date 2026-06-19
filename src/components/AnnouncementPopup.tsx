import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { useLang } from "@/lib/i18n";
import { localizedHref } from "@/lib/i18n-config";

type Announcement = Awaited<ReturnType<typeof trpcClient.site.announcement.query>>;

/**
 * Floating announcement toast. Client-only (fetched on mount) so prerendered/
 * cached static HTML never freezes a deadline-driven, time-sensitive notice.
 */
export function AnnouncementPopup() {
	const { lang } = useLang();
	const [open, setOpen] = useState(true);
	const [a, setA] = useState<Announcement | null>(null);
	useEffect(() => {
		trpcClient.site.announcement.query({ lang: lang || "" }).then(setA).catch(() => {});
	}, [lang]);

	if (!open || !a) return null;
	return (
		<div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
			<div className="flex items-start justify-between gap-3">
				<div>
					<div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">{a.hasDeadline ? "Announcement" : "KAPE"}</div>
					<h4 className="font-display text-base font-semibold leading-tight text-primary">{a.title}</h4>
					{a.message && <p className="mt-1.5 text-xs text-muted-foreground">{a.message}</p>}
					{a.deadline && (
						<span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--gold)]/20 px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.5_0.12_80)]">⏳ Deadline {a.deadline}</span>
					)}
				</div>
				<button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-xl leading-none text-muted-foreground hover:text-foreground">×</button>
			</div>
			{a.linkUrl && <a href={localizedHref(a.linkUrl, lang)} className="mt-3 inline-block text-xs font-semibold text-primary underline underline-offset-4">Read more →</a>}
		</div>
	);
}
