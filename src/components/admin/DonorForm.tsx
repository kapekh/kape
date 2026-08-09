import { Link } from "@tanstack/react-router";
import { useState } from "react";

import {
	cancelButtonClass,
	EditorGrid,
	EditorHeader,
	FormSection,
	fieldInput,
	fieldLabel,
} from "./form-ui";
import { MediaPicker } from "./MediaPicker";
import { useDirtyGuard } from "./useDirty";

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
	const [logoMediaId, setLogoMediaId] = useState(
		initial?.logoMediaId != null ? String(initial.logoMediaId) : "",
	);

	function submit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit({
			name,
			url,
			logoMediaId: logoMediaId ? Number(logoMediaId) : null,
			sort: initial?.sort ?? 0,
		});
	}

	const dirty = useDirtyGuard(
		JSON.stringify({ name, url, logoMediaId }),
		savedAt,
	);

	return (
		<form onSubmit={submit}>
			<EditorHeader
				title={title}
				saving={saving}
				savedAt={savedAt}
				saveLabel="Save donor"
				dirty={dirty}
			>
				<Link to="/admin/donors" className={cancelButtonClass}>
					Cancel
				</Link>
			</EditorHeader>
			<EditorGrid
				main={
					<FormSection
						title="Donor details"
						description="Organisations that fund the work."
					>
						<div className="space-y-4">
							<label className="block">
								<span className={fieldLabel}>Name</span>
								<input
									className={fieldInput}
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="e.g. European Union"
									required
								/>
							</label>
							<label className="block">
								<span className={fieldLabel}>Website (optional)</span>
								<input
									className={fieldInput}
									value={url}
									onChange={(e) => setUrl(e.target.value)}
									placeholder="https://…"
								/>
							</label>
						</div>
					</FormSection>
				}
				aside={
					<FormSection
						title="Logo"
						description="Shown on the public donors / partners section."
					>
						<MediaPicker
							mode="id"
							kind="image"
							accept="image/*"
							value={logoMediaId}
							onChange={setLogoMediaId}
							label="Choose logo"
						/>
					</FormSection>
				}
			/>
		</form>
	);
}
