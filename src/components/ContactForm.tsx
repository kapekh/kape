import { useState } from "react";

const input = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm";

export function ContactForm() {
	const [f, setF] = useState({ name: "", email: "", phone: "", message: "" });
	const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		setStatus("sending");
		const res = await fetch("/api/forms/contact", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(f),
		});
		if (res.ok) {
			setStatus("sent");
			setF({ name: "", email: "", phone: "", message: "" });
		} else {
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
			<div className="grid sm:grid-cols-2 gap-3">
				<input className={input} placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
				<input className={input} type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
			</div>
			<input className={input} placeholder="Phone (optional)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
			<textarea className={input} rows={4} placeholder="Message" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} required />
			{status === "error" && <p className="text-sm text-destructive">Something went wrong. Please try again.</p>}
			<button type="submit" disabled={status === "sending"} className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50">
				{status === "sending" ? "Sending…" : "Send message"}
			</button>
		</form>
	);
}
