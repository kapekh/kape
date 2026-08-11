// takes the active language rather than pinning a locale

// en resolves to en-US; anything unmapped goes to Intl as-is
export function localeFor(lang: string | null | undefined): string {
	if (!lang) return "en-US";
	if (lang === "en") return "en-US";
	if (lang === "km") return "km-KH";
	return lang;
}

// CURRENT_TIMESTAMP is UTC with no zone marker, so it needs the Z; a bare date is a calendar day and must parse as local midnight
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

// Intl throws a RangeError on an unknown currency code out of the database
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
