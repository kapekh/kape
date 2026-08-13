import { readdirSync } from "node:fs";
import { Database } from "bun:sqlite";

const base = process.argv[2] ?? "http://localhost:3070";
const jar = process.argv[3] ?? "/tmp/uat-admin.jar";
const dbPath = process.argv[4] ?? "uat.db";

const cookie = (await Bun.file(jar).text())
	.split("\n")
	// curl writes the session cookie as #HttpOnly_<domain>, so dropping every # line drops the login
	.map((l) => l.replace(/^#HttpOnly_/, ""))
	.filter((l) => l && !l.startsWith("#"))
	.map((l) => l.split("\t"))
	.filter((f) => f.length >= 7)
	.map((f) => `${f[5]}=${f[6]}`)
	.join("; ");

const db = new Database(dbPath, { readonly: true });
const firstId = (table: string): number | null =>
	(db.query(`select id from ${table} order by id limit 1`).get() as {
		id: number;
	} | null)?.id ?? null;

const ID_TABLE: Record<string, string> = {
	campaigns: "campaigns",
	donors: "donors",
	forms: "forms",
	offices: "offices",
	pages: "pages",
	partners: "partners",
	people: "people",
	posts: "posts",
	projects: "projects",
	roles: "roles",
	schools: "schools",
	users: "users",
};

const paths = new Set<string>();
for (const file of readdirSync("src/routes")) {
	if (!file.startsWith("admin") || !file.endsWith(".tsx")) continue;
	if (file.startsWith("-")) continue;
	const parts = file.replace(/\.tsx$/, "").split(".");
	if (parts.length === 1) {
		paths.add("/admin");
		continue;
	}
	const segs: string[] = [];
	let skip = false;
	for (const p of parts.slice(1)) {
		if (p === "index") continue;
		if (p.startsWith("$")) {
			const table = ID_TABLE[segs[0]];
			const id = table ? firstId(table) : null;
			if (id == null) {
				skip = true;
				break;
			}
			segs.push(String(id));
			continue;
		}
		segs.push(p);
	}
	if (!skip) paths.add(`/admin${segs.length ? `/${segs.join("/")}` : ""}`);
}

const ERROR_MARKS = ["Unexpected Application Error", "TypeError:"];
let bad = 0;
for (const p of [...paths].sort()) {
	const res = await fetch(base + p, { headers: { cookie }, redirect: "manual" });
	const html = await res.text();
	const marks = ERROR_MARKS.filter((m) =>
		html.replace(/<script[\s\S]*?<\/script>/g, "").includes(m),
	);
	const ok = res.status === 200 && marks.length === 0;
	if (!ok) bad++;
	console.log(
		`${ok ? "ok  " : "FAIL"} ${res.status} ${p}${marks.length ? ` :: ${marks.join(", ")}` : ""}`,
	);
}
console.log(`\n${paths.size - bad}/${paths.size} admin routes`);
process.exit(bad ? 1 : 0);
