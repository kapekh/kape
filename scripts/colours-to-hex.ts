/**
 * One-shot: rewrite every stored colour setting as a hex.
 *
 * Run once per database, never from a form save. The conversion is lossy for
 * anything outside sRGB - an oklch() the display can show wider than #rrggbb
 * comes back clamped - so this is a decision about the site's stored values,
 * not a display convenience.
 *
 *   bun run scripts/colours-to-hex.ts <db>          # report only
 *   bun run scripts/colours-to-hex.ts <db> --write  # apply
 */
import { Database } from "bun:sqlite";

import { colourToHex, THEME_FIELDS } from "#/lib/site-theme";

const [path, ...flags] = Bun.argv.slice(2);
const write = flags.includes("--write");

if (!path) {
	console.error("usage: bun run scripts/colours-to-hex.ts <db> [--write]");
	process.exit(2);
}

const colourKeys = THEME_FIELDS.filter((f) => f.kind === "colour").map(
	(f) => f.key,
);

const db = write ? new Database(path) : new Database(path, { readonly: true });
const rows = db
	.query<{ key: string; value: string }, []>(
		`select key, value from site_settings where key in (${colourKeys.map((k) => `'${k}'`).join(",")})`,
	)
	.all();

let converted = 0;
let already = 0;
const skipped: string[] = [];

for (const { key, value } of rows) {
	const hex = colourToHex(value)?.toUpperCase();
	if (!hex) {
		skipped.push(`${key} = ${value}`);
		continue;
	}
	if (hex === value.toUpperCase()) {
		already++;
		continue;
	}
	console.log(`${key}: ${value} -> ${hex}`);
	converted++;
	if (write)
		db.run("update site_settings set value = ? where key = ?", [hex, key]);
}

console.log(
	`\n${rows.length} colour keys: ${converted} ${write ? "converted" : "would convert"}, ${already} already hex, ${skipped.length} left alone`,
);
for (const s of skipped) console.log(`  left alone: ${s}`);
if (!write && converted) console.log("\nnothing written. re-run with --write");
db.close();
