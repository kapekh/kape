/**
 * Tiny fixed-window, in-memory rate limiter for abuse control on public
 * endpoints (contact form, newsletter). Sufficient for a single-instance
 * deployment; swap for a shared store (Redis/DB) if you scale horizontally.
 * Server-only.
 */
type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

/** Best-effort client IP from common proxy headers (Cloudflare, generic proxies). */
export function clientIp(request: Request): string {
	const h = request.headers;
	return (
		h.get("cf-connecting-ip") ||
		h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		h.get("x-real-ip") ||
		"unknown"
	);
}

/**
 * Returns true if the action is allowed, false once the limit is exceeded
 * within the window. `key` should scope the action (e.g. `contact:<ip>`).
 */
export function rateLimit(
	key: string,
	limit: number,
	windowMs: number,
): boolean {
	const now = Date.now();
	// Opportunistic cleanup so the map can't grow unbounded under attack.
	if (buckets.size > 10_000) {
		for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
	}
	const b = buckets.get(key);
	if (!b || b.reset < now) {
		buckets.set(key, { count: 1, reset: now + windowMs });
		return true;
	}
	if (b.count >= limit) return false;
	b.count++;
	return true;
}
