import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { EditorGrid, EditorHeader, FormSection, cancelButtonClass, fieldInput, fieldLabel } from "./form-ui";
import type { LangOpt } from "./PostForm";
import { RichTextEditor } from "./RichTextEditor";

export type PageStatus = "draft" | "published";
export type PageFormValue = {
	slug: string;
	status: PageStatus;
	translations: { lang: string; title: string; body: string }[];
};

type Initial = {
	slug: string;
	status: string;
	translations: Record<string, Record<string, string>>;
} | null;

export function PageForm({
	initial,
	languages,
	onSubmit,
	saving,
	title,
	savedAt,
}: {
	initial: Initial;
	languages: LangOpt[];
	onSubmit: (value: PageFormValue) => void;
	saving?: boolean;
	title: string;
	savedAt?: string | null;
}) {
	const [slug, setSlug] = useState(initial?.slug ?? "");
	const [status, setStatus] = useState<PageStatus>((initial?.status as PageStatus) ?? "draft");
	const [trans, setTrans] = useState<Record<string, { title: string; body: string }>>(() => {
		const t: Record<string, { title: string; body: string }> = {};
		for (const l of languages) {
			const e = initial?.translations[l.code] ?? {};
			t[l.code] = { title: e.title ?? "", body: e.body ?? "" };
		}
		return t;
	});

	function setField(lang: string, field: "title" | "body", value: string) {
		setTrans((prev) => ({ ...prev, [lang]: { ...prev[lang], [field]: value } }));
	}
	function submit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit({ slug, status, translations: languages.map((l) => ({ lang: l.code, ...trans[l.code] })) });
	}

	return (
		<form onSubmit={submit}>
			<EditorHeader title={title} saving={saving} savedAt={savedAt} saveLabel="Save page">
				<Link to="/admin/pages" className={cancelButtonClass}>Cancel</Link>
			</EditorHeader>
			<EditorGrid
				main={languages.map((l) => (
					<FormSection key={l.code} title={`Content — ${l.name}`} description={`Shown when the site language is ${l.name} (${l.code}).`}>
						<div className="space-y-4">
							<div>
								<label className={fieldLabel}>Title</label>
								<input className={`${fieldInput} ${l.code === "km" ? "font-khmer" : ""}`} value={trans[l.code]?.title ?? ""} onChange={(e) => setField(l.code, "title", e.target.value)} />
							</div>
							<div>
								<label className={fieldLabel}>Body</label>
								<RichTextEditor value={trans[l.code]?.body ?? ""} onChange={(v) => setField(l.code, "body", v)} />
							</div>
						</div>
					</FormSection>
				))}
				aside={
					<FormSection title="Page settings" description="Where this page lives and whether it's visible.">
						<div className="space-y-4">
							<div>
								<label className={fieldLabel}>Slug (URL path)</label>
								<input className={fieldInput} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="who-we-are/about" required />
							</div>
							<div>
								<label className={fieldLabel}>Status</label>
								<select className={fieldInput} value={status} onChange={(e) => setStatus(e.target.value as PageStatus)}>
									<option value="draft">Draft</option>
									<option value="published">Published</option>
								</select>
							</div>
						</div>
					</FormSection>
				}
			/>
		</form>
	);
}
