import nodemailer from "nodemailer";

import { env } from "#/env";
import { siteName } from "#/lib/site-identity";
import { db } from "./db";
import { getSettings } from "./repo/site";

/**
 * Sends mail via SMTP (e.g. Gmail) when configured. In dev without SMTP creds,
 * it logs the message instead of failing, so the contact form still works.
 * Server-only.
 */
const transport =
	env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
		? nodemailer.createTransport({
				host: env.SMTP_HOST,
				port: env.SMTP_PORT ?? 587,
				secure: (env.SMTP_PORT ?? 587) === 465,
				auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
			})
		: null;

export async function sendContactEmail(msg: {
	name: string;
	email: string;
	phone?: string;
	message: string;
}): Promise<void> {
	// Strip CR/LF from anything that lands in a header (subject, replyTo) so a
	// crafted name/email can't inject extra SMTP headers (BCC, etc.).
	const header = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
	const subject = header(
		`${siteName(await getSettings(db))} website contact — ${msg.name}`,
	);
	const replyTo = header(msg.email);
	const text = `Name: ${msg.name}\nEmail: ${msg.email}\nPhone: ${msg.phone ?? "-"}\n\n${msg.message}`;

	if (!transport || !env.MAIL_TO) {
		console.log(
			`[mail] (${transport ? "MAIL_TO unset" : "SMTP not configured"}) would send to ${env.MAIL_TO || "nobody"}:\n${subject}\n${text}`,
		);
		return;
	}
	await transport.sendMail({
		from: env.MAIL_FROM ?? env.SMTP_USER,
		to: env.MAIL_TO,
		replyTo,
		subject,
		text,
	});
}
