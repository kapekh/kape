/**
 * Slice 8: the staff portal at /internalsources (`internal.`). Behind a staff
 * login, so not a visitor surface - the lowest-priority slice, and the one
 * easiest to drop if the round narrows.
 *
 * English only. The audience reads Khmer, but a guessed column header is worse
 * than the honest English fallback - the Khmer lands from a staff translator
 * through /admin/ui-strings. `common.loading` stays the forms slice's key.
 */
export const internal: Record<string, { en: string; km?: string }> = {
	"internal.calendar": { en: "Calendar" },
	"internal.checking": { en: "Checking access…" },
	"internal.directory": { en: "Directory" },
	"internal.documents": { en: "Documents" },
	"internal.logout": { en: "Log out" },
	"internal.news": { en: "News Feed" },

	"internal.calendar.col.end": { en: "End" },
	"internal.calendar.col.event": { en: "Event" },
	"internal.calendar.col.program": { en: "Program" },
	"internal.calendar.col.start": { en: "Start" },
	"internal.calendar.title": { en: "Calendar of Events" },

	"internal.directory.col.email": { en: "Email" },
	"internal.directory.col.id": { en: "ID" },
	"internal.directory.col.nameEn": { en: "Name (EN)" },
	"internal.directory.col.nameKm": { en: "Name (KH)" },
	"internal.directory.col.phone": { en: "Phone" },
	"internal.directory.col.program": { en: "Program" },
	"internal.directory.col.sex": { en: "Sex" },
	"internal.directory.title": { en: "Staff Directory" },

	"internal.documents.empty": { en: "No documents." },
	"internal.documents.nofile": { en: "no file" },
	"internal.documents.open": { en: "Open" },
	"internal.documents.title": { en: "Internal Documents" },

	"internal.news.empty": { en: "No internal news." },
	"internal.news.title": { en: "Internal News Feed" },
};
