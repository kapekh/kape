import { useQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { AnnouncementPopup } from "@/components/AnnouncementPopup";
import { JsonLd } from "@/components/JsonLd";
import { PhotoGrid } from "@/components/Lightbox";
import { NavLink } from "@/components/NavLink";
import { usePdfReader } from "@/components/PdfReader";
import { ProjectView } from "@/components/ProjectView";
import { RichBody } from "@/components/RichBody";
import { ShareButtons } from "@/components/ShareButtons";
import { SubPage } from "@/components/SubPage";
import {
	SectionRenderer,
	youtubeId,
} from "@/components/sections/SectionRenderer";
import { useTRPC } from "@/integrations/trpc/react";
import { localeLinks } from "@/lib/canonical";
import { COLLECTIONS, collectionHref } from "@/lib/collections";
import { useLang, useT } from "@/lib/i18n";
import {
	DEFAULT_LANG,
	isFunctional,
	localizedHref,
	stripLang,
} from "@/lib/i18n-config";
import {
	metaDescription,
	pageTitle,
	siteShortName,
	siteTitle,
	socialSiteName,
} from "@/lib/site-identity";
import { articleLd } from "@/lib/structured-data";

// pool, not display count — the current article is filtered out of it
const RELATED_POOL = 5;

/**
 * A collection's dictionary key, by URL prefix. Spelled out rather than built as
 * `collection.${prefix}`, because the dictionary's "nothing seeded that nothing
 * renders" check proves a key is read by finding it quoted in the source.
 */
const COLLECTION_KEYS: Record<string, string> = {
	careers: "collection.careers",
	events: "collection.events",
	galleries: "collection.galleries",
	news: "collection.news",
	projects: "collection.projects",
	publications: "collection.publications",
	stories: "collection.stories",
	team: "collection.team",
	videos: "collection.videos",
};

/**
 * The resolver hands down the English label rather than the prefix, so the key
 * is found back through `COLLECTIONS`. An unrecognised label renders as it
 * arrived — better a stale English word than a raw key on a live page.
 */
function collectionLabel(
	t: (key: string, fallback?: string) => string,
	label: string,
): string {
	const def = Object.values(COLLECTIONS).find((c) => c.label === label);
	const key = def && COLLECTION_KEYS[def.prefix];
	return key ? t(key, label) : label;
}

/**
 * The public catch-all + i18n router. Every content URL is language-prefixed
 * (/en/…, /km/…); an unprefixed path 301s to the default-language prefix. The
 * remaining path is resolved by `routes.resolve` into a page, a collection record,
 * a redirect, or not-found. Adding a page or record needs no new route file.
 */
export const Route = createFileRoute("/$")({
	loader: async ({ context, params, location }) => {
		const raw = params._splat ?? "";
		const { lang, path, prefixed } = stripLang(`/${raw}`);
		if (!prefixed) {
			// No language prefix → canonical default-language URL. The query string
			// has to survive: the payment provider returns to /donate/success?order=…
			throw redirect({
				href: `/${DEFAULT_LANG}${path === "/" ? "" : path}${location.searchStr}`,
				statusCode: 301,
			});
		}
		// Functional routes (admin, api, …) are never language-prefixed — they live
		// at fixed paths. A localized URL like /en/admin would otherwise fall
		// through to content resolution and 404, so redirect it to the canonical path.
		if (isFunctional(path)) {
			throw redirect({ href: path, statusCode: 301 });
		}
		const slug = path === "/" ? "home" : path.replace(/^\//, "");
		const resolved = await context.queryClient.ensureQueryData(
			context.trpc.routes.resolve.queryOptions({ path: slug, lang }),
		);
		if (resolved.kind === "redirect") {
			throw redirect({
				to: "/$",
				params: { _splat: `${lang}/${resolved.to}` },
				statusCode: 301,
			});
		}
		// A miss has to leave the loader as a throw, not as data — rendering a
		// "not found" body from a resolved loader serves it with HTTP 200 and
		// search engines index every typo as a real page.
		if (resolved.kind === "notfound") throw notFound();
		if (resolved.kind === "article") {
			// warm the related rail so it is in the SSR html, not a client-side pop-in
			await context.queryClient.ensureQueryData(
				context.trpc.posts.list.queryOptions({
					lang,
					type: resolved.post.contentType,
					limit: RELATED_POOL,
				}),
			);
			// The resolved post drops meta, so the file and the video URL come from
			// the same listing query the collection pages read them from.
			if (resolved.post.contentType === "video")
				await context.queryClient.ensureQueryData(
					context.trpc.posts.videos.queryOptions({ lang }),
				);
			if (resolved.post.contentType === "publication")
				await context.queryClient.ensureQueryData(
					context.trpc.posts.publications.queryOptions({ lang, category: "" }),
				);
		}
		const settings = await context.queryClient.ensureQueryData(
			context.trpc.site.settings.queryOptions(),
		);
		return { route: resolved, settings };
	},
	head: ({ loaderData, params }) => {
		// A thrown notFound() leaves loaderData undefined, settings with it. The
		// root's head already carries the site's own name and description, so
		// anything returned here would rename every 404 after a site nobody owns.
		if (!loaderData) return {};
		const { settings, route: r } = loaderData;
		let title = siteShortName(settings);
		let description = metaDescription(settings);
		let image: string | null = null;
		if (r.kind === "page" && r.page.slug === "home") {
			// The home page IS the site, so it carries the site title unsuffixed.
			title = siteTitle(settings);
			description = r.page.excerpt || description;
			image = r.page.coverUrl;
		} else if (r.kind === "page") {
			title = pageTitle(r.page.title, settings);
			description = r.page.excerpt || description;
			image = r.page.coverUrl;
		} else if (r.kind === "article") {
			title = pageTitle(r.post.title, settings);
			description = r.post.excerpt || description;
		} else if (r.kind === "album") {
			title = pageTitle(r.album.title, settings);
		} else if (r.kind === "project") {
			title = pageTitle(r.project.name, settings);
		} else if (r.kind === "person") {
			title = pageTitle(r.person.name, settings);
			description = r.person.position || description;
			image = r.person.photoUrl;
		}
		const meta: Array<Record<string, string>> = [
			{ title },
			{ property: "og:title", content: title },
			{ name: "description", content: description },
			{ property: "og:description", content: description },
		];

		const siteUrl = import.meta.env.VITE_SITE_URL as string | undefined;
		const { links, absolute } = localeLinks(params._splat ?? "", siteUrl);
		// og:url and og:image are ignored unless they are fully qualified.
		if (absolute) meta.push({ property: "og:url", content: absolute });
		if (image)
			meta.push({
				property: "og:image",
				content:
					absolute && !image.startsWith("http")
						? `${new URL(absolute).origin}${image}`
						: image,
			});
		return { meta, links };
	},
	component: ResolvedRoute,
	notFoundComponent: PageNotFound,
});

/** "More news / more stories" rail. Renders nothing when the article has no siblings. */
function RelatedPosts({
	contentType,
	slug,
	label,
}: {
	contentType: string;
	slug: string;
	label: string;
}) {
	const trpc = useTRPC();
	const { lang } = useLang();
	const t = useT();
	const { data } = useQuery(
		trpc.posts.list.queryOptions({
			lang,
			type: contentType,
			limit: RELATED_POOL,
		}),
	);
	const related = (data ?? []).filter((p) => p.slug !== slug).slice(0, 3);
	if (related.length === 0) return null;
	const prefix =
		Object.values(COLLECTIONS).find((c) => c.contentType === contentType)
			?.prefix ?? contentType;
	return (
		<section className="mt-12 border-t border-border pt-8">
			<h2 className="t-subsection text-primary">
				{t("related.more", "More from")} {label}
			</h2>
			<div className="mt-5 grid gap-5 sm:grid-cols-3">
				{related.map((p) => (
					<NavLink
						key={p.slug}
						href={localizedHref(collectionHref(prefix, p.slug), lang)}
						className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-background/40 transition hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
					>
						{p.image && (
							<div className="aspect-[16/10] overflow-hidden">
								<img
									src={p.image}
									alt=""
									className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
								/>
							</div>
						)}
						<div className="flex flex-1 flex-col p-4">
							{p.publishedAt && (
								<div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
									{p.publishedAt}
								</div>
							)}
							<h3 className="mt-1 font-display text-base font-semibold text-primary transition group-hover:text-[var(--accent)]">
								{p.title}
							</h3>
							{p.excerpt && (
								<p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
									{p.excerpt}
								</p>
							)}
						</div>
					</NavLink>
				))}
			</div>
		</section>
	);
}

/** The video itself. Falls back to a link when the record holds a URL no player can take. */
function VideoPlayer({ slug, title }: { slug: string; title: string }) {
	const trpc = useTRPC();
	const { lang } = useLang();
	const t = useT();
	const { data } = useQuery(trpc.posts.videos.queryOptions({ lang }));
	const url = data?.find((v) => v.slug === slug)?.youtubeUrl ?? "";
	const id = youtubeId(url);
	if (id)
		return (
			<div className="mb-8 aspect-video overflow-hidden rounded-2xl ring-1 ring-border">
				<iframe
					src={`https://www.youtube-nocookie.com/embed/${id}`}
					title={title}
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					allowFullScreen
					className="h-full w-full"
				/>
			</div>
		);
	if (!url) return null;
	return (
		<a
			href={url}
			target="_blank"
			rel="noreferrer"
			className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
		>
			{t("videos.watch", "Watch the video")}
		</a>
	);
}

/** The publication itself: the same reader the listing opens, on the detail page. */
function PublicationFile({ slug, title }: { slug: string; title: string }) {
	const trpc = useTRPC();
	const { lang } = useLang();
	const t = useT();
	const { openPdf, reader } = usePdfReader();
	const { data } = useQuery(
		trpc.posts.publications.queryOptions({ lang, category: "" }),
	);
	const pub = data?.find((p) => p.slug === slug);
	const fileUrl = pub?.fileUrl;
	if (!fileUrl) return null;
	return (
		<div className="mb-8">
			<a
				href={fileUrl}
				target="_blank"
				rel="noreferrer"
				onClick={(e) => {
					trpcClient.posts.trackDownload.mutate({ id: pub.id }).catch(() => {});
					openPdf(e, { url: fileUrl, title });
				}}
				className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
			>
				{t("publications.open", "Open the document")}
			</a>
			{reader}
		</div>
	);
}

function ResolvedRoute() {
	const { route: r, settings } = Route.useLoaderData();
	const { lang } = useLang();
	const t = useT();

	if (r.kind === "page") {
		const page = r.page;
		if (page.sections && page.sections.length > 0) {
			// SectionRenderer promotes a hero, or else the first section carrying a
			// title, to the page h1. Sections with neither used to render alone, and
			// the page shipped with no h1, no brief and no breadcrumb at all - while
			// the editor still made the author fill the Title in.
			const sectionsOwnTitle = page.sections.some(
				(s) => s.type === "hero" || !!(s.props as { title?: string })?.title,
			);
			if (sectionsOwnTitle)
				return (
					<main className="min-h-screen overflow-x-hidden text-foreground">
						{page.slug === "home" && <AnnouncementPopup />}
						<SectionRenderer sections={page.sections} />
					</main>
				);
			return (
				<SubPage
					wide
					section={page.parentTitle ?? page.title}
					title={page.title}
					lead={page.excerpt || undefined}
					heroImage={page.coverUrl || undefined}
				>
					{page.slug === "home" && <AnnouncementPopup />}
					<SectionRenderer sections={page.sections} />
				</SubPage>
			);
		}
		// A parent/hub page with no content of its own renders its children as an
		// index instead of a blank card (e.g. "Who We Are" → its sub-pages).
		const hasBody = page.bodyHtml.replace(/<[^>]*>/g, "").trim().length > 0;
		if (!hasBody && page.children && page.children.length > 0) {
			return (
				<SubPage
					wide
					section={page.parentTitle ?? page.title}
					title={page.title}
					lead={page.excerpt || undefined}
					heroImage={page.coverUrl || undefined}
				>
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{page.children.map((c) => (
							<NavLink
								key={c.slug}
								href={localizedHref(`/${c.slug}`, lang)}
								className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
							>
								{c.coverUrl && (
									<div className="aspect-[16/10] overflow-hidden">
										<img
											src={c.coverUrl}
											alt={c.title}
											className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
										/>
									</div>
								)}
								<div className="flex flex-1 flex-col p-6">
									<h2 className="t-card-title text-primary group-hover:text-[var(--accent)] transition">
										{c.title}
									</h2>
									{c.excerpt && (
										<p className="mt-2 text-sm text-muted-foreground line-clamp-3">
											{c.excerpt}
										</p>
									)}
									<span className="mt-4 inline-block text-sm font-semibold text-[var(--accent)]">
										{t("nav.explore", "Explore")} →
									</span>
								</div>
							</NavLink>
						))}
					</div>
				</SubPage>
			);
		}
		return (
			<SubPage
				section={page.parentTitle ?? page.title}
				title={page.title}
				lead={page.excerpt || undefined}
				heroImage={page.coverUrl || undefined}
			>
				{hasBody ? (
					<div
						className="prose-body"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted, server-rendered
						dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
					/>
				) : (
					<div className="text-center py-6">
						<p className="text-muted-foreground">
							{t(
								"page.empty",
								"This section is being updated. Please check back soon.",
							)}
						</p>
						<NavLink
							href={localizedHref("/", lang)}
							className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5"
						>
							← {t("nav.backHome", "Back to home")}
						</NavLink>
					</div>
				)}
			</SubPage>
		);
	}

	if (r.kind === "article") {
		const post = r.post;
		return (
			<SubPage
				section={collectionLabel(t, r.label)}
				title={post.title}
				lead={post.excerpt || undefined}
				heroImage={post.coverUrl || undefined}
			>
				<JsonLd
					data={articleLd(
						{
							title: post.title,
							description: post.excerpt,
							image: post.coverUrl,
							datePublished: post.publishedAt,
							author: post.author,
						},
						settings,
					)}
				/>
				{post.publishedAt && (
					<div className="text-xs text-[var(--accent)] font-semibold uppercase tracking-wider mb-6">
						{post.publishedAt} · {post.author ?? socialSiteName(settings)}
					</div>
				)}
				{post.contentType === "video" && (
					<VideoPlayer slug={post.slug} title={post.title} />
				)}
				{post.contentType === "publication" && (
					<PublicationFile slug={post.slug} title={post.title} />
				)}
				<RichBody className="prose-body" html={post.bodyHtml} />
				{post.gallery.length > 0 && (
					<div className="mt-10">
						<PhotoGrid photos={post.gallery} />
					</div>
				)}
				<ShareButtons title={post.title} />
				<RelatedPosts
					contentType={post.contentType}
					slug={post.slug}
					label={collectionLabel(t, r.label)}
				/>
			</SubPage>
		);
	}

	if (r.kind === "album") {
		const album = r.album;
		// Cap columns to the photo count so a 1–2 photo album doesn't strand empty
		// grid cells (a fixed 3-col grid left a conspicuous blank column).
		const albumCols =
			album.photos.length <= 1
				? "grid-cols-1 max-w-md mx-auto"
				: album.photos.length === 2
					? "grid-cols-2 max-w-2xl mx-auto"
					: "grid-cols-2 md:grid-cols-3";
		return (
			<SubPage
				section={collectionLabel(t, r.label)}
				title={album.title}
				lead={t("album.lead", "Click any photo to view it larger.")}
			>
				<PhotoGrid photos={album.photos} className={albumCols} />
			</SubPage>
		);
	}

	if (r.kind === "person") {
		const p = r.person;
		return (
			<SubPage
				section={collectionLabel(t, r.label)}
				title={p.name}
				lead={p.position || undefined}
				heroImage={p.photoUrl || undefined}
			>
				{p.photoUrl && (
					<img
						src={p.photoUrl}
						alt={p.name}
						className="mb-8 h-40 w-40 rounded-full object-cover shadow-[var(--shadow-soft)] ring-4 ring-card"
					/>
				)}
				{p.bodyHtml ? (
					<RichBody className="prose-body" html={p.bodyHtml} />
				) : (
					<p className="text-muted-foreground">{p.position}</p>
				)}
			</SubPage>
		);
	}

	if (r.kind === "project") {
		return (
			<ProjectView project={r.project} section={collectionLabel(t, r.label)} />
		);
	}

	return <PageNotFound />;
}

/** Rendered for a thrown notFound(), so the branded body still carries a 404 status. */
function PageNotFound() {
	const { lang } = useLang();
	const t = useT();
	return (
		<SubPage
			section={t("error.notfound.section", "Not found")}
			title={t("error.notfound.title", "Page not found")}
		>
			<p className="text-muted-foreground">
				{t("error.notfound.body", "This page doesn't exist or was moved.")}
			</p>
			<NavLink
				href={localizedHref("/", lang)}
				className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5"
			>
				← {t("nav.backHome", "Back to home")}
			</NavLink>
		</SubPage>
	);
}
