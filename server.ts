// not `vite preview`: it stamps html `content-encoding: identity`, so the proxy never compresses
import { statSync } from "node:fs";
import { normalize, resolve } from "node:path";

type Handler = { fetch(req: Request): Response | Promise<Response> };

// variable path: dist/ is untyped and absent until `bun run build:app`
const ENTRY = "./dist/server/server.js";
const { default: handler } = (await import(ENTRY)) as { default: Handler };

const CLIENT = resolve("dist/client");
const port = Number(process.env.PORT ?? 3000);

const allowedHosts = (process.env.ALLOWED_HOSTS ?? "")
	.split(",")
	.map((h) => h.trim())
	.filter(Boolean);
// ssr loaders call this same server over loopback, so loopback always passes
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);
const hostAllowed = (host: string) => {
	const name = host.replace(/:\d+$/, "");
	return (
		allowedHosts.length === 0 ||
		LOOPBACK.has(name) ||
		allowedHosts.includes(name)
	);
};

const IMMUTABLE = "public, max-age=31536000, immutable";
const SHORT = "public, max-age=3600";

function staticFile(pathname: string): Response | null {
	let rel: string;
	try {
		rel = normalize(decodeURIComponent(pathname));
	} catch {
		return null;
	}
	const abs = resolve(CLIENT, `.${rel}`);
	if (!abs.startsWith(`${CLIENT}/`)) return null;
	try {
		if (!statSync(abs).isFile()) return null;
	} catch {
		return null;
	}
	return new Response(Bun.file(abs), {
		headers: {
			"cache-control": rel.startsWith("/assets/") ? IMMUTABLE : SHORT,
		},
	});
}

Bun.serve({
	port,
	hostname: "0.0.0.0",
	idleTimeout: 120,
	fetch(req) {
		if (!hostAllowed(req.headers.get("host") ?? "")) {
			return new Response("Blocked request", { status: 403 });
		}
		if (req.method === "GET" || req.method === "HEAD") {
			const file = staticFile(new URL(req.url).pathname);
			if (file) return file;
		}
		return handler.fetch(req);
	},
});

console.log(`listening on http://0.0.0.0:${port}`);
