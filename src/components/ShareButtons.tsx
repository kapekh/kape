import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useT } from "@/lib/i18n";

const SITE_URL =
	(import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") ??
	"";

/**
 * Facebook + Telegram share for a content detail page. The shared address is the
 * live language-prefixed pathname, so /km/… shares the Khmer URL. Origin comes
 * from VITE_SITE_URL when configured and from the browser otherwise — SSR has no
 * origin to guess.
 */
export function ShareButtons({ title }: { title: string }) {
	const t = useT();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const [origin, setOrigin] = useState(SITE_URL);

	useEffect(() => {
		if (!SITE_URL) setOrigin(window.location.origin);
	}, []);

	const u = encodeURIComponent(`${origin}${pathname}`);
	const text = encodeURIComponent(title);
	const links = [
		{
			label: t("share.facebook", "Facebook"),
			href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
		},
		{
			label: t("share.telegram", "Telegram"),
			href: `https://t.me/share/url?url=${u}&text=${text}`,
		},
	];

	return (
		<div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border pt-6">
			<span className="mr-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
				{t("share.label", "Share")}
			</span>
			{links.map((l) => (
				<a
					key={l.href}
					href={l.href}
					target="_blank"
					rel="noreferrer"
					className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
				>
					{l.label}
				</a>
			))}
		</div>
	);
}
