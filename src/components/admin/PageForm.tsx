import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import type { SectionNode } from "#/lib/sections";
import { PAGE_TITLE_MAX, segmentProblem } from "#/lib/slug";

import { AdminHeader } from "./AdminHeader";
import { cancelButtonClass, fieldInput, fieldLabel } from "./form-ui";
import { LangTabs } from "./LangTabs";
import { MediaPicker } from "./MediaPicker";
import { PagePreview } from "./PagePreview";
import { PageSwitcher } from "./PageSwitcher";
import type { LangOpt } from "./PostForm";
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

	const panelHead = "font-display text-sm font-semibold text-primary";
	const panelSub = "mt-0.5 text-xs text-muted-foreground";

	// not a <form>: the preview can hold real <form> sections and React 19 errors on nesting
	return (
		<div className="flex flex-col xl:h-[calc(100dvh-4rem)] xl:flex-row">
			{/* the design gives this editor no title bar, so the h1 is for AT only */}
			<h1 className="sr-only">{title ?? "Page"}</h1>
			{/* Page-owned titlebar content (rendered into the admin topbar slot). */}
			<AdminHeader>
				<PageSwitcher />
			</AdminHeader>

			{/* Tools panel (resizable) */}
			<aside
				className="flex flex-col border-b border-border bg-card xl:shrink-0 xl:border-b-0 xl:overflow-y-auto thin-scroll"
				style={isWide ? { width: panelW } : undefined}
			>
				<div data-tour="page-sections" className="border-b border-border p-4">
					<h2 className={panelHead}>Page sections</h2>
					<p className={`${panelSub} mb-3`}>
						Compose the page from sections (static + data-driven).
					</p>
					<SectionsBuilder
						value={sections}
						onChange={setSections}
						languages={languages}
					/>
				</div>

				<div className="border-b border-border p-4">
					<h2 className={panelHead}>Metadata</h2>
					<p className={`${panelSub} mb-3`}>
						Title, brief and cover power SEO and the menu card.
					</p>
					<div className="space-y-4">
						<LangTabs languages={languages}>
							{(l) => (
								<div className="space-y-2">
									<label className="block">
										<span className={fieldLabel}>Title</span>
										<input
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
											className={`${fieldInput} ${titleInvalid(l.code) ? "border-destructive" : ""} ${l.code === "km" ? "font-khmer" : ""}`}
											value={trans[l.code]?.title ?? ""}
											onChange={(e) =>
												setField(l.code, "title", e.target.value)
											}
										/>
									</label>
									{titleInvalid(l.code) && fieldError && (
										<p
											id={`page-title-error-${l.code}`}
											className="text-xs font-medium text-destructive"
										>
											{fieldError.text}
										</p>
									)}
									<label className="block">
										<span className={fieldLabel}>Brief</span>
										<textarea
											className={`${fieldInput} resize-y ${l.code === "km" ? "font-khmer" : ""}`}
											rows={2}
											placeholder="Shown on menu cards and used for SEO."
											value={trans[l.code]?.excerpt ?? ""}
											onChange={(e) =>
												setField(l.code, "excerpt", e.target.value)
											}
										/>
									</label>
								</div>
							)}
						</LangTabs>
					</div>
				</div>

				<div className="border-b border-border p-4">
					<h2 className={panelHead}>Page settings</h2>
					<div className="mt-3 space-y-3">
						<label className="block">
							<span className={fieldLabel}>Parent page</span>
							<select
								className={fieldInput}
								value={parentId ?? ""}
								onChange={(e) =>
									setParentId(e.target.value ? Number(e.target.value) : null)
								}
							>
								<option value="">— Top level</option>
								{parentOptions.map((p) => (
									<option key={p.id} value={p.id}>
										{p.slug} — {optionLabel(p.title)}
									</option>
								))}
							</select>
						</label>
						<div>
							<label className="block">
								<span className={fieldLabel}>URL segment</span>
								<input
									ref={segmentRef}
									id="page-segment"
									className={`${fieldInput} ${segmentInvalid ? "border-destructive" : ""}`}
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
							</label>
							{segmentInvalid && fieldError && (
								<p
									id="page-segment-error"
									className="mt-1 text-xs font-medium text-destructive"
								>
									{fieldError.text}
								</p>
							)}
							<p
								id="page-segment-url"
								className="mt-1 text-[11px] text-muted-foreground"
							>
								URL:{" "}
								<span className="font-mono text-foreground/80">{fullPath}</span>
							</p>
						</div>
						<label className="block">
							<span className={fieldLabel}>Status</span>
							<select
								className={fieldInput}
								value={status}
								onChange={(e) => setStatus(e.target.value as PageStatus)}
							>
								<option value="draft">Draft</option>
								<option value="published">Published</option>
							</select>
						</label>
					</div>
				</div>

				<div className="p-4">
					<h2 className={panelHead}>Cover image</h2>
					<p className={`${panelSub} mb-3`}>
						Page hero, menu card and social/SEO image.
					</p>
					<MediaPicker
						value={coverMediaId != null ? String(coverMediaId) : ""}
						onChange={(v) => setCoverMediaId(v ? Number(v) : null)}
						mode="id"
						kind="image"
						aspect="video"
					/>
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
				className="relative hidden w-px shrink-0 cursor-col-resize bg-border transition-colors hover:bg-[var(--accent)]/50 focus-visible:bg-[var(--accent)] focus-visible:outline-none xl:block"
			>
				<span className="absolute left-1/2 top-1/2 z-10 grid h-11 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
					<svg
						aria-hidden="true"
						className="h-4 w-4"
						viewBox="0 0 16 16"
						fill="currentColor"
					>
						<circle cx="6" cy="4" r="1" />
						<circle cx="10" cy="4" r="1" />
						<circle cx="6" cy="8" r="1" />
						<circle cx="10" cy="8" r="1" />
						<circle cx="6" cy="12" r="1" />
						<circle cx="10" cy="12" r="1" />
					</svg>
				</span>
			</div>

			{/* Preview canvas */}
			<div className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/40">
				<div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2">
					<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Live preview{" "}
						<span className="ml-1.5 font-normal normal-case text-[11px] text-muted-foreground/70">
							English · approximate
						</span>
					</span>
					<div className="flex items-center gap-2">
						{/* the save used to finish in silence, the button re-disabling its only cue */}
						<output className="text-xs text-[var(--palm)]">
							{savedAt ? `Saved ${savedAt}` : ""}
						</output>
						<Link to="/admin/pages" className={cancelButtonClass}>
							Cancel
						</Link>
						<button
							type="button"
							data-tour="page-save"
							onClick={() => submit()}
							disabled={saving || !dirty}
							className="rounded-full bg-primary text-primary-foreground px-5 py-1.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
						>
							{saving ? "Saving…" : "Save page"}
						</button>
					</div>
				</div>
				{error && (
					<div
						role="alert"
						className="flex shrink-0 flex-wrap items-center gap-3 border-b border-destructive/40 bg-destructive/5 px-4 py-2.5"
					>
						<p className="text-sm text-destructive">{error}</p>
						{onReload && (
							<button
								type="button"
								onClick={onReload}
								className="rounded-full border border-border bg-card px-4 py-1 text-xs font-semibold hover:bg-muted transition"
							>
								Reload the saved version
							</button>
						)}
						<p className="text-xs text-muted-foreground">
							{onReload
								? "Your draft is still on screen. Reloading replaces it with what is stored."
								: "Nothing you have typed has been lost."}
						</p>
					</div>
				)}
				<div className="min-h-0 flex-1 overflow-y-auto thin-scroll">
					<div className="bg-background">
						<PagePreview sections={sections} />
					</div>
				</div>
			</div>
		</div>
	);
}
