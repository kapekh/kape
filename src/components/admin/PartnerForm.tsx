import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";

import { Input } from "#/components/ui/input.tsx";
import {
	cancelButtonClass,
	EditorGrid,
	EditorHeader,
	Field,
	FormSection,
	fieldLabel,
} from "./form-ui";
import { MediaPicker } from "./MediaPicker";
import { SearchableSelect } from "./SearchableSelect";
import { useDirtyGuard } from "./useDirty";
import { useFieldErrors } from "./useFieldErrors";

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
	const uid = useId();
	const [name, setName] = useState(initial?.name ?? "");
	const [category, setCategory] = useState(initial?.category ?? "");
	const [url, setUrl] = useState(initial?.url ?? "");
	const [logoMediaId, setLogoMediaId] = useState(
		initial?.logoMediaId != null ? String(initial.logoMediaId) : "",
	);
	const { errors, invalid } = useFieldErrors();

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

	const dirty = useDirtyGuard(
		JSON.stringify({ name, category, url, logoMediaId }),
		savedAt,
	);

	return (
		<form onSubmit={submit}>
			<EditorHeader
				title={title}
				saving={saving}
				savedAt={savedAt}
				saveLabel="Save partner"
				dirty={dirty}
			>
				<Link to="/admin/partners" className={cancelButtonClass}>
					Cancel
				</Link>
			</EditorHeader>
			<EditorGrid
				main={
					<FormSection
						split
						title="Partner details"
						description="Organisations you collaborate with, shown on the Partners page."
					>
						<div className="space-y-6">
							<Field label="Name" required error={errors.name}>
								{(p) => (
									<Input
										{...p}
										{...invalid("name")}
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="e.g. UNICEF"
									/>
								)}
							</Field>
							<div>
								<label className={fieldLabel} htmlFor={`${uid}-category`}>
									Category
								</label>
								<SearchableSelect
									id={`${uid}-category`}
									value={category}
									onChange={setCategory}
									emptyOption="— Select category —"
									placeholder="Select category"
									options={categories.map((c) => ({
										value: c.key,
										label: c.label,
									}))}
								/>
							</div>
							<Field label="Website (optional)">
								{(p) => (
									<Input
										{...p}
										value={url}
										onChange={(e) => setUrl(e.target.value)}
										placeholder="https://…"
									/>
								)}
							</Field>
						</div>
					</FormSection>
				}
				aside={
					<FormSection
						title="Logo"
						description="Shown on the public Partners page."
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
