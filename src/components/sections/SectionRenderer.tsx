import { useLoaderData, useLocation, useRouter } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import {
	ENTITY_AREA,
	type FieldEditTarget,
	fieldLabel,
	isEditableEntity,
	isMultiline,
	rememberVersion,
	sharedNote,
	useInlineEdit,
	useStudioLink,
} from "#/lib/inline-edit";
import { saveErrorMessage } from "#/lib/save-error";
import {
	type SectionField,
	type SectionNode,
	sectionDef,
	translatableFields,
} from "#/lib/sections";
import type { JobItem, PostListItem } from "#/server/repo/content";
import type { PageInfo, SourceRow } from "#/server/repo/sections";
import { useLang, useT } from "@/lib/i18n";
import { localizedHref } from "@/lib/i18n-config";
import {
	imageFallbackRef,
	isPlaceholder,
	onImageError,
	PLACEHOLDER_IMAGE,
} from "@/lib/placeholder";

import { ContactForm } from "../ContactForm";
import { FormRenderer } from "../FormRenderer";
import { type MapMarker, MapView } from "../MapView";
import { NavLink } from "../NavLink";
import { usePdfReader } from "../PdfReader";
import { PersonPhotoEdit, useMayEditPeople } from "../PersonPhotoEdit";
import { PublicOrgChart } from "../PublicOrgChart";
import { RichBody } from "../RichBody";
import { DragHandle, SortableStatus, useSortable } from "../ui/sortable";
import { SectionBackground } from "./SectionBackground";

type Common = {
	layout?: string;
	eyebrow?: string;
	title?: string;
	tone?: string;
	/** An editor's own background colour, which beats `tone`. */
	toneColor?: string;
};

/* ------------------------------------------------------------------ */
/* Addressing                                                          */
/* ------------------------------------------------------------------ */

/** Which record the surrounding tree came from. */
export type EditIdentity = {
	entity: string;
	entityId: number;
	lang: string;
};

export type CmsMarker = Record<string, string | number>;

const Identity = createContext<EditIdentity | null>(null);
const SectionId = createContext<string | null>(null);

/** The addressing tuple as data attributes; empty when the tree carries no identity. */
export function cmsMark(
	id: EditIdentity | null | undefined,
	target: string,
): CmsMarker {
	if (!id) return {};
	return {
		"data-cms-entity": id.entity,
		"data-cms-entity-id": id.entityId,
		"data-cms-lang": id.lang,
		"data-cms-target": target,
	};
}

/** True while an admin who may edit this area has the switch on. */
function useMayEdit(area: string): boolean {
	const { editing, may } = useInlineEdit();
	return editing && may(area);
}

/** True while an admin who may edit pages has the switch on. */
function useEditingSections(): boolean {
	return useMayEdit("pages");
}

/** Marks a field of the section being rendered, e.g. `title`, `items[2].body`. */
function useMark() {
	const id = useContext(Identity);
	const sectionId = useContext(SectionId);
	// a marked node is reachable by keyboard only while it is editable
	const focusable: CmsMarker = useEditingSections() ? { tabIndex: 0 } : {};
	return (path: string): CmsMarker =>
		id && sectionId
			? { ...cmsMark(id, `section:${sectionId}:props.${path}`), ...focusable }
			: {};
}

/** A row a listing pulled in, carrying what an edit of its text needs. */
type MarkedRow = { id: number; i18nFallback: string[]; updatedAt?: string };

// the fields updateField takes on a listed record: PERSON_COLUMN_FIELDS and the
// text of ENTITY_FIELDS, less the bodies, whose source is prosemirror json
export const ROW_FIELDS: Record<string, readonly string[]> = {
	post: ["title", "excerpt"],
	project: ["name", "summary"],
	person: ["name", "position"],
};

/** Marks text a listing pulled from another record, which owns the row that holds it. */
function useRowMark() {
	const id = useContext(Identity);
	const { editing, may } = useInlineEdit();
	return <R extends MarkedRow>(
		entity: string,
		record: R,
		field: keyof R & string,
	): CmsMarker => {
		if (!id) return {};
		const mark = cmsMark(
			{ entity, entityId: record.id, lang: id.lang },
			`field:${field}`,
		);
		const editable =
			editing &&
			may(ENTITY_AREA[entity]) &&
			!!ROW_FIELDS[entity]?.includes(field);
		if (!editable) return mark;
		const text = record[field];
		return {
			...mark,
			"data-cms-source": typeof text === "string" ? text : "",
			// projects carry no updated_at, so a project row saves last-write-wins
			...(record.updatedAt ? { "data-cms-version": record.updatedAt } : {}),
			...(record.i18nFallback.includes(field)
				? { "data-cms-fell-back": "" }
				: {}),
			tabIndex: 0,
		};
	};
}

const ROW_TARGET = /^field:([A-Za-z][A-Za-z0-9_]*)$/;

/**
 * What the bar needs to edit text a listing pulled from another record, read off
 * the marked node itself. Null for the page's own record, whose fields SubPage's
 * layer claims, and for anything outside what `updateField` will take.
 */
export function rowEditTarget(
	node: Element,
	page: EditIdentity,
	editable: ReadonlySet<string>,
): FieldEditTarget | null {
	const entity = node.getAttribute("data-cms-entity") ?? "";
	const id = node.getAttribute("data-cms-entity-id");
	const field = ROW_TARGET.exec(
		node.getAttribute("data-cms-target") ?? "",
	)?.[1];
	const shown = node.getAttribute("data-cms-source");
	if (!field || !id || shown === null || !isEditableEntity(entity)) return null;
	const entityId = Number(id);
	if (!Number.isInteger(entityId) || !editable.has(entity)) return null;
	if (entity === page.entity && entityId === page.entityId) return null;
	if (!ROW_FIELDS[entity]?.includes(field)) return null;
	// versionOf reads this back out when the surface saves
	rememberVersion(entity, entityId, node.getAttribute("data-cms-version"));
	return {
		kind: "field",
		entity,
		entityId,
		lang: page.lang,
		target: `field:${field}`,
		shown,
		fellBack: node.hasAttribute("data-cms-fell-back"),
		multiline: isMultiline(field, shown),
		label: fieldLabel(entity, field),
		note: sharedNote(entity, field),
	};
}

const SECTION_TARGET =
	/^section:([A-Za-z0-9_-]+):props\.([A-Za-z][A-Za-z0-9_]*)(?:\[(\d+)\]\.([A-Za-z][A-Za-z0-9_]*))?$/;

// the cards kind declares no itemFields; its own editor draws a line for the
// title and a box for the body, so the inline editor offers the same two
const CARD_ITEM_FIELDS: SectionField[] = [
	{ key: "title", label: "Title", kind: "text" },
	{ key: "body", label: "Body", kind: "textarea" },
	{ key: "caption", label: "Image caption", kind: "text" },
];

const TEXT_KINDS = new Set(["text", "textarea", "richtext"]);

const fellBackKeys = (props: Record<string, unknown>): string[] =>
	Array.isArray(props.i18nFallback)
		? props.i18nFallback.filter((k): k is string => typeof k === "string")
		: [];

/**
 * What the bar needs to edit a marked node, read off the sections themselves
 * rather than off the DOM: `props.title` is the stored source, asterisks and
 * all, while the rendered heading has been split into accent spans.
 * Null when the target belongs to another renderer or another job.
 */
export function fieldEditTarget(
	sections: SectionNode[],
	id: EditIdentity,
	target: string,
): FieldEditTarget | null {
	const parsed = SECTION_TARGET.exec(target);
	if (!parsed || !isEditableEntity(id.entity)) return null;
	const [, sectionId, key, index, itemKey] = parsed;
	const section = sections.find((s) => s.id === sectionId);
	if (!section) return null;
	const props = (section.props ?? {}) as Record<string, unknown>;
	const field = sectionDef(section.type)?.fields.find((f) => f.key === key);
	const itemFields =
		field?.kind === "cards" ? CARD_ITEM_FIELDS : field?.itemFields;
	const item = itemKey ? itemFields?.find((f) => f.key === itemKey) : undefined;
	// the same fields updateField will accept, so no box promises a save it cannot make
	const editable = itemKey
		? !!item && TEXT_KINDS.has(item.kind)
		: translatableFields(section.type, props).some((f) => f.key === key);
	if (!editable) return null;
	const row = (props[key] as Record<string, unknown>[] | undefined)?.[
		Number(index)
	];
	const raw = itemKey ? row?.[itemKey] : props[key];
	const shown = typeof raw === "string" ? raw : "";
	const kind = (itemKey ? item?.kind : field?.kind) ?? "text";
	return {
		kind: "field",
		entity: id.entity,
		entityId: id.entityId,
		lang: id.lang,
		target,
		shown,
		// an item field cannot fall back on its own: the overlay replaces the whole array
		fellBack: !itemKey && fellBackKeys(props).includes(key),
		multiline:
			kind === "textarea" || kind === "richtext" || shown.includes("\n"),
		label: (itemKey ? item?.label : field?.label) ?? itemKey ?? key,
	};
}

const OUTLINE = "color-mix(in oklab, var(--primary) 45%, transparent)";

/**
 * What this renderer's marks address, lent to the edit surface for as long as
 * it is mounted. A signed-out visitor never reaches it: the context is off
 * until `auth.me` answers after hydration.
 */
function EditLayer({
	sections,
	identity,
}: {
	sections: SectionNode[];
	identity: EditIdentity | null;
}) {
	const { register } = useInlineEdit();
	const on = useEditingSections() && identity !== null;
	useStudioLink(identity?.entity, identity?.entityId, on);

	useEffect(() => {
		if (!on || !identity) return;
		return register((node) => {
			const address = node.getAttribute("data-cms-target");
			return address ? fieldEditTarget(sections, identity, address) : null;
		});
	}, [on, identity, sections, register]);

	if (!on) return null;
	const sel = '[data-cms-target^="section:"]';
	return (
		<style>{`${sel}{outline:1px dashed ${OUTLINE};outline-offset:2px;border-radius:2px;cursor:text}${sel}:hover{outline-color:var(--primary);background:color-mix(in oklab, var(--primary) 8%, transparent)}`}</style>
	);
}

// only a marker the mark itself declared editable carries its source text
const ROW_MARKED = '[data-cms-source][data-cms-target^="field:"]';

/** What the rows this page listed address, for as long as this renderer is mounted. */
function RowLayer({ identity }: { identity: EditIdentity | null }) {
	const { editing, may, register } = useInlineEdit();
	const allowed = Object.keys(ROW_FIELDS)
		.filter((entity) => may(ENTITY_AREA[entity]))
		.join(",");
	const on = editing && identity !== null && allowed !== "";

	useEffect(() => {
		if (!on || !identity) return;
		const editable = new Set(allowed.split(","));
		return register((node) => rowEditTarget(node, identity, editable));
	}, [on, identity, allowed, register]);

	if (!on) return null;
	return (
		<style>{`${ROW_MARKED}{outline:1px dashed ${OUTLINE};outline-offset:2px;border-radius:2px;cursor:text}${ROW_MARKED}:hover{outline-color:var(--primary);background:color-mix(in oklab, var(--primary) 8%, transparent)}`}</style>
	);
}

/* ------------------------------------------------------------------ */
/* Drag to order                                                       */
/* ------------------------------------------------------------------ */

// no hover and no focus ring on a touch screen, so there the grip always shows
const GRIP =
	"absolute left-0 top-0 z-20 bg-background/85 ring-1 ring-border shadow-sm backdrop-blur md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:focus-visible:opacity-100";

// off, it hands the rows back untouched: a visitor's markup and order never change
function useRowOrder<Row extends { id: number }>(
	rows: Row[],
	{
		on,
		label,
		name,
		save,
		axis = "grid",
	}: {
		on: boolean;
		/** What the bar calls this save, e.g. "Team order". */
		label: string;
		/** What to call one row in the grip's label and in the announcement. */
		name: (row: Row) => string;
		save: (ids: number[]) => Promise<unknown>;
		axis?: "list" | "grid";
	},
) {
	const { setStatus } = useInlineEdit();
	const router = useRouter({ warn: false });
	const byId = new Map(rows.map((r) => [r.id, r]));
	const sortable = useSortable<number>({
		ids: rows.map((r) => r.id),
		axis,
		disabled: !on,
		describe: (id) => {
			const row = byId.get(id);
			return row ? name(row) : String(id);
		},
		onReorder: async (ids) => {
			setStatus({ kind: "saving", label });
			// a subset: the server leaves everyone this listing left out in place
			await save(ids);
			router?.options.context.queryClient.removeQueries();
			await router?.invalidate();
			setStatus({ kind: "saved", label });
		},
		onError: (err) =>
			setStatus({ kind: "error", label, message: saveErrorMessage(err) }),
	});
	const list = on
		? sortable.order
				.map((id) => byId.get(id))
				.filter((row): row is Row => row !== undefined)
		: rows;
	return { ...sortable, on, list };
}

type RowOrder = ReturnType<typeof useSortable<number>>;

// a grip inside the card would be a button inside an anchor: invalid, and a
// click on it would navigate. off, the wrapper is not rendered at all.
function Grippable({
	order,
	id,
	className,
	children,
}: {
	order: Pick<RowOrder, "itemProps" | "handleProps"> & { on: boolean };
	id: number;
	className: string;
	children: React.ReactNode;
}) {
	if (!order.on) return children;
	return (
		<div {...order.itemProps(id)} className={className}>
			{children}
			<DragHandle {...order.handleProps(id)} className={GRIP} />
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */

const Container = ({
	className = "",
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) => <div className={`mx-auto max-w-7xl px-6 ${className}`}>{children}</div>;

const PAD = "py-20 md:py-24";

const TONE_CLASS: Record<string, string> = {
	card: "bg-card border-y border-border",
	muted: "bg-muted/40 border-y border-border",
	primary: "section-band section-band-primary",
	accent: "section-band section-band-accent",
	dark: "section-band section-band-dark",
};
const toneBg = (t?: string) => (t ? (TONE_CLASS[t] ?? "") : "");

// a custom colour beats the preset; the class reads it back off --band-custom
type Toned = { tone?: string; toneColor?: string };

/** A `<section>` wearing whichever background the editor chose. */
function Band({
	p,
	className = "",
	style,
	children,
	...rest
}: {
	p: Toned;
	className?: string;
	style?: React.CSSProperties;
	children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
	const custom = p.toneColor
		? ({ "--band-custom": p.toneColor } as React.CSSProperties)
		: null;
	return (
		<section
			className={`${className} ${custom ? "section-band section-band-custom" : toneBg(p.tone)}`}
			style={custom ? { ...style, ...custom } : style}
			{...rest}
		>
			{children}
		</section>
	);
}
const card =
	"rounded-3xl border border-border bg-card shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]";

/** Render a title string with *asterisk-wrapped* segments as italic accent text. */
function renderTitle(title: string, accent = "text-[var(--secondary-ink)]") {
	return String(title)
		.split(/(\*[^*]+\*|\n)/g)
		.map((seg, i) => {
			// biome-ignore lint/suspicious/noArrayIndexKey: split segments of one string, position is the identity
			if (seg === "\n") return <br key={i} />;
			if (seg.startsWith("*") && seg.endsWith("*"))
				return (
					// data-cms-accent is how the marked heading serializes back to *text*
					// biome-ignore lint/suspicious/noArrayIndexKey: split segments of one string, position is the identity
					<span key={i} data-cms-accent="" className={`italic ${accent}`}>
						{seg.slice(1, -1)}
					</span>
				);
			// biome-ignore lint/suspicious/noArrayIndexKey: split segments of one string, position is the identity
			return <span key={i}>{seg}</span>;
		});
}

// a page whose sections carry no hero has no h1 otherwise, so its first titled
// section supplies one. Styling is identical either way; only the level changes.
const OwnsPageTitle = createContext(false);

function Heading({
	eyebrow,
	title,
	center = false,
	light = false,
}: {
	eyebrow?: string;
	title?: string;
	center?: boolean;
	light?: boolean;
}) {
	const H = useContext(OwnsPageTitle) ? "h1" : "h2";
	const mark = useMark();
	if (!title && !eyebrow) return null;
	return (
		<div
			className={`${center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"} mb-12`}
		>
			{eyebrow && (
				<div
					{...mark("eyebrow")}
					className={`t-eyebrow ${light ? "text-[var(--gold)]" : "text-[var(--accent-ink)]"}`}
				>
					{eyebrow}
				</div>
			)}
			{title && (
				<H
					{...mark("title")}
					className={`mt-3 t-section ${light ? "" : "text-primary"}`}
				>
					{renderTitle(title)}
				</H>
			)}
		</div>
	);
}

// one level below whatever the section drew: h3 under its own h2, h2 when it
// drew nothing or drew the page h1
function useItemHeading(titled: boolean): "h2" | "h3" {
	const ownsPageTitle = useContext(OwnsPageTitle);
	return titled && !ownsPageTitle ? "h3" : "h2";
}

const Empty = ({ children }: { children: React.ReactNode }) => (
	<p className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
		{children}
	</p>
);

// renders empty while editing: an unwritten caption needs a node to click into
function ImageCaption({
	path,
	text,
	className = "",
	light = false,
}: {
	path: string;
	text?: string;
	className?: string;
	light?: boolean;
}) {
	const marks = useMark()(path);
	const editing = useEditingSections();
	const addressable = "data-cms-target" in marks;
	if (!text && !(editing && addressable)) return null;
	return (
		<figcaption
			{...marks}
			className={`image-caption ${light ? "text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]" : ""} ${className}`}
		>
			{text}
		</figcaption>
	);
}

const Blob = ({ className }: { className: string }) => (
	<div
		className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
		aria-hidden
	/>
);

const imgFor = (r: { image?: string | null; cover?: string | null }) =>
	r.image || r.cover || PLACEHOLDER_IMAGE;

/** Returns a language-prefixing localizer for internal hrefs (path-based i18n). */
function useL() {
	const { lang } = useLang();
	return (href?: string | null) => localizedHref(href, lang);
}

const Icon = {
	play: (c = "") => (
		<svg
			aria-hidden="true"
			className={c}
			viewBox="0 0 24 24"
			fill="currentColor"
		>
			<path d="M8 5v14l11-7z" />
		</svg>
	),
	doc: (c = "") => (
		<svg
			aria-hidden="true"
			className={c}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M14 3v5h5" />
			<path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
		</svg>
	),
	download: (c = "") => (
		<svg
			aria-hidden="true"
			className={c}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M12 3v12m0 0 4-4m-4 4-4-4" />
			<path d="M5 21h14" />
		</svg>
	),
};

function useCount(target: number, run: boolean, duration = 1800) {
	// start at the target so the SSR / no-JS DOM shows the real number, not 0
	const [n, setN] = useState(target);
	const played = useRef(false);
	useEffect(() => {
		if (!run || played.current) return;
		played.current = true;
		let raf = 0;
		const start = performance.now();
		setN(0);
		const tick = (now: number) => {
			const p = Math.min(1, (now - start) / duration);
			setN(Math.floor(target * (1 - (1 - p) ** 3)));
			if (p < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [target, run, duration]);
	return n;
}

/** Fires once when the element first scrolls into view — gates on-scroll animations
 * (e.g. the stats count-up) so they play when the user reaches them, not on page load. */
function useInView<T extends HTMLElement>() {
	const ref = useRef<T | null>(null);
	const [inView, setInView] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (!el || inView) return;
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) setInView(true);
			},
			{ rootMargin: "0px 0px -15% 0px" },
		);
		io.observe(el);
		return () => io.disconnect();
	}, [inView]);
	return [ref, inView] as const;
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

type HeroSlide = {
	image?: string;
	kicker?: string;
	title?: string;
	caption?: string;
};
type HeroStat = { value?: string; label?: string };
type HeroProps = Common & {
	lead?: string;
	image?: string;
	imageCaption?: string;
	ctaLabel?: string;
	ctaHref?: string;
	cta2Label?: string;
	cta2Href?: string;
	slides?: HeroSlide[];
	stats?: HeroStat[];
};

function Slideshow({ slides }: { slides: HeroSlide[] }) {
	const t = useT();
	const mark = useMark();
	const [i, setI] = useState(0);
	const [paused, setPaused] = useState(false);
	useEffect(() => {
		if (paused || slides.length < 2) return;
		const rotate = setInterval(
			() => setI((p) => (p + 1) % slides.length),
			4500,
		);
		return () => clearInterval(rotate);
	}, [paused, slides.length]);
	if (!slides.length) return null;
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: pause region, not a control. Hover and focus both stop the rotation, and the slide buttons inside stay the only way to act on it.
		<div
			className="relative h-[440px] md:h-[560px]"
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
			onFocus={() => setPaused(true)}
			onBlur={() => setPaused(false)}
		>
			<div className="group absolute inset-0 overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)] ring-1 ring-border">
				{slides.map((s, idx) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: slide index is the identity, compared against the active index
						key={idx}
						className={`absolute inset-0 transition-all duration-[1400ms] ease-out ${idx === i ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
						aria-hidden={idx !== i}
					>
						{s.image && (
							<img
								src={s.image}
								alt={s.caption || ""}
								className="h-full w-full object-cover"
								onError={onImageError}
								ref={imageFallbackRef}
							/>
						)}
						<div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/20 to-transparent" />
						<div className="absolute inset-x-0 bottom-0 p-7 md:p-9 text-primary-foreground">
							{s.kicker && (
								<div
									{...mark(`slides[${idx}].kicker`)}
									className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--gold)]"
								>
									{s.kicker}
								</div>
							)}
							{s.title && (
								<h2
									{...mark(`slides[${idx}].title`)}
									className="mt-2 max-w-md font-display text-2xl md:text-3xl font-semibold leading-tight"
								>
									{s.title}
								</h2>
							)}
							{s.caption && (
								<p
									{...mark(`slides[${idx}].caption`)}
									className="mt-2 text-sm opacity-90"
								>
									{s.caption}
								</p>
							)}
						</div>
					</div>
				))}
				<div className="absolute inset-x-5 top-5 z-10 flex gap-1.5">
					{slides.map((_, idx) => (
						<button
							// biome-ignore lint/suspicious/noArrayIndexKey: slide index is the identity, compared against the active index
							key={idx}
							type="button"
							onClick={() => setI(idx)}
							aria-label={t("hero.slide", "Slide {n}", { n: idx + 1 })}
							className="tap-target relative h-1 flex-1 rounded-full"
						>
							{/* the clip lives here, not on the button: overflow-hidden there would
							    cut off the ::after that carries the 24px hit area */}
							<span className="absolute inset-0 overflow-hidden rounded-full bg-white/30">
								<span
									className={`absolute inset-y-0 left-0 bg-white ${idx === i ? "w-full transition-[width] duration-[4500ms] ease-linear" : "w-0"}`}
								/>
							</span>
						</button>
					))}
				</div>
			</div>
			<Blob className="-left-6 -top-6 -z-10 h-32 w-32 bg-[var(--gold)]/40" />
			<Blob className="-bottom-6 -right-6 -z-10 h-40 w-40 bg-[var(--accent)]/30" />
		</div>
	);
}

function Hero(p: HeroProps) {
	const L = useL();
	const t = useT();
	const mark = useMark();
	const layout = p.layout ?? "banner";
	const slides: HeroSlide[] = Array.isArray(p.slides) ? p.slides : [];
	const stats: HeroStat[] = Array.isArray(p.stats) ? p.stats : [];

	const ctas = (center?: boolean) => (
		<div
			className={`mt-8 flex flex-wrap gap-3 ${center ? "justify-center" : ""}`}
		>
			{p.ctaHref && (
				<NavLink
					href={L(p.ctaHref)}
					{...mark("ctaLabel")}
					className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition"
				>
					{p.ctaLabel || t("cta.learnMore", "Learn more")}
				</NavLink>
			)}
			{p.cta2Href && (
				<NavLink
					href={L(p.cta2Href)}
					{...mark("cta2Label")}
					className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition"
				>
					{p.cta2Label || t("cta.learnMore", "Learn more")}
				</NavLink>
			)}
		</div>
	);

	// Showcase: split text + slideshow (the homepage hero).
	if ((layout === "carousel" || layout === "showcase") && slides.length) {
		return (
			<Band p={p} className="relative overflow-hidden">
				<Container className="grid items-center gap-12 py-16 lg:grid-cols-12 lg:py-24">
					<div className="relative z-10 lg:col-span-6">
						{p.eyebrow && (
							<div
								{...mark("eyebrow")}
								className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/5 px-4 py-1.5 text-xs font-medium text-[var(--accent-ink)]"
							>
								<span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
								{p.eyebrow}
							</div>
						)}
						<h1 {...mark("title")} className="mt-6 t-display text-primary">
							{renderTitle(p.title || "", "text-[var(--accent-ink)]")}
						</h1>
						{p.lead && (
							<p
								{...mark("lead")}
								className="mt-6 max-w-xl t-lead text-muted-foreground"
							>
								{p.lead}
							</p>
						)}
						{ctas()}
						{stats.length > 0 && (
							<div className="mt-12 flex items-center gap-6 text-xs text-muted-foreground">
								{stats.map((s, n) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: server-rendered list, no reorder or delete while mounted
									<div key={n} className="flex items-center gap-6">
										{n > 0 && <span className="h-10 w-px bg-border" />}
										<div>
											<div
												{...mark(`stats[${n}].value`)}
												className="font-display text-2xl font-semibold text-primary"
											>
												{s.value}
											</div>
											<span {...mark(`stats[${n}].label`)}>{s.label}</span>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
					<div className="lg:col-span-6">
						<Slideshow slides={slides} />
					</div>
				</Container>
			</Band>
		);
	}

	if (layout === "split") {
		return (
			<Band p={p} className="py-16 md:py-24">
				<Container className="grid items-center gap-12 lg:grid-cols-2">
					<div>
						{p.eyebrow && (
							<div
								{...mark("eyebrow")}
								className="t-eyebrow text-[var(--accent)]"
							>
								{p.eyebrow}
							</div>
						)}
						<h1 {...mark("title")} className="mt-3 t-page-title text-primary">
							{renderTitle(p.title || "")}
						</h1>
						{p.lead && (
							<p {...mark("lead")} className="mt-5 t-lead text-foreground/75">
								{p.lead}
							</p>
						)}
						{ctas()}
					</div>
					{p.image && (
						<figure className="m-0">
							<img
								src={p.image}
								alt={p.title || ""}
								className="rounded-3xl object-cover w-full aspect-[4/3] shadow-[var(--shadow-soft)]"
								onError={onImageError}
								ref={imageFallbackRef}
							/>
							<ImageCaption path="imageCaption" text={p.imageCaption} />
						</figure>
					)}
				</Container>
			</Band>
		);
	}

	// Banner (full-bleed) — used by sub-pages / simple heroes.
	const bg = p.image;
	return (
		<Band
			p={p}
			className={`relative flex min-h-[60vh] items-center overflow-hidden ${p.tone || p.toneColor ? "" : "bg-primary"}`}
		>
			<div className="absolute inset-0">
				{bg && (
					<img
						src={bg}
						alt=""
						className="h-full w-full object-cover"
						onError={onImageError}
						ref={imageFallbackRef}
					/>
				)}
				<div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/45" />
			</div>
			<Container className="relative py-24 text-center text-primary-foreground">
				{p.eyebrow && (
					<div
						{...mark("eyebrow")}
						className="t-eyebrow text-[var(--gold)] [text-shadow:0_1px_10px_rgba(0,0,0,0.7)]"
					>
						{p.eyebrow}
					</div>
				)}
				<h1
					{...mark("title")}
					className="mx-auto mt-4 max-w-4xl t-page-title [text-shadow:0_2px_24px_rgba(0,0,0,0.45)]"
				>
					{renderTitle(p.title || "", "text-[var(--gold)]")}
				</h1>
				{p.lead && (
					<p
						{...mark("lead")}
						className="mx-auto mt-6 max-w-2xl t-lead text-white/90 [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]"
					>
						{p.lead}
					</p>
				)}
				{ctas(true)}
				<ImageCaption
					path="imageCaption"
					text={p.imageCaption}
					className="mt-8"
					light
				/>
			</Container>
		</Band>
	);
}

/* ------------------------------------------------------------------ */
/* Static templates                                                    */
/* ------------------------------------------------------------------ */

/** Rich text is authored as a document and pre-rendered to `bodyHtml` server-side. */
type RichTextProps = Common & { bodyHtml?: string };

function RichText(p: RichTextProps) {
	return (
		<Band p={p} className={PAD}>
			<Container className={p.layout === "narrow" ? "max-w-3xl" : "max-w-4xl"}>
				<Heading eyebrow={p.eyebrow} title={p.title} />
				<RichBody className="prose-body" html={p.bodyHtml ?? ""} />
			</Container>
		</Band>
	);
}

type CardButton = { label?: string; href?: string };
type CardItem = {
	image?: string;
	imageAsBg?: boolean;
	caption?: string;
	title?: string;
	body?: string;
	href?: string;
	buttons?: CardButton[];
};
type CardsProps = Common & { center?: string; items?: CardItem[] };

function Cards(p: CardsProps) {
	const L = useL();
	const t = useT();
	const mark = useMark();
	const cols =
		p.layout === "cols-2"
			? "md:grid-cols-2"
			: p.layout === "cols-4"
				? "sm:grid-cols-2 lg:grid-cols-4"
				: "sm:grid-cols-2 lg:grid-cols-3";
	const items: CardItem[] = Array.isArray(p.items) ? p.items : [];

	const footer = (it: CardItem, light = false) => {
		// Buttons: explicit list, or a legacy single `href` folded into one button.
		const btns: CardButton[] = Array.isArray(it.buttons)
			? it.buttons
			: it.href
				? [{ label: t("cta.learnMore", "Learn more"), href: it.href }]
				: [];
		const valid = btns.filter((b) => b?.href);
		if (!valid.length) return null;
		return (
			<div className="mt-5 flex flex-wrap gap-2">
				{valid.map((b, i) => (
					<NavLink
						// biome-ignore lint/suspicious/noArrayIndexKey: server-rendered list, no reorder or delete while mounted
						key={i}
						href={L(b.href)}
						className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${light ? "bg-white/15 text-white hover:bg-white/25" : "bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"}`}
					>
						{b.label || t("cta.learnMore", "Learn more")}
					</NavLink>
				))}
			</div>
		);
	};

	if (p.layout === "logos")
		return (
			<Band p={p} className={PAD}>
				<Container>
					<Heading eyebrow={p.eyebrow} title={p.title} center={!!p.center} />
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
						{items.map((it, n) => (
							<LogoTile
								// biome-ignore lint/suspicious/noArrayIndexKey: server-rendered list, no reorder or delete while mounted
								key={n}
								item={it}
								index={n}
							/>
						))}
					</div>
				</Container>
			</Band>
		);

	return (
		<Band p={p} className={PAD}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} center={!!p.center} />
				<div className={`grid grid-cols-1 ${cols} gap-5`}>
					{items.map((it, n) => {
						// Background-image card: image fills the card, text overlaid in white.
						if (it.image && it.imageAsBg) {
							return (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: server-rendered list, no reorder or delete while mounted
									key={n}
									className="relative flex min-h-[260px] flex-col justify-end overflow-hidden rounded-3xl border border-border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
								>
									<img
										src={it.image}
										alt={it.title || ""}
										className="absolute inset-0 h-full w-full object-cover"
										onError={onImageError}
										ref={imageFallbackRef}
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
									<div className="relative text-white">
										{it.title && (
											<h3
												{...mark(`items[${n}].title`)}
												className="t-card-title [text-shadow:0_1px_10px_rgba(0,0,0,0.5)]"
											>
												{it.title}
											</h3>
										)}
										{it.body && (
											<p
												{...mark(`items[${n}].body`)}
												className="mt-2 t-body text-white/85"
											>
												{it.body}
											</p>
										)}
										<ImageCaption
											path={`items[${n}].caption`}
											text={it.caption}
											light
										/>
										{footer(it, true)}
									</div>
								</div>
							);
						}
						// Standard card: optional image on top, then title/body/buttons.
						return (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: server-rendered list, no reorder or delete while mounted
								key={n}
								className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[var(--shadow-soft)]"
							>
								{it.image ? (
									<img
										src={it.image}
										alt={it.title || ""}
										className="aspect-video w-full object-cover"
										onError={onImageError}
										ref={imageFallbackRef}
									/>
								) : null}
								<div className="flex flex-1 flex-col p-6">
									{it.image && (
										<ImageCaption
											path={`items[${n}].caption`}
											text={it.caption}
											className="mt-0 mb-3"
										/>
									)}
									{!it.image && (
										<div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] font-display text-lg font-bold">
											{n + 1}
										</div>
									)}
									{it.title && (
										<h3
											{...mark(`items[${n}].title`)}
											className="t-card-title text-primary"
										>
											{it.title}
										</h3>
									)}
									{it.body && (
										<p
											{...mark(`items[${n}].body`)}
											className="mt-2 t-body text-foreground/75"
										>
											{it.body}
										</p>
									)}
									{footer(it)}
								</div>
							</div>
						);
					})}
				</div>
			</Container>
		</Band>
	);
}

/** A logo, uncropped, on a tile the reader can click. Names and blurbs stay. */
function LogoTile({ item, index }: { item: CardItem; index: number }) {
	const L = useL();
	const mark = useMark();
	const href = item.href || item.buttons?.find((b) => b?.href)?.href || "";
	const inner = (
		<>
			<span className="grid h-20 place-items-center rounded-xl border border-border bg-white p-3 transition group-hover:border-[var(--accent)]">
				{item.image ? (
					// title renders beside it and names the tile; alt would read twice
					<img
						src={item.image}
						alt=""
						className="max-h-14 max-w-full object-contain"
						onError={onImageError}
						ref={imageFallbackRef}
					/>
				) : (
					<span className="t-meta font-medium text-foreground/70">
						{item.title}
					</span>
				)}
			</span>
			{item.image && item.title && (
				<span
					{...mark(`items[${index}].title`)}
					className="mt-2 block text-center text-xs font-medium text-foreground/80"
				>
					{item.title}
				</span>
			)}
			{item.body && (
				<span
					{...mark(`items[${index}].body`)}
					className="mt-1 line-clamp-2 block text-center text-[11px] leading-snug text-muted-foreground"
				>
					{item.body}
				</span>
			)}
		</>
	);
	return href ? (
		<NavLink href={L(href)} className="group block">
			{inner}
		</NavLink>
	) : (
		<div className="group">{inner}</div>
	);
}

function StatItem({
	index,
	value,
	label,
	icon,
	run,
	valueClass = "text-5xl md:text-6xl",
	labelClass = "text-xs",
}: {
	index: number;
	value: string;
	label?: string;
	icon?: string;
	run: boolean;
	valueClass?: string;
	labelClass?: string;
}) {
	const mark = useMark();
	const digits = String(value).replace(/[^0-9]/g, "");
	const target = digits ? Number(digits) : 0;
	const n = useCount(target, run);
	// Replace the whole numeric run (incl. thousands separators) so values >= 1000 also
	// animate — matching on the bare digit string fails against a comma-formatted value.
	const display = digits
		? String(value).replace(/[\d,]+/, n.toLocaleString())
		: value;
	return (
		<div className="group">
			{icon && (
				<img
					src={icon}
					alt=""
					className="mb-4 h-10 w-10 object-contain opacity-90"
					onError={onImageError}
					ref={imageFallbackRef}
				/>
			)}
			<div
				aria-hidden="true"
				{...mark(`items[${index}].value`)}
				className={`font-display ${valueClass} font-semibold tabular-nums tracking-tight text-[var(--secondary)] whitespace-nowrap`}
			>
				{display}
			</div>
			<span className="sr-only">
				{value} {label}
			</span>
			<div
				aria-hidden="true"
				{...mark(`items[${index}].label`)}
				className={`mt-2 ${labelClass} uppercase tracking-[0.18em] text-primary-foreground/70`}
			>
				{label}
			</div>
			<div
				aria-hidden="true"
				className="mt-4 h-px w-12 bg-[var(--secondary)]/60 transition-all duration-500 group-hover:w-24"
			/>
		</div>
	);
}

const STAT_VALUE_SIZE: Record<string, string> = {
	sm: "text-3xl md:text-4xl",
	md: "text-4xl md:text-5xl",
	lg: "text-5xl md:text-6xl",
	xl: "text-6xl md:text-7xl",
};
const STAT_LABEL_SIZE: Record<string, string> = {
	xs: "text-xs",
	sm: "text-sm",
	md: "text-base",
};

type StatRow = { icon?: string; value?: string; label?: string };
type StatsProps = Common & {
	valueSize?: string;
	labelSize?: string;
	image?: string;
	imageCaption?: string;
	items?: StatRow[];
};

function Stats(p: StatsProps) {
	const mark = useMark();
	const items: StatRow[] = Array.isArray(p.items) ? p.items : [];
	const [bandRef, inView] = useInView<HTMLElement>();
	const band = p.layout !== "plain";
	// Default the number to large on the band / medium on the plain layout; label defaults small.
	const valueClass =
		STAT_VALUE_SIZE[p.valueSize ?? ""] ??
		(band ? STAT_VALUE_SIZE.lg : STAT_VALUE_SIZE.md);
	const labelClass = STAT_LABEL_SIZE[p.labelSize ?? ""] ?? STAT_LABEL_SIZE.xs;
	if (!band) {
		return (
			<Band p={p} className={PAD}>
				<Container>
					<Heading eyebrow={p.eyebrow} title={p.title} />
					<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-8 gap-y-10">
						{items.map((it, n) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: server-rendered list, no reorder or delete while mounted
							<div key={n}>
								{it.icon && (
									<img
										src={it.icon}
										alt=""
										className="mb-3 h-10 w-10 object-contain"
										onError={onImageError}
										ref={imageFallbackRef}
									/>
								)}
								<div
									{...mark(`items[${n}].value`)}
									className={`font-display ${valueClass} font-semibold tabular-nums tracking-tight text-primary whitespace-nowrap`}
								>
									{it.value}
								</div>
								<div
									{...mark(`items[${n}].label`)}
									className={`mt-2 ${labelClass} text-muted-foreground`}
								>
									{it.label}
								</div>
							</div>
						))}
					</div>
				</Container>
			</Band>
		);
	}
	return (
		<section
			ref={bandRef}
			className="relative overflow-hidden py-24 text-primary-foreground"
			style={{ background: "var(--gradient-hero)" }}
		>
			{p.image && (
				<div
					className="absolute inset-0 opacity-30 mix-blend-overlay"
					style={{
						backgroundImage: `url(${p.image})`,
						backgroundSize: "cover",
						backgroundPosition: "center",
					}}
				/>
			)}
			<div className="absolute inset-0 bg-primary/70" />
			<Container className="relative">
				<div className="mb-16 max-w-3xl">
					{p.eyebrow && (
						<div {...mark("eyebrow")} className="t-eyebrow text-[var(--gold)]">
							{p.eyebrow}
						</div>
					)}
					{p.title && (
						<h2 {...mark("title")} className="mt-3 t-band">
							{renderTitle(p.title)}
						</h2>
					)}
				</div>
				<div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-10 gap-y-12">
					{items.map((it, n) => (
						<StatItem
							// biome-ignore lint/suspicious/noArrayIndexKey: server-rendered list, no reorder or delete while mounted
							key={n}
							index={n}
							value={String(it.value)}
							label={it.label}
							icon={it.icon}
							run={inView}
							valueClass={valueClass}
							labelClass={labelClass}
						/>
					))}
				</div>
				<ImageCaption
					path="imageCaption"
					text={p.imageCaption}
					className="mt-12"
					light
				/>
			</Container>
		</section>
	);
}

type CtaProps = Common & {
	body?: string;
	ctaLabel?: string;
	ctaHref?: string;
	cta2Label?: string;
	cta2Href?: string;
};

function Cta(p: CtaProps) {
	const L = useL();
	const t = useT();
	const mark = useMark();
	return (
		<Band
			p={p}
			className="relative overflow-hidden py-24"
			style={
				p.tone || p.toneColor
					? undefined
					: { background: "var(--gradient-warm)" }
			}
		>
			<Blob className="-left-20 -top-20 h-80 w-80 bg-[var(--gold)]/40" />
			<Blob className="-bottom-20 -right-20 h-80 w-80 bg-primary/30" />
			<div className="relative mx-auto max-w-4xl px-6 text-center">
				{p.eyebrow && (
					<div
						{...mark("eyebrow")}
						className="t-eyebrow text-warm-foreground-muted/80"
					>
						{p.eyebrow}
					</div>
				)}
				<h2 {...mark("title")} className="mt-4 t-band text-warm-foreground">
					{renderTitle(p.title || "", "italic")}
				</h2>
				{p.body && (
					<p
						{...mark("body")}
						className="mx-auto mt-6 max-w-2xl t-lead text-warm-foreground-muted/90"
					>
						{p.body}
					</p>
				)}
				<div className="mt-10 flex flex-wrap justify-center gap-4">
					{p.ctaHref && (
						<NavLink
							href={L(p.ctaHref)}
							{...mark("ctaLabel")}
							className="inline-flex items-center gap-2 rounded-full bg-warm-foreground text-primary-foreground px-8 py-4 text-base font-semibold shadow-[var(--shadow-lift)] hover:-translate-y-1 transition"
						>
							{p.ctaLabel || t("cta.donateNow", "Donate now")}
						</NavLink>
					)}
					{p.cta2Href && (
						<NavLink
							href={L(p.cta2Href)}
							{...mark("cta2Label")}
							className="inline-flex items-center gap-2 rounded-full border-2 border-warm-foreground/40 text-warm-foreground px-8 py-4 text-base font-semibold hover:bg-warm-foreground hover:text-primary-foreground transition"
						>
							{p.cta2Label || t("cta.learnMore", "Learn more")}
						</NavLink>
					)}
				</div>
			</div>
		</Band>
	);
}

type ResourceItem = {
	kind?: string;
	title?: string;
	meta?: string;
	href?: string;
};
type ResourcesProps = Common & { items?: ResourceItem[] };

function Resources(p: ResourcesProps) {
	const t = useT();
	const mark = useMark();
	const items: ResourceItem[] = Array.isArray(p.items) ? p.items : [];
	const cols = p.layout === "cols-2" ? "md:grid-cols-2" : "";
	const { openPdf, reader } = usePdfReader();
	return (
		<Band p={p} className={PAD}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} />
				{items.length === 0 ? (
					<Empty>{t("empty.resources", "No resources published yet.")}</Empty>
				) : (
					<div className={`grid grid-cols-1 ${cols} gap-4`}>
						{items.map((it, n) => {
							// "#" is what the editor stores for a file it has not uploaded yet
							const href = it.href && it.href !== "#" ? it.href : null;
							const body = (
								<>
									<div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
										{Icon.doc("h-6 w-6")}
									</div>
									<div className="min-w-0 flex-1">
										<div className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent-ink)] font-semibold">
											{it.kind || t("resources.kindDefault", "file")}
										</div>
										<div
											{...mark(`items[${n}].title`)}
											className="mt-0.5 font-medium text-foreground group-hover:text-[var(--accent)] transition"
										>
											{it.title}
										</div>
										{it.meta && (
											<div
												{...mark(`items[${n}].meta`)}
												className="text-xs text-muted-foreground mt-0.5"
											>
												{it.meta}
											</div>
										)}
									</div>
								</>
							);
							// still worth listing, but as a row: a link to "#" announces
							// itself as a link and then jumps to the top of the page
							return href ? (
								<NavLink
									// biome-ignore lint/suspicious/noArrayIndexKey: server-rendered list, no reorder or delete while mounted
									key={n}
									href={href}
									onClick={(e) => openPdf(e, { url: href, title: it.title })}
									className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[var(--shadow-soft)]"
								>
									{body}
									<span className="shrink-0 text-muted-foreground/50 group-hover:text-[var(--accent)] transition">
										{Icon.download("h-5 w-5")}
									</span>
								</NavLink>
							) : (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: server-rendered list, no reorder or delete while mounted
									key={n}
									className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
								>
									{body}
								</div>
							);
						})}
					</div>
				)}
				{reader}
			</Container>
		</Band>
	);
}

type SplitProps = Common & {
	image?: string;
	imageCaption?: string;
	bodyHtml?: string;
	statValue?: string;
	statLabel?: string;
};

function Split(p: SplitProps) {
	const mark = useMark();
	const mediaLeft = p.layout === "media-left";
	const media = p.image ? (
		<div className="relative">
			<div className="overflow-hidden rounded-3xl ring-1 ring-border shadow-[var(--shadow-soft)]">
				<img
					src={p.image}
					alt={p.title || ""}
					className="h-[420px] w-full object-cover md:h-[480px]"
					onError={onImageError}
					ref={imageFallbackRef}
				/>
			</div>
			{p.statValue && (
				<div className="absolute -bottom-8 -right-6 max-w-[220px] rounded-2xl bg-card p-6 shadow-[var(--shadow-lift)] ring-1 ring-border">
					<div
						{...mark("statValue")}
						className="font-display text-4xl font-semibold text-[var(--accent)]"
					>
						{p.statValue}
					</div>
					<div
						{...mark("statLabel")}
						className="mt-1 text-xs uppercase tracking-wider text-muted-foreground"
					>
						{p.statLabel}
					</div>
				</div>
			)}
			<ImageCaption
				path="imageCaption"
				text={p.imageCaption}
				className={p.statValue ? "mt-12" : ""}
			/>
		</div>
	) : null;
	const text = (
		<div>
			{p.eyebrow && (
				<div
					{...mark("eyebrow")}
					className="t-eyebrow text-[var(--accent-ink)]"
				>
					{p.eyebrow}
				</div>
			)}
			{p.title && (
				<h2 {...mark("title")} className="mt-3 t-section text-primary">
					{renderTitle(p.title, "italic text-primary")}
				</h2>
			)}
			<RichBody className="prose-body mt-6" html={p.bodyHtml ?? ""} />
		</div>
	);
	return (
		<Band p={p} className={PAD}>
			<Container className="grid items-center gap-16 lg:grid-cols-2">
				{mediaLeft ? (
					<>
						{media}
						{text}
					</>
				) : (
					<>
						{text}
						{media}
					</>
				)}
			</Container>
		</Band>
	);
}

type PillGroup = { heading?: string; links?: string };
type PillsProps = Common & { groups?: PillGroup[] };

function Pills(p: PillsProps) {
	const mark = useMark();
	const groups: PillGroup[] = Array.isArray(p.groups) ? p.groups : [];
	const parse = (s?: string) =>
		String(s || "")
			.split(",")
			.map((x) => x.trim())
			.filter(Boolean)
			.map((pair) => {
				const [label, href] = pair.split("|").map((y) => y.trim());
				return { label, href: href || "#" };
			});
	return (
		<Band p={p} className={PAD}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} />
				<div className="space-y-7">
					{groups.map((g, n) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: server-rendered list, no reorder or delete while mounted
						<div key={n}>
							{g.heading && (
								<h3
									{...mark(`groups[${n}].heading`)}
									className="mb-3 font-display text-lg font-semibold text-primary"
								>
									{g.heading}
								</h3>
							)}
							<div className="flex flex-wrap gap-2.5">
								{parse(g.links).map((l, m) => (
									<NavLink
										// biome-ignore lint/suspicious/noArrayIndexKey: server-rendered list, no reorder or delete while mounted
										key={m}
										href={l.href}
										className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/80 shadow-sm hover:border-[var(--accent)] hover:text-[var(--accent)] hover:-translate-y-0.5 transition"
									>
										{l.label}
									</NavLink>
								))}
							</div>
						</div>
					))}
				</div>
			</Container>
		</Band>
	);
}

type FormProps = Common & {
	formSlug?: string;
	body?: string;
};

function FormSection(p: FormProps) {
	const mark = useMark();
	// Nothing to post to: no built form and not the contact layout. Rendering the
	// fields anyway gave a volunteer or an applicant a form that discarded them.
	if (!p.formSlug && p.layout !== "contact") return null;
	// A built form carries its own title/intro/submit, so the section's heading
	// and intro are only used for the quick contact layout.
	const builtForm = !!p.formSlug;
	return (
		<Band p={p} className={PAD}>
			<Container className="max-w-2xl">
				{!builtForm && <Heading eyebrow={p.eyebrow} title={p.title} center />}
				{!builtForm && p.body && (
					<p
						{...mark("body")}
						className="-mt-6 mb-8 text-center text-foreground/75 leading-relaxed"
					>
						{p.body}
					</p>
				)}
				<div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
					{p.formSlug ? <FormRenderer slug={p.formSlug} /> : <ContactForm />}
				</div>
			</Container>
		</Band>
	);
}

/* ------------------------------------------------------------------ */
/* Dynamic templates                                                   */
/* ------------------------------------------------------------------ */

// one posts source, two row shapes: a row carries whichever fields its own source filled
type PostRow = Partial<PostListItem & JobItem> &
	Pick<PostListItem, "id" | "slug" | "title" | "i18nFallback" | "updatedAt">;
type PostListProps = Common & {
	moreHref?: string;
	linkBase?: string;
	data?: PostRow[];
	pageInfo?: PageInfo;
};

function PostCard({
	post,
	base,
	titleAs: H,
}: {
	post: PostRow;
	base: string;
	titleAs: "h2" | "h3";
}) {
	const L = useL();
	const t = useT();
	const row = useRowMark();
	const href = base ? L(`${base}/${post.slug}`) : undefined;
	const body = (
		<>
			<div className="relative h-56 overflow-hidden">
				<img
					src={imgFor(post)}
					alt={post.title || ""}
					className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
					onError={onImageError}
					ref={imageFallbackRef}
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent to-transparent" />
				{post.publishedAt && (
					<span className="absolute left-4 top-4 rounded-full bg-[var(--accent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
						{post.publishedAt}
					</span>
				)}
			</div>
			<div className="p-6">
				<H
					{...row("post", post, "title")}
					className="t-card-title text-primary group-hover:text-[var(--accent)] transition"
				>
					{post.title}
				</H>
				{post.excerpt && (
					<p
						{...row("post", post, "excerpt")}
						className="mt-2 t-meta text-foreground/70 line-clamp-3"
					>
						{post.excerpt}
					</p>
				)}
				{href && (
					<span className="mt-4 inline-block text-sm font-semibold text-[var(--accent-ink)]">
						{t("home.news.readmore", "Read more →")}
					</span>
				)}
			</div>
		</>
	);
	return href ? (
		<NavLink href={href} className={`${card} group block overflow-hidden`}>
			{body}
		</NavLink>
	) : (
		<div className="group overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
			{body}
		</div>
	);
}

function pageWindow(page: number, total: number): (number | "gap")[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	const near = [page - 1, page, page + 1].filter((n) => n > 1 && n < total);
	const out: (number | "gap")[] = [1];
	if (near[0] > 2) out.push("gap");
	out.push(...near);
	if (near[near.length - 1] < total - 1) out.push("gap");
	out.push(total);
	return out;
}

// a plain anchor, not a Link: the page is server-rendered per ?page=, and a
// crawler has to see every page of the list as its own url
function Pager({ info }: { info: PageInfo }) {
	const t = useT();
	const { pathname } = useLocation();
	const href = (n: number) => (n <= 1 ? pathname : `${pathname}?page=${n}`);
	const { page, totalPages } = info;
	const step =
		"tap-target inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-border px-3 text-sm font-medium transition";
	return (
		<nav
			className="mt-12 flex flex-wrap items-center justify-center gap-2"
			aria-label={t("pager.label", "Pagination")}
		>
			{page > 1 && (
				<a
					href={href(page - 1)}
					rel="prev"
					className={`${step} hover:bg-muted`}
				>
					← {t("pager.prev", "Previous")}
				</a>
			)}
			{pageWindow(page, totalPages).map((n, i) =>
				n === "gap" ? (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: a gap has no identity beyond its place in the window
						key={`gap-${i}`}
						className="px-1 text-sm text-muted-foreground"
					>
						…
					</span>
				) : n === page ? (
					<span
						key={n}
						aria-current="page"
						className={`${step} border-primary bg-primary text-primary-foreground`}
					>
						{n}
					</span>
				) : (
					<a key={n} href={href(n)} className={`${step} hover:bg-muted`}>
						{n}
					</a>
				),
			)}
			{page < totalPages && (
				<a
					href={href(page + 1)}
					rel="next"
					className={`${step} hover:bg-muted`}
				>
					{t("pager.next", "Next")} →
				</a>
			)}
		</nav>
	);
}

function PostList(p: PostListProps) {
	const L = useL();
	const t = useT();
	const row = useRowMark();
	const H = useItemHeading(Boolean(p.title || p.eyebrow));
	// the "featured" layout nests its secondary posts under the lead one
	const HSub = H === "h2" ? "h3" : "h4";
	const posts: PostRow[] = Array.isArray(p.data) ? p.data : [];
	const base = p.linkBase ?? "";
	const link = (slug: string) => (base ? L(`${base}/${slug}`) : "#");
	const layout = p.layout ?? "grid-3";
	return (
		<Band p={p} className={PAD}>
			<Container>
				<div className="mb-12 flex items-end justify-between gap-4 flex-wrap">
					<Heading eyebrow={p.eyebrow} title={p.title} />
					{p.moreHref && (
						<NavLink
							href={L(p.moreHref) ?? "#"}
							className="tap-target text-sm font-semibold text-primary underline underline-offset-8 hover:text-[var(--accent)]"
						>
							{t("home.news.all", "See all →")}
						</NavLink>
					)}
				</div>
				{posts.length === 0 ? (
					<Empty>{t("empty.posts", "Nothing published here yet.")}</Empty>
				) : layout === "list" ? (
					<ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
						{posts.map((post) => (
							<li key={post.id}>
								<NavLink
									href={link(post.slug)}
									className="group flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--accent)]/5 transition"
								>
									<span
										{...row("post", post, "title")}
										className="font-medium text-foreground/85 group-hover:text-[var(--accent)] transition"
									>
										{post.title}
									</span>
									<span className="shrink-0 text-xs text-muted-foreground">
										{post.publishedAt}
									</span>
								</NavLink>
							</li>
						))}
					</ul>
				) : layout === "table" ? (
					<div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
						<table className="w-full text-sm">
							<thead className="bg-muted/60 text-left">
								<tr>
									<th className="px-4 py-3 font-semibold text-foreground/70">
										{t("jobs.col.position", "Position")}
									</th>
									<th className="px-4 py-3 font-semibold text-foreground/70">
										{t("jobs.col.location", "Location")}
									</th>
									<th className="px-4 py-3 font-semibold text-foreground/70">
										{t("jobs.col.deadline", "Deadline")}
									</th>
									<th className="px-4 py-3" />
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{posts.map((post) => (
									<tr key={post.id} className="hover:bg-muted/30 transition">
										<td
											{...row("post", post, "title")}
											className="px-4 py-3 font-medium text-foreground"
										>
											{post.title}
										</td>
										<td className="px-4 py-3 text-foreground/70">
											{post.location}
										</td>
										<td className="px-4 py-3 text-foreground/70">
											{post.deadline}
										</td>
										<td className="px-4 py-3 text-right">
											{base && (
												<NavLink
													href={link(post.slug)}
													className="font-semibold text-[var(--accent)] hover:underline"
												>
													{t("jobs.apply", "Apply")} →
												</NavLink>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : layout === "featured" && posts.length > 1 ? (
					<div className="grid gap-8 lg:grid-cols-12">
						<article className="group lg:col-span-7">
							<NavLink
								href={link(posts[0].slug)}
								className="relative block h-[420px] overflow-hidden rounded-3xl bg-primary ring-1 ring-border"
							>
								{/* the placeholder's icon is centred, so at this height it lands behind the headline */}
								{!isPlaceholder(imgFor(posts[0])) && (
									<img
										src={imgFor(posts[0])}
										alt={posts[0].title || ""}
										className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
										onError={onImageError}
										ref={imageFallbackRef}
									/>
								)}
								<div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/30 to-transparent" />
								<div className="absolute bottom-0 p-8 text-primary-foreground">
									{posts[0].publishedAt && (
										<span className="rounded-full bg-[var(--accent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-foreground">
											{posts[0].publishedAt}
										</span>
									)}
									<H
										{...row("post", posts[0], "title")}
										className="mt-4 max-w-xl t-section"
									>
										{posts[0].title}
									</H>
									{posts[0].excerpt && (
										<p
											{...row("post", posts[0], "excerpt")}
											className="mt-3 max-w-lg t-meta opacity-90 line-clamp-2"
										>
											{posts[0].excerpt}
										</p>
									)}
									<span className="mt-5 inline-block text-sm font-semibold text-[var(--gold)]">
										{t("home.news.readmore", "Read more →")}
									</span>
								</div>
							</NavLink>
						</article>
						<div className="space-y-6 lg:col-span-5">
							{posts.slice(1, 4).map((post) => (
								<NavLink
									key={post.id}
									href={link(post.slug)}
									className="group flex gap-5"
								>
									<div className="relative h-32 w-40 shrink-0 overflow-hidden rounded-2xl ring-1 ring-border">
										<img
											src={imgFor(post)}
											alt={post.title || ""}
											className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
											onError={onImageError}
											ref={imageFallbackRef}
										/>
									</div>
									<div className="flex-1">
										{post.publishedAt && (
											<div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-ink)]">
												{post.publishedAt}
											</div>
										)}
										<HSub
											{...row("post", post, "title")}
											className="mt-1.5 t-card-title text-primary group-hover:text-[var(--accent)] transition line-clamp-3"
										>
											{post.title}
										</HSub>
									</div>
								</NavLink>
							))}
						</div>
					</div>
				) : (
					<div
						className={`grid gap-8 ${layout === "grid-2" || posts.length < 3 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}
					>
						{posts.map((post) => (
							<PostCard key={post.id} post={post} base={base} titleAs={H} />
						))}
					</div>
				)}
				{p.pageInfo && p.pageInfo.totalPages > 1 && <Pager info={p.pageInfo} />}
			</Container>
		</Band>
	);
}

export function youtubeId(url: string): string | null {
	const m = String(url || "").match(
		// `[?&]v=` and not a bare `v=`, which also matches inside ?rev= and ?srv=
		/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{6,})/,
	);
	return m ? m[1] : null;
}

/**
 * maxres is 1280x720 and natively 16:9; hq is 480x360 with letterbox bars baked
 * in, which is what the tile used to upscale and then crop. maxres is missing
 * for older uploads, so every use needs the step-down below.
 */
export const youtubeThumb = (id: string) =>
	`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;

const steppedDown = (src: string) =>
	src.includes("maxresdefault")
		? src.replace("maxresdefault", "hqdefault")
		: null;

function onThumbError(e: React.SyntheticEvent<HTMLImageElement, Event>): void {
	const next = steppedDown(e.currentTarget.src);
	if (next) {
		e.currentTarget.src = next;
		return;
	}
	onImageError(e);
}

// the server-rendered thumb can fail before hydration, so the event is long gone
function thumbFallbackRef(el: HTMLImageElement | null): void {
	if (!el || !el.complete || el.naturalWidth !== 0) return;
	const next = steppedDown(el.src);
	if (next) {
		el.src = next;
		return;
	}
	imageFallbackRef(el);
}

type VideoGridProps = Common & {
	moreHref?: string;
	data?: SourceRow["videos"][];
};

function VideoGrid(p: VideoGridProps) {
	const L = useL();
	const t = useT();
	const row = useRowMark();
	const H = useItemHeading(Boolean(p.title || p.eyebrow));
	const videos: SourceRow["videos"][] = Array.isArray(p.data) ? p.data : [];
	return (
		<Band p={p} className={PAD}>
			<Container>
				<div className="mb-12 flex items-end justify-between gap-4 flex-wrap">
					<Heading eyebrow={p.eyebrow} title={p.title} />
					{p.moreHref && (
						<NavLink
							href={L(p.moreHref) ?? "#"}
							className="tap-target text-sm font-semibold text-primary underline underline-offset-8 hover:text-[var(--accent)]"
						>
							{t("home.video.all", "All videos →")}
						</NavLink>
					)}
				</div>
				{videos.length === 0 ? (
					<Empty>{t("empty.videos", "No videos yet.")}</Empty>
				) : (
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{videos.map((v) => {
							const id = youtubeId(v.youtubeUrl);
							const thumb = id ? youtubeThumb(id) : imgFor(v);
							return (
								<NavLink
									key={v.id}
									href={v.youtubeUrl || "#"}
									target="_blank"
									rel="noreferrer"
									className="group cursor-pointer"
								>
									<div className="relative aspect-video overflow-hidden rounded-2xl ring-1 ring-border">
										<img
											src={thumb}
											alt={v.title || ""}
											className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
											onError={onThumbError}
											ref={thumbFallbackRef}
										/>
										<div className="absolute inset-0 bg-primary/20 transition group-hover:bg-primary/10" />
										<div className="absolute inset-0 grid place-items-center">
											<span className="grid h-16 w-16 place-items-center rounded-full bg-background/95 text-[var(--accent)] shadow-[var(--shadow-lift)] transition group-hover:scale-110">
												{Icon.play("h-6 w-6 translate-x-0.5")}
											</span>
										</div>
									</div>
									<H
										{...row("post", v, "title")}
										className="mt-4 t-card-title text-primary group-hover:text-[var(--accent)] transition"
									>
										{v.title}
									</H>
								</NavLink>
							);
						})}
					</div>
				)}
			</Container>
		</Band>
	);
}

type AlbumGridProps = Common & { data?: SourceRow["albums"][] };

function AlbumGrid(p: AlbumGridProps) {
	const L = useL();
	const t = useT();
	const row = useRowMark();
	const albums: SourceRow["albums"][] = Array.isArray(p.data) ? p.data : [];
	return (
		<Band p={p} className={PAD}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} />
				{albums.length === 0 ? (
					<Empty>{t("empty.albums", "No photo albums yet.")}</Empty>
				) : (
					<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{albums.map((a) => (
							<NavLink
								key={a.id}
								href={L(`/galleries/${a.slug}`)}
								className="group relative block overflow-hidden rounded-3xl ring-1 ring-border shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
							>
								<div className="aspect-[4/3] bg-muted">
									<img
										src={imgFor(a)}
										alt={a.title || ""}
										className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
										onError={onImageError}
										ref={imageFallbackRef}
									/>
								</div>
								<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent p-5 text-primary-foreground">
									<div {...row("post", a, "title")} className="t-card-title">
										{a.title}
									</div>
									<div className="mt-0.5 t-meta opacity-85">
										{t("albums.count", "{n} photos", { n: a.count })}
									</div>
								</div>
							</NavLink>
						))}
					</div>
				)}
			</Container>
		</Band>
	);
}

const NARROW_PUBLICATION_LAYOUTS = new Set(["grid-3", "grid-4", "grid-5"]);

const PUBLICATION_COLS: Record<string, string> = {
	"grid-2": "md:grid-cols-2",
	"grid-3": "sm:grid-cols-2 lg:grid-cols-3",
	"grid-4": "sm:grid-cols-2 lg:grid-cols-4",
	"grid-5": "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
};

type PublicationListProps = Common & { data?: SourceRow["publications"][] };

function PublicationList(p: PublicationListProps) {
	const t = useT();
	const row = useRowMark();
	const items: SourceRow["publications"][] = Array.isArray(p.data)
		? p.data
		: [];
	// Optimistic bump so the counter the visitor just moved is visibly theirs.
	const [bumped, setBumped] = useState<
		Record<number, { read: number; download: number }>
	>({});
	const { openPdf, reader } = usePdfReader();
	const track = (id: number, kind: "read" | "download") => {
		setBumped((b) => {
			const at = b[id] ?? { read: 0, download: 0 };
			return { ...b, [id]: { ...at, [kind]: at[kind] + 1 } };
		});
		trpcClient.posts.trackDocument.mutate({ id, kind }).catch(() => {});
	};

	const list = p.layout === "list";
	const cols = PUBLICATION_COLS[p.layout ?? ""] ?? PUBLICATION_COLS["grid-2"];
	// three across or more leaves no room to read a title beside its cover, so
	// the card stands the cover up and puts everything under it
	const stacked = NARROW_PUBLICATION_LAYOUTS.has(p.layout ?? "");
	return (
		<Band p={p} className={PAD}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} />
				{items.length === 0 ? (
					<Empty>
						{t("empty.publications", "No publications in this category yet.")}
					</Empty>
				) : (
					<div className={`grid gap-4 ${list ? "" : cols}`}>
						{items.map((it) => {
							const at = bumped[it.id];
							const reads = Number(it.readCount ?? 0) + (at?.read ?? 0);
							const downloads =
								Number(it.downloadCount ?? 0) + (at?.download ?? 0);
							const save = it.fileUrl ? (
								<a
									href={it.fileUrl}
									download
									onClick={() => track(it.id, "download")}
									aria-label={t(
										"publications.downloadFile",
										"Download {title}",
										{ title: it.title },
									)}
									className="relative z-10 inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--accent-ink)] hover:underline"
								>
									{Icon.download("h-4 w-4")} PDF
								</a>
							) : null;
							return (
								<div
									key={it.id}
									className={`group relative rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[var(--shadow-soft)] ${stacked ? "flex h-full flex-col" : "flex items-center gap-4"}`}
								>
									{it.image ? (
										<img
											src={it.image}
											alt={it.title || ""}
											className={`rounded-xl object-cover ring-1 ring-border ${stacked ? "aspect-[3/4] w-full" : `shrink-0 ${list ? "h-16 w-12" : "h-24 w-[4.5rem]"}`}`}
											onError={onImageError}
											ref={imageFallbackRef}
										/>
									) : (
										<div
											className={`grid place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] ${stacked ? "aspect-[3/4] w-full" : `shrink-0 ${list ? "h-12 w-12" : "h-24 w-[4.5rem]"}`}`}
										>
											{Icon.doc(stacked ? "h-10 w-10" : "h-6 w-6")}
										</div>
									)}
									<div
										className={
											stacked ? "mt-3 flex flex-1 flex-col" : "min-w-0 flex-1"
										}
									>
										{/* stretched link: the card reads, the pill saves */}
										<a
											href={it.fileUrl || "#"}
											target={it.fileUrl ? "_blank" : undefined}
											rel="noreferrer"
											onClick={(e) => {
												if (!it.fileUrl) return;
												track(it.id, "read");
												openPdf(e, {
													url: it.fileUrl,
													title: it.title,
													onDownload: () => track(it.id, "download"),
												});
											}}
											className="after:absolute after:inset-0 after:rounded-2xl"
										>
											<div
												{...row("post", it, "title")}
												className={`font-medium text-foreground group-hover:text-[var(--accent)] transition ${stacked ? "line-clamp-3 text-balance" : ""}`}
											>
												{it.title}
											</div>
										</a>
										{it.year && (
											<div className="text-xs text-muted-foreground">
												{it.year}
											</div>
										)}
										<div
											className={`text-xs text-muted-foreground ${stacked ? "mt-auto pt-1" : "mt-1"}`}
										>
											{t(
												reads === 1
													? "publications.readsOne"
													: "publications.reads",
												reads === 1 ? "{n} read" : "{n} reads",
												{ n: reads.toLocaleString() },
											)}
											{" · "}
											{t(
												downloads === 1
													? "publications.downloadsOne"
													: "publications.downloads",
												downloads === 1 ? "{n} download" : "{n} downloads",
												{ n: downloads.toLocaleString() },
											)}
										</div>
										{stacked && <div className="mt-3 self-start">{save}</div>}
									</div>
									{!stacked && save}
								</div>
							);
						})}
					</div>
				)}
				{reader}
			</Container>
		</Band>
	);
}

type PeopleProps = Common & { data?: SourceRow["people"][] };

function People(p: PeopleProps) {
	const L = useL();
	const t = useT();
	const row = useRowMark();
	const mayEditPeople = useMayEditPeople();
	const people: SourceRow["people"][] = Array.isArray(p.data) ? p.data : [];
	const order = useRowOrder(people, {
		on: mayEditPeople,
		label: "Team order",
		name: (person) => person.name || "Team member",
		save: (ids) => trpcClient.adminPeople.reorder.mutate({ ids }),
	});
	const initials = (name: string) =>
		String(name || "")
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0])
			.join("");
	return (
		<Band p={p} className={PAD}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} />
				{people.length === 0 ? (
					<Empty>
						{t("empty.people", "No team members listed yet.")}
						{mayEditPeople && (
							<>
								{" "}
								<a
									href="/admin/people/new"
									className="font-semibold text-primary underline underline-offset-4"
								>
									Add the first one
								</a>
								.
							</>
						)}
					</Empty>
				) : (
					<div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
						{order.list.map((person) => (
							<div
								key={person.id}
								{...(order.on ? order.itemProps(person.id) : {})}
								className="group relative text-center"
							>
								<NavLink
									href={L(`/team/${person.slug}`)}
									className="block text-center"
								>
									<div className="mx-auto h-24 w-24 overflow-hidden rounded-full shadow-md ring-4 ring-card transition group-hover:scale-105">
										{person.photoUrl ? (
											<img
												src={person.photoUrl}
												alt={person.name || ""}
												className="h-full w-full object-cover"
												onError={onImageError}
												ref={imageFallbackRef}
											/>
										) : (
											<div className="grid h-full w-full place-items-center bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-primary-foreground font-display text-2xl font-bold">
												{initials(person.name)}
											</div>
										)}
									</div>
									<div
										{...row("person", person, "name")}
										className="mt-3 text-sm font-semibold text-primary group-hover:text-[var(--accent)] transition"
									>
										{person.name}
									</div>
									{person.position && (
										<div
											{...row("person", person, "position")}
											className="text-xs text-muted-foreground"
										>
											{person.position}
										</div>
									)}
								</NavLink>
								{mayEditPeople && (
									<PersonPhotoEdit
										personId={person.id}
										name={person.name}
										hasPhoto={Boolean(person.photoUrl)}
									/>
								)}
								{/* the camera button covers the photo, so the grip sits in the corner */}
								{order.on && (
									<DragHandle
										{...order.handleProps(person.id)}
										className={GRIP}
									/>
								)}
							</div>
						))}
					</div>
				)}
				{order.on && <SortableStatus status={order.status} />}
			</Container>
		</Band>
	);
}

/** A map pins project locations or offices; only a location links back to a project. */
type MapRow = SourceRow["locations"] | SourceRow["offices"];
type MapProps = Common & { data?: MapRow[] };

function MapSection(p: MapProps) {
	const t = useT();
	const rows: MapRow[] = Array.isArray(p.data) ? p.data : [];
	const markers: MapMarker[] = rows
		.map((r) =>
			"schoolName" in r
				? {
						lat: r.lat,
						lng: r.lng,
						label: r.schoolName,
						sublabel: r.projectName,
						photoUrl: r.photoUrl,
						href: r.projectHref,
						status: r.status,
					}
				: {
						lat: Number(r.lat),
						lng: Number(r.lng),
						label: r.name,
						sublabel: null,
						photoUrl: null,
						href: null,
						status: null,
					},
		)
		.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
	const center: [number, number] = markers.length
		? [markers[0].lat, markers[0].lng]
		: [12.5, 104.9];
	return (
		<Band p={p} className={PAD}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} />
				{/* an empty map centred on the country reads as a broken page, not as "nothing here yet" */}
				{markers.length === 0 ? (
					<Empty>{t("empty.map", "No places to show on the map yet.")}</Empty>
				) : (
					<div className="overflow-hidden rounded-2xl border border-border shadow-sm">
						<MapView markers={markers} center={center} zoom={7} />
					</div>
				)}
			</Container>
		</Band>
	);
}

// column-generic: it prints whatever keys its source's rows carry
type DirectoryRow =
	| SourceRow["staff"]
	| SourceRow["events"]
	| SourceRow["documents"];
type DirectoryProps = Common & { data?: DirectoryRow[] };

function Directory(p: DirectoryProps) {
	const t = useT();
	const rows: Record<string, unknown>[] = Array.isArray(p.data) ? p.data : [];
	const cols = rows.length
		? Object.keys(rows[0]).filter((k) => k !== "id")
		: [];
	return (
		<Band p={p} className={PAD}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} />
				{rows.length === 0 ? (
					<Empty>{t("empty.directory", "Nothing to list yet.")}</Empty>
				) : (
					<div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
						<table className="w-full text-sm">
							<thead className="bg-muted/60 text-left">
								<tr>
									{cols.map((c) => (
										<th
											key={c}
											className="px-4 py-3 font-semibold capitalize text-foreground/70"
										>
											{c.replace(/([A-Z])/g, " $1")}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{rows.map((r, n) => (
									<tr
										key={String(r.id ?? n)}
										className="hover:bg-muted/30 transition"
									>
										{cols.map((c) => (
											<td key={c} className="px-4 py-3 text-foreground/80">
												{String(r[c] ?? "")}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Container>
		</Band>
	);
}

type PartnerRow = SourceRow["partners"];
type PartnersProps = Common & { data?: PartnerRow[] };

function PartnerLink({
	row,
	linked,
	className,
	children,
}: {
	row: PartnerRow;
	linked: boolean;
	className: string;
	children: React.ReactNode;
}) {
	// placeholder url ("#") used to render a dead anchor resolving to /en#
	const url = row.url && row.url !== "#" ? row.url : null;
	if (!linked || !url)
		return (
			<span title={row.name} className={className}>
				{children}
			</span>
		);
	return (
		<NavLink
			href={url}
			title={row.name}
			target="_blank"
			rel="noreferrer"
			className={className}
		>
			{children}
		</NavLink>
	);
}

function PartnerLogo({ row, linked }: { row: PartnerRow; linked: boolean }) {
	return (
		<PartnerLink row={row} linked={linked} className="shrink-0">
			<span className="grid h-28 w-48 place-items-center rounded-xl bg-white px-5 ring-1 ring-border transition hover:ring-[var(--accent)]">
				{row.logoUrl ? (
					<img
						src={row.logoUrl}
						alt={row.name}
						className="max-h-16 max-w-full object-contain"
						onError={onImageError}
						ref={imageFallbackRef}
					/>
				) : (
					<span className="text-center text-sm font-medium text-foreground/80">
						{row.name}
					</span>
				)}
			</span>
		</PartnerLink>
	);
}

function PartnerMarquee({ rows }: { rows: PartnerRow[] }) {
	// the marquee keyframe travels -50%, so the track holds the list twice; the copy is hidden from AT
	return (
		<div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
			<div
				className="flex w-max hover:[animation-play-state:paused] motion-reduce:[animation:none]"
				style={{ animation: "marquee 45s linear infinite" }}
			>
				{[0, 1].map((copy) => (
					<div
						key={copy}
						className="flex items-center gap-10 pr-10"
						aria-hidden={copy === 1}
					>
						{rows.map((r) => (
							<PartnerLogo key={r.id} row={r} linked={copy === 0} />
						))}
					</div>
				))}
			</div>
		</div>
	);
}

function Partners(p: PartnersProps) {
	const t = useT();
	const rows: PartnerRow[] = Array.isArray(p.data) ? p.data : [];
	const H = useItemHeading(Boolean(p.title || p.eyebrow));
	if (p.layout === "marquee") {
		return (
			<Band p={p} className={PAD}>
				<Container>
					<Heading eyebrow={p.eyebrow} title={p.title} />
				</Container>
				{rows.length === 0 ? (
					<Container>
						<Empty>{t("empty.partners", "No partners listed yet.")}</Empty>
					</Container>
				) : (
					<PartnerMarquee rows={rows} />
				)}
			</Band>
		);
	}
	const byCat = new Map<string, PartnerRow[]>();
	for (const r of rows) {
		const k = r.category || t("partners.uncategorised", "Partners");
		byCat.set(k, [...(byCat.get(k) ?? []), r]);
	}
	return (
		<Band p={p} className={PAD}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} />
				{rows.length === 0 ? (
					<Empty>{t("empty.partners", "No partners listed yet.")}</Empty>
				) : (
					// Category rows: a label column on the left, logos flowing to the right,
					// hairline-separated. Even, scannable, and no empty cards for small groups.
					<div className="mt-10 divide-y divide-border border-y border-border">
						{[...byCat.entries()].map(([cat, list]) => (
							<PartnerCategory key={cat} cat={cat} list={list} headingAs={H} />
						))}
					</div>
				)}
			</Container>
		</Band>
	);
}

// its own sortable, so a drag reorders one category and leaves the others alone
function PartnerCategory({
	cat,
	list,
	headingAs: H,
}: {
	cat: string;
	list: PartnerRow[];
	headingAs: "h2" | "h3";
}) {
	const order = useRowOrder(list, {
		on: useMayEdit("partners"),
		label: "Partner order",
		name: (r) => r.name,
		save: (ids) => trpcClient.adminPartners.reorder.mutate({ ids }),
	});
	return (
		<div className="grid gap-3 py-6 md:grid-cols-[minmax(0,190px)_1fr] md:gap-8 md:py-7">
			<H className="t-eyebrow text-[var(--accent-ink)] md:pt-2.5">
				{cat.replace(/-/g, " ")}
			</H>
			<div className="flex flex-wrap items-center gap-3">
				{order.list.map((r) => (
					<Grippable
						key={r.id}
						order={order}
						id={r.id}
						className="group relative inline-flex"
					>
						<PartnerLink row={r} linked className="group inline-flex">
							{r.logoUrl ? (
								<span className="grid h-12 w-28 place-items-center rounded-lg bg-white p-2 ring-1 ring-border transition group-hover:ring-[var(--accent)]">
									<img
										src={r.logoUrl}
										alt={r.name}
										// max-h-8 not max-h-full: the row is auto-sized, so a
										// percentage resolves against the image itself and caps nothing
										className="max-h-8 max-w-full object-contain grayscale opacity-75 transition duration-300 group-hover:grayscale-0 group-hover:opacity-100"
										onError={onImageError}
										ref={imageFallbackRef}
									/>
								</span>
							) : (
								<span className="rounded-full border border-border bg-background/60 px-3.5 py-1.5 text-sm font-medium text-foreground/80 transition group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]">
									{r.name}
								</span>
							)}
						</PartnerLink>
					</Grippable>
				))}
			</div>
			{order.on && <SortableStatus status={order.status} />}
		</div>
	);
}

type ProjectRow = SourceRow["projects"];
type ProjectListProps = Common & {
	moreHref?: string;
	linkBase?: string;
	data?: ProjectRow[];
};

function ProjectList(p: ProjectListProps) {
	const L = useL();
	const t = useT();
	const row = useRowMark();
	const rows: ProjectRow[] = Array.isArray(p.data) ? p.data : [];
	const base = p.linkBase ?? "";
	const cols =
		p.layout === "grid-2" ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
	const order = useRowOrder(rows, {
		// grid only: a row of the list layout has no room for a grip
		on: useMayEdit("projects") && p.layout !== "list",
		label: "Project order",
		name: (r) => r.name || r.code,
		save: (ids) => trpcClient.adminProjects.reorder.mutate({ ids }),
	});
	return (
		<Band p={p} className={PAD}>
			<Container>
				<div className="mb-12 flex items-end justify-between gap-4 flex-wrap">
					<Heading eyebrow={p.eyebrow} title={p.title} />
					{p.moreHref && (
						<NavLink
							href={L(p.moreHref) ?? "#"}
							className="tap-target text-sm font-semibold text-primary underline underline-offset-8 hover:text-[var(--accent)]"
						>
							{t("home.news.all", "See all →")}
						</NavLink>
					)}
				</div>
				{rows.length === 0 ? (
					<Empty>{t("empty.projects", "No projects listed yet.")}</Empty>
				) : p.layout === "list" ? (
					<ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
						{rows.map((r) => (
							<li key={r.id}>
								<NavLink
									href={base ? L(`${base}/${r.slug}`) : "#"}
									className="group flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--accent)]/5 transition"
								>
									<span
										{...row("project", r, "name")}
										className="font-medium text-foreground/85 group-hover:text-[var(--accent)] transition"
									>
										{r.name}
									</span>
									<span className="shrink-0 text-xs uppercase tracking-wider text-muted-foreground">
										{r.code}
									</span>
								</NavLink>
							</li>
						))}
					</ul>
				) : (
					<div className={`grid grid-cols-1 gap-5 ${cols}`}>
						{order.list.map((r) => (
							<Grippable
								key={r.id}
								order={order}
								id={r.id}
								className="group relative grid"
							>
								<NavLink
									href={base ? L(`${base}/${r.slug}`) : "#"}
									className={`${card} group flex flex-col p-6`}
								>
									{r.image ? (
										<img
											src={r.image}
											alt={r.name || ""}
											className="mb-4 h-12 w-auto max-w-[10rem] object-contain"
											onError={onImageError}
											ref={imageFallbackRef}
										/>
									) : (
										<div className="mb-4 inline-flex w-fit rounded-lg bg-[var(--accent)]/10 px-3 py-1.5 font-display text-sm font-bold text-[var(--accent)]">
											{r.code}
										</div>
									)}
									<h3
										{...row("project", r, "name")}
										className="t-card-title text-primary group-hover:text-[var(--accent)] transition"
									>
										{r.name}
									</h3>
									{r.summary && (
										<p
											{...row("project", r, "summary")}
											className="mt-2 t-body text-foreground/75 line-clamp-3"
										>
											{r.summary}
										</p>
									)}
									{r.status && (
										<span className="mt-4 inline-flex w-fit rounded-full bg-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
											{r.status}
										</span>
									)}
								</NavLink>
							</Grippable>
						))}
					</div>
				)}
				{order.on && <SortableStatus status={order.status} />}
			</Container>
		</Band>
	);
}

type CertificateItem = {
	image?: string;
	title?: string;
	issuer?: string;
	year?: string;
	caption?: string;
	fileUrl?: string;
};

type CertificatesProps = Common & {
	center?: string;
	items?: CertificateItem[];
};

function Certificates(p: CertificatesProps) {
	const t = useT();
	const mark = useMark();
	const items: CertificateItem[] = Array.isArray(p.items) ? p.items : [];
	const { openPdf, reader } = usePdfReader();
	const cols =
		p.layout === "cols-2"
			? "sm:grid-cols-2"
			: p.layout === "cols-4"
				? "sm:grid-cols-2 lg:grid-cols-4"
				: "sm:grid-cols-2 lg:grid-cols-3";
	return (
		<Band p={p} className={PAD}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} center={!!p.center} />
				{items.length === 0 ? (
					<Empty>
						{t("empty.certificates", "No accreditations listed yet.")}
					</Empty>
				) : (
					<div className={`grid grid-cols-1 gap-6 ${cols}`}>
						{items.map((it, n) => {
							const body = (
								<>
									<div className="aspect-[3/4] overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
										{it.image ? (
											<img
												src={it.image}
												alt={it.title || ""}
												className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
												onError={onImageError}
												ref={imageFallbackRef}
											/>
										) : (
											<div className="grid h-full w-full place-items-center text-[var(--accent)]">
												{Icon.doc("h-10 w-10")}
											</div>
										)}
									</div>
									<div className="mt-4">
										<ImageCaption
											path={`items[${n}].caption`}
											text={it.caption}
											className="mt-0 mb-2"
										/>
										{it.title && (
											<h3
												{...mark(`items[${n}].title`)}
												className="t-card-title text-primary group-hover:text-[var(--accent)] transition"
											>
												{it.title}
											</h3>
										)}
										{(it.issuer || it.year) && (
											<p className="mt-1 t-meta text-muted-foreground">
												{[it.issuer, it.year].filter(Boolean).join(" · ")}
											</p>
										)}
										{it.fileUrl && (
											<span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
												{Icon.download("h-4 w-4")} PDF
											</span>
										)}
									</div>
								</>
							);
							return it.fileUrl ? (
								<a
									// biome-ignore lint/suspicious/noArrayIndexKey: server-rendered list, no reorder or delete while mounted
									key={n}
									href={it.fileUrl}
									target="_blank"
									rel="noreferrer"
									onClick={(e) =>
										it.fileUrl &&
										openPdf(e, { url: it.fileUrl, title: it.title })
									}
									className="group block"
								>
									{body}
								</a>
							) : (
								// biome-ignore lint/suspicious/noArrayIndexKey: server-rendered list, no reorder or delete while mounted
								<div key={n} className="group block">
									{body}
								</div>
							);
						})}
					</div>
				)}
				{reader}
			</Container>
		</Band>
	);
}

type NavEntry = {
	id: number;
	label: string;
	description: string | null;
	href: string | null;
	children: NavEntry[];
};

type SiteMapProps = Common & { center?: string };

/** The published nav tree as an on-page index. Content comes from the nav, not from props. */
function SiteMap(p: SiteMapProps) {
	const L = useL();
	const t = useT();
	const rootData = useLoaderData({ from: "__root__" }) as { nav?: NavEntry[] };
	const nav: NavEntry[] = Array.isArray(rootData?.nav) ? rootData.nav : [];

	const entry = (node: NavEntry) => (
		<li key={node.id}>
			{node.href ? (
				<NavLink
					href={L(node.href) ?? "#"}
					className="font-medium text-foreground/85 hover:text-[var(--accent)] transition"
				>
					{node.label}
				</NavLink>
			) : (
				<span className="font-medium text-foreground/85">{node.label}</span>
			)}
			{node.description && (
				<p className="mt-0.5 t-meta text-muted-foreground">
					{node.description}
				</p>
			)}
			{node.children.length > 0 && (
				<ul className="mt-2 space-y-2 border-l border-border pl-4">
					{node.children.map((c) => entry(c))}
				</ul>
			)}
		</li>
	);

	return (
		<Band p={p} className={PAD}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} center={!!p.center} />
				{nav.length === 0 ? (
					<Empty>{t("empty.sitemap", "No navigation published yet.")}</Empty>
				) : (
					<div
						className={
							p.layout === "list"
								? "max-w-3xl"
								: "grid gap-10 sm:grid-cols-2 lg:grid-cols-3"
						}
					>
						{nav.map((top) => (
							<div key={top.id} className={p.layout === "list" ? "mb-8" : ""}>
								{top.href ? (
									<NavLink
										href={L(top.href) ?? "#"}
										className="t-eyebrow text-[var(--accent)] hover:underline"
									>
										{top.label}
									</NavLink>
								) : (
									<div className="t-eyebrow text-[var(--accent)]">
										{top.label}
									</div>
								)}
								{top.description && (
									<p className="mt-1 t-meta text-muted-foreground">
										{top.description}
									</p>
								)}
								{top.children.length > 0 && (
									<ul className="mt-4 space-y-3">
										{top.children.map((c) => entry(c))}
									</ul>
								)}
							</div>
						))}
					</div>
				)}
			</Container>
		</Band>
	);
}

type OrgChartProps = Common & { data?: SourceRow["orgchart"][] };

/** Hierarchical management tree, rendered as an n8n-style React Flow canvas. */
function OrgChart(p: OrgChartProps) {
	const t = useT();
	const roots: SourceRow["orgchart"][] = Array.isArray(p.data) ? p.data : [];
	// same-sized box until mount: a CSS fallback swapped visibly on hydration
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	if (roots.length === 0) {
		return (
			<Band p={p} className={PAD}>
				<Container>
					<Heading eyebrow={p.eyebrow} title={p.title} />
					<Empty>{t("empty.orgchart", "No organizational chart yet.")}</Empty>
				</Container>
			</Band>
		);
	}

	if (mounted)
		return <PublicOrgChart roots={roots} eyebrow={p.eyebrow} title={p.title} />;

	return <div className="min-h-[640px] w-full bg-muted/20" aria-hidden />;
}

/* ------------------------------------------------------------------ */
/* Registry + renderer                                                 */
/* ------------------------------------------------------------------ */

export const sectionRegistry = {
	hero: Hero,
	richtext: RichText,
	cards: Cards,
	stats: Stats,
	cta: Cta,
	resources: Resources,
	split: Split,
	pills: Pills,
	form: FormSection,
	certificates: Certificates,
	siteMap: SiteMap,
	postList: PostList,
	projectList: ProjectList,
	videoGrid: VideoGrid,
	albumGrid: AlbumGrid,
	publicationList: PublicationList,
	people: People,
	map: MapSection,
	directory: Directory,
	partners: Partners,
	orgChart: OrgChart,
};

// the one place a stored template string is tied to its props type
type SectionTemplate = (props: Record<string, unknown>) => React.ReactNode;

const templateFor = (type: string): SectionTemplate | undefined =>
	(sectionRegistry as Record<string, SectionTemplate>)[type];

function UnknownSection({ type }: { type: string }) {
	return (
		<Container className="py-6">
			<div className="rounded-xl border border-dashed border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
				Unknown section type: <code>{type}</code>
			</div>
		</Container>
	);
}

export function SectionRenderer({
	sections,
	entity,
	entityId,
	lang,
}: {
	sections: SectionNode[];
	entity?: string;
	entityId?: number;
	lang?: string;
}) {
	// Hero renders its own h1. Without one, promote the first titled section so
	// collection landings like /team and /news are not h2-first.
	const titleIndex = sections.some((s) => s.type === "hero")
		? -1
		: sections.findIndex((s) => (s.props as { title?: string })?.title);
	// the spread below flattens s.props, so identity travels beside it, not in it
	const identity: EditIdentity | null =
		entity && entityId != null && lang ? { entity, entityId, lang } : null;
	// keyed: an edit leaves DOM nodes React no longer holds, so the tree is rebuilt
	// rather than patched. See `revision` in lib/inline-edit.
	const { revision } = useInlineEdit();
	const editingSections = useEditingSections();
	return (
		<Identity.Provider value={identity} key={revision}>
			<EditLayer sections={sections} identity={identity} />
			<RowLayer identity={identity} />
			{sections.map((s, i) => {
				const Template = templateFor(s.type);
				const body = Template ? (
					<Template layout={s.layout} {...(s.props ?? {})} />
				) : (
					<UnknownSection type={s.type} />
				);
				// Expose the section id as a DOM anchor (e.g. `#donate`) and offset the
				// scroll target so the sticky header never covers it.
				return (
					<div
						key={s.id}
						id={s.id}
						data-cms-section={s.id}
						data-cms-section-type={s.type}
						data-cms-section-index={i}
						className="relative scroll-mt-28"
					>
						{editingSections && identity && (
							<SectionBackground
								identity={identity}
								sectionId={s.id}
								type={s.type}
								tone={(s.props as Toned | undefined)?.tone}
								toneColor={(s.props as Toned | undefined)?.toneColor}
							/>
						)}
						<SectionId.Provider value={s.id}>
							<OwnsPageTitle.Provider value={i === titleIndex}>
								{body}
							</OwnsPageTitle.Provider>
						</SectionId.Provider>
					</div>
				);
			})}
		</Identity.Provider>
	);
}
