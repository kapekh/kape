// One-off: copy a local SQLite file (a VACUUM INTO snapshot of the old host's
// cms.db) into an empty libSQL/Turso database, schema and rows, unchanged.
// __drizzle_migrations comes along, so the app's startup migrate sees an
// up-to-date schema and applies nothing.
//
//   TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… bun scripts/load-sqlite-into-turso.ts <file.db>
//
// Refuses a target that already has tables: it never merges into or
// overwrites a database someone is using.
import { Database } from "bun:sqlite";
import { createClient, type InArgs, type InStatement } from "@libsql/client";

const file = process.argv[2];
const url = process.env.TURSO_DATABASE_URL;
if (!file || !url) {
	console.error(
		"usage: TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… bun scripts/load-sqlite-into-turso.ts <file.db>",
	);
	process.exit(2);
}

const src = new Database(file, { readonly: true });
const dst = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const existing = await dst.execute(
	"select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '_litestream%' and name not like 'libsql_%'",
);
if (existing.rows.length) {
	console.error(
		`Refusing: the target already has ${existing.rows.length} tables (${existing.rows
			.slice(0, 5)
			.map((r) => r.name)
			.join(", ")}…). Load into an empty database.`,
	);
	process.exit(1);
}

type Master = { type: string; name: string; sql: string | null };
const master = src
	.query("select type, name, sql from sqlite_master where sql is not null order by rowid")
	.all() as Master[];
const tables = master.filter(
	(m) => m.type === "table" && !m.name.startsWith("sqlite_"),
);
const rest = master.filter((m) => m.type !== "table");

// client.migrate runs each batch in one transaction with foreign keys off, so
// rows land in any order and a failure leaves that batch out, never half in
await dst.migrate(tables.map((t) => t.sql as string));
console.log(`created ${tables.length} tables`);

const quote = (n: string) => `"${n.replaceAll('"', '""')}"`;
const BATCH = 200;
for (const t of tables) {
	const rows = src.query(`select * from ${quote(t.name)}`).values() as unknown[][];
	if (!rows.length) continue;
	const cols = (
		src.query(`select name from pragma_table_info(?)`).all(t.name) as {
			name: string;
		}[]
	).map((c) => quote(c.name));
	const insert = `insert into ${quote(t.name)} (${cols.join(", ")}) values (${cols.map(() => "?").join(", ")})`;
	for (let i = 0; i < rows.length; i += BATCH) {
		const stmts: InStatement[] = rows.slice(i, i + BATCH).map((r) => ({
			sql: insert,
			args: r as InArgs,
		}));
		await dst.migrate(stmts);
	}
	console.log(`${t.name}: ${rows.length}`);
}

if (rest.length) await dst.migrate(rest.map((m) => m.sql as string));
console.log(`created ${rest.length} indexes and triggers`);

const seq = src.query("select name, seq from sqlite_sequence").all() as {
	name: string;
	seq: number;
}[];
if (seq.length)
	await dst.migrate([
		"delete from sqlite_sequence",
		...seq.map((s) => ({
			sql: "insert into sqlite_sequence (name, seq) values (?, ?)",
			args: [s.name, s.seq],
		})),
	]);

// every table, counted on both sides
let mismatched = 0;
for (const t of tables) {
	const a = (src.query(`select count(*) c from ${quote(t.name)}`).get() as { c: number }).c;
	const b = Number(
		(await dst.execute(`select count(*) c from ${quote(t.name)}`)).rows[0].c,
	);
	if (a !== b) {
		mismatched++;
		console.error(`MISMATCH ${t.name}: ${a} here, ${b} there`);
	}
}
const before = src.query("pragma foreign_key_check").all().length;
const check = await dst.execute("pragma foreign_key_check");
console.log(
	mismatched
		? `${mismatched} tables differ`
		: `all ${tables.length} tables match; foreign_key_check: ${check.rows.length} problems there, ${before} here`,
);
process.exit(mismatched ? 1 : 0);
