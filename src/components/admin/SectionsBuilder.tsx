import { confirm } from "@/components/Dialogs";
import { useEffect, useState } from "react";

import { SECTION_DEFS, type SectionField, type SectionNode, sectionDef } from "#/lib/sections";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

import { fieldInput, fieldLabel } from "./form-ui";
import { MediaPicker } from "./MediaPicker";
import { RichTextEditor } from "./RichTextEditor";

/** Dropdown of admin-built forms (by slug) — lets a Form section embed any form. */
function FormPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
	const [forms, setForms] = useState<{ slug: string; title: string }[]>([]);
	useEffect(() => {
		trpcClient.adminForms.list.query().then((fs) => setForms(fs.map((f) => ({ slug: f.slug, title: f.title })))).catch(() => {});
	}, []);
	return (
		<select className={fieldInput} value={value} onChange={(e) => onChange(e.target.value)}>
			<option value="">— None (use the layout above) —</option>
			{forms.map((f) => <option key={f.slug} value={f.slug}>{f.title} (/{f.slug})</option>)}
			{value && !forms.some((f) => f.slug === value) && <option value={value}>{value} (missing)</option>}
		</select>
	);
}

const uid = () =>
	(globalThis.crypto?.randomUUID?.() ?? `s_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`);

const btn = "text-xs rounded border border-border px-2 py-1 hover:bg-muted transition disabled:opacity-40";

/** A borderless cell input that fills its grid cell (Excel-like). */
function CellInput({ field, value, onChange }: { field: SectionField; value: unknown; onChange: (v: unknown) => void }) {
	const str = typeof value === "string" ? value : "";
	const base = "block w-full border-0 bg-transparent px-2 py-1.5 text-sm leading-snug outline-none focus:bg-[var(--accent)]/10";
	if (field.kind === "textarea") {
		return <textarea rows={1} className={`${base} min-w-[150px] resize-none`} placeholder={field.help} value={str} onChange={(e) => onChange(e.target.value)} />;
	}
	if (field.kind === "select") {
		return (
			<select className={`${base} min-w-[96px]`} value={str} onChange={(e) => onChange(e.target.value)}>
				<option value="">—</option>
				{(field.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
			</select>
		);
	}
	if (field.kind === "image") {
		return <div className="w-[104px] p-1"><MediaPicker value={str} onChange={onChange} mode="url" kind="image" aspect="video" /></div>;
	}
	return <input className={`${base} min-w-[110px]`} placeholder={field.help} value={str} onChange={(e) => onChange(e.target.value)} />;
}

/** A repeater field rendered as an Excel-like data grid: a row per item, a column per field. */
function ItemsTable({ fields, rows, onChange }: { fields: SectionField[]; rows: Record<string, unknown>[]; onChange: (v: Record<string, unknown>[]) => void }) {
	const update = (i: number, key: string, v: unknown) => onChange(rows.map((r, n) => (n === i ? { ...r, [key]: v } : r)));
	const move = (i: number, dir: -1 | 1) => {
		const j = i + dir;
		if (j < 0 || j >= rows.length) return;
		const a = [...rows];
		[a[i], a[j]] = [a[j], a[i]];
		onChange(a);
	};
	const th = "border border-border bg-muted/50 px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap";
	return (
		<div className="overflow-hidden rounded-lg border border-border">
			<div className="overflow-x-auto thin-scroll">
				<table className="w-full border-collapse text-sm [&_td]:border [&_td]:border-border">
					<thead>
						<tr>
							<th className={`${th} w-7 text-center`}>#</th>
							{fields.map((f) => <th key={f.key} className={th}>{f.label}</th>)}
							<th className={`${th} w-px`} />
						</tr>
					</thead>
					<tbody>
						{rows.length === 0 && (
							<tr><td className="px-2 py-3 text-center text-xs text-muted-foreground" colSpan={fields.length + 2}>No items yet.</td></tr>
						)}
						{rows.map((row, i) => (
							<tr key={i}>
								<td className="w-7 bg-muted/30 px-1 text-center align-middle text-xs text-muted-foreground">{i + 1}</td>
								{fields.map((f) => (
									<td key={f.key} className="p-0 align-top"><CellInput field={f} value={row[f.key]} onChange={(v) => update(i, f.key, v)} /></td>
								))}
								<td className="bg-muted/30 px-1 align-middle whitespace-nowrap">
									<div className="flex gap-0.5">
										<button type="button" className={btn} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
										<button type="button" className={btn} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>↓</button>
										<button type="button" className={`${btn} text-destructive`} onClick={() => onChange(rows.filter((_, n) => n !== i))}>✕</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="border-t border-border bg-card p-1.5">
				<button type="button" className={btn} onClick={() => onChange([...rows, {}])}>+ Add row</button>
			</div>
		</div>
	);
}

type CardBtn = { label?: string; href?: string };
type Card = { image?: string; imageAsBg?: boolean; title?: string; body?: string; href?: string; buttons?: CardBtn[] };

/** Normalise a card's footer buttons, folding a legacy single `href` into the list. */
function cardButtons(c: Card): CardBtn[] {
	if (Array.isArray(c.buttons)) return c.buttons;
	if (c.href) return [{ label: "Learn more", href: c.href }];
	return [];
}

/** A richer card repeater: per-card image (+ background toggle), title, body, and footer buttons. */
function CardsEditor({ rows, onChange }: { rows: Record<string, unknown>[]; onChange: (v: Record<string, unknown>[]) => void }) {
	const cards = (Array.isArray(rows) ? rows : []) as Card[];
	const patch = (i: number, p: Partial<Card>) => onChange(cards.map((c, n) => (n === i ? { ...c, ...p } : c)));
	const move = (i: number, dir: -1 | 1) => {
		const j = i + dir;
		if (j < 0 || j >= cards.length) return;
		const a = [...cards];
		[a[i], a[j]] = [a[j], a[i]];
		onChange(a);
	};
	const setButtons = (i: number, btns: CardBtn[]) => patch(i, { buttons: btns, href: undefined });

	return (
		<div className="space-y-3">
			{cards.length === 0 && <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">No cards yet.</p>}
			{cards.map((card, i) => {
				const btns = cardButtons(card);
				return (
					<div key={i} className="rounded-xl border border-border bg-card p-3">
						<div className="mb-2 flex items-center justify-between">
							<span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Card {i + 1}</span>
							<div className="flex gap-0.5">
								<button type="button" className={btn} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
								<button type="button" className={btn} disabled={i === cards.length - 1} onClick={() => move(i, 1)}>↓</button>
								<button type="button" className={`${btn} text-destructive`} onClick={() => onChange(cards.filter((_, n) => n !== i))}>✕</button>
							</div>
						</div>

						<div className="space-y-3">
							<div>
								<label className={fieldLabel}>Image</label>
								<MediaPicker value={card.image ?? ""} onChange={(v) => patch(i, { image: v })} mode="url" kind="image" aspect="video" />
								{card.image && (
									<label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-foreground/80">
										<input type="checkbox" checked={!!card.imageAsBg} onChange={(e) => patch(i, { imageAsBg: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
										Use image as card background
									</label>
								)}
							</div>
							<div>
								<label className={fieldLabel}>Title</label>
								<input className={fieldInput} value={card.title ?? ""} onChange={(e) => patch(i, { title: e.target.value })} />
							</div>
							<div>
								<label className={fieldLabel}>Text</label>
								<textarea className={`${fieldInput} resize-y`} rows={2} value={card.body ?? ""} onChange={(e) => patch(i, { body: e.target.value })} />
							</div>
							<div>
								<label className={fieldLabel}>Buttons</label>
								<div className="space-y-1.5">
									{btns.map((b, bi) => (
										<div key={bi} className="flex gap-1.5">
											<input className={`${fieldInput} flex-1`} placeholder="Label" value={b.label ?? ""} onChange={(e) => setButtons(i, btns.map((x, n) => (n === bi ? { ...x, label: e.target.value } : x)))} />
											<input className={`${fieldInput} flex-1 font-mono text-xs`} placeholder="/link or https://…" value={b.href ?? ""} onChange={(e) => setButtons(i, btns.map((x, n) => (n === bi ? { ...x, href: e.target.value } : x)))} />
											<button type="button" className="rounded-lg border border-border px-2.5 text-sm text-muted-foreground hover:bg-muted" onClick={() => setButtons(i, btns.filter((_, n) => n !== bi))}>×</button>
										</div>
									))}
									<button type="button" className="text-sm font-semibold text-[var(--accent)] hover:underline" onClick={() => setButtons(i, [...btns, { label: "", href: "" }])}>+ Add button</button>
								</div>
							</div>
						</div>
					</div>
				);
			})}
			<button type="button" className={btn} onClick={() => onChange([...cards, {}])}>+ Add card</button>
		</div>
	);
}

/** One authored field (text/textarea/richtext/image/url/select/items repeater). */
function FieldInput({ field, value, onChange }: { field: SectionField; value: unknown; onChange: (v: unknown) => void }) {
	if (field.kind === "items") {
		const rows: Record<string, unknown>[] = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
		return <ItemsTable fields={field.itemFields ?? []} rows={rows} onChange={onChange} />;
	}
	if (field.kind === "cards") {
		const rows: Record<string, unknown>[] = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
		return (
			<div>
				<label className={fieldLabel}>{field.label}</label>
				<CardsEditor rows={rows} onChange={onChange} />
			</div>
		);
	}

	const str = typeof value === "string" ? value : "";
	return (
		<div>
			<label className={fieldLabel}>{field.label}</label>
			{field.kind === "textarea" ? (
				<textarea className={`${fieldInput} resize-y`} rows={3} value={str} onChange={(e) => onChange(e.target.value)} />
			) : field.kind === "richtext" ? (
				<RichTextEditor value={str} onChange={onChange} />
			) : field.kind === "image" ? (
				<MediaPicker value={str} onChange={onChange} mode="url" kind="image" aspect="video" />
			) : field.kind === "form" ? (
				<FormPicker value={str} onChange={onChange} />
			) : field.kind === "select" ? (
				<select className={fieldInput} value={str} onChange={(e) => onChange(e.target.value)}>
					<option value="">—</option>
					{(field.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
				</select>
			) : (
				<input className={fieldInput} value={str} placeholder={field.help} onChange={(e) => onChange(e.target.value)} />
			)}
		</div>
	);
}

/** Editor body for a single section: layout + source/query (dynamic) + fields. */
function SectionEditor({ node, onChange }: { node: SectionNode; onChange: (n: SectionNode) => void }) {
	const def = sectionDef(node.type);
	if (!def) return <p className="text-xs text-destructive">Unknown section type “{node.type}”.</p>;
	const props = node.props ?? {};
	const setProp = (key: string, v: unknown) => onChange({ ...node, props: { ...props, [key]: v } });

	// When a built form is picked, it supplies its own layout, title, intro and
	// submit button — so the section's layout selector + those fields are hidden.
	const formPicked = def.type === "form" && typeof props.formSlug === "string" && props.formSlug.length > 0;

	return (
		<div className="space-y-3 border-t border-border/60 p-3">
			{def.layouts.length > 1 && !formPicked && (
				<div>
					<label className={fieldLabel}>Layout</label>
					<select className={fieldInput} value={node.layout ?? def.layouts[0].value} onChange={(e) => onChange({ ...node, layout: e.target.value })}>
						{def.layouts.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
					</select>
				</div>
			)}

			{def.kind === "dynamic" && def.sources && (
				<div className="grid grid-cols-2 gap-2">
					<div className="col-span-2">
						<label className={fieldLabel}>Data source</label>
						<select
							className={fieldInput}
							value={`${node.query?.source ?? def.sources[0].value}::${node.query?.contentType ?? def.sources[0].contentType ?? ""}`}
							onChange={(e) => {
								const [source, contentType] = e.target.value.split("::");
								onChange({ ...node, query: { ...node.query, source: source as never, contentType: contentType || undefined } });
							}}
						>
							{def.sources.map((s) => (
								<option key={`${s.value}:${s.contentType ?? ""}`} value={`${s.value}::${s.contentType ?? ""}`}>{s.label}</option>
							))}
						</select>
					</div>
					<div>
						<label className={fieldLabel}>Limit</label>
						<input type="number" className={fieldInput} value={node.query?.limit ?? ""} onChange={(e) => onChange({ ...node, query: { ...node.query, source: node.query?.source ?? def.sources![0].value, limit: e.target.value ? Number(e.target.value) : undefined } })} />
					</div>
					<div>
						<label className={fieldLabel}>Category filter</label>
						<input className={fieldInput} value={node.query?.category ?? ""} onChange={(e) => onChange({ ...node, query: { ...node.query, source: node.query?.source ?? def.sources![0].value, category: e.target.value || undefined } })} />
					</div>
				</div>
			)}

			{def.fields.map((f) => {
				// A picked built form owns its title/intro/submit — hide those fields.
				if (formPicked && f.key !== "formSlug") return null;
				return <FieldInput key={f.key} field={f} value={props[f.key]} onChange={(v) => setProp(f.key, v)} />;
			})}
			{formPicked && (
				<p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
					Title, intro and submit button come from the selected form. Edit them in <span className="font-medium text-foreground/80">Forms</span>.
				</p>
			)}
		</div>
	);
}

/** The full page-section builder: ordered list + add/reorder/remove + per-section editor. */
export function SectionsBuilder({ value, onChange }: { value: SectionNode[]; onChange: (v: SectionNode[]) => void }) {
	const sections = Array.isArray(value) ? value : [];
	const [openId, setOpenId] = useState<string | null>(null);
	const [adding, setAdding] = useState(false);

	const add = (type: string) => {
		const def = sectionDef(type)!;
		const node: SectionNode = {
			id: uid(),
			type,
			layout: def.layouts[0]?.value,
			props: {},
			...(def.kind === "dynamic" && def.sources ? { query: { source: def.sources[0].value, contentType: def.sources[0].contentType } } : {}),
		};
		onChange([...sections, node]);
		setOpenId(node.id);
		setAdding(false);
	};
	const move = (i: number, dir: -1 | 1) => {
		const j = i + dir;
		if (j < 0 || j >= sections.length) return;
		const a = [...sections];
		[a[i], a[j]] = [a[j], a[i]];
		onChange(a);
	};
	const update = (id: string, n: SectionNode) => onChange(sections.map((s) => (s.id === id ? n : s)));
	const remove = (id: string) => onChange(sections.filter((s) => s.id !== id));

	return (
		<div className="space-y-3">
			{sections.length === 0 && <p className="text-sm text-muted-foreground">No sections yet. Add one to start building the page.</p>}

			{sections.map((s, i) => {
				const def = sectionDef(s.type);
				const open = openId === s.id;
				return (
					<div key={s.id} className="rounded-xl border border-border bg-card overflow-hidden">
						<div className="flex items-center gap-2 px-3 py-2">
							<button type="button" onClick={() => setOpenId(open ? null : s.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
								<svg className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
									<path d="M4.5 3L7.5 6L4.5 9" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
								<span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${def?.kind === "dynamic" ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "bg-muted text-muted-foreground"}`}>
									{def?.kind ?? "?"}
								</span>
								<span className="shrink-0 font-medium text-sm text-foreground">{def?.label ?? s.type}</span>
								{s.layout && def && def.layouts.length > 1 && <span className="min-w-0 truncate text-xs text-muted-foreground">· {def.layouts.find((l) => l.value === s.layout)?.label ?? s.layout}</span>}
							</button>
							<div className="flex shrink-0 gap-1">
								<button type="button" className={btn} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
								<button type="button" className={btn} disabled={i === sections.length - 1} onClick={() => move(i, 1)}>↓</button>
								<button
									type="button"
									className={`${btn} text-destructive`}
									onClick={() => {
										void confirm({ message: `Delete the “${def?.label ?? s.type}” section? This can't be undone.`, danger: true, confirmLabel: "Delete" }).then((ok) => ok && remove(s.id));
									}}
								>
									Delete
								</button>
							</div>
						</div>
						{open && <SectionEditor node={s} onChange={(n) => update(s.id, n)} />}
					</div>
				);
			})}

			{adding ? (
				<div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/5 p-3">
					<div className="mb-2 flex items-center justify-between">
						<span className="text-sm font-semibold text-primary">Add a section</span>
						<button type="button" className={btn} onClick={() => setAdding(false)}>Cancel</button>
					</div>
					{(["static", "dynamic"] as const).map((kind) => (
						<div key={kind} className="mb-2">
							<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{kind}</div>
							<div className="flex flex-wrap gap-1.5">
								{SECTION_DEFS.filter((d) => d.kind === kind).map((d) => (
									<button key={d.type} type="button" onClick={() => add(d.type)} title={d.description} className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:border-[var(--accent)]/50 hover:text-[var(--accent)] transition">
										{d.label}
									</button>
								))}
							</div>
						</div>
					))}
				</div>
			) : (
				<button type="button" onClick={() => setAdding(true)} className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition">
					+ Add section
				</button>
			)}
		</div>
	);
}
