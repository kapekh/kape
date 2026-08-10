/**
 * The admin's date and money formatting, in one place.
 *
 * Before this there were two of each: `toLocaleDateString(undefined, …)` on the
 * users and media lists against `toLocaleDateString("en-GB", …)` elsewhere, and
 * `Intl.NumberFormat("en-US", …)` in three separate copies. Same values, two
 * answers, depending on which screen you were on.
 *
 * Both take the active language rather than pinning a locale, so a Khmer admin
 * reads Khmer months and riel the way Khmer writes them.
 */

/**
 * BCP-47 tag for a site language code. `en` resolves to `en-US` because that is
 * what the screens already showed; anything unmapped is handed to Intl as-is,
 * which is right for a language this install added and we have never seen.
 */
export function localeFor(lang: string | null | undefined): string {
	if (!lang) return "en-US";
	if (lang === "en") return "en-US";
	if (lang === "km") return "km-KH";
	return lang;
}

/**
 * SQLite hands back three shapes. `CURRENT_TIMESTAMP` is `YYYY-MM-DD HH:MM:SS`
 * in UTC with no zone marker, so it needs the `Z` or it reads as local and
 * drifts by the offset. A bare `YYYY-MM-DD` is a calendar day and must be
 * parsed as local midnight, or a west-of-UTC reader sees the day before.
 */
function toDate(value: string | number | Date): Date | null {
	if (value instanceof Date)
		return Number.isNaN(value.getTime()) ? null : value;
	if (typeof value === "number") {
		const d = new Date(value);
		return Number.isNaN(d.getTime()) ? null : d;
	}
	const s = value.trim();
	let iso = s;
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) iso = `${s}T00:00:00`;
	else if (s.includes(" ") && !s.includes("T")) iso = `${s.replace(" ", "T")}Z`;
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? null : d;
}

/** Empty for nothing, the input untouched for something that is not a date. */
export function fmtDate(
	value: string | number | Date | null | undefined,
	lang: string | null | undefined,
): string {
	if (value == null || value === "") return "";
	const d = toDate(value);
	if (!d) return String(value);
	return new Intl.DateTimeFormat(localeFor(lang), {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(d);
}

/**
 * Whole units: these are campaign goals and totals, where the cents are noise.
 * The currency code comes out of the database, so a bad one has to degrade to
 * something readable instead of throwing the row away — `Intl` answers an
 * unknown code with a RangeError.
 */
export function fmtMoney(
	amount: number,
	currency: string,
	lang: string | null | undefined,
): string {
	if (!Number.isFinite(amount)) return "";
	const locale = localeFor(lang);
	try {
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency,
			maximumFractionDigits: 0,
		}).format(amount);
	} catch {
		const n = new Intl.NumberFormat(locale, {
			maximumFractionDigits: 0,
		}).format(amount);
		return currency ? `${currency} ${n}` : n;
	}
}
