import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { EditorGrid, EditorHeader, FormSection, cancelButtonClass, fieldInput, fieldLabel } from "./form-ui";
import { MediaPicker } from "./MediaPicker";
import { SearchableSelect } from "./SearchableSelect";
import { useDirty } from "./useDirty";

export type PartnerFormValue = {
	name: string;
	category: string;
	url: string;
	logoMediaId: number | null;
	sort: number;
};
type Initial = {
	name: string;
	category: string | null;
	url: string | null;
	logoMediaId: number | null;
	sort: number;
} | null;
export type TermOpt = { key: string; label: string };

export function PartnerForm({
	initial,
	categories,
	onSubmit,
	saving,
	title,
	savedAt,
}: {
	initial: Initial;
	categories: TermOpt[];
	onSubmit: (v: PartnerFormValue) => void;
	saving?: boolean;
	title: string;
	savedAt?: string | null;
}) {
	const [name, setName] = useState(initial?.name ?? "");
	const [category, setCategory] = useState(initial?.category ?? "");
	const [url, setUrl] = useState(initial?.url ?? "");
	const [logoMediaId, setLogoMediaId] = useState(initial?.logoMediaId != null ? String(initial.logoMediaId) : "");

	function submit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit({
			name,
			category,
			url,
			logoMediaId: logoMediaId ? Number(logoMediaId) : null,
			sort: initial?.sort ?? 0,
		});
	}

	const dirty = useDirty(JSON.stringify({ name, category, url, logoMediaId }), savedAt);

	return (
		<form onSubmit={submit}>
			<EditorHeader title={title} saving={saving} savedAt={savedAt} saveLabel="Save partner" dirty={dirty}>
				<Link to="/admin/partners" className={cancelButtonClass}>Cancel</Link>
			</EditorHeader>
			<EditorGrid
				main={
					<FormSection title="Partner details" description="Organisations KAPE collaborates with, shown on the Partners page.">
						<div className="space-y-4">
							<div>
								<label className={fieldLabel}>Name</label>
								<input className={fieldInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. UNICEF" required />
							</div>
							<div>
								<label className={fieldLabel}>Category</label>
								<SearchableSelect value={category} onChange={setCategory} emptyOption="— Select category —" placeholder="Select category" options={categories.map((c) => ({ value: c.key, label: c.label }))} />
							</div>
							<div>
								<label className={fieldLabel}>Website (optional)</label>
								<input className={fieldInput} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
							</div>
						</div>
					</FormSection>
				}
				aside={
					<FormSection title="Logo" description="Shown on the public Partners page.">
						<MediaPicker mode="id" kind="image" accept="image/*" value={logoMediaId} onChange={setLogoMediaId} label="Choose logo" />
					</FormSection>
				}
			/>
		</form>
	);
}
