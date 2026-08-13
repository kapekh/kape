import { Database } from "bun:sqlite";

const base = process.argv[2] ?? "http://localhost:3070";
const dbPath = process.argv[3] ?? "kape.db";
const db = new Database(dbPath, { readonly: true });

const rows = <T>(sql: string) => db.query(sql).all() as T[];
const langs = rows<{ code: string }>("select code from languages").map(
	(l) => l.code,
);
const pages = rows<{ slug: string }>(
	"select slug from pages where status='published' order by slug",
).map((p) => p.slug);
const posts = rows<{ slug: string; content_type: string }>(
	"select slug, content_type from posts where status='published' order by content_type, slug",
);

const LINK_BASE: Record<string, string> = {
	news: "/news",
	story: "/stories",
	person: "/team",
	album: "/galleries",
	job: "/careers",
};

const urls: string[] = [];
for (const lang of langs) {
	for (const slug of pages) urls.push(`/${lang}/${slug}`);
	for (const p of posts) {
		const b = LINK_BASE[p.content_type];
		if (b) urls.push(`/${lang}${b}/${p.slug}`);
	}
	urls.push(`/${lang}/contact`, `/${lang}/search?q=school`, `/${lang}/donate`);
}
urls.push("/sitemap.xml", "/robots.txt", "/llms.txt", "/manifest.json", "/");

// the serialised ui dictionary ships every string the site owns, including its own
// error copy, so a marker is only meaningful outside it
const ERROR_MARKS = [
	"Unexpected Application Error",
	"TypeError:",
	"Cannot read properties",
	"data-error-boundary",
];
const withoutPayload = (html: string) =>
	html.replace(/<script[\s\S]*?<\/script>/g, "");

let bad = 0;
for (const u of urls) {
	let status = 0;
	let h1 = 0;
	let marks: string[] = [];
	try {
		const res = await fetch(base + u, { redirect: "manual" });
		status = res.status;
		const html = await res.text();
		h1 = (html.match(/<h1[\s>]/g) ?? []).length;
		const visible = withoutPayload(html);
		marks = ERROR_MARKS.filter((m) => visible.includes(m));
	} catch (e) {
		marks = [String(e)];
	}
	const redirected = status === 301 || status === 302;
	const isDoc = !redirected && !/\.(xml|txt|json)$/.test(u);
	const ok =
		(status === 200 || redirected) && marks.length === 0 && (!isDoc || h1 === 1);
	if (!ok) bad++;
	console.log(
		`${ok ? "ok  " : "FAIL"} ${status} h1=${h1} ${u}${marks.length ? ` :: ${marks.join(", ")}` : ""}`,
	);
}
console.log(`\n${urls.length - bad}/${urls.length} passed`);
process.exit(bad ? 1 : 0);
