import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";

import { Input } from "#/components/ui/input.tsx";
import { MIN_FULL_WIDTH } from "#/lib/media-size";
import {
	cancelButtonClass,
	EditorGrid,
	EditorHeader,
	Field,
	FormSection,
	fieldLabel,
} from "./form-ui";
import { defaultLanguage, LangTabs } from "./LangTabs";
import { MapPicker } from "./MapPicker";
import { MediaPicker } from "./MediaPicker";
import { SearchableSelect } from "./SearchableSelect";
import { useDirtyGuard } from "./useDirty";
import { useFieldErrors } from "./useFieldErrors";

type OfficeText = { name: string; address: string };

export type OfficeFormValue = {
	province: string;
	phone: string;
	email: string;
	lat: string;
	lng: string;
	isHq: boolean;
	imageMediaId: number | null;
	sort: number;
	translations: ({ lang: string } & OfficeText)[];
};
type Initial = {
	province: string | null;
	phone: string | null;
	email: string | null;
	lat: string | null;
	lng: string | null;
	isHq: boolean;
	imageMediaId: number | null;
	sort: number;
	translations?: Record<string, Partial<OfficeText>>;
} | null;
export type TermOpt = { key: string; label: string };
export type LangOpt = { code: string; name: string; isDefault: boolean };

export function OfficeForm({
	initial,
	provinces,
	languages,
	onSubmit,
	saving,
	title,
	savedAt,
}: {
	initial: Initial;
	provinces: TermOpt[];
	languages: LangOpt[];
	onSubmit: (v: OfficeFormValue) => void;
	saving?: boolean;
	title: string;
	savedAt?: string | null;
}) {
	const uid = useId();
	const [trans, setTrans] = useState<Record<string, OfficeText>>(() => {
		const t: Record<string, OfficeText> = {};
		for (const l of languages) {
			const e = initial?.translations?.[l.code] ?? {};
			t[l.code] = { name: e.name ?? "", address: e.address ?? "" };
		}
		return t;
	});
	const [province, setProvince] = useState(initial?.province ?? "");
	const [phone, setPhone] = useState(initial?.phone ?? "");
	const [email, setEmail] = useState(initial?.email ?? "");
	const [lat, setLat] = useState(initial?.lat ?? "");
	const [lng, setLng] = useState(initial?.lng ?? "");
	const [isHq, setIsHq] = useState(initial?.isHq ?? false);
	const [imageMediaId, setImageMediaId] = useState(
		initial?.imageMediaId != null ? String(initial.imageMediaId) : "",
	);
	const { errors, invalid } = useFieldErrors();

	const setText = (lang: string, field: keyof OfficeText, value: string) =>
		setTrans((prev) => ({
			...prev,
			[lang]: { ...prev[lang], [field]: value },
		}));

	function submit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit({
			province,
			phone,
			email,
			lat,
			lng,
			isHq,
			imageMediaId: imageMediaId ? Number(imageMediaId) : null,
			sort: initial?.sort ?? 0,
			translations: languages.map((l) => ({ lang: l.code, ...trans[l.code] })),
		});
	}

	const dirty = useDirtyGuard(
		JSON.stringify({
			trans,
			province,
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
					<>
						<FormSection
							title="Name and address"
							description="What visitors read on the Contact page, each in its own language. Switch languages with the tabs — your text is kept as you switch."
						>
							<LangTabs languages={languages}>
								{(l) => (
									<div className="space-y-6">
										<Field
											label="Office name"
											required={l.code === defaultLanguage(languages)?.code}
											error={errors.name}
										>
											{(p) => (
												<Input
													{...p}
													{...invalid("name")}
													className={l.code === "km" ? "font-khmer" : undefined}
													value={trans[l.code]?.name ?? ""}
													onChange={(e) =>
														setText(l.code, "name", e.target.value)
													}
													placeholder="e.g. Head Office (PTTC)"
												/>
											)}
										</Field>
										<Field label="Address">
											{(p) => (
												<Input
													{...p}
													className={l.code === "km" ? "font-khmer" : undefined}
													value={trans[l.code]?.address ?? ""}
													onChange={(e) =>
														setText(l.code, "address", e.target.value)
													}
													placeholder="Village / commune / district"
												/>
											)}
										</Field>
									</div>
								)}
							</LangTabs>
						</FormSection>

						<FormSection
							split
							title="Office details"
							description="Where this office sits in the list of places the organisation works from."
						>
							<div className="space-y-6">
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
								<label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-admin-border p-3 transition-colors duration-150 ease-out hover:bg-admin-panel-raised">
									<input
										type="checkbox"
										checked={isHq}
										onChange={(e) => setIsHq(e.target.checked)}
										className="mt-0.5 h-4 w-4 rounded border-admin-border accent-[var(--admin-accent)]"
									/>
									<span>
										<span className="text-sm font-medium text-admin-ink">
											Headquarters (HQ)
										</span>
										<span className="block text-[13px] text-admin-ink-muted">
											The main office. Only one office should be the HQ.
										</span>
									</span>
								</label>
							</div>
						</FormSection>

						<FormSection
							split
							title="Contact"
							description="How visitors reach this office."
						>
							<div className="space-y-6">
								<Field label="Phone">
									{(p) => (
										<Input
											{...p}
											value={phone}
											onChange={(e) => setPhone(e.target.value)}
											placeholder="+855 …"
										/>
									)}
								</Field>
								<Field label="Email">
									{(p) => (
										<Input
											{...p}
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											placeholder="office@example.org"
										/>
									)}
								</Field>
							</div>
						</FormSection>

						<FormSection
							title="Location"
							description="Exact map position for the offices map."
						>
							<div className="space-y-6">
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
						description="Shown on the public Contact page and map pop-ups."
					>
						<MediaPicker
							mode="id"
							kind="image"
							accept="image/*"
							value={imageMediaId}
							onChange={setImageMediaId}
							label="Choose image"
							minWidth={MIN_FULL_WIDTH}
						/>
					</FormSection>
				}
			/>
		</form>
	);
}
