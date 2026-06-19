import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { EditorGrid, EditorHeader, FormSection, cancelButtonClass, fieldInput, fieldLabel } from "./form-ui";
import { MediaPicker } from "./MediaPicker";
import { RichTextEditor } from "./RichTextEditor";
import { SearchableSelect } from "./SearchableSelect";

export type LangOpt = { code: string; name: string; nativeName: string };
export type TypeOpt = { key: string; name: string };
export type PostStatus = "draft" | "published" | "archived";
export type PostFormValue = {
	contentType: string;
	slug: string;
	status: PostStatus;
	author: string;
	publishedAt: string;
	meta: Record<string, unknown> | null;
	translations: { lang: string; title: string; excerpt: string; body: string }[];
};

type Initial = {
	contentType: string;
	slug: string;
	status: string;
	author: string | null;
	publishedAt: string | null;
	meta?: Record<string, unknown> | null;
	translations: Record<string, Record<string, string>>;
} | null;

const input = fieldInput;
const label = fieldLabel;

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
		{ key: "location", label: "Location", kind: "relation", taxonomy: "location" },
		{ key: "deadline", label: "Application deadline", kind: "date" },
	],
	video: [{ key: "youtube_url", label: "YouTube URL", kind: "url", placeholder: "https://youtube.com/…" }],
	event: [
		{ key: "program", label: "Program", kind: "project" },
		{ key: "start", label: "Start date", kind: "date" },
		{ key: "end", label: "End date", kind: "date" },
	],
	person: [
		{ key: "section", label: "Section", kind: "select", options: ["board", "smt", "pm", "team"] },
		{ key: "position", label: "Position", placeholder: "Program Manager" },
	],
	publication: [
		{ key: "category", label: "Category", kind: "relation", taxonomy: "publication_category" },
		{ key: "fileUrl", label: "File (PDF)", kind: "media" },
		{ key: "year", label: "Year", placeholder: "2025" },
	],
	document: [
		{ key: "category", label: "Category", kind: "relation", taxonomy: "doc_category" },
		{ key: "fileUrl", label: "File (PDF)", kind: "media" },
	],
	announcement: [
		{ key: "deadline", label: "Deadline (optional — hides the card after this date)", kind: "date" },
		{ key: "link", label: "Link URL (optional)", kind: "url", placeholder: "/opportunities/careers" },
	],
};

export function PostForm({
	initial,
	languages,
	contentTypes,
	onSubmit,
	saving,
	title,
	savedAt,
}: {
	initial: Initial;
	languages: LangOpt[];
	contentTypes: TypeOpt[];
	onSubmit: (value: PostFormValue) => void;
	saving?: boolean;
	title: string;
	savedAt?: string | null;
}) {
	const [contentType, setContentType] = useState(initial?.contentType ?? contentTypes[0]?.key ?? "news");
	const [slug, setSlug] = useState(initial?.slug ?? "");
	const [status, setStatus] = useState<PostStatus>((initial?.status as PostStatus) ?? "draft");
	const [author, setAuthor] = useState(initial?.author ?? "");
	const [publishedAt, setPublishedAt] = useState(initial?.publishedAt ?? "");
	const [metaFields, setMetaFields] = useState<Record<string, string>>(() => {
		const m = initial?.meta ?? {};
		const o: Record<string, string> = {};
		for (const [k, v] of Object.entries(m)) o[k] = v == null ? "" : String(v);
		return o;
	});
	const [trans, setTrans] = useState<Record<string, { title: string; excerpt: string; body: string }>>(() => {
		const t: Record<string, { title: string; excerpt: string; body: string }> = {};
		for (const l of languages) {
			const e = initial?.translations[l.code] ?? {};
			t[l.code] = { title: e.title ?? "", excerpt: e.excerpt ?? "", body: e.body ?? "" };
		}
		return t;
	});
	const [termsByTax, setTermsByTax] = useState<Record<string, { key: string; label: string }[]>>({});
	const [projectOpts, setProjectOpts] = useState<{ value: string; label: string }[]>([]);
	useEffect(() => {
		trpcClient.terms.all
			.query()
			.then((all) => {
				const g: Record<string, { key: string; label: string }[]> = {};
				for (const t of all) (g[t.taxonomy] ??= []).push({ key: t.key, label: t.label });
				setTermsByTax(g);
			})
			.catch(() => {});
		trpcClient.projects.options
			.query({ lang: "en" })
			.then((ps) => setProjectOpts(ps.map((p) => ({ value: p.code, label: `${p.code} — ${p.name}` }))))
			.catch(() => {});
	}, []);

	function setField(lang: string, field: "title" | "excerpt" | "body", value: string) {
		setTrans((prev) => ({ ...prev, [lang]: { ...prev[lang], [field]: value } }));
	}

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
			meta: Object.keys(meta).length ? meta : null,
			translations: languages.map((l) => ({ lang: l.code, ...trans[l.code] })),
		});
	}

	const metaFieldDefs = META_FIELDS[contentType] ?? [];

	return (
		<form onSubmit={submit}>
			<EditorHeader title={title} saving={saving} savedAt={savedAt} saveLabel="Save post">
				<Link to="/admin/posts" className={cancelButtonClass}>Cancel</Link>
			</EditorHeader>
			<EditorGrid
				main={languages.map((l) => (
					<FormSection key={l.code} title={`Content — ${l.name}`} description={`Title, excerpt and body in ${l.name} (${l.code}).`}>
						<div className="space-y-4">
							<div>
								<label className={label}>Title</label>
								<input className={`${input} ${l.code === "km" ? "font-khmer" : ""}`} value={trans[l.code]?.title ?? ""} onChange={(e) => setField(l.code, "title", e.target.value)} />
							</div>
							<div>
								<label className={label}>Excerpt</label>
								<textarea className={`${input} ${l.code === "km" ? "font-khmer" : ""}`} rows={2} value={trans[l.code]?.excerpt ?? ""} onChange={(e) => setField(l.code, "excerpt", e.target.value)} />
							</div>
							<div>
								<label className={label}>Body</label>
								<RichTextEditor value={trans[l.code]?.body ?? ""} onChange={(v) => setField(l.code, "body", v)} />
							</div>
						</div>
					</FormSection>
				))}
				aside={
					<>
						<FormSection title="Settings" description="Type, status and publishing.">
							<div className="space-y-4">
								<div>
									<label className={label}>Content type</label>
									<SearchableSelect value={contentType} onChange={setContentType} placeholder="Select type" options={contentTypes.map((t) => ({ value: t.key, label: t.name }))} />
								</div>
								<div>
									<label className={label}>Status</label>
									<select className={input} value={status} onChange={(e) => setStatus(e.target.value as PostStatus)}>
										<option value="draft">Draft</option>
										<option value="published">Published</option>
										<option value="archived">Archived</option>
									</select>
								</div>
								<div>
									<label className={label}>Slug</label>
									<input className={input} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-post-slug" required />
								</div>
								<div>
									<label className={label}>Published at</label>
									<input className={input} type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
								</div>
								<div>
									<label className={label}>Author</label>
									<input className={input} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="KAPE Cambodia" />
								</div>
							</div>
						</FormSection>

						{metaFieldDefs.length > 0 && (
							<FormSection title="Details" description="Fields specific to this content type.">
								<div className="space-y-4">
									{metaFieldDefs.map((f) => (
										<div key={f.key}>
											<label className={label}>{f.label}</label>
											{f.kind === "media" ? (
												<MediaPicker
													mode="url"
													kind="all"
													value={metaFields[f.key] ?? ""}
													accept="application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
													label="Choose file"
													onChange={(v) => setMetaFields((p) => ({ ...p, [f.key]: v }))}
												/>
											) : f.kind === "select" || f.kind === "relation" || f.kind === "project" ? (
												(() => {
													const cur = metaFields[f.key] ?? "";
													const opts =
														f.kind === "relation"
															? (termsByTax[f.taxonomy ?? ""] ?? []).map((tm) => ({ value: tm.key, label: tm.label }))
															: f.kind === "project"
																? projectOpts
																: (f.options ?? []).map((o) => ({ value: o, label: o }));
													if (cur && !opts.some((o) => o.value === cur)) opts.unshift({ value: cur, label: cur });
													return (
														<SearchableSelect value={cur} onChange={(v) => setMetaFields((p) => ({ ...p, [f.key]: v }))} options={opts} emptyOption="—" placeholder="Select…" />
													);
												})()
											) : (
												<input
													className={input}
													type={f.kind === "date" ? "date" : f.kind === "url" ? "url" : "text"}
													value={metaFields[f.key] ?? ""}
													placeholder={f.placeholder}
													onChange={(e) => setMetaFields((p) => ({ ...p, [f.key]: e.target.value }))}
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
