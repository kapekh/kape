import { createFileRoute } from "@tanstack/react-router";

import {
	ATTACHMENT_EXTS,
	ATTACHMENT_MAX_BYTES,
	isFormClosed,
	validateSubmission,
} from "#/lib/forms";
import { db } from "#/server/db";
import { sendContactEmail } from "#/server/mail";
import { clientIp, rateLimit } from "#/server/ratelimit";
import {
	addSubscriber,
	createContactSubmission,
	createFormSubmission,
	getFormBySlug,
} from "#/server/repo/forms";
import { renderBasicRichText } from "#/server/richtext";
import { saveUpload } from "#/server/storage";

function ok(v: unknown) {
	return typeof v === "string" && v.trim().length > 0;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validEmail = (v: unknown) =>
	typeof v === "string" && EMAIL_RE.test(v.trim()) && v.length <= 254;

const ATTACH_EXT = new Set(ATTACHMENT_EXTS);

/** Validate + persist a single form attachment. Returns the servable URL or an error. */
async function saveFormAttachment(
	file: File,
): Promise<{ url: string } | { error: string; status: number }> {
	if (file.size > ATTACHMENT_MAX_BYTES)
		return { error: "Attachment is too large (max 10 MB).", status: 413 };
	const ext = (
		file.name.split(".").pop() ||
		file.type.split("/").pop() ||
		"bin"
	).toLowerCase();
	if (!ATTACH_EXT.has(ext))
		return { error: `File type ".${ext}" is not allowed.`, status: 415 };
	const bytes = new Uint8Array(await file.arrayBuffer());
	const stored = await saveUpload(
		bytes,
		file.type || "application/octet-stream",
		ext,
	);
	return { url: stored.url };
}

async function handler({ request }: { request: Request }) {
	const action = new URL(request.url).pathname.replace(/^\/api\/forms\/?/, "");

	// Forms with file fields POST multipart/form-data; everything else posts JSON.
	const contentType = request.headers.get("content-type") || "";
	let body: Record<string, unknown> = {};
	const fileEntries: Record<string, File> = {};
	if (contentType.includes("multipart/form-data")) {
		const fd = await request.formData().catch(() => null);
		if (fd) {
			for (const [k, v] of fd.entries()) {
				if (typeof v === "string") body[k] = v;
				else fileEntries[k] = v as File;
			}
		}
	} else {
		body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	}

	// Honeypot: a hidden field real users never fill. Pretend success so bots
	// don't learn they were caught, but store nothing.
	if (ok(body.company)) return Response.json({ ok: true });

	// Abuse control: cap submissions per IP. 429 tells well-behaved clients to back off.
	const ip = clientIp(request);
	if (!rateLimit(`forms:${action}:${ip}`, 5, 60_000)) {
		return Response.json(
			{ error: "Too many requests. Please try again shortly." },
			{ status: 429 },
		);
	}

	const s = (v: unknown) => (typeof v === "string" ? v : "");

	if (action === "contact") {
		if (!ok(body.name) || !validEmail(body.email) || !ok(body.message)) {
			return Response.json(
				{ error: "Missing or invalid fields" },
				{ status: 400 },
			);
		}
		const name = s(body.name);
		const email = s(body.email).trim();
		const phone = s(body.phone);
		const message = s(body.message);
		await createContactSubmission(db, {
			name: name.slice(0, 200),
			email,
			phone: phone.slice(0, 50) || undefined,
			message: message.slice(0, 5000),
		});
		try {
			await sendContactEmail({ name, email, phone, message });
		} catch (e) {
			console.error("[mail] send failed", e); // submission is still stored
		}
		return Response.json({ ok: true });
	}

	if (action === "subscribe") {
		if (!validEmail(body.email))
			return Response.json({ error: "Valid email required" }, { status: 400 });
		await addSubscriber(db, s(body.email).trim());
		return Response.json({ ok: true });
	}

	// Generic builder-defined form: the action segment is the form's slug.
	const form = await getFormBySlug(db, action);
	if (form) {
		if (isFormClosed(form.deadline))
			return Response.json(
				{ error: "This form is closed and no longer accepting responses." },
				{ status: 403 },
			);
		// Validate text + files together (so a required file field is enforced).
		const err = validateSubmission(form.fields, { ...body, ...fileEntries });
		if (err) return Response.json({ error: err }, { status: 400 });
		const data: Record<string, string> = {};
		for (const f of form.fields) {
			if (f.type === "content") continue; // author content, never submitted
			if (f.type === "file") {
				const file = fileEntries[f.key];
				if (!file || file.size === 0) continue;
				const saved = await saveFormAttachment(file);
				if ("error" in saved)
					return Response.json(
						{ error: saved.error },
						{ status: saved.status },
					);
				data[f.key] = saved.url;
				data[`${f.key}__name`] = file.name.slice(0, 200); // original filename, for the inbox
				continue;
			}
			const v = body[f.key];
			if (v == null || v === "") continue;
			if (f.type === "richtext") {
				// Untrusted ProseMirror JSON → safe HTML via the restricted allow-list.
				const html = renderBasicRichText(String(v).slice(0, 50_000));
				if (html) data[f.key] = html;
				continue;
			}
			data[f.key] = String(v).slice(0, 5000);
		}
		await createFormSubmission(db, form.id, data);
		return Response.json({ ok: true });
	}

	return Response.json({ error: "Not found" }, { status: 404 });
}

export const Route = createFileRoute("/api/forms/$")({
	server: {
		handlers: {
			POST: handler,
		},
	},
});
