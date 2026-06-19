import nodemailer from "nodemailer";

import { env } from "#/env";

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
	const subject = `KAPE website contact — ${msg.name}`;
	const text = `Name: ${msg.name}\nEmail: ${msg.email}\nPhone: ${msg.phone ?? "-"}\n\n${msg.message}`;

	if (!transport) {
		console.log(`[mail] (SMTP not configured) would send to ${env.MAIL_TO}:\n${subject}\n${text}`);
		return;
	}
	await transport.sendMail({
		from: env.MAIL_FROM ?? env.SMTP_USER,
		to: env.MAIL_TO,
		replyTo: msg.email,
		subject,
		text,
	});
}
