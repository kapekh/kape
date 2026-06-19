import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { MediaPicker } from "#/components/admin/MediaPicker";
import type { LangOpt } from "#/components/admin/PostForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/hero")({ component: HeroAdmin });

type Row = Awaited<ReturnType<typeof trpcClient.adminHero.list.query>>[number];
const FIELDS = ["kicker", "title", "caption"] as const;
const inp = "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25 transition";
const lbl = "block text-[11px] font-medium text-muted-foreground mb-1";

function HeroAdmin() {
	const [rows, setRows] = useState<Row[]>([]);
	const [langs, setLangs] = useState<LangOpt[]>([]);
	const [loading, setLoading] = useState(true);
	const [savedId, setSavedId] = useState<number | null>(null);

	async function refresh() {
		const [h, l] = await Promise.all([
			trpcClient.adminHero.list.query(),
			trpcClient.i18n.languages.query(),
		]);
		setRows(h);
		setLangs(l);
		setLoading(false);
	}
	useEffect(() => {
		refresh();
	}, []);

	function patch(id: number, fn: (r: Row) => Row) {
		setRows((rs) => rs.map((r) => (r.id === id ? fn(r) : r)));
	}
	function tr(r: Row, lang: string, field: (typeof FIELDS)[number]) {
		return (r.translations as Record<string, Record<string, string>>)[lang]?.[field] ?? "";
	}
	function setTr(id: number, lang: string, field: (typeof FIELDS)[number], value: string) {
		patch(id, (r) => {
			const t = { ...(r.translations as Record<string, Record<string, string>>) };
			t[lang] = { ...(t[lang] ?? {}), [field]: value };
			return { ...r, translations: t };
		});
	}
	async function save(r: Row) {
		await trpcClient.adminHero.update.mutate({
			id: r.id, mediaId: r.mediaId, kind: r.kind, videoUrl: r.videoUrl, sort: r.sort,
			translations: langs.map((l) => ({ lang: l.code, kicker: tr(r, l.code, "kicker"), title: tr(r, l.code, "title"), caption: tr(r, l.code, "caption") })),
		});
		setSavedId(r.id);
		setTimeout(() => setSavedId((cur) => (cur === r.id ? null : cur)), 2000);
	}
	async function add() {
		await trpcClient.adminHero.create.mutate({ mediaId: null, kind: "image", videoUrl: null, sort: rows.length, translations: [] });
		refresh();
	}
	async function del(id: number) {
		await trpcClient.adminHero.delete.mutate({ id });
		setRows((rs) => rs.filter((r) => r.id !== id));
	}

	return (
		<div className="space-y-5">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">Hero Slides</h1>
					<p className="mt-1 text-sm text-muted-foreground">Slides in the homepage hero carousel. Each needs an image; text is shown per language.</p>
				</div>
				<button type="button" onClick={add} className="shrink-0 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition">+ New slide</button>
			</div>

			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : rows.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
					No slides yet. <button type="button" onClick={add} className="text-[var(--accent)] font-medium hover:underline">Add the first slide →</button>
				</div>
			) : (
				<div className="space-y-4">
					{rows.map((r, idx) => (
						<div key={r.id} className="rounded-2xl border border-border bg-card overflow-hidden">
							<div className="grid md:grid-cols-[280px_1fr]">
								{/* Image side */}
								<div className="border-b md:border-b-0 md:border-r border-border bg-muted/30 p-4 space-y-3">
									<span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Slide {idx + 1}</span>
									<MediaPicker
										mode="id"
										kind="image"
										accept="image/*"
										label="Choose image"
										value={r.mediaId != null ? String(r.mediaId) : ""}
										onChange={(v) => patch(r.id, (x) => ({ ...x, mediaId: v ? Number(v) : null }))}
									/>
								</div>

								{/* Content side */}
								<div className="p-4 space-y-4">
									{langs.map((l) => (
										<div key={l.code}>
											<div className="text-xs font-semibold text-primary mb-2">{l.name} <span className="text-muted-foreground font-normal">({l.code})</span></div>
											<div className="grid sm:grid-cols-3 gap-3">
												<div>
													<label className={lbl}>Kicker</label>
													<input className={`${inp} ${l.code === "km" ? "font-khmer" : ""}`} value={tr(r, l.code, "kicker")} onChange={(e) => setTr(r.id, l.code, "kicker", e.target.value)} />
												</div>
												<div>
													<label className={lbl}>Title</label>
													<input className={`${inp} ${l.code === "km" ? "font-khmer" : ""}`} value={tr(r, l.code, "title")} onChange={(e) => setTr(r.id, l.code, "title", e.target.value)} />
												</div>
												<div>
													<label className={lbl}>Caption</label>
													<input className={`${inp} ${l.code === "km" ? "font-khmer" : ""}`} value={tr(r, l.code, "caption")} onChange={(e) => setTr(r.id, l.code, "caption", e.target.value)} />
												</div>
											</div>
										</div>
									))}
									<div className="flex items-center justify-end gap-3 pt-1 border-t border-border">
										{savedId === r.id && <span className="text-xs text-[var(--palm)]">Saved ✓</span>}
										<button type="button" onClick={() => save(r)} className="mt-2 rounded-lg bg-primary text-primary-foreground px-4 py-1.5 text-sm font-semibold hover:opacity-90 transition">Save</button>
										<span className="mt-2"><ActionMenu items={[{ label: "Delete slide", danger: true, onClick: () => { if (window.confirm("Delete this slide?")) del(r.id); } }]} /></span>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
