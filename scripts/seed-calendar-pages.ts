/**
 * Re-run the calendar pages and their footer buttons against an existing
 * database. The content lives in src/server/seed/pages-calendar.ts and is part
 * of `bun run seed:kape`; this is the standalone entry point for refreshing the
 * dates when a new sub-decree lands.
 */
import { seedCalendarPages } from "../src/server/seed/pages-calendar";

await seedCalendarPages();
process.exit(0);
