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
import { LangTabs } from "./LangTabs";
import { MediaPicker } from "./MediaPicker";
import type { LangOpt } from "./PostForm";
import { RichTextEditor } from "./RichTextEditor";
import { useDirtyGuard } from "./useDirty";

export type PersonFormValue = {
	nameEn: string;
	nameKm: string | null;
	position: string | null;
	tier: string;
	isPublic: boolean;
	slug: string | null;
	photoMediaId: number | null;
	staffNo: string | null;
	sex: string | null;
	phone: string | null;
	email: string | null;
	program: string | null;
	sort: number;
	bio: { en: string; km: string };
};

type Initial = {
	nameEn: string;
	nameKm: string | null;
	position: string | null;
	tier: string;
	isPublic: boolean;
	slug: string | null;
	photoMediaId: number | null;
	staffNo: string | null;
	sex: string | null;
	phone: string | null;
	email: string | null;
	program: string | null;
	sort: number;
	bio?: Record<string, string>;
} | null;

const TIERS = [
	{ value: "board", label: "Board of Directors" },
	{ value: "smt", label: "Senior Management Team" },
	{ value: "pm", label: "Program Manager / Team Leader" },
	{ value: "team", label: "Team member" },
	{ value: "staff", label: "Staff (internal directory only)" },
];

export function PeopleForm({
	initial,
	languages,
	onSubmit,
	saving,
	title,
	savedAt,
}: {
	initial: Initial;
	languages: LangOpt[];
	onSubmit: (v: PersonFormValue) => void;
	saving?: boolean;
	title: string;
	savedAt?: string | null;
}) {
	const [nameEn, setNameEn] = useState(initial?.nameEn ?? "");
	const [nameKm, setNameKm] = useState(initial?.nameKm ?? "");
	const [position, setPosition] = useState(initial?.position ?? "");
	const [tier, setTier] = useState(initial?.tier ?? "team");
	const [isPublic, setIsPublic] = useState(initial?.isPublic ?? true);
	const [slug, setSlug] = useState(initial?.slug ?? "");
	const [photoMediaId, setPhotoMediaId] = useState(
		initial?.photoMediaId != null ? String(initial.photoMediaId) : "",
	);
	const [staffNo, setStaffNo] = useState(initial?.staffNo ?? "");
	const [sex, setSex] = useState(initial?.sex ?? "");
	const [phone, setPhone] = useState(initial?.phone ?? "");
	const [email, setEmail] = useState(initial?.email ?? "");
	const [program, setProgram] = useState(initial?.program ?? "");
	const [bio, setBio] = useState<Record<string, string>>(() => {
		const b: Record<string, string> = {};
		for (const l of languages) b[l.code] = initial?.bio?.[l.code] ?? "";
		return b;
	});

	function submit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit({
			nameEn,
			nameKm: nameKm || null,
			position: position || null,
			tier,
			isPublic,
			slug: slug || null,
			photoMediaId: photoMediaId ? Number(photoMediaId) : null,
			staffNo: staffNo || null,
			sex: sex || null,
			phone: phone || null,
			email: email || null,
			program: program || null,
			sort: initial?.sort ?? 0,
			bio: { en: bio.en ?? "", km: bio.km ?? "" },
		});
	}

	const dirty = useDirtyGuard(
		JSON.stringify({
			nameEn,
			nameKm,
			position,
			tier,
			isPublic,
			slug,
			photoMediaId,
			staffNo,
			sex,
			phone,
			email,
			program,
			bio,
		}),
		savedAt,
	);

	return (
		<form onSubmit={submit}>
			<EditorHeader
				title={title}
				saving={saving}
				savedAt={savedAt}
				saveLabel="Save person"
				dirty={dirty}
			>
				<Link to="/admin/people" className={cancelButtonClass}>
					Cancel
				</Link>
			</EditorHeader>
			<EditorGrid
				main={
					<>
						<FormSection
							title="Identity"
							description="Name and role, shown on the public team page and the internal directory."
						>
							<div className="space-y-4">
								<div className="grid sm:grid-cols-2 gap-4">
									<label className="block">
										<span className={fieldLabel}>Name (English)</span>
										<input
											className={fieldInput}
											value={nameEn}
											onChange={(e) => setNameEn(e.target.value)}
											placeholder="Chenda Sok"
											required
										/>
									</label>
									<label className="block">
										<span className={fieldLabel}>Name (Khmer)</span>
										<input
											className={`${fieldInput} font-khmer`}
											value={nameKm}
											onChange={(e) => setNameKm(e.target.value)}
											placeholder="សុខ ច័ន្ទដា"
										/>
									</label>
								</div>
								<label className="block">
									<span className={fieldLabel}>Position / role</span>
									<input
										className={fieldInput}
										value={position}
										onChange={(e) => setPosition(e.target.value)}
										placeholder="Executive Director"
									/>
								</label>
							</div>
						</FormSection>

						<FormSection
							title="Bio"
							description="Profile biography. Switch languages with the tabs — your text is kept as you switch."
						>
							<LangTabs languages={languages}>
								{(l) => (
									<RichTextEditor
										value={bio[l.code] ?? ""}
										onChange={(v) => setBio((p) => ({ ...p, [l.code]: v }))}
									/>
								)}
							</LangTabs>
						</FormSection>

						<FormSection
							title="Directory details"
							description="Contact info for the internal staff directory."
						>
							<div className="grid sm:grid-cols-2 gap-4">
								<label className="block">
									<span className={fieldLabel}>Staff no.</span>
									<input
										className={fieldInput}
										value={staffNo}
										onChange={(e) => setStaffNo(e.target.value)}
										placeholder="K001"
									/>
								</label>
								<label className="block">
									<span className={fieldLabel}>Sex</span>
									<select
										className={fieldInput}
										value={sex}
										onChange={(e) => setSex(e.target.value)}
									>
										<option value="">—</option>
										<option value="M">M</option>
										<option value="F">F</option>
									</select>
								</label>
								<label className="block">
									<span className={fieldLabel}>Phone</span>
									<input
										className={fieldInput}
										value={phone}
										onChange={(e) => setPhone(e.target.value)}
										placeholder="012 000 000"
									/>
								</label>
								<label className="block">
									<span className={fieldLabel}>Email</span>
									<input
										className={fieldInput}
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="name@example.org"
									/>
								</label>
								<div className="sm:col-span-2">
									<label className="block">
										<span className={fieldLabel}>Program / department</span>
										<input
											className={fieldInput}
											value={program}
											onChange={(e) => setProgram(e.target.value)}
											placeholder="NGS"
										/>
									</label>
								</div>
							</div>
						</FormSection>
					</>
				}
				aside={
					<>
						<FormSection
							title="Photo"
							description="Profile photo for the team page, org chart and directory."
						>
							<MediaPicker
								mode="id"
								kind="image"
								accept="image/*"
								aspect="square"
								value={photoMediaId}
								onChange={setPhotoMediaId}
								label="Choose photo"
							/>
						</FormSection>
						<FormSection
							title="Placement"
							description="Where this person appears."
						>
							<div className="space-y-4">
								<label className="block">
									<span className={fieldLabel}>Tier</span>
									<select
										className={fieldInput}
										value={tier}
										onChange={(e) => setTier(e.target.value)}
									>
										{TIERS.map((t) => (
											<option key={t.value} value={t.value}>
												{t.label}
											</option>
										))}
									</select>
								</label>
								<label className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={isPublic}
										onChange={(e) => setIsPublic(e.target.checked)}
									/>
									Show on the public website (Team page, org chart)
								</label>
								{isPublic && (
									<div>
										<label className="block">
											<span className={fieldLabel}>Public URL slug</span>
											<input
												className={fieldInput}
												value={slug}
												onChange={(e) => setSlug(e.target.value)}
												placeholder="chenda-sok"
											/>
										</label>
										<p className="mt-1 text-xs text-muted-foreground">
											Profile lives at /team/{slug || "…"}
										</p>
									</div>
								)}
							</div>
						</FormSection>
					</>
				}
			/>
		</form>
	);
}
