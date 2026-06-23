import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { EditorGrid, EditorHeader, FormSection, cancelButtonClass, fieldInput, fieldLabel } from "./form-ui";
import { MediaPicker } from "./MediaPicker";

export type DonorFormValue = {
	name: string;
	url: string;
	logoMediaId: number | null;
	sort: number;
};
type Initial = {
	name: string;
	url: string | null;
	logoMediaId: number | null;
	sort: number;
} | null;

export function DonorForm({
	initial,
	onSubmit,
	saving,
	title,
	savedAt,
}: {
	initial: Initial;
	onSubmit: (v: DonorFormValue) => void;
	saving?: boolean;
	title: string;
	savedAt?: string | null;
}) {
	const [name, setName] = useState(initial?.name ?? "");
	const [url, setUrl] = useState(initial?.url ?? "");
	const [logoMediaId, setLogoMediaId] = useState(initial?.logoMediaId != null ? String(initial.logoMediaId) : "");

	function submit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit({
			name,
			url,
			logoMediaId: logoMediaId ? Number(logoMediaId) : null,
			sort: initial?.sort ?? 0,
		});
	}

	return (
		<form onSubmit={submit}>
			<EditorHeader title={title} saving={saving} savedAt={savedAt} saveLabel="Save donor">
				<Link to="/admin/donors" className={cancelButtonClass}>Cancel</Link>
			</EditorHeader>
			<EditorGrid
				main={
					<FormSection title="Donor details" description="Organisations that fund KAPE's work.">
						<div className="space-y-4">
							<div>
								<label className={fieldLabel}>Name</label>
								<input className={fieldInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. European Union" required />
							</div>
							<div>
								<label className={fieldLabel}>Website (optional)</label>
								<input className={fieldInput} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
							</div>
						</div>
					</FormSection>
				}
				aside={
					<FormSection title="Logo" description="Shown on the public donors / partners section.">
						<MediaPicker mode="id" kind="image" accept="image/*" value={logoMediaId} onChange={setLogoMediaId} label="Choose logo" />
					</FormSection>
				}
			/>
		</form>
	);
}
