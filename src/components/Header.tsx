import { useEffect, useRef, useState } from "react";

import { useLang, LanguageSwitcher } from "@/lib/i18n";
import { localizedHref } from "@/lib/i18n-config";

import { NavLink } from "./NavLink";
import { ThemeToggle } from "./ThemeToggle";
import type { NavNode } from "#/server/repo/nav";

/** Prefix internal hrefs with the active language (path-based i18n). */
const withLang = (href: string | null, lang: string): string | undefined => localizedHref(href, lang);

/* ------------------------------------------------------------------ */
/* Desktop mega menu                                                   */
/* ------------------------------------------------------------------ */

/**
 * Bento span for a (leaf) tile, varied by position so the grid reads as a dynamic
 * bento rather than a uniform grid. Deterministic; spans apply at lg+.
 */
function bentoSpan(i: number, total: number): string {
	if (i === 0 && total >= 5) return "lg:col-span-2 lg:row-span-2"; // hero
	if (i >= 3 && (i - 3) % 5 === 0 && i < total - 2) return "lg:col-span-2"; // wide accent
	return "";
}

/** A bento tile: full-bleed image (or brand gradient) with the label + brief overlaid. */
function MegaBentoCard({
	item,
	lang,
	onNavigate,
	span,
	feature,
}: {
	item: NavNode;
	lang: string;
	onNavigate: () => void;
	span: string;
	feature: boolean;
}) {
	const href = withLang(item.href, lang);
	const cls = `group relative block overflow-hidden rounded-2xl border border-border bg-primary transition hover:shadow-[var(--shadow-soft)] ${span}`;
	const inner = (
		<>
			{item.imageUrl ? (
				<img
					src={item.imageUrl}
					alt=""
					loading="lazy"
					className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
				/>
			) : (
				<span className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]" />
			)}
			{/* Frosted-glass fade: clear at the top, blurred toward the bottom (masked so the
			    backdrop-blur fades out upward) for legible text on any image. */}
			<span className="absolute inset-0 backdrop-blur-md [mask-image:linear-gradient(to_top,#000_0%,#000_28%,transparent_72%)] [-webkit-mask-image:linear-gradient(to_top,#000_0%,#000_28%,transparent_72%)]" />
			{/* Dark gradient: 0% opacity at the top → opaque at the bottom. */}
			<span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
			<span className="absolute inset-x-0 bottom-0 block p-4 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
				<span className={`block font-display font-semibold text-white ${feature ? "text-lg" : "text-sm"}`}>
					{item.label}
				</span>
				{item.description && (
					<span className={`mt-1 block text-white/85 ${feature ? "text-sm" : "text-xs"} line-clamp-2`}>
						{item.description}
					</span>
				)}
			</span>
		</>
	);
	return href ? (
		<NavLink href={href} onClick={onNavigate} className={cls}>
			{inner}
		</NavLink>
	) : (
		<div className={cls}>{inner}</div>
	);
}

/** A bento grid of leaf tiles. `fill` makes it stretch to the panel height (flat sections). */
function MegaBentoGrid({
	items,
	lang,
	onNavigate,
	fill,
}: {
	items: NavNode[];
	lang: string;
	onNavigate: () => void;
	fill?: boolean;
}) {
	return (
		<div
			className={`grid grid-flow-row-dense grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4 ${fill ? "h-full" : ""}`}
			style={{ gridAutoRows: "minmax(150px, 1fr)" }}
		>
			{items.map((c, i) => {
				const span = bentoSpan(i, items.length);
				return (
					<MegaBentoCard
						key={c.id}
						item={c}
						lang={lang}
						onNavigate={onNavigate}
						span={span}
						feature={span.includes("row-span-2")}
					/>
				);
			})}
		</div>
	);
}

/** A full-width section: an L2 title/brief with its level-3 items, toggleable
 *  between a grid and a horizontally-scrolling row. */
function MegaSection({ item, lang, onNavigate }: { item: NavNode; lang: string; onNavigate: () => void }) {
	const href = withLang(item.href, lang);
	const [mode, setMode] = useState<"grid" | "scroll">("grid");
	const modeBtn = (active: boolean) =>
		`grid h-7 w-7 place-items-center rounded-md transition ${
			active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
		}`;
	return (
		<section>
			<div className="mb-3 flex items-start justify-between gap-4 border-b border-border pb-2">
				<div className="min-w-0">
					<h2 className="font-display text-lg font-semibold text-primary">
						{href ? (
							<NavLink href={href} onClick={onNavigate} className="hover:text-[var(--accent)] transition">
								{item.label}
							</NavLink>
						) : (
							item.label
						)}
					</h2>
					{item.description && <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>}
				</div>
				{/* View-mode toggle: grid ⇆ horizontal scroll. */}
				<div className="flex flex-none items-center gap-0.5 rounded-lg border border-border p-0.5">
					<button type="button" aria-pressed={mode === "grid"} aria-label="Grid view" onClick={() => setMode("grid")} className={modeBtn(mode === "grid")}>
						<svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
							<rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" />
							<rect x="9" y="1.5" width="5.5" height="5.5" rx="1" />
							<rect x="1.5" y="9" width="5.5" height="5.5" rx="1" />
							<rect x="9" y="9" width="5.5" height="5.5" rx="1" />
						</svg>
					</button>
					<button type="button" aria-pressed={mode === "scroll"} aria-label="Scrolling row view" onClick={() => setMode("scroll")} className={modeBtn(mode === "scroll")}>
						<svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
							<rect x="1.5" y="3.5" width="3.5" height="9" rx="1" />
							<rect x="6.25" y="3.5" width="3.5" height="9" rx="1" />
							<rect x="11" y="3.5" width="3.5" height="9" rx="1" />
						</svg>
					</button>
				</div>
			</div>
			{/* Level-3: same card style as the L2 tiles, as a grid or a scrolling row. */}
			{mode === "grid" ? (
				<div
					className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
					style={{ gridAutoRows: "minmax(150px, 1fr)" }}
				>
					{item.children.map((c) => (
						<MegaBentoCard key={c.id} item={c} lang={lang} onNavigate={onNavigate} span="" feature={false} />
					))}
				</div>
			) : (
				<div className="flex gap-4 overflow-x-auto thin-scroll pb-2">
					{item.children.map((c) => (
						<MegaBentoCard key={c.id} item={c} lang={lang} onNavigate={onNavigate} span="h-44 w-60 flex-none" feature={false} />
					))}
				</div>
			)}
		</section>
	);
}

/* ------------------------------------------------------------------ */
/* Mobile menu                                                         */
/* ------------------------------------------------------------------ */

/** Recursive accordion row for the mobile drawer. */
function MobileNode({ node, lang, onNavigate }: { node: NavNode; lang: string; onNavigate: () => void }) {
	const [open, setOpen] = useState(false);
	const hasChildren = node.children.length > 0;
	const href = withLang(node.href, lang);

	if (!hasChildren) {
		return (
			<NavLink
				href={href || withLang("/", lang)}
				onClick={onNavigate}
				className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted transition"
			>
				{node.imageUrl ? (
					<img src={node.imageUrl} alt="" loading="lazy" className="h-10 w-12 flex-none rounded-md object-cover" />
				) : (
					<span className="h-10 w-12 flex-none rounded-md bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]" />
				)}
				<span className="min-w-0">
					<span className="block text-sm font-medium text-foreground/85">{node.label}</span>
					{node.description && (
						<span className="block truncate text-xs text-muted-foreground">{node.description}</span>
					)}
				</span>
			</NavLink>
		);
	}

	return (
		<div>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				aria-expanded={open}
				className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:bg-muted transition"
			>
				<span>{node.label}</span>
				<svg
					className={`h-4 w-4 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
					viewBox="0 0 12 12"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
				>
					<path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</button>
			{open && (
				<div className="ml-3 mt-0.5 border-l border-border pl-2">
					{href && (
						<NavLink
							href={href}
							onClick={onNavigate}
							className="block rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-[var(--accent)] transition"
						>
							Overview
						</NavLink>
					)}
					{node.children.map((c) => (
						<MobileNode key={c.id} node={c} lang={lang} onNavigate={onNavigate} />
					))}
				</div>
			)}
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

export function Header({ nav, settings }: { nav: NavNode[]; settings: Record<string, string> }) {
	const { lang, t } = useLang();
	const [openId, setOpenId] = useState<number | null>(null);
	const [mobileOpen, setMobileOpen] = useState(false);
	const headerRef = useRef<HTMLElement>(null);
	// Where the header's bottom edge sits in the viewport — the open mega panel
	// starts here and fills the rest of the screen (always 100dvh tall total).
	const [panelTop, setPanelTop] = useState(0);

	const contact = [settings.contact_phone, settings.contact_email].filter(Boolean).join(" · ");
	// Header chrome bits (editable in the "Header" admin page via site_settings).
	const donate = settings.header_donate_label || t("nav.donate");
	const donateHref = withLang(settings.header_donate_link || "#donate", lang);
	const searchHref = withLang(settings.header_search_link || "#", lang);
	const sitemapHref = withLang(settings.header_sitemap_link || "#", lang);

	// Close everything on Escape.
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") {
				setOpenId(null);
				setMobileOpen(false);
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	// Lock body scroll while the mobile drawer OR a desktop mega panel is open.
	useEffect(() => {
		const locked = mobileOpen || openId != null;
		document.body.style.overflow = locked ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [mobileOpen, openId]);

	// While a mega panel is open, track the header's bottom edge so the panel can
	// pin there and stretch to the viewport bottom (the top utility bar scrolls away).
	useEffect(() => {
		if (openId == null) return;
		const measure = () => {
			const el = headerRef.current;
			if (el) setPanelTop(Math.max(0, Math.round(el.getBoundingClientRect().bottom)));
		};
		measure();
		window.addEventListener("scroll", measure, { passive: true });
		window.addEventListener("resize", measure);
		return () => {
			window.removeEventListener("scroll", measure);
			window.removeEventListener("resize", measure);
		};
	}, [openId]);

	const openNode = openId != null ? nav.find((n) => n.id === openId) ?? null : null;
	const closeAll = () => {
		setOpenId(null);
		setMobileOpen(false);
	};

	return (
		<>
			{/* Top utility bar */}
			<div className="border-b border-border/60 bg-primary text-primary-foreground text-xs" style={{ viewTransitionName: "site-topbar" }}>
				<div className="mx-auto max-w-7xl px-6 py-2 flex items-center justify-between">
					<span className="opacity-80">{contact || t("top.contact")}</span>
					<div className="flex items-center gap-4 opacity-80">
						<a href={searchHref} className="hover:text-[var(--secondary)] transition">{t("top.search")}</a>
						<a href={sitemapHref} className="hover:text-[var(--secondary)] transition">{t("top.sitemap")}</a>
						<LanguageSwitcher />
						<ThemeToggle className="h-6 w-6 text-primary-foreground/80 hover:bg-white/10" />
					</div>
				</div>
			</div>

			{/* Header + mega panel share a hover region so moving into the panel doesn't close it.
			    The sticky lives HERE (not on <header>) because a sticky element only sticks within
			    its parent's box — this wrapper's parent is <body>, so it stays pinned page-wide. */}
			<div onMouseLeave={() => setOpenId(null)} className="sticky top-0 z-40">
			<header
				ref={headerRef}
				className="relative backdrop-blur-md bg-background/85 border-b border-border/60"
				style={{ viewTransitionName: "site-header" }}
			>
				<div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-6">
					<NavLink href={withLang("/", lang)} className="flex items-center gap-3" onClick={closeAll}>
						<img src="/logo.png" alt="KAPE" className="h-12 w-12 shrink-0 rounded-full object-cover shadow-[var(--shadow-lift)] ring-1 ring-border" />
						<div className="leading-tight">
							<div className="font-khmer text-[13px] text-primary">អង្គការសកម្មភាពសម្រាប់ការអប់រំនៅកម្ពុជា</div>
							<div className="font-display font-semibold text-primary text-[15px]">Kampuchea Action to Promote Education</div>
						</div>
					</NavLink>

					{/* Desktop nav */}
					<nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-foreground/80">
						{nav.map((n) => {
							const hasChildren = n.children.length > 0;
							const href = withLang(n.href, lang);
							const active = openId === n.id;
							const underline = (
								<span
									className={`absolute -bottom-0.5 left-0 h-0.5 bg-[var(--accent)] transition-all ${active ? "w-full" : "w-0"}`}
								/>
							);
							// Leaf items (no children) are always links — never dropdown triggers.
							// A leaf with no target falls back to the home page.
							if (!hasChildren) {
								return (
									<div key={n.id} className="relative py-2">
										<NavLink
											href={href || withLang("/", lang)}
											onMouseEnter={() => setOpenId(null)}
											className="group relative flex items-center gap-1 hover:text-primary transition"
										>
											{n.label}
											<span className="absolute -bottom-0.5 left-0 h-0.5 w-0 bg-[var(--accent)] transition-all group-hover:w-full" />
										</NavLink>
									</div>
								);
							}
							return (
								<div key={n.id} className="relative py-2">
									<button
										type="button"
										onMouseEnter={() => setOpenId(hasChildren ? n.id : null)}
										onFocus={() => setOpenId(hasChildren ? n.id : null)}
										onClick={() => setOpenId(active ? null : n.id)}
										aria-expanded={active}
										className={`relative flex items-center gap-1 transition ${active ? "text-primary" : "hover:text-primary"}`}
									>
										{n.label}
										{hasChildren && (
											<svg
												className={`h-3 w-3 opacity-60 transition-transform ${active ? "rotate-180" : ""}`}
												viewBox="0 0 12 12"
												fill="none"
												stroke="currentColor"
												strokeWidth="1.8"
											>
												<path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										)}
										{underline}
									</button>
								</div>
							);
						})}
					</nav>

					<div className="flex items-center gap-3">
						<NavLink
							href={donateHref}
							className="hidden md:inline-flex items-center gap-2 rounded-full bg-[var(--accent)] text-accent-foreground px-5 py-2.5 text-sm font-semibold shadow-[var(--shadow-lift)] hover:translate-y-[-2px] transition-transform"
						>
							{donate}
						</NavLink>
						{/* Mobile menu trigger */}
						<button
							type="button"
							onClick={() => setMobileOpen(true)}
							aria-label="Open menu"
							className="lg:hidden grid h-10 w-10 place-items-center rounded-full border border-border text-primary hover:bg-muted transition"
						>
							<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
							</svg>
						</button>
					</div>
				</div>

				</header>

				{/* Mega panel — rendered OUTSIDE the header so its backdrop-filter frosts the PAGE
				    behind it (not the header's stacking context). Fixed under the header's bottom edge,
				    filling to the viewport bottom. */}
				{openNode && (
					<div
						className="hidden lg:block fixed inset-x-0 z-40 overflow-y-auto bg-card/80 backdrop-blur-2xl border-b border-border/60 shadow-[var(--shadow-soft)] thin-scroll animate-[mega-in_0.2s_ease-out] motion-reduce:animate-none"
						style={{ top: panelTop, height: `calc(100dvh - ${panelTop}px)` }}
					>
						<div key={openId} className="mx-auto flex h-full max-w-7xl flex-col px-6 py-8 animate-[mega-content-in_0.28s_ease-out] motion-reduce:animate-none">
							{(() => {
								const kids = openNode.children;
								const grouped = kids.some((c) => c.children.length > 0);
								// Flat section: one bento that fills the panel height.
								if (!grouped) {
									return <MegaBentoGrid items={kids} lang={lang} onNavigate={closeAll} fill />;
								}
								// Mixed: leaf L2s (no level-3) shown first as one bento block for clean
								// separation, then each L2-with-children as a full-width titled section.
								const leaves = kids.filter((c) => c.children.length === 0);
								const sections = kids.filter((c) => c.children.length > 0);
								return (
									<div className="flex flex-col gap-8">
										{leaves.length > 0 && (
											<MegaBentoGrid items={leaves} lang={lang} onNavigate={closeAll} />
										)}
										{sections.map((c) => (
											<MegaSection key={c.id} item={c} lang={lang} onNavigate={closeAll} />
										))}
									</div>
								);
							})()}
						</div>
					</div>
				)}
			</div>

			{/* Mobile drawer */}
			{mobileOpen && (
				<div className="lg:hidden fixed inset-0 z-50 h-[100dvh]">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
					<div className="absolute right-0 top-0 flex h-[100dvh] w-[88%] max-w-sm flex-col bg-card shadow-2xl">
						<div className="flex items-center justify-between border-b border-border px-4 py-4">
							<span className="font-display font-semibold text-primary">{t("nav.menu", "Menu")}</span>
							<button
								type="button"
								onClick={() => setMobileOpen(false)}
								aria-label="Close menu"
								className="grid h-9 w-9 place-items-center rounded-full border border-border text-foreground/70 hover:bg-muted transition"
							>
								<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
									<path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
								</svg>
							</button>
						</div>
						<div className="flex-1 overflow-y-auto thin-scroll p-3">
							{nav.map((n) => (
								<MobileNode key={n.id} node={n} lang={lang} onNavigate={() => setMobileOpen(false)} />
							))}
						</div>
						<div className="flex items-center justify-between gap-3 border-t border-border px-4 py-4">
							<LanguageSwitcher />
							<NavLink
								href={donateHref}
								onClick={() => setMobileOpen(false)}
								className="inline-flex items-center rounded-full bg-[var(--accent)] text-accent-foreground px-5 py-2.5 text-sm font-semibold shadow-[var(--shadow-lift)]"
							>
								{donate}
							</NavLink>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
