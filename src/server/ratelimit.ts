/**
 * Abuse control for public endpoints (login, contact form, newsletter, payment
 * webhook). Fixed-window, in-memory: sufficient for a single-instance
 * deployment; swap for a shared store (Redis/DB) if you scale horizontally.
 * Server-only.
 */
import { getRequestIP } from "@tanstack/react-start/server";

import { env } from "#/env";

export {
	backoffDelayMs,
	countEvent,
	peekCount,
	rateLimit,
	resetLimiter,
} from "./ratelimit-core";

function peerAddress(): string {
	try {
		return getRequestIP() ?? "unknown";
	} catch {
		return "unknown";
	}
}

/** Loopback or RFC1918/RFC4193 - i.e. not an address a real internet client has. */
function isLocalAddress(ip: string): boolean {
	const addr = ip.replace(/^::ffff:/i, "").replace(/%.*$/, "");
	if (addr === "unknown") return true;
	if (addr === "::1" || addr === "127.0.0.1") return true;
	if (/^127\./.test(addr)) return true;
	if (/^10\./.test(addr)) return true;
	if (/^192\.168\./.test(addr)) return true;
	if (/^172\.(1[6-9]|2\d|3[01])\./.test(addr)) return true;
	if (/^f[cd][0-9a-f]{2}:/i.test(addr)) return true;
	return false;
}

let warnedUndeclaredProxy = false;

/**
 * Every request arriving from a local address means something in front is
 * relaying them, and with no declared header the whole user base shares one
 * rate-limit bucket. That fails closed, so it shows up as a site-wide lockout in
 * production and nowhere else. Say so once, naming the fix.
 */
function warnIfProxyUndeclared(peer: string): void {
	if (warnedUndeclaredProxy || env.TRUSTED_PROXY_HEADER) return;
	// In dev every request is loopback, so the signal means nothing there.
	if (process.env.NODE_ENV !== "production") return;
	if (!isLocalAddress(peer)) return;
	warnedUndeclaredProxy = true;
	console.warn(
		`[ratelimit] Requests are arriving from a local/private address (${peer}) and ` +
			"TRUSTED_PROXY_HEADER is unset. If a reverse proxy or CDN sits in front, every visitor " +
			"now shares ONE rate-limit bucket, and logins and contact-form posts will start failing " +
			"for everyone at once. Fix: set TRUSTED_PROXY_HEADER to the header your proxy sets " +
			"(cf-connecting-ip for Cloudflare, x-forwarded-for for nginx/Caddy/Traefik). See README " +
			"'Running behind a proxy'. If nothing is in front of the app (container NAT can also look " +
			"like this), no action is needed.",
	);
}

/**
 * The client address to key rate limits on.
 *
 * Defaults to the socket peer address, which the caller cannot forge. Proxy
 * headers (`x-forwarded-for`, `cf-connecting-ip`, …) are caller-controlled: a
 * limiter keyed on one is no limiter at all, because rotating the header buys a
 * fresh bucket per request. So a header is read only when the operator names it
 * in TRUSTED_PROXY_HEADER, declaring that a proxy sets it and that the app
 * cannot be reached around that proxy.
 *
 * Within that header the RIGHTMOST element wins. An appending proxy (Caddy,
 * Traefik, and nginx's usual `$proxy_add_x_forwarded_for` recipe) produces
 * "<what the caller sent>, <real client>", so the leftmost element is the
 * caller's own value and keying on it restores the exact bypass the header was
 * meant to close. The rightmost is the one the nearest trusted proxy appended.
 * A single-value overwriting header (`cf-connecting-ip`) is unaffected: it is
 * both leftmost and rightmost.
 */
export function clientIp(request: Request): string {
	const header = env.TRUSTED_PROXY_HEADER;
	if (header) {
		const forwarded = request.headers.get(header);
		if (forwarded) {
			const parts = forwarded
				.split(",")
				.map((p) => p.trim())
				.filter(Boolean);
			const nearest = parts.at(-1);
			if (nearest) return nearest;
		}
	}
	const peer = peerAddress();
	warnIfProxyUndeclared(peer);
	return peer;
}
