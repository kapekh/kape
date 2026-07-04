import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import type { SectionNode } from "#/lib/sections";

import { AdminHeader } from "./AdminHeader";
import { cancelButtonClass, fieldInput, fieldLabel } from "./form-ui";
import { LangTabs } from "./LangTabs";
import { MediaPicker } from "./MediaPicker";
import { PagePreview } from "./PagePreview";
import { PageSwitcher } from "./PageSwitcher";
import type { LangOpt } from "./PostForm";
import { SectionsBuilder } from "./SectionsBuilder";

export type PageStatus = "draft" | "published";
export type PageFormValue = {
	segment: string;
	parentId: number | null;
	status: PageStatus;
	coverMediaId: number | null;
	sections: SectionNode[];
	translations: { lang: string; title: string; excerpt: string; body: string }[];
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

export function PageForm({
	initial,
	languages,
	onSubmit,
	saving,
	savedAt,
}: {
	initial: Initial;
	languages: LangOpt[];
	onSubmit: (value: PageFormValue) => void;
	saving?: boolean;
	title?: string; // kept for caller compatibility; the page editor has no title bar
	savedAt?: string | null;
}) {
	const [segment, setSegment] = useState(initial?.segment ?? initial?.slug ?? "");
	const [parentId, setParentId] = useState<number | null>(initial?.parentId ?? null);
	const [status, setStatus] = useState<PageStatus>((initial?.status as PageStatus) ?? "draft");

	// Pages for the parent picker (exclude self + own descendants to prevent cycles).
	const [allPages, setAllPages] = useState<{ id: number; slug: string; parentId: number | null; title: string }[]>([]);
	useEffect(() => {
		trpcClient.adminPages.list.query().then(setAllPages).catch(() => {});
	}, []);
	const parentOptions = useMemo(() => {
		const selfId = initial?.id;
		const blocked = new Set<number>();
		if (selfId != null) {
			blocked.add(selfId);
			const childrenOf = new Map<number, number[]>();
			for (const p of allPages) if (p.parentId != null) (childrenOf.get(p.parentId) ?? childrenOf.set(p.parentId, []).get(p.parentId)!).push(p.id);
			const stack = [selfId];
			while (stack.length) for (const c of childrenOf.get(stack.pop()!) ?? []) { blocked.add(c); stack.push(c); }
		}
		return allPages.filter((p) => !blocked.has(p.id)).sort((a, b) => a.slug.localeCompare(b.slug));
	}, [allPages, initial?.id]);
	const parentSlug = parentId != null ? (allPages.find((p) => p.id === parentId)?.slug ?? "") : "";
	const fullPath = `/${[parentSlug, segment.replace(/^\/+|\/+$/g, "")].filter(Boolean).join("/")}`;
	const [coverMediaId, setCoverMediaId] = useState<number | null>(initial?.coverMediaId ?? null);
	const [sections, setSections] = useState<SectionNode[]>(initial?.sections ?? []);
	const [trans, setTrans] = useState<Record<string, { title: string; excerpt: string; body: string }>>(() => {
		const t: Record<string, { title: string; excerpt: string; body: string }> = {};
		for (const l of languages) {
			const e = initial?.translations[l.code] ?? {};
			t[l.code] = { title: e.title ?? "", excerpt: e.excerpt ?? "", body: e.body ?? "" };
		}
		return t;
	});

	function setField(lang: string, field: "title" | "excerpt" | "body", value: string) {
		setTrans((prev) => ({ ...prev, [lang]: { ...prev[lang], [field]: value } }));
	}
	function submit(e?: React.SyntheticEvent) {
		e?.preventDefault();
		onSubmit({ segment: segment.replace(/^\/+|\/+$/g, ""), parentId, status, coverMediaId, sections, translations: languages.map((l) => ({ lang: l.code, ...trans[l.code] })) });
	}

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
	function startResize(e: React.MouseEvent) {
		e.preventDefault();
		const startX = e.clientX;
		const startW = panelW;
		const onMove = (ev: MouseEvent) => setPanelW(Math.min(880, Math.max(300, startW + ev.clientX - startX)));
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

	// Not a <form>: the live preview can contain real <form> sections (Contact / built
	// forms), and nested <form> elements are invalid HTML — React 19 errors on every
	// render, flooding the console and hanging the tab. Save is an explicit button below.
	return (
		<div className="flex flex-col xl:h-[calc(100dvh-4rem)] xl:flex-row">
			{/* Page-owned titlebar content (rendered into the admin topbar slot). */}
			<AdminHeader>
				<PageSwitcher />
			</AdminHeader>

			{/* Tools panel (resizable) */}
			<aside
				className="flex flex-col border-b border-border bg-card xl:shrink-0 xl:border-b-0 xl:overflow-y-auto thin-scroll"
				style={isWide ? { width: panelW } : undefined}
			>
				<div className="border-b border-border p-4">
					<h2 className={panelHead}>Page sections</h2>
					<p className={`${panelSub} mb-3`}>Compose the page from sections (static + data-driven).</p>
					<SectionsBuilder value={sections} onChange={setSections} languages={languages} />
				</div>

				<div className="border-b border-border p-4">
					<h2 className={panelHead}>Metadata</h2>
					<p className={`${panelSub} mb-3`}>Title, brief and cover power SEO and the menu card.</p>
					<div className="space-y-4">
						<LangTabs languages={languages}>
							{(l) => (
								<div className="space-y-2">
									<input className={`${fieldInput} ${l.code === "km" ? "font-khmer" : ""}`} placeholder="Title" value={trans[l.code]?.title ?? ""} onChange={(e) => setField(l.code, "title", e.target.value)} />
									<textarea
										className={`${fieldInput} resize-y ${l.code === "km" ? "font-khmer" : ""}`}
										rows={2}
										placeholder="Brief — shown on menu cards and used for SEO."
										value={trans[l.code]?.excerpt ?? ""}
										onChange={(e) => setField(l.code, "excerpt", e.target.value)}
									/>
								</div>
							)}
						</LangTabs>
					</div>
				</div>

				<div className="border-b border-border p-4">
					<h2 className={panelHead}>Page settings</h2>
					<div className="mt-3 space-y-3">
						<div>
							<label className={fieldLabel}>Parent page</label>
							<select className={fieldInput} value={parentId ?? ""} onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}>
								<option value="">— Top level</option>
								{parentOptions.map((p) => (
									<option key={p.id} value={p.id}>{p.slug} — {p.title}</option>
								))}
							</select>
						</div>
						<div>
							<label className={fieldLabel}>URL segment</label>
							<input className={fieldInput} value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="about" required />
							<p className="mt-1 text-[11px] text-muted-foreground">URL: <span className="font-mono text-foreground/80">{fullPath}</span></p>
						</div>
						<div>
							<label className={fieldLabel}>Status</label>
							<select className={fieldInput} value={status} onChange={(e) => setStatus(e.target.value as PageStatus)}>
								<option value="draft">Draft</option>
								<option value="published">Published</option>
							</select>
						</div>
					</div>
				</div>

				<div className="p-4">
					<h2 className={panelHead}>Cover image</h2>
					<p className={`${panelSub} mb-3`}>Page hero, menu card and social/SEO image.</p>
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
			<div
				onMouseDown={startResize}
				role="separator"
				aria-orientation="vertical"
				className="relative hidden w-px shrink-0 cursor-col-resize bg-border transition-colors hover:bg-[var(--accent)]/50 xl:block"
			>
				<span className="absolute left-1/2 top-1/2 z-10 grid h-11 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
					<svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
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
						Live preview <span className="ml-1.5 font-normal normal-case text-[11px] text-muted-foreground/70">English · approximate</span>
					</span>
					<div className="flex items-center gap-2">
						{savedAt && <span className="text-xs text-[var(--palm)]">Saved {savedAt}</span>}
						<Link to="/admin/pages" className={cancelButtonClass}>Cancel</Link>
						<button type="button" onClick={() => submit()} disabled={saving} className="rounded-full bg-primary text-primary-foreground px-5 py-1.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
							{saving ? "Saving…" : "Save page"}
						</button>
					</div>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto thin-scroll">
					<div className="bg-background">
						<PagePreview sections={sections} />
					</div>
				</div>
			</div>
		</div>
	);
}
