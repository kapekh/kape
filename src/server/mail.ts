import nodemailer from "nodemailer";

import { env } from "#/env";
import { siteName } from "#/lib/site-identity";
import { db } from "./db";
import { getSettings } from "./repo/site";

/**
 * Sends mail via SMTP (e.g. Gmail) when configured. Without SMTP credentials the
 * message is stored and logged rather than sent, so the contact form still works
 * in dev - but that is a misconfiguration in production, so say so loudly.
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

if (!transport)
	console.warn(
		"[mail] SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS). Contact form " +
			"submissions will be stored and readable at /admin/messages, but nobody will " +
			"be emailed about them. See .env.example.",
	);

export async function sendContactEmail(msg: {
	name: string;
	email: string;
	phone?: string;
	message: string;
}): Promise<void> {
	// Strip CR/LF from anything that lands in a header (subject, replyTo) so a
	// crafted name/email can't inject extra SMTP headers (BCC, etc.).
	const header = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
	const settings = await getSettings(db);
	const subject = header(`${siteName(settings)} website contact — ${msg.name}`);
	const replyTo = header(msg.email);
	const text = `Name: ${msg.name}\nEmail: ${msg.email}\nPhone: ${msg.phone ?? "-"}\n\n${msg.message}`;

	// An operator who filled in the site's public contact address has already said
	// where mail about the site should go; MAIL_TO only has to override that.
	const to = env.MAIL_TO.trim() || settings.contact_email?.trim() || "";

	if (!transport || !to) {
		console.warn(
			`[mail] NOT SENT - ${transport ? "no recipient: set MAIL_TO, or a contact_email in /admin/settings" : "SMTP is not configured"}. ` +
				`The submission is stored and readable at /admin/messages.\n${subject}\n${text}`,
		);
		return;
	}
	await transport.sendMail({
		from: env.MAIL_FROM ?? env.SMTP_USER,
		to,
		replyTo,
		subject,
		text,
	});
}
