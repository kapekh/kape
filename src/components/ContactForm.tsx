import { useState } from "react";

import { useLang } from "#/lib/i18n";

const input = "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30";

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
		<form onSubmit={submit} className="space-y-3">
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
				<input className={input} aria-label="Full name" placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
				<input className={input} aria-label="Email" type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
			</div>
			<input className={input} aria-label="Phone (optional)" placeholder="Phone (optional)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
			<textarea className={input} aria-label="Message" rows={4} placeholder="Message" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} required />
			{status === "error" && <p className="text-sm text-destructive">Something went wrong. Please try again.</p>}
			<button type="submit" disabled={status === "sending"} className="rounded-full bg-primary text-primary-foreground px-7 py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
				{status === "sending" ? t("forms.sending", "Sending…") : t("forms.send", "Send message")}
			</button>
		</form>
	);
}
