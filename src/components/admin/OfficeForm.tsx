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
import { MapPicker } from "./MapPicker";
import { MediaPicker } from "./MediaPicker";
import { SearchableSelect } from "./SearchableSelect";
import { useDirtyGuard } from "./useDirty";

export type OfficeFormValue = {
	name: string;
	province: string;
	address: string;
	phone: string;
	email: string;
	lat: string;
	lng: string;
	isHq: boolean;
	imageMediaId: number | null;
	sort: number;
};
type Initial = {
	name: string;
	province: string | null;
	address: string | null;
	phone: string | null;
	email: string | null;
	lat: string | null;
	lng: string | null;
	isHq: boolean;
	imageMediaId: number | null;
	sort: number;
} | null;
export type TermOpt = { key: string; label: string };

export function OfficeForm({
	initial,
	provinces,
	onSubmit,
	saving,
	title,
	savedAt,
}: {
	initial: Initial;
	provinces: TermOpt[];
	onSubmit: (v: OfficeFormValue) => void;
	saving?: boolean;
	title: string;
	savedAt?: string | null;
}) {
	const [name, setName] = useState(initial?.name ?? "");
	const [province, setProvince] = useState(initial?.province ?? "");
	const [address, setAddress] = useState(initial?.address ?? "");
	const [phone, setPhone] = useState(initial?.phone ?? "");
	const [email, setEmail] = useState(initial?.email ?? "");
	const [lat, setLat] = useState(initial?.lat ?? "");
	const [lng, setLng] = useState(initial?.lng ?? "");
	const [isHq, setIsHq] = useState(initial?.isHq ?? false);
	const [imageMediaId, setImageMediaId] = useState(
		initial?.imageMediaId != null ? String(initial.imageMediaId) : "",
	);

	function submit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit({
			name,
			province,
			address,
			phone,
			email,
			lat,
			lng,
			isHq,
			imageMediaId: imageMediaId ? Number(imageMediaId) : null,
			sort: initial?.sort ?? 0,
		});
	}

	const dirty = useDirtyGuard(
		JSON.stringify({
			name,
			province,
			address,
			phone,
			email,
			lat,
			lng,
			isHq,
			imageMediaId,
		}),
		savedAt,
	);

	return (
		<form onSubmit={submit}>
			<EditorHeader
				title={title}
				saving={saving}
				savedAt={savedAt}
				saveLabel="Save office"
				dirty={dirty}
			>
				<Link to="/admin/offices" className={cancelButtonClass}>
					Cancel
				</Link>
			</EditorHeader>
			<EditorGrid
				main={
					<div className="space-y-5">
						<FormSection
							title="Office details"
							description="An office location shown on the public Contact page and map."
						>
							<div className="space-y-4">
								<div>
									<label className={fieldLabel}>Office name</label>
									<input
										className={fieldInput}
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="e.g. Head Office (PTTC)"
										required
									/>
								</div>
								<div>
									<label className={fieldLabel}>Province</label>
									<SearchableSelect
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
								<label className="flex items-start gap-2.5 cursor-pointer rounded-xl border border-border p-3">
									<input
										type="checkbox"
										checked={isHq}
										onChange={(e) => setIsHq(e.target.checked)}
										className="mt-0.5 h-4 w-4 rounded border-border accent-[var(--accent)]"
									/>
									<span>
										<span className="text-sm font-medium text-foreground">
											Headquarters (HQ)
										</span>
										<span className="block text-xs text-muted-foreground">
											The main office. Only one office should be the HQ.
										</span>
									</span>
								</label>
							</div>
						</FormSection>

						<FormSection
							title="Contact"
							description="How visitors reach this office."
						>
							<div className="grid sm:grid-cols-2 gap-4">
								<div>
									<label className={fieldLabel}>Phone</label>
									<input
										className={fieldInput}
										value={phone}
										onChange={(e) => setPhone(e.target.value)}
										placeholder="+855 …"
									/>
								</div>
								<div>
									<label className={fieldLabel}>Email</label>
									<input
										className={fieldInput}
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="office@example.org"
									/>
								</div>
							</div>
						</FormSection>

						<FormSection
							title="Location"
							description="Address and exact map position for the offices map."
						>
							<div className="space-y-4">
								<div>
									<label className={fieldLabel}>Address</label>
									<input
										className={fieldInput}
										value={address}
										onChange={(e) => setAddress(e.target.value)}
										placeholder="Village / commune / district"
									/>
								</div>
								<div>
									<label className={fieldLabel}>Map position</label>
									<p className="text-xs text-muted-foreground mb-2">
										Click the map to drop a pin (or drag it). Coordinates fill
										in automatically.
									</p>
									<MapPicker
										lat={lat}
										lng={lng}
										onPick={(la, ln) => {
											setLat(la);
											setLng(ln);
										}}
									/>
									<div className="grid grid-cols-2 gap-4 max-w-sm mt-3">
										<div>
											<span className="block text-[11px] text-muted-foreground mb-1">
												Latitude
											</span>
											<input
												className={fieldInput}
												value={lat}
												onChange={(e) => setLat(e.target.value)}
												placeholder="12.245"
											/>
										</div>
										<div>
											<span className="block text-[11px] text-muted-foreground mb-1">
												Longitude
											</span>
											<input
												className={fieldInput}
												value={lng}
												onChange={(e) => setLng(e.target.value)}
												placeholder="104.668"
											/>
										</div>
									</div>
								</div>
							</div>
						</FormSection>
					</div>
				}
				aside={
					<FormSection
						title="Photo"
						description="Shown on the public Contact page and map pop-ups."
					>
						<MediaPicker
							mode="id"
							kind="image"
							accept="image/*"
							value={imageMediaId}
							onChange={setImageMediaId}
							label="Choose image"
						/>
					</FormSection>
				}
			/>
		</form>
	);
}
