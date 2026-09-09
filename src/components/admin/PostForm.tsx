import { Link } from "@tanstack/react-router";
import { Image as ImageIcon, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
import {
	DragHandle,
	SortableStatus,
	useSortableArray,
} from "#/components/ui/sortable.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { MIN_FULL_WIDTH } from "#/lib/media-size";
import {
	cancelButtonClass,
	dragItem,
	EditorGrid,
	EditorHeader,
	Field,
	FormSection,
	fieldLabel,
} from "./form-ui";
import { type LangOpt as BaseLangOpt, LangTabs, useLangText } from "./LangTabs";
import {
	isImageMedia,
	type MediaItem,
	MediaLibraryDialog,
} from "./MediaLibraryDialog";
import { MediaPicker } from "./MediaPicker";
import { RichTextEditor } from "./RichTextEditor";
import { SearchableSelect } from "./SearchableSelect";
import { useDirtyGuard } from "./useDirty";
import { useFieldErrors } from "./useFieldErrors";

export type LangOpt = BaseLangOpt & { nativeName: string };
export type TypeOpt = { key: string; name: string };
export type PostStatus = "draft" | "published" | "archived";
export type PostFormValue = {
	contentType: string;
	slug: string;
	status: PostStatus;
	author: string;
	publishedAt: string;
	coverMediaId: number | null;
	media: number[];
	meta: Record<string, unknown> | null;
	translations: {
		lang: string;
		title: string;
		excerpt: string;
		body: string;
	}[];
};

type Initial = {
	contentType: string;
	slug: string;
	status: string;
	author: string | null;
	publishedAt: string | null;
	coverMediaId?: number | null;
	media?: number[];
	meta?: Record<string, unknown> | null;
	translations: Record<string, Record<string, string>>;
} | null;

const label = fieldLabel;

const POST_FIELDS = ["title", "excerpt", "body"] as const;

type MetaField = {
	key: string;
	label: string;
	kind?: "text" | "date" | "url" | "select" | "relation" | "project" | "media";
	options?: string[];
	taxonomy?: string;
	placeholder?: string;
};

/** Friendly, type-specific detail fields (stored in `meta`). */
const META_FIELDS: Record<string, MetaField[]> = {
	job: [
		{
			key: "location",
			label: "Location",
			kind: "relation",
			taxonomy: "location",
		},
		{ key: "deadline", label: "Application deadline", kind: "date" },
	],
	video: [
		{
			key: "youtube_url",
			label: "YouTube URL",
			kind: "url",
			placeholder: "https://youtube.com/…",
		},
	],
	event: [
		{ key: "program", label: "Program", kind: "project" },
		{ key: "start", label: "Start date", kind: "date" },
		{ key: "end", label: "End date", kind: "date" },
	],
	publication: [
		{
			key: "category",
			label: "Category",
			kind: "relation",
			taxonomy: "publication_category",
		},
		{ key: "fileUrl", label: "File (PDF)", kind: "media" },
		{ key: "year", label: "Year", placeholder: "2025" },
	],
	document: [
		{
			key: "category",
			label: "Category",
			kind: "relation",
			taxonomy: "doc_category",
		},
		{ key: "fileUrl", label: "File (PDF)", kind: "media" },
	],
	announcement: [
		{
			key: "deadline",
			label: "Deadline (optional — hides the card after this date)",
			kind: "date",
		},
	],
};

export function PostForm({
	initial,
	languages,
	contentTypes,
	defaultType,
	onSubmit,
	saving,
	title,
	savedAt,
}: {
	initial: Initial;
	languages: LangOpt[];
	contentTypes: TypeOpt[];
	defaultType?: string;
	onSubmit: (value: PostFormValue) => void;
	saving?: boolean;
	title: string;
	savedAt?: string | null;
}) {
	const uid = useId();
	const [contentType, setContentType] = useState(
		initial?.contentType ?? defaultType ?? contentTypes[0]?.key ?? "news",
	);
	const [slug, setSlug] = useState(initial?.slug ?? "");
	const [status, setStatus] = useState<PostStatus>(
		(initial?.status as PostStatus) ?? "draft",
	);
	const [author, setAuthor] = useState(initial?.author ?? "");
	const [publishedAt, setPublishedAt] = useState(initial?.publishedAt ?? "");
	const [coverMediaId, setCoverMediaId] = useState(
		initial?.coverMediaId != null ? String(initial.coverMediaId) : "",
	);
	const [gallery, setGallery] = useState<number[]>(initial?.media ?? []);
	const [metaFields, setMetaFields] = useState<Record<string, string>>(() => {
		const m = initial?.meta ?? {};
		const o: Record<string, string> = {};
		for (const [k, v] of Object.entries(m)) o[k] = v == null ? "" : String(v);
		return o;
	});
	const {
		text: trans,
		setText: setField,
		toTranslations,
	} = useLangText(languages, POST_FIELDS, initial?.translations);
	const [termsByTax, setTermsByTax] = useState<
		Record<string, { key: string; label: string }[]>
	>({});
	const [projectOpts, setProjectOpts] = useState<
		{ value: string; label: string }[]
	>([]);
	useEffect(() => {
		trpcClient.terms.all
			.query()
			.then((all) => {
				const g: Record<string, { key: string; label: string }[]> = {};
				for (const t of all) {
					g[t.taxonomy] ??= [];
					g[t.taxonomy].push({ key: t.key, label: t.label });
				}
				setTermsByTax(g);
			})
			.catch(() => {});
		trpcClient.projects.options
			.query({ lang: "en" })
			.then((ps) =>
				setProjectOpts(
					ps.map((p) => ({ value: p.code, label: `${p.code} — ${p.name}` })),
				),
			)
			.catch(() => {});
	}, []);

	function submit(e: React.FormEvent) {
		e.preventDefault();
		const meta: Record<string, unknown> = { ...(initial?.meta ?? {}) };
		for (const f of META_FIELDS[contentType] ?? []) {
			const v = (metaFields[f.key] ?? "").trim();
			if (v === "") delete meta[f.key];
			else meta[f.key] = v;
		}
		onSubmit({
			contentType,
			slug,
			status,
			author,
			publishedAt,
			coverMediaId: coverMediaId ? Number(coverMediaId) : null,
			media: gallery,
			meta: Object.keys(meta).length ? meta : null,
			translations: toTranslations(),
		});
	}

	const metaFieldDefs = META_FIELDS[contentType] ?? [];
	const { errors, invalid } = useFieldErrors();

	const dirty = useDirtyGuard(
		JSON.stringify({
			contentType,
			slug,
			status,
			author,
			publishedAt,
			coverMediaId,
			gallery,
			metaFields,
			trans,
		}),
		savedAt,
	);

	return (
		<form onSubmit={submit}>
			<EditorHeader
				title={title}
				saving={saving}
				savedAt={savedAt}
				saveLabel="Save post"
				dirty={dirty}
			>
				<Link to="/admin/posts" className={cancelButtonClass}>
					Cancel
				</Link>
			</EditorHeader>
			<EditorGrid
				main={[
					<FormSection
						key="content"
						title="Content"
						description="Title, excerpt and body. Switch languages with the tabs — your text is kept as you switch."
					>
						<LangTabs languages={languages}>
							{(l) => (
								<div className="space-y-6">
									<Field label="Title">
										{(p) => (
											<Input
												{...p}
												className={l.code === "km" ? "font-khmer" : undefined}
												value={trans[l.code]?.title ?? ""}
												onChange={(e) =>
													setField(l.code, "title", e.target.value)
												}
											/>
										)}
									</Field>
									<Field
										label="Excerpt"
										hint="A sentence or two. Used on cards and in search results."
									>
										{(p) => (
											<Textarea
												{...p}
												className={l.code === "km" ? "font-khmer" : undefined}
												rows={2}
												value={trans[l.code]?.excerpt ?? ""}
												onChange={(e) =>
													setField(l.code, "excerpt", e.target.value)
												}
											/>
										)}
									</Field>
									<div>
										<span id={`${uid}-body-${l.code}-label`} className={label}>
											Body
										</span>
										<RichTextEditor
											ariaLabelledBy={`${uid}-body-${l.code}-label`}
											value={trans[l.code]?.body ?? ""}
											onChange={(v) => setField(l.code, "body", v)}
										/>
									</div>
								</div>
							)}
						</LangTabs>
					</FormSection>,
					<FormSection
						key="gallery"
						split
						title="Gallery"
						description="Extra images for this post. Galleries (type = Gallery) render these as a grid; other posts show them below the article."
					>
						<GalleryPicker value={gallery} onChange={setGallery} />
					</FormSection>,
				]}
				aside={
					<>
						<FormSection
							title="Cover image"
							description="Shown as the hero at the top of the post."
						>
							<MediaPicker
								mode="id"
								kind="image"
								value={coverMediaId}
								label="Choose image"
								minWidth={MIN_FULL_WIDTH}
								onChange={setCoverMediaId}
							/>
						</FormSection>

						<FormSection
							title="Settings"
							description="Type, status and publishing."
						>
							<div className="space-y-6">
								<div>
									<label className={label} htmlFor={`${uid}-content-type`}>
										Content type
									</label>
									<SearchableSelect
										id={`${uid}-content-type`}
										value={contentType}
										onChange={setContentType}
										placeholder="Select type"
										options={contentTypes.map((t) => ({
											value: t.key,
											label: t.name,
										}))}
									/>
								</div>
								<Field label="Status">
									{(p) => (
										<Select
											value={status}
											onValueChange={(v) => setStatus(v as PostStatus)}
										>
											<SelectTrigger
												id={p.id}
												aria-label="Status"
												className="w-full"
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="draft">Draft</SelectItem>
												<SelectItem value="published">Published</SelectItem>
												<SelectItem value="archived">Archived</SelectItem>
											</SelectContent>
										</Select>
									)}
								</Field>
								<Field
									label="Slug"
									required
									hint="The last part of the post's web address."
									error={errors.slug}
								>
									{(p) => (
										<Input
											{...p}
											{...invalid("slug")}
											value={slug}
											onChange={(e) => setSlug(e.target.value)}
											placeholder="my-post-slug"
										/>
									)}
								</Field>
								<Field label="Published at">
									{(p) => (
										<Input
											{...p}
											type="date"
											value={publishedAt}
											onChange={(e) => setPublishedAt(e.target.value)}
										/>
									)}
								</Field>
								<Field label="Author">
									{(p) => (
										<Input
											{...p}
											value={author}
											onChange={(e) => setAuthor(e.target.value)}
											placeholder="Author name"
										/>
									)}
								</Field>
							</div>
						</FormSection>

						{metaFieldDefs.length > 0 && (
							<FormSection
								title="Details"
								description="Fields specific to this content type."
							>
								<div className="space-y-6">
									{metaFieldDefs.map((f) => (
										<div key={f.key}>
											<label className={label} htmlFor={`${uid}-meta-${f.key}`}>
												{f.label}
											</label>
											{f.kind === "media" ? (
												<MediaPicker
													id={`${uid}-meta-${f.key}`}
													mode="url"
													kind="all"
													value={metaFields[f.key] ?? ""}
													accept="application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
													label="Choose file"
													onChange={(v) =>
														setMetaFields((p) => ({ ...p, [f.key]: v }))
													}
												/>
											) : f.kind === "select" ||
												f.kind === "relation" ||
												f.kind === "project" ? (
												(() => {
													const cur = metaFields[f.key] ?? "";
													const opts =
														f.kind === "relation"
															? (termsByTax[f.taxonomy ?? ""] ?? []).map(
																	(tm) => ({ value: tm.key, label: tm.label }),
																)
															: f.kind === "project"
																? projectOpts
																: (f.options ?? []).map((o) => ({
																		value: o,
																		label: o,
																	}));
													if (cur && !opts.some((o) => o.value === cur))
														opts.unshift({ value: cur, label: cur });
													return (
														<SearchableSelect
															id={`${uid}-meta-${f.key}`}
															value={cur}
															onChange={(v) =>
																setMetaFields((p) => ({ ...p, [f.key]: v }))
															}
															options={opts}
															emptyOption="—"
															placeholder="Select…"
														/>
													);
												})()
											) : (
												<Input
													id={`${uid}-meta-${f.key}`}
													type={
														f.kind === "date"
															? "date"
															: f.kind === "url"
																? "url"
																: "text"
													}
													value={metaFields[f.key] ?? ""}
													placeholder={f.placeholder}
													onChange={(e) =>
														setMetaFields((p) => ({
															...p,
															[f.key]: e.target.value,
														}))
													}
												/>
											)}
										</div>
									))}
								</div>
							</FormSection>
						)}
					</>
				}
			/>
		</form>
	);
}

const thumbButton =
	"grid size-6 place-items-center rounded bg-admin-panel/90 text-admin-ink transition-colors duration-150 ease-out hover:bg-admin-panel disabled:opacity-30";

function GalleryPicker({
	value,
	onChange,
}: {
	value: number[];
	onChange: (ids: number[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const [urls, setUrls] = useState<Record<number, string>>({});

	// Resolve URLs for any ids we don't have a thumbnail for yet (e.g. on edit-load).
	useEffect(() => {
		const missing = value.filter((id) => !(id in urls));
		if (!missing.length) return;
		let alive = true;
		trpcClient.adminMedia.byIds
			.query({ ids: missing })
			.then((rows) => {
				if (!alive) return;
				const map: Record<number, string> = {};
				for (const x of rows) if (x.url) map[x.id] = x.url;
				setUrls((p) => ({ ...map, ...p }));
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [value, urls]);

	function add(m: MediaItem) {
		if (!isImageMedia(m) || value.includes(m.id)) return;
		if (m.url) setUrls((p) => ({ ...p, [m.id]: m.url as string }));
		onChange([...value, m.id]); // keep the dialog open for multi-add
	}
	function remove(id: number) {
		onChange(value.filter((x) => x !== id));
	}
	const sortable = useSortableArray({
		items: value,
		id: (id) => id,
		// the grip's label already carries the position; a number here would rename
		// the image every time it moves
		describe: () => "image",
		axis: "grid",
		onReorder: onChange,
	});

	return (
		<div className="space-y-4">
			<SortableStatus status={sortable.status} />
			{value.length > 0 && (
				<ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
					{sortable.items.map((id, i) => {
						const grip = sortable.grip(id);
						return (
							<li
								key={id}
								{...sortable.itemProps(id)}
								className={`group relative aspect-square overflow-hidden rounded-lg border border-admin-border bg-admin-panel-raised ${dragItem} data-[dragging]:ring-2 data-[dragging]:ring-admin-accent`}
							>
								{urls[id] ? (
									<img
										src={urls[id]}
										alt=""
										className="h-full w-full object-cover"
									/>
								) : (
									<span className="grid h-full w-full place-items-center text-admin-ink-subtle">
										<ImageIcon className="size-6" aria-hidden="true" />
									</span>
								)}
								<span className="absolute left-1.5 top-1.5 rounded-full bg-admin-ink/75 px-2 py-0.5 text-xs font-medium text-admin-panel">
									{i + 1}
								</span>
								<div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-admin-ink/70 px-1.5 py-1.5 opacity-0 transition-opacity duration-150 ease-out focus-within:opacity-100 group-hover:opacity-100">
									{grip ? (
										<DragHandle {...grip} className={thumbButton} />
									) : (
										<span />
									)}
									<button
										type="button"
										onClick={() => remove(id)}
										className={`${thumbButton} text-admin-danger-ink`}
										aria-label="Remove"
									>
										<X className="size-3.5" aria-hidden="true" />
									</button>
								</div>
							</li>
						);
					})}
				</ul>
			)}
			<Button type="button" variant="secondary" onClick={() => setOpen(true)}>
				+ Add images{value.length > 0 ? ` (${value.length})` : ""}
			</Button>
			<MediaLibraryDialog
				open={open}
				onClose={() => setOpen(false)}
				onSelect={add}
				kind="image"
				selectedId={null}
			/>
		</div>
	);
}
