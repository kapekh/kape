import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { EditorGrid, EditorHeader, FormSection, cancelButtonClass, fieldInput, fieldLabel } from "./form-ui";
import { MapPicker } from "./MapPicker";
import { MediaPicker } from "./MediaPicker";
import { SearchableSelect } from "./SearchableSelect";
import { useDirty } from "./useDirty";

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
	name: string; code: string | null; level: string | null; province: string | null;
	projectId: number | null; coverMediaId: number | null; address: string | null;
	lat: string | null; lng: string | null; sort: number;
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
	const [name, setName] = useState(initial?.name ?? "");
	const [code, setCode] = useState(initial?.code ?? "");
	const [level, setLevel] = useState(initial?.level ?? "primary");
	const [province, setProvince] = useState(initial?.province ?? "");
	const [projectId, setProjectId] = useState(initial?.projectId != null ? String(initial.projectId) : "");
	const [coverMediaId, setCoverMediaId] = useState(initial?.coverMediaId != null ? String(initial.coverMediaId) : "");
	const [address, setAddress] = useState(initial?.address ?? "");
	const [lat, setLat] = useState(initial?.lat ?? "");
	const [lng, setLng] = useState(initial?.lng ?? "");

	function submit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit({
			name, code, level, province,
			projectId: projectId ? Number(projectId) : null,
			coverMediaId: coverMediaId ? Number(coverMediaId) : null,
			address, lat, lng, sort: initial?.sort ?? 0,
		});
	}

	const dirty = useDirty(
		JSON.stringify({ name, code, level, province, projectId, coverMediaId, address, lat, lng }),
		savedAt,
	);

	return (
		<form onSubmit={submit}>
			<EditorHeader title={title} saving={saving} savedAt={savedAt} saveLabel="Save school" dirty={dirty}>
				<Link to="/admin/schools" className={cancelButtonClass}>Cancel</Link>
			</EditorHeader>
			<EditorGrid
				main={
					<>
						<FormSection title="School details" description="The school's name and where it sits in KAPE's work.">
							<div className="space-y-4">
								<div>
									<label className={fieldLabel}>School name</label>
									<input className={fieldInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hun Sen Rolea B'ier High School" required />
								</div>
								<div className="grid sm:grid-cols-2 gap-4">
									<div>
										<label className={fieldLabel}>School code</label>
										<input className={fieldInput} value={code} onChange={(e) => setCode(e.target.value)} placeholder="EMIS / internal code" />
									</div>
									<div>
										<label className={fieldLabel}>Level</label>
										<select className={fieldInput} value={level} onChange={(e) => setLevel(e.target.value)}>
											{LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
										</select>
									</div>
									<div>
										<label className={fieldLabel}>Province</label>
										<SearchableSelect value={province} onChange={setProvince} emptyOption="— Select province —" placeholder="Select province" options={provinces.map((p) => ({ value: p.key, label: p.label }))} />
									</div>
									<div>
										<label className={fieldLabel}>Project</label>
										<SearchableSelect value={projectId} onChange={setProjectId} emptyOption="— Not linked —" placeholder="Link a project" options={projects.map((p) => ({ value: String(p.id), label: `${p.code} — ${p.name}` }))} />
									</div>
								</div>
							</div>
						</FormSection>

						<FormSection title="Location" description="Address and exact map position for the schools map.">
							<div className="space-y-4">
								<div>
									<label className={fieldLabel}>Address</label>
									<input className={fieldInput} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Village / commune / district" />
								</div>
								<div>
									<label className={fieldLabel}>Map position</label>
									<p className="text-xs text-muted-foreground mb-2">Click the map to drop a pin (or drag it). Coordinates fill in automatically.</p>
									<MapPicker lat={lat} lng={lng} onPick={(la, ln) => { setLat(la); setLng(ln); }} />
									<div className="grid grid-cols-2 gap-4 max-w-sm mt-3">
										<div>
											<span className="block text-[11px] text-muted-foreground mb-1">Latitude</span>
											<input className={fieldInput} value={lat} onChange={(e) => setLat(e.target.value)} placeholder="12.245" />
										</div>
										<div>
											<span className="block text-[11px] text-muted-foreground mb-1">Longitude</span>
											<input className={fieldInput} value={lng} onChange={(e) => setLng(e.target.value)} placeholder="104.668" />
										</div>
									</div>
								</div>
							</div>
						</FormSection>
					</>
				}
				aside={
					<FormSection title="Photo" description="Shown on the public schools page and map pop-ups.">
						<MediaPicker mode="id" kind="image" accept="image/*" value={coverMediaId} onChange={setCoverMediaId} label="Choose photo" />
					</FormSection>
				}
			/>
		</form>
	);
}
