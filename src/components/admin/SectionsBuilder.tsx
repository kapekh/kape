import { useLoaderData } from "@tanstack/react-router";
import { ChevronRight, Plus, Trash2, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	DragHandle,
	SortableStatus,
	useSortableArray,
} from "#/components/ui/sortable.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

import { DEFAULT_LANG } from "#/lib/i18n-config";
import { MIN_FULL_WIDTH } from "#/lib/media-size";
import { sectionsFor } from "#/lib/modules";
import { PEOPLE_TIERS } from "#/lib/people-tiers";
import {
	type QuerySource,
	type SectionField,
	type SectionNode,
	sectionDef,
	translatableFields,
} from "#/lib/sections";
import type { SiteSettings } from "#/lib/site-identity";
import { confirm } from "@/components/Dialogs";

import { dragGrip, dragItem, fieldInput, fieldLabel } from "./form-ui";
import { MediaPicker } from "./MediaPicker";
import type { LangOpt } from "./PostForm";
import { RichTextEditor } from "./RichTextEditor";

/** Dropdown of admin-built forms (by slug) — lets a Form section embed any form. */
function FormPicker({
	id,
	value,
	onChange,
}: {
	id?: string;
	value: string;
	onChange: (v: string) => void;
}) {
	const [forms, setForms] = useState<{ slug: string; title: string }[]>([]);
	useEffect(() => {
		trpcClient.adminForms.list
			.query()
			.then((fs) => setForms(fs.map((f) => ({ slug: f.slug, title: f.title }))))
			.catch(() => {});
	}, []);
	return (
		<select
			id={id}
			className={fieldInput}
			value={value}
			onChange={(e) => onChange(e.target.value)}
		>
			<option value="">— None (use the layout above) —</option>
			{forms.map((f) => (
				<option key={f.slug} value={f.slug}>
					{f.title} (/{f.slug})
				</option>
			))}
			{value && !forms.some((f) => f.slug === value) && (
				<option value={value}>{value} (missing)</option>
			)}
		</select>
	);
}

/** Dropdown of public people — lets a section borrow one's photo, name and job title. */
function PersonPicker({
	id,
	value,
	onChange,
}: {
	id?: string;
	value: string;
	onChange: (v: string) => void;
}) {
	const [people, setPeople] = useState<
		{ id: number; slug: string | null; name: string; position: string }[]
	>([]);
	useEffect(() => {
		trpcClient.adminPeople.list
			.query()
			.then((rows) =>
				setPeople(
					rows
						.filter((r) => r.isPublic)
						.map((r) => ({
							id: r.id,
							slug: r.slug,
							name: r.name,
							position: r.position,
						})),
				),
			)
			.catch(() => {});
	}, []);
	// a seeded page names its person by slug, so the picker answers to both
	const picked = people.find(
		(p) => String(p.id) === value || (value !== "" && p.slug === value),
	);
	return (
		<select
			id={id}
			className={fieldInput}
			value={picked ? String(picked.id) : value}
			onChange={(e) => onChange(e.target.value)}
		>
			<option value="">— None (use the image below) —</option>
			{people.map((p) => (
				<option key={p.id} value={String(p.id)}>
					{p.position ? `${p.name} — ${p.position}` : p.name}
				</option>
			))}
			{value && !picked && <option value={value}>{value} (missing)</option>}
		</select>
	);
}

const uid = () =>
	globalThis.crypto?.randomUUID?.() ??
	`s_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;

/** Stable identity for rows that carry no id of their own and are replaced on
 *  every keystroke, so a dragged row keeps the cell the cursor sits in. */
function useRowKeys(count: number) {
	const [keys, setKeys] = useState<string[]>(() =>
		Array.from({ length: count }, () => uid()),
	);
	if (keys.length === count) return [keys, setKeys] as const;
	const next = keys.slice(0, count);
	while (next.length < count) next.push(uid());
	setKeys(next);
	return [next, setKeys] as const;
}

/** A compact control inside a repeater row or a section header. */
const iconBtn =
	"grid size-8 shrink-0 place-items-center rounded-lg border border-admin-border text-admin-ink-muted transition-colors duration-150 ease-out hover:bg-admin-accent-soft hover:text-admin-ink disabled:opacity-40 disabled:hover:bg-transparent focus-visible:ring-2 focus-visible:ring-admin-focus/40 focus-visible:outline-none";
const textBtn =
	"inline-flex h-8 items-center gap-2 rounded-lg border border-admin-border px-3 text-sm text-admin-ink transition-colors duration-150 ease-out hover:bg-admin-accent-soft focus-visible:ring-2 focus-visible:ring-admin-focus/40 focus-visible:outline-none";

/** A borderless cell input that fills its grid cell (Excel-like). */
function CellInput({
	field,
	value,
	onChange,
}: {
	field: SectionField;
	value: unknown;
	onChange: (v: unknown) => void;
}) {
	const str = typeof value === "string" ? value : "";
	const base =
		"block w-full border-0 bg-transparent px-2 py-2 text-sm leading-snug text-admin-ink outline-none focus:bg-admin-accent-soft";
	if (field.kind === "textarea") {
		return (
			<textarea
				rows={1}
				className={`${base} min-w-[150px] resize-none`}
				placeholder={field.help}
				value={str}
				onChange={(e) => onChange(e.target.value)}
			/>
		);
	}
	if (field.kind === "select") {
		return (
			<select
				className={`${base} min-w-[96px]`}
				value={str}
				onChange={(e) => onChange(e.target.value)}
			>
				<option value="">—</option>
				{(field.options ?? []).map((o) => (
					<option key={o.value} value={o.value}>
						{o.label}
					</option>
				))}
			</select>
		);
	}
	if (field.kind === "image") {
		return (
			<div className="w-[104px] p-1">
				<MediaPicker
					value={str}
					onChange={onChange}
					mode="url"
					kind="image"
					aspect="video"
					minWidth={MIN_FULL_WIDTH}
				/>
			</div>
		);
	}
	return (
		<input
			className={`${base} min-w-[110px]`}
			placeholder={field.help}
			value={str}
			onChange={(e) => onChange(e.target.value)}
		/>
	);
}

/** A repeater field rendered as an Excel-like data grid: a row per item, a column per field. */
function ItemsTable({
	fields,
	rows,
	onChange,
}: {
	fields: SectionField[];
	rows: Record<string, unknown>[];
	onChange: (v: Record<string, unknown>[]) => void;
}) {
	const [keys, setKeys] = useRowKeys(rows.length);
	const update = (i: number, key: string, v: unknown) =>
		onChange(rows.map((r, n) => (n === i ? { ...r, [key]: v } : r)));
	const removeRow = (i: number) => {
		onChange(rows.filter((_, n) => n !== i));
		setKeys(keys.filter((_, n) => n !== i));
	};
	const nameOf = (row: Record<string, unknown>) => {
		const first = fields
			.map((f) => row[f.key])
			.find((v): v is string => typeof v === "string" && v.trim() !== "");
		return first?.trim() ?? "untitled row";
	};
	const sortable = useSortableArray({
		items: rows.map((row, i) => ({ key: keys[i], row })),
		id: (e) => e.key,
		describe: (e) => nameOf(e.row),
		onReorder: (next) => {
			onChange(next.map((e) => e.row));
			setKeys(next.map((e) => e.key));
		},
	});
	const th =
		"border border-admin-border bg-admin-bg px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-admin-ink-muted whitespace-nowrap";
	return (
		<div className="overflow-hidden rounded-xl border border-admin-border">
			<div className="overflow-x-auto">
				<table className="w-full border-collapse text-sm [&_td]:border [&_td]:border-admin-border">
					<thead>
						<tr>
							<th className={`${th} w-16`}>#</th>
							{fields.map((f) => (
								<th key={f.key} className={th}>
									{f.label}
								</th>
							))}
							<th className={`${th} w-px`} />
						</tr>
					</thead>
					<tbody>
						{rows.length === 0 && (
							<tr>
								<td
									className="px-2 py-4 text-center text-[13px] text-admin-ink-muted"
									colSpan={fields.length + 2}
								>
									No items yet.
								</td>
							</tr>
						)}
						{sortable.items.map((e, i) => {
							const grip = sortable.grip(e);
							return (
								<tr key={e.key} {...sortable.itemProps(e)} className={dragItem}>
									<td className="w-16 bg-admin-bg px-1 align-middle text-[13px] text-admin-ink-muted">
										<div className="flex items-center gap-1">
											{grip ? (
												<DragHandle {...grip} className={dragGrip} />
											) : (
												<span className="size-7" />
											)}
											{i + 1}
										</div>
									</td>
									{fields.map((f) => (
										<td key={f.key} className="p-0 align-top">
											<CellInput
												field={f}
												value={e.row[f.key]}
												onChange={(v) => update(i, f.key, v)}
											/>
										</td>
									))}
									<td className="bg-admin-bg px-1 align-middle whitespace-nowrap">
										<button
											type="button"
											className={`${iconBtn} text-admin-danger-ink`}
											aria-label={`Remove row ${i + 1}`}
											onClick={() => removeRow(i)}
										>
											<X aria-hidden="true" className="size-4" />
										</button>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			<div className="border-t border-admin-border bg-admin-panel p-2">
				<SortableStatus status={sortable.status} />
				<button
					type="button"
					className={textBtn}
					onClick={() => onChange([...rows, {}])}
				>
					<Plus aria-hidden="true" className="size-4" />
					Add row
				</button>
			</div>
		</div>
	);
}

type CardBtn = { label?: string; href?: string };
type Card = {
	image?: string;
	imageAsBg?: boolean;
	caption?: string;
	title?: string;
	body?: string;
	href?: string;
	buttons?: CardBtn[];
};

/** Normalise a card's footer buttons, folding a legacy single `href` into the list. */
function cardButtons(c: Card): CardBtn[] {
	if (Array.isArray(c.buttons)) return c.buttons;
	if (c.href) return [{ label: "Learn more", href: c.href }];
	return [];
}

/** A richer card repeater: per-card image (+ background toggle), title, body, and footer buttons. */
function CardsEditor({
	rows,
	onChange,
}: {
	rows: Record<string, unknown>[];
	onChange: (v: Record<string, unknown>[]) => void;
}) {
	const fieldId = useId();
	const cards = (Array.isArray(rows) ? rows : []) as Card[];
	const [keys, setKeys] = useRowKeys(cards.length);
	const patch = (i: number, p: Partial<Card>) =>
		onChange(cards.map((c, n) => (n === i ? { ...c, ...p } : c)));
	const removeCard = (i: number) => {
		onChange(cards.filter((_, n) => n !== i));
		setKeys(keys.filter((_, n) => n !== i));
	};
	const setButtons = (i: number, btns: CardBtn[]) =>
		patch(i, { buttons: btns, href: undefined });
	const sortable = useSortableArray({
		items: cards.map((card, i) => ({ key: keys[i], card })),
		id: (e) => e.key,
		describe: (e) => e.card.title?.trim() || "untitled card",
		onReorder: (next) => {
			onChange(next.map((e) => e.card));
			setKeys(next.map((e) => e.key));
		},
	});

	return (
		<div className="space-y-3">
			<SortableStatus status={sortable.status} />
			{cards.length === 0 && (
				<p className="rounded-xl border border-dashed border-admin-border px-3 py-4 text-center text-[13px] text-admin-ink-muted">
					No cards yet.
				</p>
			)}
			{sortable.items.map((e, i) => {
				const card = e.card;
				const btns = cardButtons(card);
				const grip = sortable.grip(e);
				return (
					<div
						key={e.key}
						{...sortable.itemProps(e)}
						className={`rounded-xl border border-admin-border bg-admin-panel p-3 ${dragItem}`}
					>
						<div className="mb-3 flex items-center justify-between gap-2">
							<span className="flex items-center gap-1 text-[13px] font-medium text-admin-ink-muted">
								{grip ? <DragHandle {...grip} className={dragGrip} /> : null}
								Card {i + 1}
							</span>
							<div className="flex gap-1">
								<button
									type="button"
									className={`${iconBtn} text-admin-danger-ink`}
									aria-label={`Remove card ${i + 1}`}
									onClick={() => removeCard(i)}
								>
									<X aria-hidden="true" className="size-4" />
								</button>
							</div>
						</div>

						<div className="space-y-3">
							<div>
								<label className={fieldLabel} htmlFor={`${fieldId}-${i}-image`}>
									Image
								</label>
								<MediaPicker
									id={`${fieldId}-${i}-image`}
									value={card.image ?? ""}
									onChange={(v) => patch(i, { image: v })}
									mode="url"
									kind="image"
									aspect="video"
									minWidth={MIN_FULL_WIDTH}
								/>
								{card.image && (
									<label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-admin-ink">
										<input
											type="checkbox"
											checked={!!card.imageAsBg}
											onChange={(e) =>
												patch(i, { imageAsBg: e.target.checked })
											}
											className="size-4 accent-admin-accent"
										/>
										Use image as card background
									</label>
								)}
								{card.image && (
									<label className="mt-2 block">
										<span className={fieldLabel}>Image caption</span>
										<input
											className={fieldInput}
											value={card.caption ?? ""}
											onChange={(e) => patch(i, { caption: e.target.value })}
										/>
									</label>
								)}
							</div>
							<label className="block">
								<span className={fieldLabel}>Title</span>
								<input
									className={fieldInput}
									value={card.title ?? ""}
									onChange={(e) => patch(i, { title: e.target.value })}
								/>
							</label>
							<label className="block">
								<span className={fieldLabel}>Text</span>
								<textarea
									className={`${fieldInput} resize-y`}
									rows={2}
									value={card.body ?? ""}
									onChange={(e) => patch(i, { body: e.target.value })}
								/>
							</label>
							<fieldset>
								<legend className={fieldLabel}>Buttons</legend>
								<div className="space-y-1.5">
									{btns.map((b, bi) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: the row is the authored payload and carries no id, and every keystroke replaces the object, so position is the only identity there is
										<div key={bi} className="flex gap-1.5">
											<input
												className={`${fieldInput} flex-1`}
												placeholder="Label"
												aria-label={`Button ${bi + 1} label`}
												value={b.label ?? ""}
												onChange={(e) =>
													setButtons(
														i,
														btns.map((x, n) =>
															n === bi ? { ...x, label: e.target.value } : x,
														),
													)
												}
											/>
											<input
												className={`${fieldInput} flex-1 font-mono text-xs`}
												placeholder="/link or https://…"
												aria-label={`Button ${bi + 1} link`}
												value={b.href ?? ""}
												onChange={(e) =>
													setButtons(
														i,
														btns.map((x, n) =>
															n === bi ? { ...x, href: e.target.value } : x,
														),
													)
												}
											/>
											<button
												type="button"
												className={iconBtn}
												aria-label={`Remove button ${bi + 1}`}
												onClick={() =>
													setButtons(
														i,
														btns.filter((_, n) => n !== bi),
													)
												}
											>
												<X aria-hidden="true" className="size-4" />
											</button>
										</div>
									))}
									<button
										type="button"
										className={textBtn}
										onClick={() =>
											setButtons(i, [...btns, { label: "", href: "" }])
										}
									>
										<Plus aria-hidden="true" className="size-4" />
										Add button
									</button>
								</div>
							</fieldset>
						</div>
					</div>
				);
			})}
			<button
				type="button"
				className={textBtn}
				onClick={() => onChange([...cards, {}])}
			>
				<Plus aria-hidden="true" className="size-4" />
				Add card
			</button>
		</div>
	);
}

/** One authored field (text/textarea/richtext/image/url/select/items repeater). */
function FieldInput({
	field,
	value,
	onChange,
}: {
	field: SectionField;
	value: unknown;
	onChange: (v: unknown) => void;
}) {
	const fieldId = useId();
	if (field.kind === "items") {
		const rows: Record<string, unknown>[] = Array.isArray(value)
			? (value as Record<string, unknown>[])
			: [];
		return (
			<ItemsTable
				fields={field.itemFields ?? []}
				rows={rows}
				onChange={onChange}
			/>
		);
	}
	if (field.kind === "cards") {
		const rows: Record<string, unknown>[] = Array.isArray(value)
			? (value as Record<string, unknown>[])
			: [];
		return (
			<fieldset>
				<legend className={fieldLabel}>{field.label}</legend>
				<CardsEditor rows={rows} onChange={onChange} />
			</fieldset>
		);
	}

	const str = typeof value === "string" ? value : "";
	// richtext renders a contenteditable, which htmlFor resolves to but cannot name
	const rich = field.kind === "richtext";
	return (
		<div>
			{rich ? (
				<span id={`${fieldId}-label`} className={fieldLabel}>
					{field.label}
				</span>
			) : (
				<label className={fieldLabel} htmlFor={fieldId}>
					{field.label}
				</label>
			)}
			{field.kind === "textarea" ? (
				<textarea
					id={fieldId}
					className={`${fieldInput} resize-y`}
					rows={3}
					value={str}
					onChange={(e) => onChange(e.target.value)}
				/>
			) : field.kind === "richtext" ? (
				<RichTextEditor
					ariaLabelledBy={`${fieldId}-label`}
					value={str}
					onChange={onChange}
				/>
			) : field.kind === "image" ? (
				<MediaPicker
					id={fieldId}
					value={str}
					onChange={onChange}
					mode="url"
					kind="image"
					aspect="video"
					minWidth={MIN_FULL_WIDTH}
				/>
			) : field.kind === "colour" ? (
				<div className="flex items-center gap-2">
					<input
						type="color"
						aria-label={`${field.label} colour wheel`}
						value={/^#[0-9a-f]{6}$/i.test(str) ? str : "#1f4e79"}
						onChange={(e) => onChange(e.target.value)}
						className="h-10 w-14 cursor-pointer rounded-lg border border-admin-border bg-admin-panel p-1"
					/>
					<input
						id={fieldId}
						className={fieldInput}
						value={str}
						placeholder="#1F4E79, or any CSS colour"
						onChange={(e) => onChange(e.target.value)}
					/>
					{str && (
						<button
							type="button"
							className={iconBtn}
							aria-label={`Clear ${field.label}`}
							onClick={() => onChange("")}
						>
							<X aria-hidden="true" className="size-4" />
						</button>
					)}
				</div>
			) : field.kind === "form" ? (
				<FormPicker id={fieldId} value={str} onChange={onChange} />
			) : field.kind === "person" ? (
				<PersonPicker id={fieldId} value={str} onChange={onChange} />
			) : field.kind === "select" ? (
				<select
					id={fieldId}
					className={fieldInput}
					value={str}
					onChange={(e) => onChange(e.target.value)}
				>
					<option value="">—</option>
					{(field.options ?? []).map((o) => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
			) : (
				<input
					id={fieldId}
					className={fieldInput}
					value={str}
					placeholder={field.help}
					onChange={(e) => onChange(e.target.value)}
				/>
			)}
		</div>
	);
}

// typed vocabulary beats a free-text guess: `board-of-directors` matched no tier and showed nobody
function categoryOptions(source: QuerySource, current: string) {
	if (source !== "people") return null;
	// a stored value outside the list is named, not silently shown as "Everyone"
	return current && !PEOPLE_TIERS.some((t) => t.value === current)
		? [{ value: current, label: `${current} — no such group` }, ...PEOPLE_TIERS]
		: PEOPLE_TIERS;
}

function CategoryFilter({
	options,
	value,
	onChange,
}: {
	options: { value: string; label: string }[] | null;
	value: string;
	onChange: (v: string) => void;
}) {
	const id = useId();
	return (
		<div>
			<label className={fieldLabel} htmlFor={id}>
				Category filter
			</label>
			{options ? (
				<select
					id={id}
					className={fieldInput}
					value={value}
					onChange={(e) => onChange(e.target.value)}
				>
					<option value="">Everyone</option>
					{options.map((o) => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
			) : (
				<input
					id={id}
					className={fieldInput}
					value={value}
					onChange={(e) => onChange(e.target.value)}
				/>
			)}
		</div>
	);
}

/** Editor body for a single section: layout + source/query (dynamic) + fields,
 *  plus a per-language tab for translating the section's text props. */
function SectionEditor({
	node,
	onChange,
	languages,
}: {
	node: SectionNode;
	onChange: (n: SectionNode) => void;
	languages: LangOpt[];
}) {
	const def = sectionDef(node.type);
	const [editLang, setEditLang] = useState("");
	if (!def)
		return (
			<p className="p-3 text-[13px] text-admin-danger-ink">
				Unknown section type “{node.type}”.
			</p>
		);
	const sources = def.sources ?? [];
	const props = node.props ?? {};
	const setProp = (key: string, v: unknown) =>
		onChange({ ...node, props: { ...props, [key]: v } });
	const categories = categoryOptions(
		node.query?.source ?? sources[0]?.value,
		node.query?.category ?? "",
	);
	const setCategory = (v: string) =>
		onChange({
			...node,
			query: {
				...node.query,
				source: node.query?.source ?? sources[0].value,
				category: v || undefined,
			},
		});

	// When a built form is picked, it supplies its own layout, title, intro and
	// submit button — so the section's layout selector + those fields are hidden.
	const formPicked =
		def.type === "form" &&
		typeof props.formSlug === "string" &&
		props.formSlug.length > 0;

	// Per-language text overlay: only text fields translate; images/links/data stay shared.
	const extraLangs = languages.filter((l) => l.code !== DEFAULT_LANG);
	const textFields = translatableFields(node.type, props);
	const i18n = (
		props.i18n && typeof props.i18n === "object" ? props.i18n : {}
	) as Record<string, Record<string, unknown>>;
	const setI18n = (code: string, key: string, v: unknown) => {
		const map = { ...(i18n[code] ?? {}) };
		if (v === "" || v == null) delete map[key];
		else map[key] = v;
		const next: Record<string, Record<string, unknown>> = { ...i18n };
		if (Object.keys(map).length) next[code] = map;
		else delete next[code];
		onChange({
			...node,
			props: { ...props, i18n: Object.keys(next).length ? next : undefined },
		});
	};
	const tab = (on: boolean) =>
		`h-8 rounded-full px-3 text-[13px] font-medium transition-colors duration-150 ease-out ${on ? "bg-admin-accent text-accent-foreground" : "border border-admin-border text-admin-ink-muted hover:bg-admin-accent-soft"}`;

	if (editLang) {
		return (
			<div className="space-y-4 border-t border-admin-border p-3">
				{extraLangs.length > 0 && textFields.length > 0 && (
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							className={tab(false)}
							onClick={() => setEditLang("")}
						>
							Default
						</button>
						{extraLangs.map((l) => (
							<button
								key={l.code}
								type="button"
								className={tab(editLang === l.code)}
								onClick={() => setEditLang(l.code)}
							>
								{l.nativeName || l.name}
							</button>
						))}
					</div>
				)}
				<p className="text-[13px] text-admin-ink-muted">
					Translations — leave a field blank to fall back to the default text.
					Images, links and the data source are shared across languages.
				</p>
				{textFields.map((f) => (
					<FieldInput
						key={f.key}
						field={f}
						value={i18n[editLang]?.[f.key] ?? ""}
						onChange={(v) => setI18n(editLang, f.key, v)}
					/>
				))}
			</div>
		);
	}

	return (
		<div className="space-y-3 border-t border-border/60 p-3">
			{extraLangs.length > 0 && textFields.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					<button
						type="button"
						className={tab(true)}
						onClick={() => setEditLang("")}
					>
						Default
					</button>
					{extraLangs.map((l) => (
						<button
							key={l.code}
							type="button"
							className={tab(false)}
							onClick={() => setEditLang(l.code)}
						>
							{l.nativeName || l.name}
						</button>
					))}
				</div>
			)}
			{def.layouts.length > 1 && !formPicked && (
				<label className="block">
					<span className={fieldLabel}>Layout</span>
					<select
						className={fieldInput}
						value={node.layout ?? def.layouts[0].value}
						onChange={(e) => onChange({ ...node, layout: e.target.value })}
					>
						{def.layouts.map((l) => (
							<option key={l.value} value={l.value}>
								{l.label}
							</option>
						))}
					</select>
				</label>
			)}

			{def.kind === "dynamic" && sources.length > 0 && (
				<div className="grid grid-cols-2 gap-3">
					<div className="col-span-2">
						<label className="block">
							<span className={fieldLabel}>Data source</span>
							<select
								className={fieldInput}
								value={`${node.query?.source ?? sources[0].value}::${node.query?.contentType ?? sources[0].contentType ?? ""}`}
								onChange={(e) => {
									const [source, contentType] = e.target.value.split("::");
									onChange({
										...node,
										query: {
											...node.query,
											source: source as never,
											contentType: contentType || undefined,
										},
									});
								}}
							>
								{sources.map((s) => (
									<option
										key={`${s.value}:${s.contentType ?? ""}`}
										value={`${s.value}::${s.contentType ?? ""}`}
									>
										{s.label}
									</option>
								))}
							</select>
						</label>
					</div>
					<label className="block">
						<span className={fieldLabel}>Limit</span>
						<input
							type="number"
							className={fieldInput}
							value={node.query?.limit ?? ""}
							onChange={(e) =>
								onChange({
									...node,
									query: {
										...node.query,
										source: node.query?.source ?? sources[0].value,
										limit: e.target.value ? Number(e.target.value) : undefined,
									},
								})
							}
						/>
					</label>
					<CategoryFilter
						options={categories}
						value={node.query?.category ?? ""}
						onChange={setCategory}
					/>
				</div>
			)}

			{def.fields.map((f) => {
				// A picked built form owns its title/intro/submit — hide those fields.
				if (formPicked && f.key !== "formSlug") return null;
				return (
					<FieldInput
						key={f.key}
						field={f}
						value={props[f.key]}
						onChange={(v) => setProp(f.key, v)}
					/>
				);
			})}
			{formPicked && (
				<p className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-[13px] text-admin-ink-muted">
					Title, intro and submit button come from the selected form. Edit them
					in <span className="font-medium text-admin-ink">Forms</span>.
				</p>
			)}
		</div>
	);
}

/** The full page-section builder: ordered list + add/reorder/remove + per-section editor. */
export function SectionsBuilder({
	value,
	onChange,
	languages,
}: {
	value: SectionNode[];
	onChange: (v: SectionNode[]) => void;
	languages: LangOpt[];
}) {
	const sections = Array.isArray(value) ? value : [];
	const [openId, setOpenId] = useState<string | null>(null);
	const [adding, setAdding] = useState(false);
	// What this install can place. A section bound to a module nobody turned on is
	// not offered; one already on a page keeps its editor and keeps rendering.
	const { settings } = useLoaderData({ from: "__root__" }) as {
		settings?: SiteSettings;
	};
	const catalogue = useMemo(() => sectionsFor(settings ?? {}), [settings]);

	const add = (type: string) => {
		const def = catalogue.find((d) => d.type === type);
		if (!def) return;
		const node: SectionNode = {
			id: uid(),
			type,
			layout: def.layouts[0]?.value,
			props: {},
			...(def.kind === "dynamic" && def.sources
				? {
						query: {
							source: def.sources[0].value,
							contentType: def.sources[0].contentType,
						},
					}
				: {}),
		};
		onChange([...sections, node]);
		setOpenId(node.id);
		setAdding(false);
	};
	const update = (id: string, n: SectionNode) =>
		onChange(sections.map((s) => (s.id === id ? n : s)));
	const remove = (id: string) => onChange(sections.filter((s) => s.id !== id));
	const sortable = useSortableArray({
		items: sections,
		id: (s) => s.id,
		describe: (s) => sectionDef(s.type)?.label ?? s.type,
		onReorder: onChange,
	});

	return (
		<div className="space-y-3">
			<SortableStatus status={sortable.status} />
			{sections.length === 0 && (
				<p className="rounded-xl border border-dashed border-admin-border px-3 py-6 text-center text-[13px] text-admin-ink-muted">
					No sections yet. Add one and it appears in the preview.
				</p>
			)}

			{sortable.items.map((s) => {
				const def = sectionDef(s.type);
				const open = openId === s.id;
				const grip = sortable.grip(s);
				return (
					<div
						key={s.id}
						{...sortable.itemProps(s)}
						className={`overflow-hidden rounded-xl border bg-admin-panel transition-colors duration-150 ease-out ${dragItem} ${open ? "border-admin-accent" : "border-admin-border"}`}
					>
						<div className="flex items-center gap-2 p-2">
							{grip ? <DragHandle {...grip} className={dragGrip} /> : null}
							<button
								type="button"
								onClick={() => setOpenId(open ? null : s.id)}
								aria-expanded={open}
								className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left focus-visible:ring-2 focus-visible:ring-admin-focus/40 focus-visible:outline-none"
							>
								<ChevronRight
									aria-hidden="true"
									className={`size-4 shrink-0 text-admin-ink-muted transition-transform duration-200 ease-out ${open ? "rotate-90" : ""}`}
								/>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-medium text-admin-ink">
										{def?.label ?? s.type}
									</span>
									<span className="block truncate text-[13px] text-admin-ink-muted">
										{def?.kind === "dynamic" ? "Dynamic" : "Static"}
										{s.layout && def && def.layouts.length > 1
											? ` · ${def.layouts.find((l) => l.value === s.layout)?.label ?? s.layout}`
											: ""}
									</span>
								</span>
							</button>
							<div className="flex shrink-0 gap-1">
								<button
									type="button"
									className={`${iconBtn} text-admin-danger-ink`}
									aria-label={`Delete ${def?.label ?? s.type}`}
									onClick={() => {
										void confirm({
											message: `Delete the “${def?.label ?? s.type}” section? This can't be undone.`,
											danger: true,
											confirmLabel: "Delete",
										}).then((ok) => ok && remove(s.id));
									}}
								>
									<Trash2 aria-hidden="true" className="size-4" />
								</button>
							</div>
						</div>
						{open && (
							<SectionEditor
								node={s}
								onChange={(n) => update(s.id, n)}
								languages={languages}
							/>
						)}
					</div>
				);
			})}

			{adding ? (
				<div className="rounded-xl border border-admin-accent bg-admin-accent-soft/40 p-3">
					<div className="mb-3 flex items-center justify-between gap-2">
						<span className="text-sm font-semibold text-admin-ink">
							Add a section
						</span>
						<button
							type="button"
							className={textBtn}
							onClick={() => setAdding(false)}
						>
							Cancel
						</button>
					</div>
					{(["static", "dynamic"] as const).map((kind) => (
						<div key={kind} className="mb-3 last:mb-0">
							<div className="mb-2 text-[13px] text-admin-ink-muted">
								{kind === "static"
									? "Static — words you write"
									: "Dynamic — pulled from posts, projects or people"}
							</div>
							<div className="flex flex-wrap gap-2">
								{catalogue
									.filter((d) => d.kind === kind)
									.map((d) => (
										<button
											key={d.type}
											type="button"
											onClick={() => add(d.type)}
											title={d.description}
											className="h-8 rounded-lg border border-admin-border bg-admin-panel px-3 text-sm text-admin-ink transition-colors duration-150 ease-out hover:border-admin-accent hover:text-admin-accent-ink focus-visible:ring-2 focus-visible:ring-admin-focus/40 focus-visible:outline-none"
										>
											{d.label}
										</button>
									))}
							</div>
						</div>
					))}
				</div>
			) : (
				<Button onClick={() => setAdding(true)}>
					<Plus aria-hidden="true" className="size-4" />
					Add section
				</Button>
			)}
		</div>
	);
}
