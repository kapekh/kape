import { useState } from "react";

import { useLang } from "#/lib/i18n";

// Floating-label fields: the label sits inside the control and lifts on focus /
// when filled, so every field keeps a persistent, visible label (placeholders
// alone vanish on the first keystroke) without adding a stacked-label row.
const input = "peer w-full rounded-xl border border-border bg-background px-4 pt-6 pb-2 text-sm transition placeholder-transparent focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30";
const floatLabel = "pointer-events-none absolute left-4 top-2 text-xs font-medium text-muted-foreground transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-[var(--accent)]";
// Textarea variant: label stays anchored at the top (a multi-line field is never
// vertically centered), still lifting to the accent colour on focus.
const areaLabel = "pointer-events-none absolute left-4 top-3 text-xs font-medium text-muted-foreground transition-colors peer-focus:text-[var(--accent)]";

export function ContactForm() {
	const { t } = useLang();
	const [f, setF] = useState({ name: "", email: "", phone: "", message: "", company: "" });
	const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		setStatus("sending");
		try {
			const res = await fetch("/api/forms/contact", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(f),
			});
			if (res.ok) {
				setStatus("sent");
				setF({ name: "", email: "", phone: "", message: "", company: "" });
			} else {
				setStatus("error");
			}
		} catch {
			setStatus("error");
		}
	}

	if (status === "sent") {
		return (
			<div className="rounded-2xl border border-[var(--palm)]/40 bg-[var(--palm)]/5 p-5 text-sm">
				Thank you — your message has been sent. We'll be in touch.
			</div>
		);
	}

	return (
		<form onSubmit={submit} className="flex flex-1 flex-col gap-3">
			{/* Honeypot — hidden from real users; bots that fill it are silently dropped server-side. */}
			<input
				type="text"
				name="company"
				tabIndex={-1}
				autoComplete="off"
				aria-hidden="true"
				className="absolute left-[-9999px] h-0 w-0 opacity-0"
				value={f.company}
				onChange={(e) => setF({ ...f, company: e.target.value })}
			/>
			<div className="grid sm:grid-cols-2 gap-3">
				<div className="relative">
					<input id="cf-name" className={input} name="name" autoComplete="name" placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
					<label htmlFor="cf-name" className={floatLabel}>Full name</label>
				</div>
				<div className="relative">
					<input id="cf-email" className={input} name="email" autoComplete="email" type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
					<label htmlFor="cf-email" className={floatLabel}>Email</label>
				</div>
			</div>
			<div className="relative">
				<input id="cf-phone" className={input} name="phone" autoComplete="tel" placeholder="Phone (optional)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
				<label htmlFor="cf-phone" className={floatLabel}>Phone (optional)</label>
			</div>
			<div className="relative flex flex-1 flex-col">
				<textarea id="cf-message" className={`${input} flex-1 min-h-0 pt-7`} name="message" rows={4} placeholder="Message" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} required />
				<label htmlFor="cf-message" className={areaLabel}>Message</label>
			</div>
			{status === "error" && <p className="text-sm text-destructive">Something went wrong. Please try again.</p>}
			<button type="submit" disabled={status === "sending"} className="rounded-full bg-primary text-primary-foreground px-7 py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
				{status === "sending" ? t("forms.sending", "Sending…") : t("forms.send", "Send message")}
			</button>
		</form>
	);
}
