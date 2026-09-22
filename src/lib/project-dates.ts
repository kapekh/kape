export const OPEN_ENDED = "open";

export function isProjectEndDate(value: string): boolean {
	if (value === "" || value === OPEN_ENDED) return true;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const d = new Date(`${value}T00:00:00Z`);
	// date rolls 2026-02-31 into march
	return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}
