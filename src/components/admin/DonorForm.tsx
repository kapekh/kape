import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Input } from "#/components/ui/input.tsx";
import {
	cancelButtonClass,
	EditorGrid,
	EditorHeader,
	Field,
	FormSection,
} from "./form-ui";
import { MediaPicker } from "./MediaPicker";
import { useDirtyGuard } from "./useDirty";
import { useFieldErrors } from "./useFieldErrors";

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
	const { errors, invalid } = useFieldErrors();

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
						split
						title="Donor details"
						description="Organisations that fund the work, shown on the public donors panel."
					>
						<div className="space-y-6">
							<Field label="Name" required error={errors.name}>
								{(p) => (
									<Input
										{...p}
										{...invalid("name")}
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="e.g. European Union"
									/>
								)}
							</Field>
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
