import { type ReactNode, useEffect } from "react";
import type { ResolvedPage, ResolvedPost } from "#/server/repo/content";
import type { ResolvedPerson } from "#/server/repo/people";
import type { ResolvedProject } from "#/server/repo/projects";
import { NavLink } from "@/components/NavLink";
import { type CmsMarker, cmsMark } from "@/components/sections/SectionRenderer";
import { useLang, useT } from "@/lib/i18n";
import { localizedHref } from "@/lib/i18n-config";
import {
	type EditableEntity,
	ENTITY_AREA,
	type FieldEditTarget,
	fieldLabel,
	isMultiline,
	rememberVersion,
	useInlineEdit,
	useStudioLink,
} from "@/lib/inline-edit";

type Crumb = { label: string; href?: string };

/** The record a page *is*, as opposed to the records its sections list. */
export type PageRecord = {
	entity: EditableEntity;
	entityId: number;
	/** The stored source of every field `updateField` takes, keyed by its name. */
	fields: Record<string, string>;
	/** Those of them showing the default language because this one stores none. */
	fallback: string[];
	/** The version the page was loaded at, which every save is checked against. */
	updatedAt: string | null;
};

/** A page's own text, off the payload the route loader already fetched. No body: the
 * stored source is prosemirror json, and rich text stays in the studio. */
export const pageRecord = (
	page: Pick<
		ResolvedPage,
		"id" | "title" | "excerpt" | "i18nFallback" | "updatedAt"
	>,
): PageRecord => ({
	entity: "page",
	entityId: page.id,
	fields: { title: page.title, excerpt: page.excerpt },
	fallback: page.i18nFallback,
	updatedAt: page.updatedAt,
});

/** The same for a post. No body: the payload carries the rendered html, not the source. */
export const postRecord = (
	post: Pick<
		ResolvedPost,
		"id" | "title" | "excerpt" | "i18nFallback" | "updatedAt"
	>,
): PageRecord => ({
	entity: "post",
	entityId: post.id,
	fields: { title: post.title, excerpt: post.excerpt },
	fallback: post.i18nFallback,
	updatedAt: post.updatedAt,
});

/**
 * A project's name and summary are translations rows like a page's title, and so
 * is a person's position; a person's name is still a column per language, which
 * `updateField` writes directly. Neither payload carries an `updatedAt`, so both
 * save without a version check.
 */
export const projectRecord = (
	project: Pick<ResolvedProject, "id" | "name" | "summary" | "i18nFallback">,
): PageRecord => ({
	entity: "project",
	entityId: project.id,
	fields: { name: project.name, summary: project.summary },
	fallback: project.i18nFallback,
	updatedAt: null,
});

export const personRecord = (
	person: Pick<ResolvedPerson, "id" | "name" | "position" | "i18nFallback">,
): PageRecord => ({
	entity: "person",
	entityId: person.id,
	fields: { name: person.name, position: person.position },
	fallback: person.i18nFallback,
	updatedAt: null,
});

/**
 * True while an admin who may edit this record's entity has the switch on. A
 * route whose kind carries no editable source, an album's, is never editable.
 */
function useEditingRecord(record: PageRecord | null): boolean {
	const { editing, may } = useInlineEdit();
	return (
		record !== null &&
		editing &&
		may(ENTITY_AREA[record.entity]) &&
		Object.keys(record.fields).length > 0
	);
}

const FIELD_TARGET = /^field:([A-Za-z][A-Za-z0-9_]*)$/;

/**
 * What the bar needs to edit one of this record's own fields, read off the
 * payload the page already has. Null for a field this route does not carry the
 * source of, and for a marker belonging to a record a listing pulled in.
 */
export function recordFieldTarget(
	record: PageRecord,
	lang: string,
	target: string,
): FieldEditTarget | null {
	const field = FIELD_TARGET.exec(target)?.[1];
	const shown = field === undefined ? undefined : record.fields[field];
	if (field === undefined || shown === undefined) return null;
	return {
		kind: "field",
		entity: record.entity,
		entityId: record.entityId,
		lang,
		target,
		shown,
		fellBack: record.fallback.includes(field),
		multiline: isMultiline(field, shown),
		label: fieldLabel(record.entity, field),
	};
}

/** Marks this record's own fields, and hands the bar the version it loaded. */
export function useRecordMark(record: PageRecord | null) {
	const { lang } = useLang();
	// a marked node is reachable by keyboard only while it is editable
	const focusable: CmsMarker = useEditingRecord(record) ? { tabIndex: 0 } : {};

	useEffect(() => {
		if (record)
			rememberVersion(record.entity, record.entityId, record.updatedAt);
	}, [record]);

	return (field: string): CmsMarker =>
		record
			? {
					...cmsMark(
						{ entity: record.entity, entityId: record.entityId, lang },
						`field:${field}`,
					),
					...focusable,
				}
			: {};
}

const OUTLINE = "color-mix(in oklab, var(--primary) 45%, transparent)";

/**
 * One delegated listener for this record's own fields, the field-level twin of
 * the section renderer's. A marker naming another record - a post title inside a
 * listing - belongs to that record and is left alone.
 */
function FieldLayer({ record }: { record: PageRecord }) {
	const { lang } = useLang();
	const { register } = useInlineEdit();
	const on = useEditingRecord(record);
	const scope = `[data-cms-entity="${record.entity}"][data-cms-entity-id="${record.entityId}"]`;
	useStudioLink(record.entity, record.entityId, on);

	useEffect(() => {
		if (!on) return;
		return register((node) =>
			node.matches(scope)
				? recordFieldTarget(
						record,
						lang,
						node.getAttribute("data-cms-target") ?? "",
					)
				: null,
		);
	}, [on, record, lang, scope, register]);

	if (!on) return null;
	const address = (field: string) =>
		`${scope}[data-cms-target="field:${field}"]`;
	const editable = Object.keys(record.fields).map(address).join(",");
	const hover = Object.keys(record.fields)
		.map((f) => `${address(f)}:hover`)
		.join(",");
	return (
		<style>{`${editable}{outline:1px dashed ${OUTLINE};outline-offset:2px;border-radius:2px;cursor:text}${hover}{outline-color:var(--primary);background:color-mix(in oklab, var(--primary) 8%, transparent)}`}</style>
	);
}

export function SubPage({
	section,
	sectionHref,
	title,
	lead,
	heroImage,
	badge,
	crumbs,
	wide = false,
	record,
	titleField,
	leadField,
	children,
}: {
	section: string;
	/** Where the section crumb goes. Absent leaves it plain text. */
	sectionHref?: string;
	title: string;
	lead?: string;
	heroImage?: string;
	badge?: string;
	crumbs?: Crumb[];
	/** Full-width body (max-w-7xl, no single card) for layouts that supply their
	 *  own cards/columns. Default is the narrow article card (max-w-4xl). */
	wide?: boolean;
	/** Which record the title and lead came from; absent leaves them unmarked. */
	record?: PageRecord | null;
	titleField?: string;
	leadField?: string;
	children: ReactNode;
}) {
	const { lang, t } = useLang();
	const { revision } = useInlineEdit();
	const mark = useRecordMark(record ?? null);
	return (
		// keyed: an edit leaves DOM nodes React no longer holds, so the tree is
		// rebuilt rather than patched. See `revision` in lib/inline-edit.
		<main key={revision} className="text-foreground overflow-x-hidden">
			{record && <FieldLayer record={record} />}
			{/* Hero */}
			<section className="relative pt-28 pb-24 px-6 overflow-hidden">
				<div className="absolute inset-0 -z-10">
					{/* Cover-less pages skip the photo and use the brand gradient alone, so
              they don't all wear the same stock hero image. */}
					{heroImage && (
						<img
							src={heroImage}
							alt=""
							className="h-full w-full object-cover"
						/>
					)}
					<div className="absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/75 to-background" />
					<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_35%,rgba(0,0,0,0.25))]" />
				</div>
				<div className="mx-auto max-w-7xl text-primary-foreground">
					<nav className="flex flex-wrap items-center gap-2 text-xs opacity-85">
						<NavLink
							exact
							href={localizedHref("/", lang)}
							className="tap-target hover:underline"
						>
							{t("nav.home", "Home")}
						</NavLink>
						<span aria-hidden>/</span>
						{sectionHref ? (
							<NavLink
								exact
								href={localizedHref(sectionHref, lang)}
								className="tap-target hover:underline"
							>
								{section}
							</NavLink>
						) : (
							<span>{section}</span>
						)}
						{crumbs?.map((c, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: server-rendered list, no reorder or delete while mounted
							<span key={i} className="flex items-center gap-2">
								<span aria-hidden>/</span>
								{c.href ? (
									<NavLink
										exact
										href={localizedHref(c.href, lang)}
										className="tap-target hover:underline"
									>
										{c.label}
									</NavLink>
								) : (
									<span>{c.label}</span>
								)}
							</span>
						))}
					</nav>
					{badge && (
						<div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gold)] backdrop-blur">
							{badge}
						</div>
					)}
					<h1
						{...(titleField ? mark(titleField) : {})}
						className="mt-5 max-w-4xl t-page-title [text-shadow:0_2px_24px_rgba(0,0,0,0.3)]"
					>
						{title}
					</h1>
					{lead && (
						<p
							{...(leadField ? mark(leadField) : {})}
							className="mt-5 max-w-3xl t-lead text-primary-foreground/90"
						>
							{lead}
						</p>
					)}
				</div>
			</section>

			{/* Body — pulled up to overlap the hero for a layered, polished feel. */}
			<section className="px-6 pb-24 -mt-16">
				<div className={`mx-auto ${wide ? "max-w-7xl" : "max-w-4xl"}`}>
					{wide ? (
						// Caller supplies its own cards/columns across the full frame.
						children
					) : (
						// Caller supplies its own `prose-body` wrapper for rich text; we don't
						// force it here so non-prose children (e.g. the album photo grid) stay clean.
						<div className="rounded-3xl bg-card border border-border shadow-[var(--shadow-soft)] p-8 md:p-12">
							{children}
						</div>
					)}
				</div>
			</section>
		</main>
	);
}

/* Reusable building blocks */

export function Section({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<section className="mt-10 first:mt-0">
			<h2 className="t-subsection text-primary">{title}</h2>
			<div className="mt-4 space-y-4 text-foreground/85 leading-relaxed">
				{children}
			</div>
		</section>
	);
}

export function Card({
	title,
	children,
	accent = false,
}: {
	title?: string;
	children: ReactNode;
	accent?: boolean;
}) {
	return (
		<div
			className={`rounded-2xl border p-6 ${
				accent
					? "border-[var(--accent)]/30 bg-[var(--accent)]/5"
					: "border-border bg-background/40"
			}`}
		>
			{title && (
				<h3 className="font-display text-lg font-semibold text-primary mb-2">
					{title}
				</h3>
			)}
			<div className="text-sm text-foreground/80 leading-relaxed">
				{children}
			</div>
		</div>
	);
}

export function Grid({
	cols = 3,
	children,
}: {
	cols?: 2 | 3 | 4;
	children: ReactNode;
}) {
	const c =
		cols === 2
			? "md:grid-cols-2"
			: cols === 4
				? "md:grid-cols-2 lg:grid-cols-4"
				: "md:grid-cols-2 lg:grid-cols-3";
	return <div className={`mt-6 grid grid-cols-1 ${c} gap-4`}>{children}</div>;
}

export function MediaPlaceholder({
	kind,
	title,
	meta,
}: {
	kind: "pdf" | "video" | "image";
	title: string;
	meta?: string;
}) {
	const t = useT();
	const icon = kind === "pdf" ? "📄" : kind === "video" ? "▶" : "🖼";
	const label =
		kind === "pdf"
			? "PDF"
			: kind === "video"
				? t("media.video", "Video")
				: t("media.image", "Image");
	return (
		<div className="group flex items-start gap-4 rounded-2xl border border-border bg-background/40 p-4 hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 transition">
			<div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[var(--secondary)]/15 text-xl text-[var(--secondary)]">
				{icon}
			</div>
			<div className="min-w-0">
				<div className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent-ink)] font-semibold">
					{label}
				</div>
				<div className="mt-0.5 font-medium text-foreground group-hover:text-[var(--accent)] transition">
					{title}
				</div>
				{meta && (
					<div className="text-xs text-muted-foreground mt-1">{meta}</div>
				)}
			</div>
		</div>
	);
}
