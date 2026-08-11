import { createFileRoute } from "@tanstack/react-router";

// more specific than the catch-all /$ page route, so it wins; production with R2 never reaches it
async function handler({ request }: { request: Request }) {
	const name = new URL(request.url).pathname
		.replace(/^\/uploads\//, "")
		.replace(/\.\.+/g, ""); // no path traversal
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
