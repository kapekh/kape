/** A3: create, edit and delete each entity that has a form, through the real API, counted in SQL. */
import { Database } from "bun:sqlite";

const base = process.argv[2] ?? "http://localhost:3070";
const jar = process.argv[3] ?? "/tmp/uat-admin.jar";
const db = new Database(process.argv[4] ?? "uat.db", { readonly: true });

const cookie = (await Bun.file(jar).text())
	.split("\n")
	.map((l) => l.replace(/^#HttpOnly_/, ""))
	.filter((l) => l && !l.startsWith("#"))
	.map((l) => l.split("\t"))
	.filter((f) => f.length >= 7)
	.map((f) => `${f[5]}=${f[6]}`)
	.join("; ");

async function call(path: string, input: unknown): Promise<unknown> {
	const res = await fetch(`${base}/api/trpc/${path}?batch=1`, {
		method: "POST",
		headers: { cookie, "content-type": "application/json" },
		body: JSON.stringify({ 0: { json: input } }),
	});
	const body = (await res.json()) as Array<{
		result?: { data?: { json?: unknown } };
		error?: { json?: { message?: string } };
	}>;
	const first = body[0];
	if (first?.error) throw new Error(first.error.json?.message ?? "error");
	return first?.result?.data?.json;
}

const count = (table: string): number =>
	(db.query(`select count(*) n from ${table}`).get() as { n: number }).n;

type Case = {
	name: string;
	table: string;
	router: string;
	create: unknown;
	edit: (id: number) => unknown;
	read?: (id: number) => string;
};

const langs = ["en", "km"];
const tr = (fields: Record<string, string>) =>
	langs.map((lang) => ({ lang, ...fields }));

const cases: Case[] = [
	{
		name: "page",
		table: "pages",
		router: "adminPages",
		create: {
			slug: "",
			segment: "uat-probe-page",
			parentId: null,
			status: "draft",
			coverMediaId: null,
			sections: [],
			translations: tr({ title: "UAT probe", excerpt: "", body: "" }),
		},
		edit: (id) => ({
			id,
			slug: "",
			segment: "uat-probe-page",
			parentId: null,
			status: "draft",
			coverMediaId: null,
			sections: [],
			translations: tr({ title: "UAT probe edited", excerpt: "", body: "" }),
		}),
	},
	{
		name: "post",
		table: "posts",
		router: "adminPosts",
		create: {
			slug: "uat-probe-post",
			contentType: "news",
			status: "draft",
			publishedAt: "",
			coverMediaId: null,
			categoryIds: [],
			translations: tr({ title: "UAT post", excerpt: "", body: "" }),
		},
		edit: (id) => ({
			id,
			slug: "uat-probe-post",
			contentType: "news",
			status: "draft",
			publishedAt: "",
			coverMediaId: null,
			categoryIds: [],
			translations: tr({ title: "UAT post edited", excerpt: "", body: "" }),
		}),
	},
];

let failed = 0;
for (const c of cases) {
	const before = count(c.table);
	try {
		const created = (await call(`${c.router}.create`, c.create)) as
			| number
			| { id: number };
		const id = typeof created === "number" ? created : created.id;
		const afterCreate = count(c.table);
		await call(`${c.router}.update`, c.edit(id));
		await call(`${c.router}.delete`, { id });
		const afterDelete = count(c.table);
		const ok = afterCreate === before + 1 && afterDelete === before;
		if (!ok) failed++;
		console.log(
			`${ok ? "ok  " : "FAIL"} ${c.name}: ${before} -> ${afterCreate} -> ${afterDelete} (id ${id})`,
		);
	} catch (e) {
		failed++;
		console.log(`FAIL ${c.name}: ${String(e).slice(0, 160)}`);
	}
}
console.log(`\n${cases.length - failed}/${cases.length} entities round-tripped`);
process.exit(failed ? 1 : 0);
