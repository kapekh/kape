import { useLang, LanguageSwitcher } from "@/lib/i18n";

import type { NavNode } from "#/server/repo/nav";

/** Append the active language to internal hrefs so navigation preserves it. */
function withLang(href: string | null, lang: string): string | undefined {
	if (!href) return undefined;
	if (/^https?:\/\//.test(href)) return href; // external — leave as-is
	return lang && lang !== "en" ? `${href}?lang=${lang}` : href;
}

function DropdownItem({ item, lang }: { item: NavNode; lang: string }) {
	// Item with its own children → render as a labeled group.
	if (item.children.length > 0) {
		return (
			<div className="py-2">
				<div className="px-4 py-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
					{item.label}
				</div>
				<div className="mt-1">
					{item.children.map((c) => (
						<a
							key={c.id}
							href={withLang(c.href, lang)}
							className="block rounded-lg px-4 py-2 text-sm text-foreground/80 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition"
						>
							{c.label}
						</a>
					))}
				</div>
			</div>
		);
	}

	const href = withLang(item.href, lang);
	if (href) {
		return (
			<a
				href={href}
				className="block rounded-lg px-4 py-2.5 text-sm text-foreground/80 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition"
			>
				{item.label}
			</a>
		);
	}
	return (
		<span className="block rounded-lg px-4 py-2.5 text-sm text-foreground/60 cursor-default">
			{item.label}
		</span>
	);
}

export function Header({ nav, settings }: { nav: NavNode[]; settings: Record<string, string> }) {
	const { lang, t } = useLang();
	const contact = [settings.contact_phone, settings.contact_email].filter(Boolean).join(" · ");

	return (
		<>
			{/* Top utility bar */}
			<div className="border-b border-border/60 bg-primary text-primary-foreground text-xs">
				<div className="mx-auto max-w-7xl px-6 py-2 flex items-center justify-between">
					<span className="opacity-80">{contact || t("top.contact")}</span>
					<div className="flex items-center gap-4 opacity-80">
						<a href="#" className="hover:text-[var(--secondary)] transition">{t("top.search")}</a>
						<a href="#" className="hover:text-[var(--secondary)] transition">{t("top.sitemap")}</a>
						<LanguageSwitcher />
					</div>
				</div>
			</div>

			{/* Header */}
			<header className="sticky top-0 z-40 backdrop-blur-md bg-background/85 border-b border-border/60">
				<div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-6">
					<a href={withLang("/", lang)} className="flex items-center gap-3">
						<div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-[var(--secondary)] to-[var(--accent)] grid place-items-center text-primary-foreground font-display font-bold text-xl shadow-[var(--shadow-lift)]">
							K
							<span className="absolute inset-0 rounded-full ring-2 ring-[var(--gold)]/40" />
						</div>
						<div className="leading-tight">
							<div className="font-khmer text-[13px] text-primary">អង្គការសកម្មភាពសម្រាប់ការអប់រំនៅកម្ពុជា</div>
							<div className="font-display font-semibold text-primary text-[15px]">Kampuchea Action to Promote Education</div>
						</div>
					</a>
					<nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-foreground/80">
						{nav.map((n) => {
							const hasChildren = n.children.length > 0;
							const wide =
								n.children.some((c) => c.children.length > 0) || n.children.length > 7;
							const href = withLang(n.href, lang);
							return (
								<div key={n.id} className="relative py-2 group">
									{!hasChildren && href ? (
										<a href={href} className="relative flex items-center gap-1 hover:text-primary transition">
											{n.label}
											<span className="absolute -bottom-0.5 left-0 h-0.5 w-0 bg-[var(--accent)] transition-all group-hover:w-full" />
										</a>
									) : (
										<span className="relative flex items-center gap-1 hover:text-primary transition cursor-default">
											{n.label}
											{hasChildren && (
												<svg className="h-3 w-3 opacity-60 transition-transform group-hover:rotate-180" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
													<path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
												</svg>
											)}
											<span className="absolute -bottom-0.5 left-0 h-0.5 w-0 bg-[var(--accent)] transition-all group-hover:w-full" />
										</span>
									)}
									{hasChildren && (
										<div className="invisible opacity-0 translate-y-2 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50">
											<div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] p-2">
												{wide ? (
													<div className="grid grid-cols-2 gap-2 min-w-[420px]">
														{n.children.map((s) => (
															<DropdownItem key={s.id} item={s} lang={lang} />
														))}
													</div>
												) : (
													<div className="min-w-[260px]">
														{n.children.map((s) => (
															<DropdownItem key={s.id} item={s} lang={lang} />
														))}
													</div>
												)}
											</div>
										</div>
									)}
								</div>
							);
						})}
					</nav>
					<a
						href="#donate"
						className="hidden md:inline-flex items-center gap-2 rounded-full bg-[var(--accent)] text-accent-foreground px-5 py-2.5 text-sm font-semibold shadow-[var(--shadow-lift)] hover:translate-y-[-2px] transition-transform"
					>
						{t("nav.donate")}
					</a>
				</div>
			</header>
		</>
	);
}
