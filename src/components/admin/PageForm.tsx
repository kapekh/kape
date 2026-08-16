import { Link } from "@tanstack/react-router";
import { ChevronRight, GripVertical } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import { Textarea } from "#/components/ui/textarea";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import type { SectionNode } from "#/lib/sections";
import { PAGE_TITLE_MAX, segmentProblem } from "#/lib/slug";

import { AdminHeader } from "./AdminHeader";
import { fieldLabel } from "./form-ui";
import { LangTabs } from "./LangTabs";
import { MediaPicker } from "./MediaPicker";
import { PagePreview } from "./PagePreview";
import { PageSwitcher } from "./PageSwitcher";
import type { LangOpt } from "./PostForm";
import { SearchableSelect } from "./SearchableSelect";
import { SectionsBuilder } from "./SectionsBuilder";
import { useDirtyGuard } from "./useDirty";

export type PageStatus = "draft" | "published";
export type PageFormValue = {
	segment: string;
	parentId: number | null;
	status: PageStatus;
	coverMediaId: number | null;
	sections: SectionNode[];
	translations: {
		lang: string;
		title: string;
		excerpt: string;
		body: string;
	}[];
};

type Initial = {
	id?: number;
	slug: string;
	segment?: string;
	parentId?: number | null;
	status: string;
	coverMediaId: number | null;
	sections: SectionNode[];
	translations: Record<string, Record<string, string>>;
} | null;

/** Which field the save stopped on, so the message sits beside it and it takes focus. */
type FieldError = { field: "segment" | "title"; lang?: string; text: string };

/** A title stored before the cap existed still has to fit one dropdown line. */
const optionLabel = (text: string) =>
	text.length > 60 ? `${text.slice(0, 60)}…` : text;

/** One collapsible job in the inspector, so four unrelated ones stop competing. */
function InspectorGroup({
	id,
	title,
	description,
	defaultOpen,
	children,
	...rest
}: {
	id: string;
	title: string;
	description?: string;
	defaultOpen?: boolean;
	children: ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
	const [open, setOpen] = useState(!!defaultOpen);
	return (
		<section className="border-b border-admin-border" {...rest}>
			<h2>
				<button
					type="button"
					onClick={() => setOpen((o) => !o)}
					aria-expanded={open}
					aria-controls={`${id}-panel`}
					className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors duration-150 ease-out hover:bg-admin-accent-soft/40"
				>
					<ChevronRight
						aria-hidden="true"
						className={`size-4 shrink-0 text-admin-ink-muted transition-transform duration-200 ease-out ${open ? "rotate-90" : ""}`}
					/>
					<span className="flex-1 text-base font-semibold text-admin-ink">
						{title}
					</span>
				</button>
			</h2>
			<div id={`${id}-panel`} hidden={!open} className="px-4 pb-4">
				{description && (
					<p className="mb-3 text-[13px] text-admin-ink-muted">{description}</p>
				)}
				{children}
			</div>
		</section>
	);
}

/** The studio's own shape while it loads, so the two panes do not arrive as a jump. */
export function StudioSkeleton({
	label = "Loading the page…",
}: {
	label?: string;
}) {
	return (
		<div className="flex flex-col bg-admin-bg xl:h-[calc(100dvh-4rem)] xl:flex-row">
			<output className="sr-only">{label}</output>
			<aside className="w-full shrink-0 space-y-4 border-b border-admin-border bg-admin-panel p-4 xl:w-[420px] xl:border-b-0">
				<Skeleton className="h-6 w-40" />
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-10 w-32" />
			</aside>
			<div className="flex-1 p-6">
				<Skeleton className="h-32 w-full" />
			</div>
		</div>
	);
}

export function PageForm({
	initial,
	languages,
	onSubmit,
	saving,
	savedAt,
	title,
	error,
	onReload,
}: {
	initial: Initial;
	languages: LangOpt[];
	onSubmit: (value: PageFormValue) => void;
	saving?: boolean;
	title?: string;
	savedAt?: string | null;
	/** A refusal from the server, shown against the Save button until the next try. */
	error?: string | null;
	/** Offered only when the record moved: replaces the draft with what is stored. */
	onReload?: () => void;
}) {
	const [segment, setSegment] = useState(
		initial?.segment ?? initial?.slug ?? "",
	);
	const initialSegment = (initial?.segment ?? initial?.slug ?? "").trim();
	const [parentId, setParentId] = useState<number | null>(
		initial?.parentId ?? null,
	);
	const [status, setStatus] = useState<PageStatus>(
		(initial?.status as PageStatus) ?? "draft",
	);

	// Pages for the parent picker (exclude self + own descendants to prevent cycles).
	const [allPages, setAllPages] = useState<
		{ id: number; slug: string; parentId: number | null; title: string }[]
	>([]);
	useEffect(() => {
		trpcClient.adminPages.list
			.query()
			.then(setAllPages)
			.catch(() => {});
	}, []);
	const parentOptions = useMemo(() => {
		const selfId = initial?.id;
		const blocked = new Set<number>();
		if (selfId != null) {
			blocked.add(selfId);
			const childrenOf = new Map<number, number[]>();
			for (const p of allPages) {
				if (p.parentId == null) continue;
				let kids = childrenOf.get(p.parentId);
				if (!kids) {
					kids = [];
					childrenOf.set(p.parentId, kids);
				}
				kids.push(p.id);
			}
			const stack = [selfId];
			while (stack.length) {
				const id = stack.pop();
				if (id === undefined) break;
				for (const c of childrenOf.get(id) ?? []) {
					blocked.add(c);
					stack.push(c);
				}
			}
		}
		return allPages
			.filter((p) => !blocked.has(p.id))
			.sort((a, b) => a.slug.localeCompare(b.slug));
	}, [allPages, initial?.id]);
	const parentSlug =
		parentId != null
			? (allPages.find((p) => p.id === parentId)?.slug ?? "")
			: "";
	const fullPath = `/${[parentSlug, segment.replace(/^\/+|\/+$/g, "")].filter(Boolean).join("/")}`;
	const [coverMediaId, setCoverMediaId] = useState<number | null>(
		initial?.coverMediaId ?? null,
	);
	const [sections, setSections] = useState<SectionNode[]>(
		initial?.sections ?? [],
	);
	const [trans, setTrans] = useState<
		Record<string, { title: string; excerpt: string; body: string }>
	>(() => {
		const t: Record<string, { title: string; excerpt: string; body: string }> =
			{};
		for (const l of languages) {
			const e = initial?.translations[l.code] ?? {};
			t[l.code] = {
				title: e.title ?? "",
				excerpt: e.excerpt ?? "",
				body: e.body ?? "",
			};
		}
		return t;
	});

	function setField(
		lang: string,
		field: "title" | "excerpt" | "body",
		value: string,
	) {
		setTrans((prev) => ({
			...prev,
			[lang]: { ...prev[lang], [field]: value },
		}));
	}
	const [fieldError, setFieldError] = useState<FieldError | null>(null);
	const segmentRef = useRef<HTMLInputElement>(null);
	const titleRefs = useRef<Record<string, HTMLInputElement | null>>({});
	const segmentInvalid = fieldError?.field === "segment";
	const titleInvalid = (lang: string) =>
		fieldError?.field === "title" && fieldError.lang === lang;

	function submit(e?: React.SyntheticEvent) {
		e?.preventDefault();
		const cleaned = segment.trim().replace(/^\/+|\/+$/g, "");
		// a legacy segment keeps its address until edited, same as the server
		const untouched = !!cleaned && cleaned === initialSegment;
		const problem = untouched ? null : segmentProblem(cleaned);
		if (problem) {
			setFieldError({ field: "segment", text: problem });
			segmentRef.current?.focus();
			return;
		}
		// Not maxLength alone: a title stored before the cap existed is already over
		// it, and the field would look fine while the server refused every save.
		const long = languages.find(
			(l) => (trans[l.code]?.title ?? "").length > PAGE_TITLE_MAX,
		);
		if (long) {
			setFieldError({
				field: "title",
				lang: long.code,
				text: `The ${long.name} title is ${trans[long.code].title.length} characters. The limit is ${PAGE_TITLE_MAX}.`,
			});
			titleRefs.current[long.code]?.focus();
			return;
		}
		setFieldError(null);
		onSubmit({
			segment: cleaned,
			parentId,
			status,
			coverMediaId,
			sections,
			translations: languages.map((l) => ({ lang: l.code, ...trans[l.code] })),
		});
	}

	const dirty = useDirtyGuard(
		JSON.stringify({
			segment,
			parentId,
			status,
			coverMediaId,
			sections,
			trans,
		}),
		savedAt,
	);

	// Resizable editor/preview split (only when the studio is in side-by-side mode).
	const [panelW, setPanelW] = useState(420);
	const [isWide, setIsWide] = useState(false);
	useEffect(() => {
		const mq = window.matchMedia("(min-width: 1280px)");
		const sync = () => setIsWide(mq.matches);
		sync();
		mq.addEventListener("change", sync);
		return () => mq.removeEventListener("change", sync);
	}, []);
	function nudgeResize(e: React.KeyboardEvent) {
		const step = e.shiftKey ? 80 : 16;
		if (e.key === "ArrowLeft") setPanelW((w) => Math.max(300, w - step));
		else if (e.key === "ArrowRight") setPanelW((w) => Math.min(880, w + step));
		else if (e.key === "Home") setPanelW(300);
		else if (e.key === "End") setPanelW(880);
		else return;
		e.preventDefault();
	}
	function startResize(e: React.MouseEvent) {
		e.preventDefault();
		const startX = e.clientX;
		const startW = panelW;
		const onMove = (ev: MouseEvent) =>
			setPanelW(Math.min(880, Math.max(300, startW + ev.clientX - startX)));
		const onUp = () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
			document.body.style.userSelect = "";
		};
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		document.body.style.userSelect = "none";
	}

	// not a <form>: the preview can hold real <form> sections and React 19 errors on nesting
	return (
		<div className="flex flex-col bg-admin-bg xl:h-[calc(100dvh-4rem)] xl:flex-row">
			{/* the design gives this editor no title bar, so the h1 is for AT only */}
			<h1 className="sr-only">{title ?? "Page"}</h1>
			{/* Page-owned titlebar content (rendered into the admin topbar slot). */}
			<AdminHeader>
				<PageSwitcher />
			</AdminHeader>

			{/* Inspector: four jobs, one open at a time, its own save footer */}
			<aside
				className="flex min-h-0 flex-col border-b border-admin-border bg-admin-panel xl:shrink-0 xl:border-b-0"
				style={isWide ? { width: panelW } : undefined}
			>
				{/* the studio's header: whether this page is on the site is the one thing
				    that must never be scrolled past */}
				<div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-admin-border px-4 py-3">
					<span className="text-[13px] font-medium text-admin-ink-muted">
						Status
					</span>
					<Select
						value={status}
						onValueChange={(v) => setStatus(v as PageStatus)}
					>
						<SelectTrigger size="sm" aria-label="Status" className="w-36">
							<span
								aria-hidden="true"
								className={`size-2 shrink-0 rounded-full ${status === "published" ? "bg-admin-live" : "bg-admin-draft"}`}
							/>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="draft">Draft</SelectItem>
							<SelectItem value="published">Published</SelectItem>
						</SelectContent>
					</Select>
					<span className="text-[13px] text-admin-ink-muted">
						{status === "published"
							? "On the site."
							: "Off the site until published."}
					</span>
				</div>
				<div className="min-h-0 flex-1 xl:overflow-y-auto">
					<InspectorGroup
						id="page-sections"
						data-tour="page-sections"
						title="Page sections"
						description="A page is a stack of sections, rendered in this order."
						defaultOpen
					>
						<SectionsBuilder
							value={sections}
							onChange={setSections}
							languages={languages}
						/>
					</InspectorGroup>

					<InspectorGroup
						id="page-metadata"
						title="Metadata"
						description="Title, brief and cover power SEO and the menu card."
					>
						<LangTabs languages={languages}>
							{(l) => (
								<div className="space-y-3">
									<label
										className={fieldLabel}
										htmlFor={`page-title-${l.code}`}
									>
										Title
									</label>
									<div>
										<Input
											ref={(el) => {
												titleRefs.current[l.code] = el;
											}}
											id={`page-title-${l.code}`}
											maxLength={PAGE_TITLE_MAX}
											aria-invalid={titleInvalid(l.code) || undefined}
											aria-describedby={
												titleInvalid(l.code)
													? `page-title-error-${l.code}`
													: undefined
											}
											className={l.code === "km" ? "font-khmer" : undefined}
											value={trans[l.code]?.title ?? ""}
											onChange={(e) =>
												setField(l.code, "title", e.target.value)
											}
										/>
									</div>
									{titleInvalid(l.code) && fieldError && (
										<p
											id={`page-title-error-${l.code}`}
											className="text-[13px] font-medium text-admin-danger-ink"
										>
											{fieldError.text}
										</p>
									)}
									<label
										className={fieldLabel}
										htmlFor={`page-excerpt-${l.code}`}
									>
										Brief
									</label>
									<div>
										<Textarea
											id={`page-excerpt-${l.code}`}
											className={`resize-y ${l.code === "km" ? "font-khmer" : ""}`}
											rows={2}
											placeholder="Shown on menu cards and used for SEO."
											value={trans[l.code]?.excerpt ?? ""}
											onChange={(e) =>
												setField(l.code, "excerpt", e.target.value)
											}
										/>
									</div>
								</div>
							)}
						</LangTabs>
					</InspectorGroup>

					<InspectorGroup
						id="page-settings"
						data-tour="page-settings"
						title="Page settings"
						description="Where the page sits, and the address it answers on."
					>
						<div className="space-y-4">
							<div>
								<label className={fieldLabel} htmlFor="page-parent">
									Parent page
								</label>
								<SearchableSelect
									id="page-parent"
									value={parentId != null ? String(parentId) : ""}
									onChange={(v) => setParentId(v ? Number(v) : null)}
									emptyOption="Top level"
									placeholder="Top level"
									options={parentOptions.map((p) => ({
										value: String(p.id),
										label: `${p.slug} — ${optionLabel(p.title)}`,
									}))}
								/>
							</div>
							<div>
								<label className={fieldLabel} htmlFor="page-segment">
									URL segment
								</label>
								<div>
									<Input
										ref={segmentRef}
										id="page-segment"
										aria-invalid={segmentInvalid || undefined}
										aria-describedby={
											segmentInvalid
												? "page-segment-error page-segment-url"
												: "page-segment-url"
										}
										value={segment}
										onChange={(e) => {
											setSegment(e.target.value);
											if (segmentInvalid) setFieldError(null);
										}}
										placeholder="about"
										required
									/>
								</div>
								{segmentInvalid && fieldError && (
									<p
										id="page-segment-error"
										className="mt-1 text-[13px] font-medium text-admin-danger-ink"
									>
										{fieldError.text}
									</p>
								)}
								<p
									id="page-segment-url"
									className="mt-1 text-[13px] text-admin-ink-muted"
								>
									URL:{" "}
									<span className="font-mono text-admin-ink">{fullPath}</span>
								</p>
							</div>
						</div>
					</InspectorGroup>

					<InspectorGroup
						id="page-cover"
						title="Cover image"
						description="Page hero, menu card and social image."
					>
						<MediaPicker
							value={coverMediaId != null ? String(coverMediaId) : ""}
							onChange={(v) => setCoverMediaId(v ? Number(v) : null)}
							mode="id"
							kind="image"
							aspect="video"
						/>
					</InspectorGroup>
				</div>

				{/* The save acts on this pane, so it lives at the foot of it */}
				<div className="shrink-0 border-t border-admin-border bg-admin-panel">
					{error && (
						<div
							role="alert"
							className="border-b border-admin-danger/40 bg-admin-danger-soft px-4 py-3"
						>
							<p className="text-sm text-admin-danger-ink">{error}</p>
							{onReload && (
								<Button
									variant="secondary"
									size="sm"
									className="mt-2"
									onClick={onReload}
								>
									Reload the saved version
								</Button>
							)}
							<p className="mt-2 text-[13px] text-admin-ink-muted">
								{onReload
									? "Your draft is still on screen. Reloading replaces it with what is stored."
									: "Nothing you have typed has been lost."}
							</p>
						</div>
					)}
					<div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
						{/* the save used to finish in silence, the button re-disabling its only cue */}
						<output className="text-[13px] text-admin-live-ink">
							{savedAt ? `Saved ${savedAt}` : ""}
						</output>
						<div className="ml-auto flex items-center gap-2">
							<Button variant="secondary" asChild>
								<Link to="/admin/pages">Cancel</Link>
							</Button>
							<Button
								data-tour="page-save"
								onClick={() => submit()}
								disabled={saving || !dirty}
								disabledReason={dirty ? undefined : "No changes to save."}
							>
								{saving ? "Saving…" : "Save page"}
							</Button>
						</div>
					</div>
				</div>
			</aside>

			{/* 1px divider with a centered grab handle */}
			{/* biome-ignore lint/a11y/useSemanticElements: <hr> is void and cannot hold the grab handle, and a focusable splitter is a widget rather than a thematic break. */}
			<div
				role="separator"
				aria-orientation="vertical"
				aria-label="Resize editor panel"
				aria-valuenow={panelW}
				aria-valuemin={300}
				aria-valuemax={880}
				tabIndex={0}
				onMouseDown={startResize}
				onKeyDown={nudgeResize}
				className="tap-target hidden w-px shrink-0 cursor-col-resize bg-admin-border transition-colors duration-150 ease-out hover:bg-admin-accent/50 focus-visible:bg-admin-accent focus-visible:outline-none xl:block"
			>
				<span className="absolute left-1/2 top-1/2 z-10 grid h-11 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-admin-border bg-admin-panel text-admin-ink-muted shadow-[var(--shadow-soft)] transition-colors duration-150 ease-out hover:border-admin-accent hover:text-admin-accent-ink">
					<GripVertical aria-hidden="true" className="size-4" />
				</span>
			</div>

			{/* Preview canvas */}
			<div className="flex min-h-0 min-w-0 flex-1 flex-col bg-admin-bg">
				<div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-admin-border bg-admin-panel px-4 py-3">
					<span className="text-base font-semibold text-admin-ink">
						Live preview
					</span>
					<span className="text-[13px] text-admin-ink-muted">
						English · approximate
					</span>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto">
					<div className="bg-background">
						<PagePreview sections={sections} />
					</div>
				</div>
			</div>
		</div>
	);
}
