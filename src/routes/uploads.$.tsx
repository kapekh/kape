import { createFileRoute } from "@tanstack/react-router";

import { kstorage } from "#/server/storage";

// more specific than the catch-all /$ page route, so it wins; production with R2 never reaches it
async function handler({ request }: { request: Request }) {
	const name = new URL(request.url).pathname
		.replace(/^\/uploads\//, "")
		.replace(/\.\.+/g, ""); // no path traversal
	// a KOOMPI Cloud bucket holds them under the same names; a name never
	// changes its bytes, so browsers and Cloudflare may keep the answer
	if (kstorage)
		return new Response(null, {
			status: 301,
			headers: {
				location: kstorage.url(`uploads/${name}`),
				"cache-control": "public, max-age=31536000, immutable",
			},
		});
	const file = Bun.file(`public/uploads/${name}`);
	if (!(await file.exists())) return new Response("Not found", { status: 404 });
	return new Response(file);
}

export const Route = createFileRoute("/uploads/$")({
	server: {
		handlers: {
			GET: handler,
		},
	},
});
