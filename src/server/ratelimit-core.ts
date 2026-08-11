// no server-runtime imports, so it unit-tests under vitest, which cannot load Bun-only modules
type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

function bucketFor(key: string, windowMs: number, now: number): Bucket {
	const b = buckets.get(key);
	if (b && b.reset >= now) return b;
	const fresh = { count: 0, reset: now + windowMs };
	buckets.set(key, fresh);
	return fresh;
}

function sweep(now: number): void {
	// Opportunistic cleanup so the map can't grow unbounded under attack.
	if (buckets.size <= 10_000) return;
	for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
}

export function rateLimit(
	key: string,
	limit: number,
	windowMs: number,
): boolean {
	const now = Date.now();
	sweep(now);
	const b = bucketFor(key, windowMs, now);
	if (b.count >= limit) return false;
	b.count++;
	return true;
}

/** Record one occurrence in a fixed window and return the running count. */
export function countEvent(key: string, windowMs: number): number {
	const now = Date.now();
	sweep(now);
	const b = bucketFor(key, windowMs, now);
	b.count++;
	return b.count;
}

/** Current count for a key without recording anything. */
export function peekCount(key: string): number {
	const b = buckets.get(key);
	return b && b.reset >= Date.now() ? b.count : 0;
}

// a delay and never a refusal: a per-account hard block is a lockout anyone can trigger for someone else
export function backoffDelayMs(
	failures: number,
	threshold: number,
	maxMs: number,
): number {
	if (failures <= threshold) return 0;
	const steps = failures - threshold;
	return Math.min(maxMs, 100 * 2 ** (steps - 1));
}

/** Test seam: drop all buckets. */
export function resetLimiter(): void {
	buckets.clear();
}
