import { createFileRoute } from "@tanstack/react-router";

import { parseCookies, SESSION_COOKIE, validateToken } from "#/server/auth";
import { db } from "#/server/db";
import { createMediaRecord } from "#/server/repo/admin";
import { saveUpload } from "#/server/storage";

async function handler({ request }: { request: Request }) {
	const url = new URL(request.url);
	const action = url.pathname.replace(/^\/api\/media\/?/, "");

	// Admin only.
	const cookies = parseCookies(request.headers.get("cookie"));
	const auth = await validateToken(db, cookies[SESSION_COOKIE]);
	if (!auth || auth.user.role !== "admin") {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (request.method === "POST" && action === "upload") {
		const form = await request.formData();
		const file = form.get("file");
		if (!(file instanceof File))
			return Response.json({ error: "No file" }, { status: 400 });

		// Reject oversized uploads before buffering the bytes into memory.
		const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
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
		const ext = (
			file.name.split(".").pop() ||
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
		const stored = await saveUpload(
			bytes,
			file.type || "application/octet-stream",
			ext,
		);
		const id = await createMediaRecord(db, {
			r2Key: stored.key,
			url: stored.url,
			contentType: file.type,
			size: file.size,
		});
		return Response.json({ id, url: stored.url });
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
