import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";

import { Input } from "#/components/ui/input.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
import { MIN_FULL_WIDTH } from "#/lib/media-size";
import {
	cancelButtonClass,
	EditorGrid,
	EditorHeader,
	Field,
	FormSection,
	fieldLabel,
} from "./form-ui";
import { MapPicker } from "./MapPicker";
import { MediaPicker } from "./MediaPicker";
import { SearchableSelect } from "./SearchableSelect";
import { useDirtyGuard } from "./useDirty";
import { useFieldErrors } from "./useFieldErrors";

export type SchoolFormValue = {
	name: string;
	code: string;
	level: string;
	province: string;
	projectId: number | null;
	coverMediaId: number | null;
	address: string;
	lat: string;
	lng: string;
	sort: number;
};
type Initial = {
	name: string;
	code: string | null;
	level: string | null;
	province: string | null;
	projectId: number | null;
	coverMediaId: number | null;
	address: string | null;
	lat: string | null;
	lng: string | null;
	sort: number;
} | null;
export type TermOpt = { key: string; label: string };
export type ProjectOpt = { id: number; code: string; name: string };

const LEVELS = [
	{ value: "preschool", label: "Preschool" },
	{ value: "primary", label: "Primary" },
	{ value: "secondary", label: "Secondary" },
	{ value: "high", label: "High school" },
	{ value: "higher", label: "Higher education" },
];

export function SchoolForm({
	initial,
	provinces,
	projects,
	onSubmit,
	saving,
	title,
	savedAt,
}: {
	initial: Initial;
	provinces: TermOpt[];
	projects: ProjectOpt[];
	onSubmit: (v: SchoolFormValue) => void;
	saving?: boolean;
	title: string;
	savedAt?: string | null;
}) {
	const uid = useId();
	const [name, setName] = useState(initial?.name ?? "");
	const [code, setCode] = useState(initial?.code ?? "");
	const [level, setLevel] = useState(initial?.level ?? "primary");
	const [province, setProvince] = useState(initial?.province ?? "");
	const [projectId, setProjectId] = useState(
		initial?.projectId != null ? String(initial.projectId) : "",
	);
	const [coverMediaId, setCoverMediaId] = useState(
		initial?.coverMediaId != null ? String(initial.coverMediaId) : "",
	);
	const [address, setAddress] = useState(initial?.address ?? "");
	const [lat, setLat] = useState(initial?.lat ?? "");
	const [lng, setLng] = useState(initial?.lng ?? "");
	const { errors, invalid } = useFieldErrors();

	function submit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit({
			name,
			code,
			level,
			province,
			projectId: projectId ? Number(projectId) : null,
			coverMediaId: coverMediaId ? Number(coverMediaId) : null,
			address,
			lat,
			lng,
			sort: initial?.sort ?? 0,
		});
	}

	const dirty = useDirtyGuard(
		JSON.stringify({
			name,
			code,
			level,
			province,
			projectId,
			coverMediaId,
			address,
			lat,
			lng,
		}),
		savedAt,
	);

	return (
		<form onSubmit={submit}>
			<EditorHeader
				title={title}
				saving={saving}
				savedAt={savedAt}
				saveLabel="Save school"
				dirty={dirty}
			>
				<Link to="/admin/schools" className={cancelButtonClass}>
					Cancel
				</Link>
			</EditorHeader>
			<EditorGrid
				main={
					<>
						<FormSection
							split
							title="School details"
							description="The school's name and where it sits in the programme."
						>
							<div className="space-y-6">
								<Field label="School name" required error={errors.name}>
									{(p) => (
										<Input
											{...p}
											{...invalid("name")}
											value={name}
											onChange={(e) => setName(e.target.value)}
											placeholder="e.g. Hun Sen Rolea B'ier High School"
										/>
									)}
								</Field>
								<Field label="School code">
									{(p) => (
										<Input
											{...p}
											value={code}
											onChange={(e) => setCode(e.target.value)}
											placeholder="EMIS / internal code"
										/>
									)}
								</Field>
								<Field label="Level">
									{(p) => (
										<Select value={level} onValueChange={setLevel}>
											<SelectTrigger
												id={p.id}
												aria-label="Level"
												className="w-full"
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{LEVELS.map((l) => (
													<SelectItem key={l.value} value={l.value}>
														{l.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								</Field>
								<div>
									<label className={fieldLabel} htmlFor={`${uid}-province`}>
										Province
									</label>
									<SearchableSelect
										id={`${uid}-province`}
										value={province}
										onChange={setProvince}
										emptyOption="— Select province —"
										placeholder="Select province"
										options={provinces.map((p) => ({
											value: p.key,
											label: p.label,
										}))}
									/>
								</div>
								<div>
									<label className={fieldLabel} htmlFor={`${uid}-project`}>
										Project
									</label>
									<SearchableSelect
										id={`${uid}-project`}
										value={projectId}
										onChange={setProjectId}
										emptyOption="— Not linked —"
										placeholder="Link a project"
										options={projects.map((p) => ({
											value: String(p.id),
											label: `${p.code} — ${p.name}`,
										}))}
									/>
								</div>
							</div>
						</FormSection>

						<FormSection
							title="Location"
							description="Address and exact map position for the schools map."
						>
							<div className="space-y-6">
								<Field label="Address">
									{(p) => (
										<Input
											{...p}
											value={address}
											onChange={(e) => setAddress(e.target.value)}
											placeholder="Village / commune / district"
										/>
									)}
								</Field>
								<fieldset>
									<legend className={fieldLabel}>Map position</legend>
									<p className="mb-3 text-[13px] text-admin-ink-muted">
										Click the map to drop a pin, or drag it. The coordinates
										fill in as you go.
									</p>
									<MapPicker
										lat={lat}
										lng={lng}
										onPick={(la, ln) => {
											setLat(la);
											setLng(ln);
										}}
									/>
									<div className="mt-4 grid max-w-sm grid-cols-2 gap-4">
										<Field label="Latitude">
											{(p) => (
												<Input
													{...p}
													value={lat}
													onChange={(e) => setLat(e.target.value)}
													placeholder="12.245"
												/>
											)}
										</Field>
										<Field label="Longitude">
											{(p) => (
												<Input
													{...p}
													value={lng}
													onChange={(e) => setLng(e.target.value)}
													placeholder="104.668"
												/>
											)}
										</Field>
									</div>
								</fieldset>
							</div>
						</FormSection>
					</>
				}
				aside={
					<FormSection
						title="Photo"
						description="Shown on the public schools page and map pop-ups."
					>
						<MediaPicker
							mode="id"
							kind="image"
							accept="image/*"
							value={coverMediaId}
							onChange={setCoverMediaId}
							label="Choose photo"
							minWidth={MIN_FULL_WIDTH}
						/>
					</FormSection>
				}
			/>
		</form>
	);
}
