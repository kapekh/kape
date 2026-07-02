import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { ATTACHMENT_EXTS, ATTACHMENT_MAX_BYTES, type FormField, isFormClosed } from "@/lib/forms";
import { useLang } from "@/lib/i18n";
import { PublicRichText } from "./PublicRichText";

type FormData = NonNullable<Awaited<ReturnType<typeof trpcClient.forms.bySlug.query>>>;

const field = "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30";

/** Renders an admin-defined form (by slug) on the public site: fields + submit. */
export function FormRenderer({ slug }: { slug: string }) {
	const { lang } = useLang();
	const [form, setForm] = useState<FormData | null | undefined>(undefined); // undefined = loading, null = not found
	const [values, setValues] = useState<Record<string, string>>({});
	const [files, setFiles] = useState<Record<string, File | null>>({});
	const [company, setCompany] = useState(""); // honeypot
	const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let alive = true;
		trpcClient.forms.bySlug.query({ slug }).then((f) => alive && setForm(f)).catch(() => alive && setForm(null));
		return () => { alive = false; };
	}, [slug]);

	if (form === undefined) return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading…</div>;
	if (!form) return null;

	if (isFormClosed(form.deadline)) {
		return (
			<div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6 text-sm text-foreground/80">
				This form is now closed and no longer accepting responses. Thank you for your interest.
			</div>
		);
	}

	const deadlineLabel = form.deadline
		? new Date(`${form.deadline}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
		: null;
	const labelOf = (f: FormField) => (lang === "km" ? f.labelKm || f.label : f.label);
	const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

	if (status === "sent") {
		return (
			<div className="rounded-2xl border border-[var(--palm)]/40 bg-[var(--palm)]/5 p-6 text-sm">
				{form.successMessage || "Thank you — your response has been recorded."}
			</div>
		);
	}

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		// Friendly client-side guard before uploading megabytes.
		for (const [, file] of Object.entries(files)) {
			if (file && file.size > ATTACHMENT_MAX_BYTES) {
				setError(`“${file.name}” is too large (max 10 MB).`);
				setStatus("error");
				return;
			}
		}
		setStatus("sending");
		setError(null);
		try {
			// Multipart so file fields ride along; the browser sets the boundary header.
			const fd = new FormData();
			for (const [k, v] of Object.entries(values)) fd.append(k, v);
			fd.append("company", company);
			for (const [k, file] of Object.entries(files)) if (file) fd.append(k, file);
			const res = await fetch(`/api/forms/${form!.slug}`, { method: "POST", body: fd });
			const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
			if (res.ok && d.ok) {
				setStatus("sent");
			} else {
				setError(d.error || "Something went wrong. Please try again.");
				setStatus("error");
			}
		} catch {
			setError("Network error. Please check your connection and try again.");
			setStatus("error");
		}
	}

	// The form's own title + intro (built in /admin/forms) — so an embed shows the
	// real form content, not section-level copy the editor would have to duplicate.
	const headTitle = lang === "km" && form.titleKm ? form.titleKm : form.title;
	const headIntro = lang === "km" && form.introKm ? form.introKm : form.intro;

	return (
		<form onSubmit={submit} className="space-y-4">
			{(headTitle || headIntro) && (
				<header className="mb-2">
					{headTitle && <h2 className={`font-display text-2xl font-semibold text-primary ${lang === "km" ? "font-khmer" : ""}`}>{headTitle}</h2>}
					{headIntro && <p className={`mt-1.5 text-sm leading-relaxed text-foreground/70 ${lang === "km" ? "font-khmer" : ""}`}>{headIntro}</p>}
				</header>
			)}
			{/* Honeypot */}
			<input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 opacity-0" value={company} onChange={(e) => setCompany(e.target.value)} />

			{form.fields.map((f, idx) => {
				const id = `f_${f.key}_${idx}`;
				const rk = `${f.key}-${idx}`; // unique React key (legacy forms may have duplicate field keys)
				const km = lang === "km" ? "font-khmer" : "";
				if (f.type === "content") {
						// Author content block — formatted text/instructions, not an input.
						// Rendered HTML is server-produced from the trusted admin editor.
						return f.contentHtml ? (
							// biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered, trusted author content
							<div key={rk} className="prose-kape text-sm text-foreground/80" dangerouslySetInnerHTML={{ __html: f.contentHtml }} />
						) : null;
					}
					if (f.type === "checkbox") {
					return (
						<label key={rk} className="flex items-start gap-2.5 text-sm">
							<input id={id} type="checkbox" checked={values[f.key] === "Yes"} onChange={(e) => set(f.key, e.target.checked ? "Yes" : "")} className="mt-0.5 h-4 w-4 rounded border-border accent-[var(--accent)]" />
							<span className={km}>{labelOf(f)}{f.required && <span className="text-destructive"> *</span>}</span>
						</label>
					);
				}
				return (
					<div key={rk}>
						<label htmlFor={id} className={`mb-1 block text-sm font-medium text-foreground/80 ${km}`}>{labelOf(f)}{f.required && <span className="text-destructive"> *</span>}</label>
						{f.type === "file" ? (
							<>
								<input
									id={id}
									name={f.key}
									type="file"
									required={f.required}
									accept={ATTACHMENT_EXTS.map((e) => `.${e}`).join(",")}
									onChange={(e) => setFiles((p) => ({ ...p, [f.key]: e.target.files?.[0] ?? null }))}
									className={`${field} cursor-pointer file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-[var(--accent)]/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--accent)]`}
								/>
								<p className="mt-1 text-xs text-muted-foreground">Up to 10 MB · {ATTACHMENT_EXTS.join(", ")}</p>
							</>
						) : f.type === "richtext" ? (
							<PublicRichText value={values[f.key] ?? ""} onChange={(json) => set(f.key, json)} km={lang === "km"} />
						) : f.type === "textarea" ? (
							<textarea id={id} name={f.key} rows={4} required={f.required} placeholder={f.placeholder} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} className={`${field} ${km}`} />
						) : f.type === "select" ? (
							<select id={id} name={f.key} required={f.required} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} className={field}>
								<option value="">{f.placeholder || "— Select —"}</option>
								{(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
							</select>
						) : (
							<input id={id} name={f.key} type={f.type === "number" ? "number" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"} required={f.required} placeholder={f.placeholder} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} className={`${field} ${km}`} />
						)}
					</div>
				);
			})}

			{status === "error" && <p className="text-sm text-destructive">{error}</p>}

			<div className="flex flex-wrap items-center gap-3">
				<button type="submit" disabled={status === "sending"} className="rounded-full bg-primary text-primary-foreground px-7 py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
					{status === "sending" ? "Sending…" : form.submitLabel || "Submit"}
				</button>
				{deadlineLabel && <span className="text-xs text-muted-foreground">Closes {deadlineLabel}</span>}
			</div>
		</form>
	);
}
