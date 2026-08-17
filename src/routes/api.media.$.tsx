import { createFileRoute } from "@tanstack/react-router";

import { parseCookies, SESSION_COOKIE, validateToken } from "#/server/auth";
import { db } from "#/server/db";
import { imageSize } from "#/server/image-size";
import {
	bytesMatchExtension,
	contentTypeForExtension,
} from "#/server/magic-bytes";
import { createMediaRecord } from "#/server/repo/admin";
import { resolvePermissions } from "#/server/repo/roles";
import { saveUpload } from "#/server/storage";

async function handler({ request }: { request: Request }) {
	const url = new URL(request.url);
	const action = url.pathname.replace(/^\/api\/media\/?/, "");

	// Same gate as adminMedia over tRPC: the `media` permission area, not a
	// literal role string, so any role that can list/delete media can upload too.
	const cookies = parseCookies(request.headers.get("cookie"));
	const auth = await validateToken(db, cookies[SESSION_COOKIE]);
	if (!auth) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}
	const perms = await resolvePermissions(db, auth.user.role);
	if (!perms.isSuperAdmin && !perms.permissions.includes("media")) {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}

	if (request.method === "POST" && action === "upload") {
		const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
		// formData() buffers the whole body, so the declared length is the only
		// place to stop a huge one before it is in memory
		const declared = Number(request.headers.get("content-length"));
		if (Number.isFinite(declared) && declared > MAX_BYTES + 1024 * 1024) {
			return Response.json(
				{ error: "File too large (max 50 MB)" },
				{ status: 413 },
			);
		}
		// Malformed multipart (an empty filename is enough) makes formData() throw.
		// The body is attacker-controlled, so that has to be a 400, not a crash.
		const form = await request.formData().catch(() => null);
		if (!form) {
			return Response.json({ error: "Malformed upload" }, { status: 400 });
		}
		const file = form.get("file");
		// a zero-length part arrives with a blank name, so it would otherwise be
		// reported as no file at all to someone who did pick one.
		if (file instanceof File && file.size === 0)
			return Response.json({ error: "That file is empty" }, { status: 400 });
		if (!(file instanceof File) || !file.name)
			return Response.json({ error: "No file" }, { status: 400 });

		if (file.size > MAX_BYTES) {
			return Response.json(
				{ error: "File too large (max 50 MB)" },
				{ status: 413 },
			);
		}
		// Allow-list of safe upload types (images, documents, video). Excludes SVG
		// and HTML, which can carry script when served from our own origin.
		const ALLOWED_EXT = new Set([
			"png",
			"jpg",
			"jpeg",
			"webp",
			"gif",
			"avif",
			"pdf",
			"doc",
			"docx",
			"xls",
			"xlsx",
			"ppt",
			"pptx",
			"mp4",
			"webm",
		]);
		// `pop()` on a name with no dot returns the whole name, so an
		// extension-less upload would never reach the `file.type` fallback
		const ext = (
			(file.name.includes(".") ? file.name.split(".").pop() : "") ||
			file.type.split("/").pop() ||
			"bin"
		).toLowerCase();
		if (!ALLOWED_EXT.has(ext)) {
			return Response.json(
				{ error: `File type ".${ext}" is not allowed` },
				{ status: 415 },
			);
		}
		const bytes = new Uint8Array(await file.arrayBuffer());
		// The allow-list and `file.type` are both client-controlled; verify the
		// leading bytes actually match the extension before storing.
		if (!bytesMatchExtension(ext, bytes)) {
			return Response.json(
				{ error: `File contents do not match ".${ext}"` },
				{ status: 415 },
			);
		}
		const type = contentTypeForExtension(ext);
		const stored = await saveUpload(bytes, type, ext);
		const dims = imageSize(bytes);
		const id = await createMediaRecord(db, {
			r2Key: stored.key,
			url: stored.url,
			contentType: type,
			size: file.size,
			width: dims?.width,
			height: dims?.height,
		});
		return Response.json({
			id,
			url: stored.url,
			width: dims?.width ?? null,
			height: dims?.height ?? null,
		});
	}

	return Response.json({ error: "Not found" }, { status: 404 });
}

export const Route = createFileRoute("/api/media/$")({
	server: {
		handlers: {
			POST: handler,
		},
	},
});
