/**
 * Extract every string a language is missing, then apply the translations back.
 *
 *   bun scripts/backfill-translations.ts extract --lang km --out .work/i18n/km.json
 *   bun scripts/backfill-translations.ts apply   --lang km --in  .work/i18n/km.json [--dry]
 *
 * A value that exists but is byte-identical to the default language counts as
 * missing: that is what an untranslated placeholder looks like in this schema.
 * Acronyms are identical on purpose, so extract keeps listing them. Leave them
 * blank; a blank value is never written.
 */
import { Database } from "bun:sqlite";

type Entry = {
	address: string;
	source: string;
	value: string;
	note?: string;
};

/** Filenames, codes and the like: same in every language, never sent for translation. */
const SKIP_FIELDS = new Set(["media.original_filename"]);

/**
 * Prose is the default and structure is the exception, so this is a blacklist:
 * a whitelist quietly drops whatever key the next section type invents.
 */
const STRUCTURAL_KEYS = new Set([
	"id",
	"type",
	"layout",
	"variant",
	"tone",
	"align",
	"icon",
	"image",
	"src",
	"href",
	"slug",
	"formSlug",
	"linkBase",
	"contentType",
	"source",
	"color",
	"lang",
	"i18n",
]);

const STRUCTURAL_VALUE = [
	/^\//, // a path
	/^https?:\/\//,
	/^#[0-9a-f]{3,8}$/i, // a colour
	/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, // a slug or enum: no spaces, no capitals
];

const isTranslatable = (key: string, v: unknown): v is string => {
	if (typeof v !== "string" || !v.trim()) return false;
	if (STRUCTURAL_KEYS.has(key)) return false;
	if (/(?:Href|Url|Id|Ids|Slug|Icon|Image|Color|Key)$/.test(key)) return false;
	return !STRUCTURAL_VALUE.some((re) => re.test(v.trim()));
};

function arg(name: string, fallback?: string) {
	const i = process.argv.indexOf(`--${name}`);
	const v = i > -1 ? process.argv[i + 1] : undefined;
	if (v === undefined && fallback === undefined)
		throw new Error(`--${name} is required`);
	return v ?? (fallback as string);
}

const mode = process.argv[2];
const lang = arg("lang");
// no default: a script that writes translations should never guess its target
const dbPath = arg("db", process.env.DATABASE_PATH ?? "");
if (!dbPath) throw new Error("--db or DATABASE_PATH is required");
const db =
	mode === "apply" ? new Database(dbPath) : new Database(dbPath, { readonly: true });

const defaultLang =
	(
		db.query("select code from languages where is_default = 1").get() as
			| { code: string }
			| undefined
	)?.code ?? "en";

if (lang === defaultLang)
	throw new Error(`${lang} is the default language; nothing to backfill`);

/* ---------------------------------------------------------------- extract */

function extractUiStrings(): Entry[] {
	const rows = db
		.query(
			`select e.key, e.value as source, t.value as target
			   from ui_strings e
			   left join ui_strings t on t.key = e.key and t.lang = ?
			  where e.lang = ?`,
		)
		.all(lang, defaultLang) as {
		key: string;
		source: string;
		target: string | null;
	}[];
	return rows
		.filter((r) => r.target === null || r.target === r.source)
		.map((r) => ({
			address: `ui:${r.key}`,
			source: r.source,
			value: "",
			note: r.target === null ? "missing" : "same as source",
		}));
}

function extractTranslations(): Entry[] {
	const rows = db
		.query(
			`select e.entity_type, e.entity_id, e.field, e.value as source, t.value as target
			   from translations e
			   left join translations t
			     on t.entity_type = e.entity_type and t.entity_id = e.entity_id
			    and t.field = e.field and t.lang = ?
			  where e.lang = ?`,
		)
		.all(lang, defaultLang) as {
		entity_type: string;
		entity_id: number;
		field: string;
		source: string;
		target: string | null;
	}[];
	return rows
		.filter((r) => !SKIP_FIELDS.has(`${r.entity_type}.${r.field}`))
		.filter((r) => r.target === null || r.target === r.source)
		.map((r) => ({
			address: `tr:${r.entity_type}:${r.entity_id}:${r.field}`,
			source: r.source,
			value: "",
			note: r.target === null ? "missing" : "same as source",
		}));
}

/** Walks one section's props into `title` / `items[2].body` style paths. */
function walkProps(props: Record<string, unknown>): [string, string][] {
	const found: [string, string][] = [];
	for (const [k, v] of Object.entries(props)) {
		if (k === "i18n") continue;
		if (isTranslatable(k, v)) found.push([k, v]);
		else if (Array.isArray(v))
			v.forEach((item, i) => {
				if (!item || typeof item !== "object" || Array.isArray(item)) return;
				for (const [kk, vv] of Object.entries(item as Record<string, unknown>))
					if (isTranslatable(kk, vv)) found.push([`${k}[${i}].${kk}`, vv]);
			});
	}
	return found;
}

function extractSections(): Entry[] {
	const pages = db
		.query(
			`select id, slug, sections from pages
			  where sections is not null and sections not in ('', '[]')`,
		)
		.all() as { id: number; slug: string; sections: string }[];

	const out: Entry[] = [];
	for (const p of pages) {
		let secs: Record<string, unknown>[];
		try {
			secs = JSON.parse(p.sections);
		} catch {
			continue;
		}
		if (!Array.isArray(secs)) continue;
		for (const s of secs) {
			const props = (s.props ?? {}) as Record<string, unknown>;
			const overlay = ((props.i18n ?? {}) as Record<string, unknown>)[lang] as
				| Record<string, unknown>
				| undefined;
			for (const [path, source] of walkProps(props)) {
				const already = overlay ? readPath(overlay, path) : undefined;
				if (typeof already === "string" && already && already !== source)
					continue;
				out.push({
					address: `sec:${p.id}:${s.id}:${path}`,
					source,
					value: "",
					note: p.slug,
				});
			}
		}
	}
	return out;
}

/** `items[2].body` against an overlay that mirrors the props shape. */
function readPath(root: unknown, path: string): unknown {
	let cur: unknown = root;
	for (const step of path.split(".")) {
		const m = step.match(/^(.+)\[(\d+)\]$/);
		if (!cur || typeof cur !== "object") return undefined;
		if (m) {
			cur = (cur as Record<string, unknown>)[m[1]];
			if (!Array.isArray(cur)) return undefined;
			cur = cur[Number(m[2])];
		} else cur = (cur as Record<string, unknown>)[step];
	}
	return cur;
}

/* ------------------------------------------------------------------ apply */

function writePath(
	root: Record<string, unknown>,
	path: string,
	value: string,
	fallbackFrom: Record<string, unknown>,
) {
	const steps = path.split(".");
	let cur: Record<string, unknown> = root;
	let src: unknown = fallbackFrom;
	for (let i = 0; i < steps.length; i++) {
		const step = steps[i];
		const last = i === steps.length - 1;
		const m = step.match(/^(.+)\[(\d+)\]$/);
		if (m) {
			const [, key, idxRaw] = m;
			const idx = Number(idxRaw);
			// the overlay is applied with a shallow spread, so a translated array
			// has to carry every item and every untranslated key alongside it
			const srcArr = (src as Record<string, unknown>)?.[key];
			if (!Array.isArray(cur[key]))
				cur[key] = Array.isArray(srcArr)
					? srcArr.map((it) =>
							it && typeof it === "object" ? { ...it } : it,
						)
					: [];
			const arr = cur[key] as Record<string, unknown>[];
			while (arr.length <= idx) arr.push({});
			if (last) throw new Error(`array index cannot be the last step: ${path}`);
			cur = arr[idx];
			src = Array.isArray(srcArr) ? srcArr[idx] : undefined;
		} else if (last) {
			cur[step] = value;
		} else {
			if (typeof cur[step] !== "object" || cur[step] === null) cur[step] = {};
			cur = cur[step] as Record<string, unknown>;
			src = (src as Record<string, unknown>)?.[step];
		}
	}
}

function apply(entries: Entry[], dry: boolean) {
	const filled = entries.filter((e) => e.value.trim());
	const counts = { ui: 0, tr: 0, sec: 0, skipped: entries.length - filled.length };

	const byPage = new Map<number, Entry[]>();
	for (const e of filled) {
		const [kind, ...rest] = e.address.split(":");
		if (kind === "ui") counts.ui++;
		else if (kind === "tr") counts.tr++;
		else if (kind === "sec") {
			const pageId = Number(rest[0]);
			byPage.set(pageId, [...(byPage.get(pageId) ?? []), e]);
			counts.sec++;
		}
	}

	const run = db.transaction(() => {
		for (const e of filled) {
			const [kind, ...rest] = e.address.split(":");
			if (kind === "ui") {
				db.query(
					`insert into ui_strings (tenant_id, key, lang, value) values (1, ?, ?, ?)
					 on conflict(tenant_id, key, lang) do update set value = excluded.value`,
				).run(rest.join(":"), lang, e.value);
			} else if (kind === "tr") {
				const [entity_type, entity_id, field] = rest;
				db.query(
					`insert into translations (tenant_id, entity_type, entity_id, field, lang, value)
					 values (1, ?, ?, ?, ?, ?)
					 on conflict(entity_type, entity_id, field, lang) do update set value = excluded.value`,
				).run(entity_type, Number(entity_id), field, lang, e.value);
			}
		}

		for (const [pageId, list] of byPage) {
			const row = db
				.query("select sections from pages where id = ?")
				.get(pageId) as { sections: string } | undefined;
			if (!row) continue;
			const secs = JSON.parse(row.sections) as Record<string, unknown>[];
			for (const e of list) {
				const [, , sectionId, ...pathParts] = e.address.split(":");
				const path = pathParts.join(":");
				const sec = secs.find((s) => String(s.id) === sectionId);
				if (!sec) continue;
				const props = (sec.props ?? {}) as Record<string, unknown>;
				const i18n = (props.i18n ?? {}) as Record<string, unknown>;
				const overlay = (i18n[lang] ?? {}) as Record<string, unknown>;
				writePath(overlay, path, e.value, props);
				i18n[lang] = overlay;
				props.i18n = i18n;
				sec.props = props;
			}
			db.query(
				"update pages set sections = ?, updated_at = datetime('now') where id = ?",
			).run(JSON.stringify(secs), pageId);
		}
	});

	if (dry) console.log("dry run, nothing written");
	else run();
	console.log(
		`${dry ? "would write" : "wrote"}: ${counts.ui} ui strings, ${counts.tr} translations, ${counts.sec} section fields across ${byPage.size} pages; ${counts.skipped} left blank`,
	);
}

/* ------------------------------------------------------------------- main */

if (mode === "extract") {
	const entries = [
		...extractUiStrings(),
		...extractTranslations(),
		...extractSections(),
	];
	const out = arg("out", `.work/i18n/${lang}.json`);
	await Bun.write(out, `${JSON.stringify(entries, null, "\t")}\n`);
	console.log(`${entries.length} strings need ${lang} -> ${out}`);
} else if (mode === "apply") {
	const file = arg("in", `.work/i18n/${lang}.json`);
	const entries = JSON.parse(await Bun.file(file).text()) as Entry[];
	apply(entries, process.argv.includes("--dry"));
} else {
	console.error("usage: backfill-translations.ts extract|apply --lang <code>");
	process.exit(1);
}
