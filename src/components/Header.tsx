import { useEffect, useRef, useState } from "react";
import type { NavNode } from "#/server/repo/nav";
import { LanguageSwitcher, useLang } from "@/lib/i18n";
import { localizedHref } from "@/lib/i18n-config";
import { siteLogo, siteName, siteShortName } from "@/lib/site-identity";
import { NavLink } from "./NavLink";
import { ThemeToggle } from "./ThemeToggle";

/** Prefix internal hrefs with the active language (path-based i18n). */
const withLang = (href: string | null, lang: string): string | undefined =>
	localizedHref(href, lang);

/* ------------------------------------------------------------------ */
/* Desktop mega menu                                                   */
/* ------------------------------------------------------------------ */

const HEADING =
	"text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground";

/** One nav destination: label, and a single line of brief under it. No card, no image. */
function MegaLink({
	item,
	lang,
	onNavigate,
}: {
	item: NavNode;
	lang: string;
	onNavigate: () => void;
}) {
	const href = withLang(item.href, lang);
	const cls = "group block break-inside-avoid py-1.5";
	// A brief that just restates the label ("CLASS — the CLASS project") says
	// nothing new. Only one that opens on new words earns its line.
	const brief = item.description
		?.toLowerCase()
		.startsWith(item.label.toLowerCase())
		? null
		: item.description;
	const inner = (
		<>
			<span className="block text-sm text-foreground/85 transition group-hover:text-[var(--accent)]">
				{item.label}
			</span>
			{/* one line, always: the brief is a hint, not a summary. no `block` here,
			    it would outrank the display line-clamp needs */}
			{brief && (
				<span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
					{brief}
				</span>
			)}
		</>
	);
	return href ? (
		<NavLink href={href} onClick={onNavigate} className={cls}>
			{inner}
		</NavLink>
	) : (
		<span className={cls}>{inner}</span>
	);
}

/** Links flowing down then across, so a long list stays short instead of stretching the panel. */
function MegaLinks({
	items,
	lang,
	onNavigate,
	columns,
}: {
	items: NavNode[];
	lang: string;
	onNavigate: () => void;
	columns: number;
}) {
	return (
		<div style={{ columnCount: columns, columnGap: "2rem" }}>
			{items.map((c) => (
				<MegaLink key={c.id} item={c} lang={lang} onNavigate={onNavigate} />
			))}
		</div>
	);
}

/** A titled column of level-3 links. */
function MegaSection({
	item,
	lang,
	onNavigate,
}: {
	item: NavNode;
	lang: string;
	onNavigate: () => void;
}) {
	const href = withLang(item.href, lang);
	return (
		<section>
			<h2 className="mb-2">
				{href ? (
					<NavLink
						href={href}
						onClick={onNavigate}
						className={`${HEADING} transition hover:text-[var(--accent)]`}
					>
						{item.label}
					</NavLink>
				) : (
					<span className={HEADING}>{item.label}</span>
				)}
			</h2>
			{/* one column: a brief needs the width to land on one line */}
			<MegaLinks
				items={item.children}
				lang={lang}
				onNavigate={onNavigate}
				columns={1}
			/>
		</section>
	);
}

/* ------------------------------------------------------------------ */
/* Mobile menu                                                         */
/* ------------------------------------------------------------------ */

/** Recursive accordion row for the mobile drawer. */
function MobileNode({
	node,
	lang,
	onNavigate,
}: {
	node: NavNode;
	lang: string;
	onNavigate: () => void;
}) {
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
					<img
						src={node.imageUrl}
						alt=""
						loading="lazy"
						className="h-10 w-12 flex-none rounded-md object-cover"
					/>
				) : (
					<span className="h-10 w-12 flex-none rounded-md bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]" />
				)}
				<span className="min-w-0">
					<span className="block text-sm font-medium text-foreground/85">
						{node.label}
					</span>
					{node.description && (
						<span className="block truncate text-xs text-muted-foreground">
							{node.description}
						</span>
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
					aria-hidden="true"
					className={`h-4 w-4 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
					viewBox="0 0 12 12"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
				>
					<path
						d="M3 4.5L6 7.5L9 4.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
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
						<MobileNode
							key={c.id}
							node={c}
							lang={lang}
							onNavigate={onNavigate}
						/>
					))}
				</div>
			)}
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

export function Header({
	nav,
	settings,
}: {
	nav: NavNode[];
	settings: Record<string, string>;
}) {
	const { lang, t } = useLang();
	const [openId, setOpenId] = useState<number | null>(null);
	const [mobileOpen, setMobileOpen] = useState(false);
	const headerRef = useRef<HTMLElement>(null);
	// Where the header's bottom edge sits in the viewport — the open mega panel
	// hangs from here.
	const [panelTop, setPanelTop] = useState(0);
	const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const contact = [settings.contact_phone, settings.contact_email]
		.filter(Boolean)
		.join(" · ");
	// Header chrome bits (editable in the "Header" admin page via site_settings).
	const donate = settings.header_donate_label || t("nav.donate");
	const donateHref = withLang(settings.header_donate_link || "#donate", lang);
	const searchHref = withLang(settings.header_search_link || "#", lang);
	const sitemapHref = withLang(settings.header_sitemap_link || "#", lang);
	// a labelled control must not hand a reader a machine file (/sitemap.xml)
	const isPageHref = (h?: string) => !!h && !/\.[a-z0-9]+(?:[?#]|$)/i.test(h);
	// Only show "Search" when it points at a real, distinct destination — otherwise
	// it's a labelled control that just opens the sitemap (or nowhere).
	const showSearch =
		!!searchHref &&
		searchHref !== "#" &&
		searchHref !== sitemapHref &&
		isPageHref(settings.header_search_link);
	const showSitemap = isPageHref(settings.header_sitemap_link);

	// Close everything on Escape. A pending hover-open dies with it, or the panel
	// reappears a fraction of a second after the reader dismissed it.
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") {
				if (hoverTimer.current) clearTimeout(hoverTimer.current);
				setOpenId(null);
				setMobileOpen(false);
			}
		}
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("keydown", onKey);
			if (hoverTimer.current) clearTimeout(hoverTimer.current);
		};
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
			if (el)
				setPanelTop(Math.max(0, Math.round(el.getBoundingClientRect().bottom)));
		};
		measure();
		window.addEventListener("scroll", measure, { passive: true });
		window.addEventListener("resize", measure);
		return () => {
			window.removeEventListener("scroll", measure);
			window.removeEventListener("resize", measure);
		};
	}, [openId]);

	const openNode =
		openId != null ? (nav.find((n) => n.id === openId) ?? null) : null;
	const cancelHover = () => {
		if (hoverTimer.current) clearTimeout(hoverTimer.current);
		hoverTimer.current = null;
	};
	// Hover intent: a cursor crossing the nav on its way to Donate should not flash
	// three panels open. Only the first open waits; switching between triggers while
	// a panel is already up is instant, and leaving gets a grace period to come back.
	const hoverOpen = (id: number | null) => {
		cancelHover();
		if (id == null || openId != null) {
			setOpenId(id);
			return;
		}
		hoverTimer.current = setTimeout(() => setOpenId(id), 200);
	};
	const hoverClose = () => {
		cancelHover();
		hoverTimer.current = setTimeout(() => setOpenId(null), 300);
	};
	const closeAll = () => {
		cancelHover();
		setOpenId(null);
		setMobileOpen(false);
	};

	return (
		<>
			{/* Top utility bar */}
			<div
				className="border-b border-border/60 bg-primary text-primary-foreground text-xs"
				style={{ viewTransitionName: "site-topbar" }}
			>
				<div className="mx-auto max-w-7xl px-6 py-2 flex items-center justify-between">
					<span className="hidden opacity-80 sm:inline">{contact}</span>
					<div className="flex items-center gap-3 opacity-80 sm:gap-4">
						{showSearch && (
							<a
								href={searchHref}
								className="hover:text-[var(--secondary)] transition"
							>
								{t("top.search")}
							</a>
						)}
						{showSitemap && (
							<a
								href={sitemapHref}
								className="hover:text-[var(--secondary)] transition"
							>
								{t("top.sitemap")}
							</a>
						)}
						<a
							href="/login"
							aria-label={t("top.login", "Staff login")}
							className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-primary-foreground/30 bg-white/10 px-2 py-0.5 font-semibold hover:bg-white/20 hover:text-[var(--secondary)] transition sm:px-3"
						>
							<svg
								className="h-3 w-3"
								viewBox="0 0 20 20"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								aria-hidden="true"
							>
								<path
									d="M12 3h4a1 1 0 011 1v12a1 1 0 01-1 1h-4"
									strokeLinecap="round"
								/>
								<path
									d="M9 7l3 3-3 3M12 10H3"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
							<span className="hidden sm:inline">
								{t("top.login", "Staff login")}
							</span>
						</a>
						<LanguageSwitcher />
						<ThemeToggle
							settings={settings}
							className="h-6 w-6 text-primary-foreground/80 hover:bg-white/10"
						/>
					</div>
				</div>
			</div>

			{/* Header + mega panel share a hover region so moving into the panel doesn't close it.
			    The sticky lives HERE (not on <header>) because a sticky element only sticks within
			    its parent's box — this wrapper's parent is <body>, so it stays pinned page-wide. */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: layout wrapper, not a control. The handlers only cancel a hover timer; every menu it opens is also reachable by the nav buttons' onClick and aria-expanded. */}
			<div
				onMouseLeave={hoverClose}
				onMouseEnter={cancelHover}
				className="sticky top-0 z-40"
			>
				<header
					ref={headerRef}
					className="relative backdrop-blur-md bg-background/70 border-b border-border/60"
					style={{ viewTransitionName: "site-header" }}
				>
					<div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-6">
						<NavLink
							href={withLang("/", lang)}
							className="flex items-center gap-3"
							onClick={closeAll}
						>
							<img
								src={siteLogo(settings)}
								alt={siteShortName(settings)}
								className="h-12 w-12 shrink-0 rounded-full object-cover shadow-[var(--shadow-lift)] ring-1 ring-border"
							/>
							<div className="leading-tight">
								{settings.site_name_km && (
									<div className="font-khmer text-[13px] text-primary">
										{settings.site_name_km}
									</div>
								)}
								<div className="font-display font-semibold text-primary text-[15px]">
									{siteName(settings)}
								</div>
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
												onMouseEnter={() => hoverOpen(null)}
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
										{/* no onFocus: focus-to-open makes Tab swap the panel out from under a
										    keyboard user before they reach its links. Enter/Space opens it. */}
										<button
											type="button"
											onMouseEnter={() => hoverOpen(hasChildren ? n.id : null)}
											onClick={() => {
												cancelHover();
												setOpenId(active ? null : n.id);
											}}
											aria-expanded={active}
											className={`relative flex items-center gap-1 transition ${active ? "text-primary" : "hover:text-primary"}`}
										>
											{n.label}
											{hasChildren && (
												<svg
													aria-hidden="true"
													className={`h-3 w-3 opacity-60 transition-transform ${active ? "rotate-180" : ""}`}
													viewBox="0 0 12 12"
													fill="none"
													stroke="currentColor"
													strokeWidth="1.8"
												>
													<path
														d="M3 4.5L6 7.5L9 4.5"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
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
								<svg
									aria-hidden="true"
									className="h-5 w-5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
								</svg>
							</button>
						</div>
					</div>
				</header>

				{/* Mega panel — rendered OUTSIDE the header so its backdrop-filter frosts the PAGE
				    behind it (not the header's stacking context). Hangs off the header's bottom edge,
				    same width as the header's own container, only as tall as its contents. */}
				{openNode && (
					<div
						className="hidden lg:block fixed left-1/2 z-40 w-full max-w-7xl -translate-x-1/2 overflow-y-auto rounded-b-2xl border border-t-0 border-border/60 bg-card/95 backdrop-blur-2xl shadow-[var(--shadow-soft)] thin-scroll animate-[mega-in_0.2s_ease-out] motion-reduce:animate-none"
						style={{
							top: panelTop,
							maxHeight: `calc(100dvh - ${panelTop}px - 1rem)`,
						}}
					>
						<div
							key={openId}
							className="p-6 animate-[mega-content-in_0.28s_ease-out] motion-reduce:animate-none"
						>
							{(() => {
								const kids = openNode.children;
								const sections = kids.filter((c) => c.children.length > 0);
								// Flat menu: no titles to separate, so the links just flow into columns.
								if (sections.length === 0) {
									const columns = Math.min(3, Math.ceil(kids.length / 3));
									return (
										// bounded, or the columns stretch across the full panel and the
										// links drift apart into unrelated islands
										<div
											style={{
												maxWidth: `${columns * 22 + (columns - 1) * 2}rem`,
											}}
										>
											<MegaLinks
												items={kids}
												lang={lang}
												onNavigate={closeAll}
												columns={columns}
											/>
										</div>
									);
								}
								// Mixed: leaf L2s get a column of their own, headed by the menu they
								// belong to, so every column starts on the same line.
								const leaves = kids.filter((c) => c.children.length === 0);
								const columns = (leaves.length > 0 ? 1 : 0) + sections.length;
								return (
									<div
										className="grid gap-x-8 gap-y-6"
										style={{
											gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
										}}
									>
										{leaves.length > 0 && (
											<section>
												<h2 className={`${HEADING} mb-2 block`}>
													{openNode.label}
												</h2>
												<MegaLinks
													items={leaves}
													lang={lang}
													onNavigate={closeAll}
													columns={1}
												/>
											</section>
										)}
										{sections.map((c) => (
											<MegaSection
												key={c.id}
												item={c}
												lang={lang}
												onNavigate={closeAll}
											/>
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
					<button
						type="button"
						aria-label="Close menu"
						className="absolute inset-0 bg-black/40 backdrop-blur-sm"
						onClick={() => setMobileOpen(false)}
					/>
					<div className="absolute right-0 top-0 flex h-[100dvh] w-[88%] max-w-sm flex-col bg-card shadow-2xl">
						<div className="flex items-center justify-between border-b border-border px-4 py-4">
							<span className="font-display font-semibold text-primary">
								{t("nav.menu", "Menu")}
							</span>
							<button
								type="button"
								onClick={() => setMobileOpen(false)}
								aria-label="Close menu"
								className="grid h-9 w-9 place-items-center rounded-full border border-border text-foreground/70 hover:bg-muted transition"
							>
								<svg
									aria-hidden="true"
									className="h-5 w-5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
								</svg>
							</button>
						</div>
						<div className="flex-1 overflow-y-auto thin-scroll p-3">
							{nav.map((n) => (
								<MobileNode
									key={n.id}
									node={n}
									lang={lang}
									onNavigate={() => setMobileOpen(false)}
								/>
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
