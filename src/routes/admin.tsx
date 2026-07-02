import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminHeaderProvider } from "#/components/admin/AdminHeader";
import { AdminIcon } from "#/components/admin/AdminIcon";
import { ThemeToggle } from "#/components/ThemeToggle";
import { NAV_AREA } from "#/lib/permissions";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin")({
	head: () => ({ meta: [{ title: "KAPE Admin" }] }),
	component: AdminLayout,
});

type NavItem = { to: string; label: string; icon: string; exact?: boolean; type?: string };
type NavGroup = { group: string; items: NavItem[] };

// `type` items deep-link the Posts list to a single content type (/admin/posts?type=…),
// so the admin mirrors the public collections (News, Stories, Videos, …).
const NAV: NavGroup[] = [
	{ group: "", items: [
		{ to: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
		{ to: "/admin/messages", label: "Messages", icon: "message" },
		{ to: "/admin/forms", label: "Forms", icon: "forms" },
	] },
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
			{ to: "/admin/posts", label: "Galleries", icon: "gallery", type: "album" },
			{ to: "/admin/posts", label: "Publications", icon: "publication", type: "publication" },
			{ to: "/admin/posts", label: "Careers", icon: "career", type: "job" },
			{ to: "/admin/posts", label: "Events", icon: "event", type: "event" },
			{ to: "/admin/posts", label: "Documents", icon: "document", type: "document" },
			{ to: "/admin/posts", label: "Announcements", icon: "announcements", type: "announcement" },
			{ to: "/admin/posts", label: "Internal news", icon: "posts", type: "internal_news" },
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
			{ to: "/admin/users", label: "Users", icon: "staff" },
			{ to: "/admin/roles", label: "Roles", icon: "staff" },
			{ to: "/admin/settings", label: "Settings", icon: "settings" },
		],
	},
	{
		group: "Lists",
		items: [
			{ to: "/admin/locations", label: "Locations", icon: "tag" },
			{ to: "/admin/publication-categories", label: "Publication categories", icon: "tag" },
			{ to: "/admin/doc-categories", label: "Document categories", icon: "tag" },
			{ to: "/admin/partner-categories", label: "Partner categories", icon: "tag" },
		],
	},
];

/**
 * Admin layout + client-side auth guard. The admin is client-rendered: it calls
 * tRPC via the browser (cookies sent automatically), so no SSR-auth plumbing.
 */
function AdminLayout() {
	const navigate = useNavigate();
	const [ready, setReady] = useState(false);
	const [email, setEmail] = useState("");
	const [roleLabel, setRoleLabel] = useState("Administrator");
	const [isSuper, setIsSuper] = useState(false);
	const [perms, setPerms] = useState<Set<string>>(new Set());
	const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
	// Full-bleed "studio" chrome (no padding / max-width) for the page builder.
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const activeType = useRouterState({ select: (s) => (s.location.search as { type?: string }).type });
	const studio = /^\/admin\/pages\/(new|\d+)/.test(pathname);

	// Whether a sidebar item is the current route (content-type items match on ?type too).
	const isActive = (it: NavItem) => {
		if (it.exact) return pathname === it.to;
		if (it.to === "/admin/posts") return pathname === "/admin/posts" && (it.type ?? undefined) === activeType;
		return pathname === it.to || pathname.startsWith(`${it.to}/`);
	};
	// Each group is foldable; the collapsed set is remembered in localStorage.
	const [folded, setFolded] = useState<Record<string, boolean>>(() => {
		if (typeof window === "undefined") return {};
		try {
			return JSON.parse(localStorage.getItem("kape-nav-folded") || "{}");
		} catch {
			return {};
		}
	});
	const toggleGroup = (g: string) =>
		setFolded((f) => {
			const next = { ...f, [g]: !f[g] };
			try {
				localStorage.setItem("kape-nav-folded", JSON.stringify(next));
			} catch {}
			return next;
		});

	useEffect(() => {
		let alive = true;
		trpcClient.auth.me
			.query()
			.then((u) => {
				if (!alive) return;
				// Access requires the super-admin role or at least one granted area.
				if (u && (u.isSuperAdmin || u.permissions.length > 0)) {
					setEmail(u.email);
					setIsSuper(u.isSuperAdmin);
					setPerms(new Set(u.permissions));
					setRoleLabel(u.isSuperAdmin ? "Administrator" : u.role.replace(/_/g, " "));
					setReady(true);
				} else {
					navigate({ to: "/login" });
				}
			})
			.catch(() => navigate({ to: "/login" }));
		return () => {
			alive = false;
		};
	}, [navigate]);

	async function logout() {
		await fetch("/api/auth/logout", { method: "POST" });
		navigate({ to: "/login" });
	}

	if (!ready) {
		return (
			<div className="min-h-screen grid place-items-center bg-background text-muted-foreground">
				<div className="flex items-center gap-3 text-sm">
					<span className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
					Checking access…
				</div>
			</div>
		);
	}

	// Show an item if it has no area mapping (e.g. Dashboard) or the user holds its area.
	const canSee = (it: NavItem) => {
		const area = NAV_AREA[it.to];
		return !area || isSuper || perms.has(area);
	};
	const visibleNav = NAV.map((s) => ({ ...s, items: s.items.filter(canSee) })).filter((s) => s.items.length > 0);

	const link = "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground/70 transition-colors hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50";
	const linkActive = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent)]/10 shadow-[inset_3px_0_0_var(--accent)]";

	return (
		<div className="min-h-screen flex bg-card text-foreground">
			{/* Sidebar rail */}
			<aside className="w-64 shrink-0 sticky top-0 h-screen bg-card border-r border-border flex flex-col" style={{ viewTransitionName: "admin-sidebar" }}>
				<div className="flex items-center gap-2.5 px-5 h-16 border-b border-border shrink-0">
					<img src="/logo.png" alt="KAPE" className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-border" />
					<div className="leading-tight">
						<div className="font-display font-semibold text-primary">KAPE</div>
						<div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Admin</div>
					</div>
				</div>

				<nav className="thin-scroll flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-5">
					{visibleNav.map((section) => {
						const collapsed = !!folded[section.group];
						return (
							<div key={section.group || "_top"}>
								{section.group ? (
									<button
										type="button"
										onClick={() => toggleGroup(section.group)}
										className="flex w-full items-center justify-between px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 hover:text-foreground"
									>
										{section.group}
										<ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`} />
									</button>
								) : null}
								{(!section.group || !collapsed) && (
									<div className="space-y-0.5">
										{section.items.map((it) => (
											<Link
												key={`${it.to}:${it.type ?? ""}`}
												to={it.to}
												search={it.type ? { type: it.type } : undefined}
												className={isActive(it) ? linkActive : link}
											>
												<AdminIcon name={it.icon} className="h-4 w-4 shrink-0 opacity-80" />
												<span className="truncate">{it.label}</span>
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
				<header className="sticky top-0 z-20 h-16 shrink-0 border-b border-border bg-card/85 backdrop-blur flex items-center justify-between gap-4 px-4 lg:px-5" style={{ viewTransitionName: "admin-topbar" }}>
					<div ref={setHeaderSlot} className="flex min-w-0 flex-1 items-center gap-3" />
					<div className="flex items-center gap-4">
						<a href="/" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:text-[var(--accent)] transition-colors">View site ↗</a>
						<ThemeToggle className="h-8 w-8 border border-border text-foreground/70 hover:bg-muted" />
						<span className="h-5 w-px bg-border" />
						<div className="flex items-center gap-2.5">
							<span className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-semibold uppercase">{email.slice(0, 2)}</span>
							<div className="hidden sm:block leading-tight">
								<div className="text-xs font-medium text-foreground max-w-[180px] truncate">{email}</div>
								<div className="text-[10px] uppercase tracking-wide text-[var(--palm)] capitalize">{roleLabel}</div>
							</div>
							<Link to="/admin/account" className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-muted hover:text-foreground transition-colors">My account</Link>
								<button type="button" onClick={logout} className="ml-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-muted hover:text-foreground transition-colors">Log out</button>
						</div>
					</div>
				</header>

				<AdminHeaderProvider slot={headerSlot}>
						{studio ? (
							<main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden xl:overflow-hidden">
								<Outlet />
							</main>
						) : (
							<main className="flex-1 p-4 lg:p-5 overflow-x-hidden">
								<div className="mx-auto max-w-[1600px]">
									<Outlet />
								</div>
							</main>
						)}
					</AdminHeaderProvider>
			</div>
		</div>
	);
}
