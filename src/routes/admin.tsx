import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import {
	ChevronDown,
	Compass,
	ExternalLink,
	Menu,
	PanelLeft,
	ShieldAlert,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AdminHeaderProvider } from "#/components/admin/AdminHeader";
import { AdminIcon } from "#/components/admin/AdminIcon";
import { CommandPalette } from "#/components/admin/CommandPalette";
import { startTour, startTourOnce, TourHost } from "#/components/admin/Tour";
import { tourForPath } from "#/components/admin/tours";
import { ThemeToggle } from "#/components/ThemeToggle";
import { Button } from "#/components/ui/button";
import { EmptyState } from "#/components/ui/empty-state";
import { PageHeader } from "#/components/ui/page-header";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { adminPathEnabled, MODULES_SETTING } from "#/lib/modules";
import { NAV_AREA } from "#/lib/permissions";
import { adminTitle, siteLogo, siteShortName } from "#/lib/site-identity";
import { darkModeAvailable } from "#/lib/site-theme";
import { useModalPanel } from "#/lib/use-modal-panel";
import { SESSION_COOKIE, validateToken } from "#/server/auth";
import { db } from "#/server/db";
import { resolvePermissions } from "#/server/repo/roles";
import { getSettings } from "#/server/repo/site";

// same-site absolute path only: //evil.tld is another origin, and a backslash is one to some browsers
function returnTo(href: string): { redirect?: string } {
	return /^\/(?![/\\])/.test(href) ? { redirect: href } : {};
}

type AdminAccess =
	| { kind: "anon" }
	| { kind: "forbidden"; email: string }
	| {
			kind: "ok";
			email: string;
			role: string;
			isSuperAdmin: boolean;
			permissions: string[];
			modules: string | null;
	  };

// runs during SSR, so no admin HTML ships to an unauthenticated request; "no session" and "no areas" are answered apart, a login form only helps the first
const resolveAdminAccess = createServerFn({ method: "GET" }).handler(
	async (): Promise<AdminAccess> => {
		const auth = await validateToken(db, getCookie(SESSION_COOKIE));
		if (!auth) return { kind: "anon" };
		const perms = await resolvePermissions(db, auth.user.role);
		if (!perms.isSuperAdmin && perms.permissions.length === 0)
			return { kind: "forbidden", email: auth.user.email };
		return {
			kind: "ok",
			email: auth.user.email,
			role: auth.user.role,
			isSuperAdmin: perms.isSuperAdmin,
			permissions: perms.permissions,
			// null, not "": a database with no row predates modules and keeps them all,
			// where an empty row means an install that answered "none".
			modules: (await getSettings(db))[MODULES_SETTING] ?? null,
		};
	},
);

export const Route = createFileRoute("/admin")({
	beforeLoad: async ({ location }) => {
		const access = await resolveAdminAccess();
		if (access.kind === "anon")
			throw redirect({ to: "/login", search: returnTo(location.href) });
		// Answered at /admin, whose only child renders nothing until the shell asks
		// for it, so no screen's data is fetched on the way to being refused.
		if (access.kind === "forbidden") {
			if (location.pathname !== "/admin") throw redirect({ to: "/admin" });
			return { access };
		}
		// A module this install has not turned on has no screens: the path stops
		// answering here, during SSR, rather than rendering and failing on its data.
		const modules =
			access.modules === null ? {} : { [MODULES_SETTING]: access.modules };
		if (!adminPathEnabled(modules, location.pathname))
			throw redirect({ to: "/admin" });
		return { access };
	},
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(
			context.trpc.site.settings.queryOptions(),
		),
	head: ({ loaderData }) => ({
		meta: [{ title: adminTitle(loaderData ?? {}) }],
	}),
	component: AdminShell,
});

type OkAccess = Extract<AdminAccess, { kind: "ok" }>;

// split so neither branch calls the other's hooks
function AdminShell() {
	const { access } = Route.useRouteContext();
	if (access.kind === "forbidden") return <NoAccess email={access.email} />;
	return <AdminLayout access={access} />;
}

// the refusal is the server's; this only says so, instead of handing back the sign-in form they already used
function NoAccess({ email }: { email: string }) {
	const navigate = useNavigate();

	async function logout() {
		await fetch("/api/auth/logout", { method: "POST" });
		navigate({ to: "/login" });
	}

	return (
		<main className="admin grid min-h-screen place-items-center bg-admin-bg p-6 text-admin-ink">
			<div className="w-full max-w-md">
				<PageHeader
					className="mb-4 text-center"
					title="You do not have access to the admin"
					description={
						<>
							You are signed in as{" "}
							<strong className="font-medium text-admin-ink">{email}</strong>,
							and that account has no admin areas.
						</>
					}
				/>
				<EmptyState
					icon={<ShieldAlert />}
					title="Ask an administrator to grant one"
					description="Someone who can reach the Users screen can give this account an area. Until then there is nothing here to show you."
					action={
						<div className="flex flex-wrap justify-center gap-2">
							<Button asChild>
								<a href="/internalsources">Go to Internal Sources</a>
							</Button>
							<Button variant="secondary" onClick={logout}>
								Log out
							</Button>
						</div>
					}
				/>
			</div>
		</main>
	);
}

type NavItem = {
	to: string;
	label: string;
	icon: string;
	exact?: boolean;
	type?: string;
};
type NavGroup = { group: string; items: NavItem[] };

function persistOpenGroup(group: string) {
	try {
		localStorage.setItem("admin-nav-open", group);
	} catch {}
}

function persistRail(collapsed: boolean) {
	try {
		localStorage.setItem("admin-nav-rail", collapsed ? "collapsed" : "open");
	} catch {}
}

// `type` items deep-link the Posts list to a single content type (/admin/posts?type=…),
// so the admin mirrors the public collections (News, Stories, Videos, …).
const NAV: NavGroup[] = [
	{
		group: "",
		items: [
			{ to: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
			{ to: "/admin/messages", label: "Messages", icon: "message" },
			{ to: "/admin/forms", label: "Forms", icon: "forms" },
		],
	},
	{
		group: "Content",
		items: [
			{ to: "/admin/pages", label: "Pages", icon: "pages" },
			{ to: "/admin/projects", label: "Projects", icon: "projects" },
			{ to: "/admin/media", label: "Media", icon: "media" },
		],
	},
	{
		group: "Posts",
		items: [
			{ to: "/admin/posts", label: "All posts", icon: "posts" },
			{ to: "/admin/posts", label: "News", icon: "news", type: "news" },
			{ to: "/admin/posts", label: "Stories", icon: "story", type: "story" },
			{ to: "/admin/posts", label: "Videos", icon: "video", type: "video" },
			{
				to: "/admin/posts",
				label: "Galleries",
				icon: "gallery",
				type: "album",
			},
			{
				to: "/admin/posts",
				label: "Publications",
				icon: "publication",
				type: "publication",
			},
			{ to: "/admin/posts", label: "Careers", icon: "career", type: "job" },
			{ to: "/admin/posts", label: "Events", icon: "event", type: "event" },
			{
				to: "/admin/posts",
				label: "Documents",
				icon: "document",
				type: "document",
			},
			{
				to: "/admin/posts",
				label: "Announcements",
				icon: "announcements",
				type: "announcement",
			},
			{
				to: "/admin/posts",
				label: "Internal news",
				icon: "posts",
				type: "internal_news",
			},
		],
	},
	{
		group: "Fundraising",
		items: [
			{ to: "/admin/campaigns", label: "Campaigns", icon: "campaigns" },
			{ to: "/admin/donations", label: "Donations", icon: "donations" },
		],
	},
	{
		group: "Records",
		items: [
			{ to: "/admin/schools", label: "Schools", icon: "offices" },
			{ to: "/admin/people", label: "People", icon: "team" },
			{ to: "/admin/partners", label: "Partners", icon: "partners" },
			{ to: "/admin/donors", label: "Donors", icon: "donors" },
			{ to: "/admin/offices", label: "Offices", icon: "offices" },
		],
	},
	{
		group: "Site",
		items: [
			{ to: "/admin/nav", label: "Header", icon: "nav" },
			{ to: "/admin/footer", label: "Footer", icon: "footer" },
			{ to: "/admin/org-chart", label: "Org Chart", icon: "team" },
			{ to: "/admin/languages", label: "Languages", icon: "languages" },
			{ to: "/admin/ui-strings", label: "UI Strings", icon: "languages" },
			{ to: "/admin/users", label: "Users", icon: "staff" },
			{ to: "/admin/roles", label: "Roles", icon: "staff" },
			{ to: "/admin/settings", label: "Settings", icon: "settings" },
			{ to: "/admin/modules", label: "Modules", icon: "modules" },
		],
	},
	{
		group: "Lists",
		items: [
			{ to: "/admin/locations", label: "Locations", icon: "tag" },
			{
				to: "/admin/publication-categories",
				label: "Publication categories",
				icon: "tag",
			},
			{
				to: "/admin/doc-categories",
				label: "Document categories",
				icon: "tag",
			},
			{
				to: "/admin/partner-categories",
				label: "Partner categories",
				icon: "tag",
			},
		],
	},
];

const RECORD_KIND = {
	pages: "page",
	posts: "post",
	projects: "project",
	people: "person",
} as const;

type ViewTarget = { href: string; label: string };

const SITE: ViewTarget = { href: "/", label: "View site" };

/**
 * What the topbar's outward link opens: the record being edited when this screen
 * edits one and the public site actually serves it, the home page otherwise.
 * `refresh` re-asks, so publishing a draft and then reaching for the link works.
 */
function useViewTarget(pathname: string) {
	const [target, setTarget] = useState<ViewTarget>(SITE);
	const match = /^\/admin\/(pages|posts|projects|people)\/(\d+)$/.exec(
		pathname,
	);
	const area = match?.[1] as keyof typeof RECORD_KIND | undefined;
	const id = match ? Number(match[2]) : null;

	const refresh = useCallback(() => {
		if (!area || id === null) {
			setTarget(SITE);
			return;
		}
		const kind = RECORD_KIND[area];
		trpcClient.admin.publicPath
			.query({ kind, id })
			.then((path) =>
				setTarget(path ? { href: path, label: `View ${kind}` } : SITE),
			)
			.catch(() => setTarget(SITE));
	}, [area, id]);

	useEffect(refresh, [refresh]);
	return { target, refresh };
}

function AdminLayout({ access }: { access: OkAccess }) {
	const navigate = useNavigate();
	const settings = Route.useLoaderData();
	const email = access.email;
	const isSuper = access.isSuperAdmin;
	const roleLabel = isSuper ? "Administrator" : access.role.replace(/_/g, " ");
	const perms = new Set(access.permissions);
	const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
	// Full-bleed "studio" chrome (no padding / max-width) for the page builder.
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const activeType = useRouterState({
		select: (s) => (s.location.search as { type?: string }).type,
	});
	const studio = /^\/admin\/pages\/(new|\d+)/.test(pathname);
	const { target: viewTarget, refresh: refreshViewTarget } =
		useViewTarget(pathname);

	// Whether a sidebar item is the current route (content-type items match on ?type too).
	const isActive = (it: NavItem) => {
		if (it.exact) return pathname === it.to;
		if (it.to === "/admin/posts")
			return (
				pathname === "/admin/posts" && (it.type ?? undefined) === activeType
			);
		return pathname === it.to || pathname.startsWith(`${it.to}/`);
	};
	// starts null on both sides of hydration: reading storage in the first client render disagrees with the server and React throws the nav away
	const [openGroup, setOpenGroup] = useState<string | null>(null);
	const toggleGroup = (g: string, isOpen: boolean) => {
		const next = isOpen ? "" : g;
		setOpenGroup(next);
		persistOpenGroup(next);
	};

	// same hydration rule: the server cannot see storage, so the rail starts wide and narrows on mount
	const [railCollapsed, setRailCollapsed] = useState(false);
	useEffect(() => {
		setRailCollapsed(localStorage.getItem("admin-nav-rail") === "collapsed");
	}, []);

	// Once, on the first admin screen anyone opens. The topbar's Tour button
	// offers it again afterwards.
	useEffect(() => {
		startTourOnce("shell");
	}, []);
	// this visit's answer only, never the stored preference
	const [studioRailOpen, setStudioRailOpen] = useState(false);
	useEffect(() => {
		if (studio) setStudioRailOpen(false);
	}, [studio]);
	const railShut = studio ? !studioRailOpen : railCollapsed;
	const toggleRail = () => {
		if (studio) {
			setStudioRailOpen((o) => !o);
			return;
		}
		setRailCollapsed((c) => {
			persistRail(!c);
			return !c;
		});
	};

	// Below `lg` the rail leaves the layout and becomes a drawer, so the content
	// column gets the whole viewport instead of the 104px the 256px rail left it.
	const [drawerOpen, setDrawerOpen] = useState(false);
	const closeDrawer = () => setDrawerOpen(false);
	const drawerRef = useModalPanel(closeDrawer, drawerOpen);
	// Starts true so the server-rendered desktop rail is never inert before
	// hydration; a narrow viewport corrects it on mount.
	const [isDesktop, setIsDesktop] = useState(true);
	// Widening past the breakpoint turns the drawer back into the static rail,
	// and a trap left armed there would hold the keyboard on the desktop layout.
	useEffect(() => {
		const desktop = window.matchMedia("(min-width: 1024px)");
		const sync = () => {
			setIsDesktop(desktop.matches);
			if (desktop.matches) setDrawerOpen(false);
		};
		sync();
		desktop.addEventListener("change", sync);
		return () => desktop.removeEventListener("change", sync);
	}, []);

	const [accountOpen, setAccountOpen] = useState(false);
	const closeAccount = () => setAccountOpen(false);
	const accountRef = useModalPanel(closeAccount, accountOpen);

	async function logout() {
		await fetch("/api/auth/logout", { method: "POST" });
		navigate({ to: "/login" });
	}

	// Show an item if this install has the module behind it, and it has no area
	// mapping (e.g. Dashboard) or the user holds that area.
	const canSee = (it: NavItem) => {
		if (!adminPathEnabled(settings, it.to)) return false;
		const area = NAV_AREA[it.to];
		return !area || isSuper || perms.has(area);
	};
	const visibleNav = NAV.map((s) => ({
		...s,
		items: s.items.filter(canSee),
	})).filter((s) => s.items.length > 0);

	const activeGroup =
		visibleNav.find((s) => s.group && s.items.some(isActive))?.group ?? "";
	// a deep link into a shut group would otherwise leave the current page's link hidden
	useEffect(() => {
		if (!activeGroup) {
			setOpenGroup(localStorage.getItem("admin-nav-open"));
			return;
		}
		setOpenGroup(activeGroup);
		persistOpenGroup(activeGroup);
	}, [activeGroup]);
	// Nothing stored and nothing active - the dashboard - would otherwise show six
	// shut headers and three links.
	const shownGroup =
		openGroup ??
		(activeGroup || (visibleNav.find((s) => s.group)?.group ?? ""));
	// Narrowed, there is no room for a group header, so the accordion steps aside
	// and every item shows as an icon.
	const railNarrow = railShut && isDesktop;

	const link =
		"group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-admin-ink-muted transition-colors duration-150 ease-out hover:bg-admin-accent-soft hover:text-admin-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50";
	const linkActive =
		"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-admin-accent-ink bg-admin-accent-soft shadow-[inset_3px_0_0_var(--admin-accent)]";
	const menuItem =
		"block w-full rounded-lg px-3 py-2 text-left text-sm text-admin-ink transition-colors duration-150 ease-out hover:bg-admin-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50";

	return (
		<div className="admin min-h-screen flex bg-admin-bg text-admin-ink">
			<a
				href="#admin-main"
				className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-admin-border focus:bg-admin-panel-raised focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-[var(--shadow-lift)] focus:outline-none focus:ring-2 focus:ring-admin-focus"
			>
				Skip to main content
			</a>
			{drawerOpen && (
				<button
					type="button"
					aria-label="Close navigation"
					onClick={closeDrawer}
					className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
				/>
			)}
			{/* Sidebar rail — a drawer below `lg`, the static rail from `lg` up */}
			<aside
				id="admin-sidebar"
				ref={drawerRef}
				tabIndex={-1}
				aria-label="Admin navigation"
				// a shut drawer is only translated off-screen, so without this its controls stay in the tab ring
				inert={!isDesktop && !drawerOpen}
				className={`fixed lg:sticky left-0 lg:left-auto top-0 z-40 lg:z-auto w-64 shrink-0 h-screen bg-admin-panel border-r border-admin-border flex flex-col focus:outline-none transition-transform duration-200 ease-out lg:transition-[width] lg:duration-200 ${drawerOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 ${railNarrow ? "lg:w-[4.5rem]" : "lg:w-64"}`}
				style={{ viewTransitionName: "admin-sidebar" }}
			>
				<div
					className={`flex items-center gap-3 h-16 border-b border-admin-border shrink-0 ${railNarrow ? "justify-center px-0" : "px-4"}`}
				>
					{railNarrow ? (
						<button
							type="button"
							onClick={toggleRail}
							aria-expanded={false}
							aria-controls="admin-sidebar"
							title="Expand sidebar"
							className="group relative grid size-9 shrink-0 place-items-center rounded-lg transition-colors duration-150 ease-out hover:bg-admin-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
						>
							<img
								src={siteLogo(settings)}
								alt=""
								className="size-9 rounded-lg object-cover ring-1 ring-admin-border transition-opacity duration-150 ease-out group-hover:opacity-0 group-focus-visible:opacity-0"
							/>
							<PanelLeft
								aria-hidden="true"
								className="absolute h-5 w-5 text-admin-ink-muted opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
							/>
							<span className="sr-only">Expand sidebar</span>
						</button>
					) : (
						<>
							<img
								src={siteLogo(settings)}
								alt={siteShortName(settings)}
								className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-admin-border"
							/>
							<div className="min-w-0 flex-1 leading-tight">
								<div className="truncate text-sm font-semibold text-admin-ink">
									{siteShortName(settings)}
								</div>
								<div className="text-[13px] text-admin-ink-muted">Admin</div>
							</div>
							<button
								type="button"
								onClick={isDesktop ? toggleRail : closeDrawer}
								aria-expanded={true}
								aria-controls="admin-sidebar"
								title={isDesktop ? "Collapse sidebar" : "Close navigation"}
								className="grid size-9 shrink-0 place-items-center rounded-lg text-admin-ink-muted transition-colors duration-150 ease-out hover:bg-admin-accent-soft hover:text-admin-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
							>
								<PanelLeft className="h-5 w-5" aria-hidden="true" />
								<span className="sr-only">
									{isDesktop ? "Collapse sidebar" : "Close navigation"}
								</span>
							</button>
						</>
					)}
				</div>

				<CommandPalette nav={visibleNav} narrow={railNarrow} />

				<nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-6">
					{visibleNav.map((section) => {
						const open =
							railNarrow || !section.group || section.group === shownGroup;
						const panelId = `admin-nav-${section.group.toLowerCase().replace(/\s+/g, "-")}`;
						return (
							<div key={section.group || "_top"}>
								{section.group && !railNarrow ? (
									<button
										type="button"
										onClick={() => toggleGroup(section.group, open)}
										aria-expanded={open}
										aria-controls={panelId}
										className="flex w-full items-center justify-between rounded-lg px-3 py-1 mb-2 text-[13px] font-medium text-admin-ink-muted transition-colors duration-150 ease-out hover:text-admin-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
									>
										{section.group}
										<ChevronDown
											className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
											aria-hidden="true"
										/>
									</button>
								) : null}
								{open && (
									<div id={panelId} className="space-y-1">
										{section.items.map((it) => (
											<Link
												key={`${it.to}:${it.type ?? ""}`}
												to={it.to}
												search={it.type ? { type: it.type } : undefined}
												// the router matches Dashboard on the /admin prefix, so without this two links claim to be the page
												activeOptions={it.exact ? { exact: true } : undefined}
												onClick={closeDrawer}
												title={railNarrow ? it.label : undefined}
												className={`${isActive(it) ? linkActive : link} ${railNarrow ? "justify-center" : ""}`}
											>
												<AdminIcon
													name={it.icon}
													className="h-4 w-4 shrink-0 opacity-80"
												/>
												<span className={railNarrow ? "sr-only" : "truncate"}>
													{it.label}
												</span>
											</Link>
										))}
									</div>
								)}
							</div>
						);
					})}
				</nav>
			</aside>

			{/* Content column */}
			<div className="flex-1 min-w-0 flex flex-col">
				<header
					className="sticky top-0 z-20 h-16 shrink-0 border-b border-admin-border bg-admin-panel/85 backdrop-blur flex items-center justify-between gap-4 px-4"
					style={{ viewTransitionName: "admin-topbar" }}
				>
					<button
						type="button"
						onClick={() => setDrawerOpen((o) => !o)}
						aria-expanded={drawerOpen}
						aria-controls="admin-sidebar"
						className="lg:hidden grid size-9 shrink-0 place-items-center rounded-lg border border-admin-border text-admin-ink-muted transition-colors duration-150 ease-out hover:bg-admin-accent-soft hover:text-admin-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
					>
						<Menu className="h-5 w-5" aria-hidden="true" />
						<span className="sr-only">Menu</span>
					</button>
					<div
						ref={setHeaderSlot}
						className="flex min-w-0 flex-1 items-center gap-3"
					/>
					<div className="flex shrink-0 items-center gap-1">
						<button
							type="button"
							data-tour="tour-button"
							onClick={() => startTour(tourForPath(pathname))}
							className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-admin-ink-muted transition-colors duration-150 ease-out hover:bg-admin-accent-soft hover:text-admin-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
						>
							Tour
							<Compass className="size-4 shrink-0" aria-hidden="true" />
						</button>
						<a
							href={viewTarget.href}
							target="_blank"
							rel="noopener noreferrer"
							onPointerEnter={refreshViewTarget}
							onFocus={refreshViewTarget}
							className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-admin-ink-muted transition-colors duration-150 ease-out hover:bg-admin-accent-soft hover:text-admin-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
						>
							{viewTarget.label}
							<ExternalLink className="size-4 shrink-0" aria-hidden="true" />
						</a>
						<div className="relative">
							<button
								type="button"
								onClick={() => setAccountOpen((o) => !o)}
								aria-haspopup="dialog"
								aria-expanded={accountOpen}
								aria-label="Account"
								title={email}
								className="grid size-9 place-items-center rounded-lg transition-colors duration-150 ease-out hover:bg-admin-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50 aria-expanded:bg-admin-accent-soft"
							>
								<span
									aria-hidden="true"
									className="grid size-8 place-items-center rounded-full bg-admin-accent-soft text-xs font-semibold uppercase text-admin-accent-ink"
								>
									{email.slice(0, 2)}
								</span>
							</button>
							{accountOpen && (
								<>
									<button
										type="button"
										aria-label="Close account menu"
										onClick={closeAccount}
										className="fixed inset-0 z-30 cursor-default"
									/>
									<div
										ref={accountRef}
										role="dialog"
										aria-modal="true"
										aria-label="Account"
										tabIndex={-1}
										className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-admin-border bg-admin-panel-raised p-2 shadow-[var(--shadow-soft)] focus:outline-none"
									>
										<div className="px-3 py-2">
											<div className="truncate text-sm font-medium text-admin-ink">
												{email}
											</div>
											<div className="mt-1 text-[13px] capitalize text-admin-ink-muted">
												{roleLabel}
											</div>
										</div>
										<div className="my-2 h-px bg-admin-border" />
										<Link
											to="/admin/account"
											onClick={closeAccount}
											className={menuItem}
										>
											My account
										</Link>
										{darkModeAvailable(settings) && (
											<div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2">
												<span className="text-sm text-admin-ink">Theme</span>
												<ThemeToggle
													settings={settings}
													className="size-9 shrink-0 border border-admin-border text-admin-ink-muted hover:bg-admin-accent-soft hover:text-admin-ink"
												/>
											</div>
										)}
										<div className="my-2 h-px bg-admin-border" />
										<button type="button" onClick={logout} className={menuItem}>
											Log out
										</button>
									</div>
								</>
							)}
						</div>
					</div>
				</header>

				<AdminHeaderProvider slot={headerSlot}>
					{studio ? (
						<main
							id="admin-main"
							tabIndex={-1}
							className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden xl:overflow-hidden"
						>
							<Outlet />
						</main>
					) : (
						<main
							id="admin-main"
							tabIndex={-1}
							// clip, not hidden: overflow-x hidden computes overflow-y to auto, and every sticky descendant then has a scrollport that cannot move
							className="flex-1 overflow-x-clip p-4 lg:p-6"
						>
							{/* a surface that is a column of fields marks data-admin-width="prose" and the shell narrows around it */}
							<div className="mx-auto w-full max-w-[1600px] has-[[data-admin-width='prose']]:max-w-3xl">
								<Outlet />
							</div>
						</main>
					)}
				</AdminHeaderProvider>
			</div>
			<TourHost />
		</div>
	);
}
