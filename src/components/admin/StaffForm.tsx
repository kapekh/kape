import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { EditorGrid, EditorHeader, FormSection, cancelButtonClass, fieldInput, fieldLabel } from "./form-ui";
import { MediaPicker } from "./MediaPicker";

export type StaffFormValue = {
	staffNo: string;
	nameKm: string;
	nameEn: string;
	sex: string;
	phone: string;
	email: string;
	program: string;
	photoMediaId: number | null;
	sort: number;
};
type Initial = {
	staffNo: string | null;
	nameKm: string | null;
	nameEn: string | null;
	sex: string | null;
	phone: string | null;
	email: string | null;
	program: string | null;
	photoMediaId: number | null;
	sort: number;
} | null;

export function StaffForm({
	initial,
	onSubmit,
	saving,
	title,
	savedAt,
}: {
	initial: Initial;
	onSubmit: (v: StaffFormValue) => void;
	saving?: boolean;
	title: string;
	savedAt?: string | null;
}) {
	const [staffNo, setStaffNo] = useState(initial?.staffNo ?? "");
	const [nameKm, setNameKm] = useState(initial?.nameKm ?? "");
	const [nameEn, setNameEn] = useState(initial?.nameEn ?? "");
	const [sex, setSex] = useState(initial?.sex ?? "");
	const [phone, setPhone] = useState(initial?.phone ?? "");
	const [email, setEmail] = useState(initial?.email ?? "");
	const [program, setProgram] = useState(initial?.program ?? "");
	const [photoMediaId, setPhotoMediaId] = useState(initial?.photoMediaId != null ? String(initial.photoMediaId) : "");

	function submit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit({
			staffNo, nameKm, nameEn, sex, phone, email, program,
			photoMediaId: photoMediaId ? Number(photoMediaId) : null,
			sort: initial?.sort ?? 0,
		});
	}

	return (
		<form onSubmit={submit}>
			<EditorHeader title={title} saving={saving} savedAt={savedAt} saveLabel="Save staff member">
				<Link to="/admin/staff" className={cancelButtonClass}>Cancel</Link>
			</EditorHeader>
			<EditorGrid
				main={
					<FormSection title="Staff details" description="Used in the internal staff directory.">
						<div className="space-y-4">
							<div>
								<label className={fieldLabel}>Name (EN)</label>
								<input className={fieldInput} value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Full name" />
							</div>
							<div>
								<label className={fieldLabel}>Name (KH)</label>
								<input className={`${fieldInput} font-khmer`} value={nameKm} onChange={(e) => setNameKm(e.target.value)} placeholder="ឈ្មោះ" />
							</div>
							<div className="grid sm:grid-cols-2 gap-4">
								<div>
									<label className={fieldLabel}>Staff ID</label>
									<input className={fieldInput} value={staffNo} onChange={(e) => setStaffNo(e.target.value)} placeholder="001" />
								</div>
								<div>
									<label className={fieldLabel}>Sex</label>
									<select className={fieldInput} value={sex} onChange={(e) => setSex(e.target.value)}>
										<option value="">—</option>
										<option value="M">M</option>
										<option value="F">F</option>
									</select>
								</div>
								<div>
									<label className={fieldLabel}>Phone</label>
									<input className={fieldInput} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="012 345 678" />
								</div>
								<div>
									<label className={fieldLabel}>Email</label>
									<input className={fieldInput} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@kape.org" />
								</div>
								<div>
									<label className={fieldLabel}>Program</label>
									<input className={fieldInput} value={program} onChange={(e) => setProgram(e.target.value)} placeholder="e.g. STEM" />
								</div>
							</div>
						</div>
					</FormSection>
				}
				aside={
					<FormSection title="Photo" description="Shown in the staff directory.">
						<MediaPicker mode="id" kind="image" accept="image/*" aspect="square" value={photoMediaId} onChange={setPhotoMediaId} label="Choose photo" />
					</FormSection>
				}
			/>
		</form>
	);
}
