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
import { PEOPLE_TIERS } from "#/lib/people-tiers";
import { IMAGE_ACCEPT } from "#/lib/upload-types";
import {
	cancelButtonClass,
	EditorGrid,
	EditorHeader,
	Field,
	FormSection,
	fieldLabel,
} from "./form-ui";
import { LangTabs } from "./LangTabs";
import { MediaPicker } from "./MediaPicker";
import type { LangOpt } from "./PostForm";
import { RichTextEditor } from "./RichTextEditor";
import { useDirtyGuard } from "./useDirty";
import { useFieldErrors } from "./useFieldErrors";

type PersonText = { position: string; bio: string };

export type PersonFormValue = {
	nameEn: string;
	nameKm: string | null;
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
	translations: ({ lang: string } & PersonText)[];
};

type Initial = {
	nameEn: string;
	nameKm: string | null;
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
	translations?: Record<string, Partial<PersonText>>;
} | null;

// radix rejects "" as an item value; the stored value is still "" for "not recorded"
const NO_SEX = "unspecified";
const SEXES = [
	{ value: NO_SEX, label: "Not recorded" },
	{ value: "M", label: "M" },
	{ value: "F", label: "F" },
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
	const uid = useId();
	const [nameEn, setNameEn] = useState(initial?.nameEn ?? "");
	const [nameKm, setNameKm] = useState(initial?.nameKm ?? "");
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
	const [trans, setTrans] = useState<Record<string, PersonText>>(() => {
		const t: Record<string, PersonText> = {};
		for (const l of languages) {
			const e = initial?.translations?.[l.code] ?? {};
			t[l.code] = { position: e.position ?? "", bio: e.bio ?? "" };
		}
		return t;
	});
	const { errors, invalid } = useFieldErrors();

	const setText = (lang: string, field: keyof PersonText, value: string) =>
		setTrans((prev) => ({
			...prev,
			[lang]: { ...prev[lang], [field]: value },
		}));

	function submit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit({
			nameEn,
			nameKm: nameKm || null,
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
			translations: languages.map((l) => ({ lang: l.code, ...trans[l.code] })),
		});
	}

	const dirty = useDirtyGuard(
		JSON.stringify({
			nameEn,
			nameKm,
			tier,
			isPublic,
			slug,
			photoMediaId,
			staffNo,
			sex,
			phone,
			email,
			program,
			trans,
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
							split
							title="Identity"
							description="Name, shown on the public team page and the internal directory."
						>
							<div className="space-y-6">
								<Field label="Name (English)" required error={errors.nameEn}>
									{(p) => (
										<Input
											{...p}
											{...invalid("nameEn")}
											value={nameEn}
											onChange={(e) => setNameEn(e.target.value)}
											placeholder="Chenda Sok"
										/>
									)}
								</Field>
								<Field label="Name (Khmer)">
									{(p) => (
										<Input
											{...p}
											className="font-khmer"
											value={nameKm}
											onChange={(e) => setNameKm(e.target.value)}
											placeholder="សុខ ច័ន្ទដា"
										/>
									)}
								</Field>
							</div>
						</FormSection>

						<FormSection
							title="Position and bio"
							description="Job title and profile biography, each in its own language. Switch languages with the tabs — your text is kept as you switch."
						>
							<LangTabs languages={languages}>
								{(l) => (
									<div className="space-y-6">
										<Field label="Position / role">
											{(p) => (
												<Input
													{...p}
													className={l.code === "km" ? "font-khmer" : undefined}
													value={trans[l.code]?.position ?? ""}
													onChange={(e) =>
														setText(l.code, "position", e.target.value)
													}
													placeholder="Executive Director"
												/>
											)}
										</Field>
										<div>
											<span
												id={`${uid}-bio-${l.code}-label`}
												className={fieldLabel}
											>
												Biography
											</span>
											<RichTextEditor
												ariaLabelledBy={`${uid}-bio-${l.code}-label`}
												value={trans[l.code]?.bio ?? ""}
												onChange={(v) => setText(l.code, "bio", v)}
											/>
										</div>
									</div>
								)}
							</LangTabs>
						</FormSection>

						<FormSection
							split
							title="Directory details"
							description="Contact info for the internal staff directory."
						>
							<div className="space-y-6">
								<Field label="Staff no.">
									{(p) => (
										<Input
											{...p}
											value={staffNo}
											onChange={(e) => setStaffNo(e.target.value)}
											placeholder="K001"
										/>
									)}
								</Field>
								<Field label="Sex">
									{(p) => (
										<Select
											value={sex || NO_SEX}
											onValueChange={(v) => setSex(v === NO_SEX ? "" : v)}
										>
											<SelectTrigger
												id={p.id}
												aria-label="Sex"
												className="w-full"
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{SEXES.map((s) => (
													<SelectItem key={s.value} value={s.value}>
														{s.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								</Field>
								<Field label="Phone">
									{(p) => (
										<Input
											{...p}
											value={phone}
											onChange={(e) => setPhone(e.target.value)}
											placeholder="012 000 000"
										/>
									)}
								</Field>
								<Field label="Email" error={errors.email}>
									{(p) => (
										<Input
											{...p}
											{...invalid("email")}
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											placeholder="name@example.org"
										/>
									)}
								</Field>
								<Field label="Program / department">
									{(p) => (
										<Input
											{...p}
											value={program}
											onChange={(e) => setProgram(e.target.value)}
											placeholder="NGS"
										/>
									)}
								</Field>
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
								accept={IMAGE_ACCEPT}
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
							<div className="space-y-6">
								<Field label="Tier">
									{(p) => (
										<Select value={tier} onValueChange={setTier}>
											<SelectTrigger
												id={p.id}
												aria-label="Tier"
												className="w-full"
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{PEOPLE_TIERS.map((t) => (
													<SelectItem key={t.value} value={t.value}>
														{t.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								</Field>
								<label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-admin-border p-3 transition-colors duration-150 ease-out hover:bg-admin-panel-raised">
									<input
										type="checkbox"
										checked={isPublic}
										onChange={(e) => setIsPublic(e.target.checked)}
										className="mt-0.5 h-4 w-4 rounded border-admin-border accent-[var(--admin-accent)]"
									/>
									<span className="text-sm text-admin-ink">
										Show on the public website (Team page, org chart)
									</span>
								</label>
								{isPublic && (
									<Field
										label="Public URL slug"
										hint={`Profile lives at /team/${slug || "…"}`}
									>
										{(p) => (
											<Input
												{...p}
												value={slug}
												onChange={(e) => setSlug(e.target.value)}
												placeholder="chenda-sok"
											/>
										)}
									</Field>
								)}
							</div>
						</FormSection>
					</>
				}
			/>
		</form>
	);
}
