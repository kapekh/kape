import { useRouterState } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import type { NavNode } from "#/server/repo/nav";
import { LanguageSwitcher, useLang } from "@/lib/i18n";
import { localizedHref, stripLang } from "@/lib/i18n-config";
import { siteLogo, siteName, siteShortName } from "@/lib/site-identity";
import { useModalPanel } from "@/lib/use-modal-panel";
import { NavLink } from "./NavLink";
import { T } from "./T";
import { ThemeToggle } from "./ThemeToggle";

/** Prefix internal hrefs with the active language (path-based i18n). */
const withLang = (href: string | null, lang: string): string | undefined =>
	localizedHref(href, lang);

/** An href as the language-free, slash-trimmed path the router compares against. */
const pathOf = (href: string | null | undefined): string | null => {
	if (!href || /^(https?:|mailto:|tel:|#)/.test(href)) return null;
	return stripLang(href).path.replace(/\/+$/, "") || "/";
};

const isHere = (href: string | null | undefined, currentPath: string) => {
	const path = pathOf(href);
	return path != null && path === currentPath;
};

/** Does this branch hold the page the reader is on — itself or anything under it? */
const holdsHere = (node: NavNode, currentPath: string): boolean => {
	const path = pathOf(node.href);
	if (
		path != null &&
		path !== "/" &&
		(currentPath === path || currentPath.startsWith(`${path}/`))
	)
		return true;
	return node.children.some((c) => holdsHere(c, currentPath));
};

function Chevron({ className }: { className: string }) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			viewBox="0 0 12 12"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
		>
			<path
				d="M4.5 3L7.5 6L4.5 9"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/* ------------------------------------------------------------------ */
/* Desktop mega menu                                                   */
/* ------------------------------------------------------------------ */

const HEADING =
	"text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground";

// the row's start padding, on the panel's, puts every label on the header container's text edge
const ROW = "group relative break-inside-avoid rounded-lg ps-4 pe-3 py-1.5";

/** One nav destination: label, and a single line of brief under it. No card, no image. */
function MegaLink({
	item,
	lang,
	currentPath,
	onNavigate,
}: {
	item: NavNode;
	lang: string;
	currentPath: string;
	onNavigate: () => void;
}) {
	const href = withLang(item.href, lang);
	const here = isHere(item.href, currentPath);
	// A brief that just restates the label ("CLASS — the CLASS project") says
	// nothing new. Only one that opens on new words earns its line.
	const brief = item.description
		?.toLowerCase()
		.startsWith(item.label.toLowerCase())
		? null
		: item.description;
	const inner = (
		<>
			<Chevron
				className={`absolute start-0.5 top-2.5 h-3 w-3 transition-all motion-reduce:transition-none ${
					here
						? "opacity-70"
						: "-translate-x-0.5 rtl:translate-x-0.5 opacity-0 group-hover:translate-x-0 group-hover:opacity-70"
				}`}
			/>
			<span
				className={`block text-sm transition ${
					here
						? "text-[var(--accent-ink)]"
						: "text-foreground/85 group-hover:text-[var(--accent)]"
				}`}
			>
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
	const self = href ? (
		<NavLink
			href={href}
			exact
			aria-current={here ? "page" : undefined}
			onClick={onNavigate}
			className={`${ROW} block transition-colors ${here ? "bg-[var(--accent)]/10" : "hover:bg-[var(--accent)]/10"}`}
		>
			{inner}
		</NavLink>
	) : (
		<span className={`${ROW} block`}>{inner}</span>
	);
	if (item.children.length === 0) return self;
	return (
		<div className="break-inside-avoid">
			{self}
			<div className="ms-3 border-s border-border ps-1">
				{item.children.map((c) => (
					<MegaLink
						key={c.id}
						item={c}
						lang={lang}
						currentPath={currentPath}
						onNavigate={onNavigate}
					/>
				))}
			</div>
		</div>
	);
}

/** Links flowing down then across, so a long list stays short instead of stretching the panel. */
function MegaLinks({
	items,
	lang,
	currentPath,
	onNavigate,
	columns,
}: {
	items: NavNode[];
	lang: string;
	currentPath: string;
	onNavigate: () => void;
	columns: number;
}) {
	return (
		<div style={{ columnCount: columns, columnGap: "2.5rem" }}>
			{items.map((c) => (
				<MegaLink
					key={c.id}
					item={c}
					lang={lang}
					currentPath={currentPath}
					onNavigate={onNavigate}
				/>
			))}
		</div>
	);
}

/** The floor of a group: its own page, named after it. */
function SeeAll({
	node,
	lang,
	onNavigate,
}: {
	node: NavNode;
	lang: string;
	onNavigate: () => void;
}) {
	const href = withLang(node.href, lang);
	if (!href) return null;
	return (
		<div className="mt-2 border-t border-border/60 pt-2">
			<NavLink
				href={href}
				exact
				onClick={onNavigate}
				className={`${ROW} flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent)]/10`}
			>
				<T
					k="nav.seeAll"
					fallback="See all {label}"
					params={{ label: node.label }}
				/>
				<Chevron className="h-3 w-3 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none rtl:-scale-x-100" />
			</NavLink>
		</div>
	);
}

/** A titled column of level-3 links. */
function MegaSection({
	item,
	lang,
	currentPath,
	onNavigate,
}: {
	item: NavNode;
	lang: string;
	currentPath: string;
	onNavigate: () => void;
}) {
	const href = withLang(item.href, lang);
	const here = isHere(item.href, currentPath);
	return (
		<section>
			<h2 className="mb-2 border-b border-border/60 pb-2">
				{href ? (
					<NavLink
						href={href}
						exact
						aria-current={here ? "page" : undefined}
						onClick={onNavigate}
						className={`${HEADING} block px-4 transition hover:text-[var(--accent)] ${here ? "text-[var(--accent-ink)]" : ""}`}
					>
						{item.label}
					</NavLink>
				) : (
					<span className={`${HEADING} block px-4`}>{item.label}</span>
				)}
			</h2>
			{/* one column: a brief needs the width to land on one line */}
			<MegaLinks
				items={item.children}
				lang={lang}
				currentPath={currentPath}
				onNavigate={onNavigate}
				columns={1}
			/>
			<SeeAll node={item} lang={lang} onNavigate={onNavigate} />
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
	currentPath,
	onNavigate,
}: {
	node: NavNode;
	lang: string;
	currentPath: string;
	onNavigate: () => void;
}) {
	const hasChildren = node.children.length > 0;
	const holds = holdsHere(node, currentPath);
	const [open, setOpen] = useState(hasChildren && holds);
	const href = withLang(node.href, lang);
	const here = isHere(node.href, currentPath);

	if (!hasChildren) {
		return (
			<NavLink
				href={href || withLang("/", lang)}
				exact
				aria-current={here ? "page" : undefined}
				onClick={onNavigate}
				className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${here ? "bg-[var(--accent)]/10" : "hover:bg-muted"}`}
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
					<span
						className={`block text-sm font-medium ${here ? "text-[var(--accent-ink)]" : "text-foreground/85"}`}
					>
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
				aria-current={here ? "page" : holds ? "true" : undefined}
				className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:bg-muted transition"
			>
				<span>{node.label}</span>
				<svg
					aria-hidden="true"
					className={`h-4 w-4 opacity-60 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
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
			<div
				inert={!open}
				className={`grid transition-all duration-200 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
			>
				<div className="overflow-hidden">
					<div className="ms-3 mt-0.5 border-s border-border ps-2">
						{href && (
							<NavLink
								href={href}
								exact
								aria-current={here ? "page" : undefined}
								onClick={onNavigate}
								className="block rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-[var(--accent)] transition"
							>
								<T k="nav.overview" fallback="Overview" />
							</NavLink>
						)}
						{node.children.map((c) => (
							<MobileNode
								key={c.id}
								node={c}
								lang={lang}
								currentPath={currentPath}
								onNavigate={onNavigate}
							/>
						))}
					</div>
				</div>
			</div>
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
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const currentPath = pathOf(pathname) ?? "/";
	const [openId, setOpenId] = useState<number | null>(null);
	// the panel outlives openId by one leave animation
	const [shownId, setShownId] = useState<number | null>(null);
	const [focusIntoPanel, setFocusIntoPanel] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const headerRef = useRef<HTMLElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const triggers = useRef(new Map<number, HTMLButtonElement | null>());
	const panelId = useId();
	const drawerTitleId = useId();
	const drawerRef = useModalPanel(() => setMobileOpen(false), mobileOpen);
	// Where the header's bottom edge sits in the viewport — the open mega panel
	// hangs from here.
	const [panelTop, setPanelTop] = useState(0);
	const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const contact = [settings.contact_phone, settings.contact_email]
		.filter(Boolean)
		.join(" · ");
	// Header chrome bits (editable in the "Header" admin page via site_settings).
	// an operator's own label overrides every language and cannot be edited in place
	const donate = settings.header_donate_label || <T k="nav.donate" />;
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

	useEffect(
		() => () => {
			if (hoverTimer.current) clearTimeout(hoverTimer.current);
		},
		[],
	);

	// Close everything on Escape. A pending hover-open dies with it, or the panel
	// reappears a fraction of a second after the reader dismissed it.
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key !== "Escape") return;
			if (hoverTimer.current) clearTimeout(hoverTimer.current);
			// the panel is about to go: its focus belongs back on the trigger
			if (openId != null && panelRef.current?.contains(document.activeElement))
				triggers.current.get(openId)?.focus();
			setOpenId(null);
			setMobileOpen(false);
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [openId]);

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
			// floor, not round: half a pixel of gap is enough to lose the pointer on its way in
			if (el)
				setPanelTop(Math.max(0, Math.floor(el.getBoundingClientRect().bottom)));
		};
		measure();
		window.addEventListener("scroll", measure, { passive: true });
		window.addEventListener("resize", measure);
		return () => {
			window.removeEventListener("scroll", measure);
			window.removeEventListener("resize", measure);
		};
	}, [openId]);

	useEffect(() => {
		if (openId != null) {
			setShownId(openId);
			return;
		}
		if (shownId == null) return;
		const timer = setTimeout(() => setShownId(null), 160);
		return () => clearTimeout(timer);
	}, [openId, shownId]);

	useEffect(() => {
		if (!focusIntoPanel) return;
		setFocusIntoPanel(false);
		if (openId == null) return;
		panelRef.current?.querySelector<HTMLElement>("a[href]")?.focus();
	}, [focusIntoPanel, openId]);

	// A menubar must let Tab walk out into the rest of the header, so the panel
	// closes behind the focus instead of trapping it.
	useEffect(() => {
		const panel = panelRef.current;
		if (!panel || openId == null) return;
		const onFocusOut = (e: FocusEvent) => {
			const next = e.relatedTarget as Node | null;
			// null means focus went nowhere (a click on dead space, a lost window)
			if (!next) return;
			if (panel.contains(next) || triggers.current.get(openId) === next) return;
			setOpenId(null);
		};
		panel.addEventListener("focusout", onFocusOut);
		return () => panel.removeEventListener("focusout", onFocusOut);
	}, [openId]);

	const visibleId = openId ?? shownId;
	const panelNode =
		visibleId != null ? (nav.find((n) => n.id === visibleId) ?? null) : null;
	const leaving = openId == null && shownId != null;
	const cancelHover = () => {
		if (hoverTimer.current) clearTimeout(hoverTimer.current);
		hoverTimer.current = null;
	};
	// touch synthesises mouseenter, so a tap would open the panel over what it hit
	const finePointer = () =>
		typeof window === "undefined" ||
		!window.matchMedia ||
		window.matchMedia("(hover: hover) and (pointer: fine)").matches;
	// hover intent: only the first open waits, so a cursor crossing the nav opens nothing
	const hoverOpen = (id: number | null) => {
		cancelHover();
		if (id != null && !finePointer()) return;
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
								className="tap-target hover:text-[var(--secondary)] transition"
							>
								<T k="top.search" />
							</a>
						)}
						{showSitemap && (
							<a
								href={sitemapHref}
								className="tap-target hover:text-[var(--secondary)] transition"
							>
								<T k="top.sitemap" />
							</a>
						)}
						<a
							href="/login"
							aria-label={t("top.login", "Staff login")}
							className="tap-target inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-primary-foreground/30 bg-white/10 px-2 py-0.5 font-semibold hover:bg-white/20 hover:text-[var(--secondary)] transition sm:px-3"
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
								<T k="top.login" fallback="Staff login" />
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

			{/* sticky lives here, not on <header>: an element only sticks within its parent's box */}
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
								// a leaf with no target falls back to the home page, so it is that page
								const here = isHere(
									hasChildren ? n.href : (n.href ?? "/"),
									currentPath,
								);
								const marked = here || holdsHere(n, currentPath);
								const underline = (
									<span
										className={`absolute -bottom-0.5 start-0 h-0.5 bg-[var(--accent)] transition-all ${active ? "w-full" : marked ? "w-full opacity-40" : "w-0"}`}
									/>
								);
								// Leaf items (no children) are always links — never dropdown triggers.
								// A leaf with no target falls back to the home page.
								if (!hasChildren) {
									return (
										<div key={n.id} className="relative py-2">
											<NavLink
												href={href || withLang("/", lang)}
												exact
												aria-current={here ? "page" : undefined}
												onMouseEnter={() => hoverOpen(null)}
												className={`tap-target group flex items-center gap-1 transition ${marked ? "text-primary" : "hover:text-primary"}`}
											>
												{n.label}
												<span
													className={`absolute -bottom-0.5 start-0 h-0.5 bg-[var(--accent)] transition-all ${marked ? "w-full opacity-40" : "w-0 group-hover:w-full"}`}
												/>
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
											ref={(el) => {
												triggers.current.set(n.id, el);
											}}
											onMouseEnter={() => hoverOpen(hasChildren ? n.id : null)}
											onClick={(e) => {
												cancelHover();
												const next = active ? null : n.id;
												setOpenId(next);
												// detail 0 is a keyboard press: it wants the panel, not just its state
												if (next != null && e.detail === 0)
													setFocusIntoPanel(true);
											}}
											onKeyDown={(e) => {
												if (e.key !== "ArrowDown") return;
												e.preventDefault();
												cancelHover();
												setOpenId(n.id);
												setFocusIntoPanel(true);
											}}
											aria-expanded={active}
											aria-controls={panelId}
											// "true", not "page": an ancestor of the page is not the page
											aria-current={here ? "page" : marked ? "true" : undefined}
											className={`tap-target flex items-center gap-1 transition ${active || marked ? "text-primary" : "hover:text-primary"}`}
										>
											{n.label}
											{hasChildren && (
												<svg
													aria-hidden="true"
													className={`h-3 w-3 opacity-60 transition-transform motion-reduce:transition-none ${active ? "rotate-180" : ""}`}
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
								aria-label={t("nav.openMenu", "Open menu")}
								aria-expanded={mobileOpen}
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

				{/* outside the header so backdrop-filter frosts the page, not the header's stacking context */}
				{panelNode && (
					<div
						id={panelId}
						ref={panelRef}
						className={`hidden lg:block fixed left-1/2 z-40 w-full max-w-7xl -translate-x-1/2 overflow-y-auto rounded-b-2xl border border-t-0 border-border/60 bg-card/95 backdrop-blur-2xl shadow-[inset_0_1px_0_var(--border),var(--shadow-soft)] motion-reduce:animate-none ${
							leaving
								? "pointer-events-none animate-[mega-out_0.16s_ease-in_forwards]"
								: "animate-[mega-in_0.2s_ease-out]"
						}`}
						style={{
							top: panelTop,
							maxHeight: `calc(100dvh - ${panelTop}px - 1rem)`,
						}}
					>
						<div className="px-2 py-6 animate-[mega-content-in_0.28s_ease-out] motion-reduce:animate-none">
							<div
								key={visibleId}
								className="animate-[mega-swap_0.18s_ease-out] motion-reduce:animate-none"
							>
								{(() => {
									const kids = panelNode.children;
									const sections = kids.filter((c) => c.children.length > 0);
									// Flat menu: no titles to separate, so the links just flow into columns.
									if (sections.length === 0) {
										const columns = Math.min(3, Math.ceil(kids.length / 3));
										return (
											// bounded, or the columns stretch across the full panel and the
											// links drift apart into unrelated islands
											<div
												style={{
													maxWidth: `${columns * 22 + (columns - 1) * 2.5}rem`,
												}}
											>
												<MegaLinks
													items={kids}
													lang={lang}
													currentPath={currentPath}
													onNavigate={closeAll}
													columns={columns}
												/>
												<SeeAll
													node={panelNode}
													lang={lang}
													onNavigate={closeAll}
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
											className="grid gap-x-10 gap-y-6"
											style={{
												gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
											}}
										>
											{leaves.length > 0 && (
												<section>
													<h2 className="mb-2 border-b border-border/60 pb-2">
														<span className={`${HEADING} block px-4`}>
															{panelNode.label}
														</span>
													</h2>
													<MegaLinks
														items={leaves}
														lang={lang}
														currentPath={currentPath}
														onNavigate={closeAll}
														columns={1}
													/>
													<SeeAll
														node={panelNode}
														lang={lang}
														onNavigate={closeAll}
													/>
												</section>
											)}
											{sections.map((c) => (
												<MegaSection
													key={c.id}
													item={c}
													lang={lang}
													currentPath={currentPath}
													onNavigate={closeAll}
												/>
											))}
										</div>
									);
								})()}
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Mobile drawer */}
			{mobileOpen && (
				<div className="lg:hidden fixed inset-0 z-50 h-[100dvh]">
					<button
						type="button"
						aria-label={t("nav.closeMenu", "Close menu")}
						className="absolute inset-0 bg-black/40 backdrop-blur-sm"
						onClick={() => setMobileOpen(false)}
					/>
					<div
						ref={drawerRef}
						role="dialog"
						aria-modal="true"
						aria-labelledby={drawerTitleId}
						tabIndex={-1}
						className="absolute end-0 top-0 flex h-[100dvh] w-[88%] max-w-sm flex-col bg-card shadow-2xl outline-none"
					>
						<div className="flex items-center justify-between border-b border-border px-4 py-4">
							<span
								id={drawerTitleId}
								className="font-display font-semibold text-primary"
							>
								<T k="nav.menu" fallback="Menu" />
							</span>
							<button
								type="button"
								onClick={() => setMobileOpen(false)}
								aria-label={t("nav.closeMenu", "Close menu")}
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
						<div className="flex-1 overflow-y-auto p-3">
							{nav.map((n) => (
								<MobileNode
									key={n.id}
									node={n}
									lang={lang}
									currentPath={currentPath}
									onNavigate={() => setMobileOpen(false)}
								/>
							))}
						</div>
						<div className="flex items-center justify-between gap-3 border-t border-border px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
