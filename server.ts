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

// What Caddy did on the old host, for platforms with no proxy config of their own.
// REDIRECT_HOSTS="www.example.org=example.org" sends the first name to the second, 301.
const redirects = new Map(
	(process.env.REDIRECT_HOSTS ?? "")
		.split(",")
		.map((pair) => pair.split("=").map((h) => h.trim()))
		.filter((p): p is [string, string] => p.length === 2 && !!p[0] && !!p[1]),
);
// BASIC_AUTH_HOSTS="dev.example.org" with BASIC_AUTH="user:<bcrypt hash>" puts a
// staging host behind a password and keeps it out of search engines. The hash
// is `caddy hash-password` or Bun.password.hash(..., "bcrypt"), never plaintext.
const lockedHosts = new Set(
	(process.env.BASIC_AUTH_HOSTS ?? "")
		.split(",")
		.map((h) => h.trim())
		.filter(Boolean),
);
const [authUser, authHash] = (() => {
	const v = process.env.BASIC_AUTH ?? "";
	const at = v.indexOf(":");
	return at > 0 ? [v.slice(0, at), v.slice(at + 1)] : ["", ""];
})();
if (lockedHosts.size && !authHash)
	throw new Error("BASIC_AUTH_HOSTS is set but BASIC_AUTH is not user:<hash>");
// bcrypt at cost 14 is about a second; pay it once per credential, not per request
const passed = new Set<string>();
async function authorised(header: string | null): Promise<boolean> {
	if (!header?.startsWith("Basic ")) return false;
	if (passed.has(header)) return true;
	let decoded: string;
	try {
		decoded = atob(header.slice(6));
	} catch {
		return false;
	}
	const at = decoded.indexOf(":");
	if (at < 0 || decoded.slice(0, at) !== authUser) return false;
	const ok = await Bun.password
		.verify(decoded.slice(at + 1), authHash)
		.catch(() => false);
	if (ok) passed.add(header);
	return ok;
}

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
	async fetch(req) {
		const host = req.headers.get("host") ?? "";
		if (!hostAllowed(host)) {
			return new Response("Blocked request", { status: 403 });
		}
		const name = host.replace(/:\d+$/, "");
		const to = redirects.get(name);
		if (to) {
			const url = new URL(req.url);
			return Response.redirect(`https://${to}${url.pathname}${url.search}`, 301);
		}
		const locked = lockedHosts.has(name);
		if (locked && !(await authorised(req.headers.get("authorization")))) {
			return new Response("Authentication required", {
				status: 401,
				headers: {
					"www-authenticate": 'Basic realm="staging", charset="UTF-8"',
					"x-robots-tag": "noindex, nofollow",
				},
			});
		}
		let res: Response | null = null;
		if (req.method === "GET" || req.method === "HEAD") {
			res = staticFile(new URL(req.url).pathname);
		}
		res ??= await handler.fetch(req);
		if (locked) {
			res = new Response(res.body, res);
			res.headers.set("x-robots-tag", "noindex, nofollow");
		}
		return res;
	},
});

console.log(`listening on http://0.0.0.0:${port}`);
