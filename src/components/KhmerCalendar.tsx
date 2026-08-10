import { useEffect, useState } from "react";

import { useLang } from "@/lib/i18n";

const KM_DIGITS = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];

// Chrome carries no `km` locale data at all (supportedLocalesOf("km") is empty
// as of 149), so Intl answers a Khmer request in English. This calendar's own
// Khmer names have to be spelled out; the Gregorian line below can use Intl.
const KM_MONTHS = [
	"មករា",
	"កុម្ភៈ",
	"មីនា",
	"មេសា",
	"ឧសភា",
	"មិថុនា",
	"កក្កដា",
	"សីហា",
	"កញ្ញា",
	"តុលា",
	"វិច្ឆិកា",
	"ធ្នូ",
];

const KM_WEEKDAYS = ["អា", "ច", "អ", "ព", "ព្រ", "សុ", "ស"];

const toKhmer = (n: number) =>
	String(n).replace(/\d/g, (d) => KM_DIGITS[Number(d)]);

const arrow =
	"grid h-7 w-7 place-items-center rounded-full border border-primary-foreground/25 transition hover:bg-[var(--secondary)] hover:text-primary";

export function KhmerCalendar() {
	const { lang, t } = useLang();
	const [today, setToday] = useState<Date | null>(null);
	const [cursor, setCursor] = useState<{ year: number; month: number } | null>(
		null,
	);

	// Client-only: the footer is prerendered and render-cached, so a server-side
	// "today" would freeze into the static HTML and go stale.
	useEffect(() => {
		const now = new Date();
		setToday(now);
		setCursor({ year: now.getFullYear(), month: now.getMonth() });
	}, []);

	function shift(delta: number) {
		setCursor((c) => {
			if (!c) return c;
			const m = c.month + delta;
			if (m < 0) return { year: c.year - 1, month: 11 };
			if (m > 11) return { year: c.year + 1, month: 0 };
			return { year: c.year, month: m };
		});
	}

	const monthStart = cursor ? new Date(cursor.year, cursor.month, 1) : null;
	const startDow = monthStart?.getDay() ?? 0;
	// "en" behind the site language so a language the browser has no data for
	// lands on English rather than on whatever locale the browser prefers
	const localMonth = monthStart
		? new Intl.DateTimeFormat([lang, "en"], {
				month: "long",
				year: "numeric",
			}).format(monthStart)
		: "";
	const days = cursor
		? Array.from(
				{ length: new Date(cursor.year, cursor.month + 1, 0).getDate() },
				(_, i) => i + 1,
			)
		: [];
	const isToday = (d: number) =>
		!!today &&
		!!cursor &&
		today.getDate() === d &&
		today.getMonth() === cursor.month &&
		today.getFullYear() === cursor.year;

	return (
		<div className="mt-8">
			<h2 className="font-display text-lg font-semibold text-[var(--secondary)]">
				{t("footer.calendar", "ប្រតិទិនខ្មែរ · Khmer Calendar")}
			</h2>
			<div className="mt-3 min-h-[15rem] max-w-sm rounded-2xl border border-primary-foreground/20 bg-primary-foreground/5 p-4">
				{cursor && (
					<>
						<div className="flex items-center justify-between gap-2">
							<button
								type="button"
								onClick={() => shift(-1)}
								aria-label={t("calendar.prev", "Previous month")}
								className={arrow}
							>
								‹
							</button>
							<div className="text-center">
								<div className="font-khmer text-sm font-semibold text-[var(--secondary)]">
									{t("calendar.buddhistDate", "ខែ{month} ឆ្នាំ {year} ព.ស.", {
										month: KM_MONTHS[cursor.month],
										year: toKhmer(cursor.year + 543),
									})}
								</div>
								<div className="text-[11px] opacity-70">{localMonth}</div>
							</div>
							<button
								type="button"
								onClick={() => shift(1)}
								aria-label={t("calendar.next", "Next month")}
								className={arrow}
							>
								›
							</button>
						</div>

						<div className="mt-3 grid grid-cols-7 gap-1 text-center font-khmer text-[10px] opacity-70">
							{KM_WEEKDAYS.map((d) => (
								<div key={d}>{d}</div>
							))}
						</div>
						<div className="mt-1 grid grid-cols-7 gap-1 text-center text-[11px]">
							{days.map((d) => (
								<div
									key={d}
									style={
										d === 1 ? { gridColumnStart: startDow + 1 } : undefined
									}
									className={`grid aspect-square place-items-center rounded-md ${
										isToday(d)
											? "bg-[var(--secondary)] font-bold text-primary"
											: "hover:bg-primary-foreground/10"
									}`}
								>
									<span className="font-khmer">{toKhmer(d)}</span>
								</div>
							))}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
