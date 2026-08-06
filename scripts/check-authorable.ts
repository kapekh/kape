import { Database } from "bun:sqlite";
import { SECTION_DEFS } from "../src/lib/sections";

// SectionsBuilder draws a control only for keys declared in SECTION_DEFS, but setProp
// spreads unknown props rather than dropping them. So an undeclared prop renders fine
// publicly and is permanently uneditable. This finds those before an editor does.

const CARD_ITEM_KEYS = new Set(["image", "title", "body", "href", "buttons"]);
const NON_FIELD_PROPS = new Set(["i18n"]);

const fieldsFor = new Map(
	SECTION_DEFS.map((d) => [d.type, new Map(d.fields.map((f) => [f.key, f.kind]))]),
);

const db = new Database(process.env.DATABASE_PATH ?? "./cms.db", { readonly: true });
const rows = db.query("select slug, sections from pages order by slug").all() as {
	slug: string;
	sections: string | null;
}[];

type Finding = { slug: string; type: string; detail: string };
const undeclared: Finding[] = [];
const unknownType: Finding[] = [];
const unknownItemKey: Finding[] = [];

for (const row of rows) {
	let nodes: { type?: string; props?: Record<string, unknown> }[];
	try {
		nodes = JSON.parse(row.sections || "[]");
	} catch {
		unknownType.push({ slug: row.slug, type: "-", detail: "sections is not valid JSON" });
		continue;
	}
	for (const node of nodes) {
		const type = node.type ?? "-";
		const declared = fieldsFor.get(type);
		if (!declared) {
			unknownType.push({ slug: row.slug, type, detail: "no SectionDef, renders as UnknownSection" });
			continue;
		}
		for (const [key, value] of Object.entries(node.props ?? {})) {
			if (NON_FIELD_PROPS.has(key)) continue;
			if (!declared.has(key)) {
				undeclared.push({ slug: row.slug, type, detail: key });
				continue;
			}
			if (declared.get(key) === "cards" && Array.isArray(value)) {
				for (const item of value) {
					if (!item || typeof item !== "object") continue;
					for (const sub of Object.keys(item)) {
						if (!CARD_ITEM_KEYS.has(sub)) {
							unknownItemKey.push({ slug: row.slug, type, detail: `${key}[].${sub}` });
						}
					}
				}
			}
		}
	}
}

const report = (title: string, found: Finding[]) => {
	const seen = new Set<string>();
	const rows = found.filter((f) => {
		const k = `${f.slug}|${f.type}|${f.detail}`;
		return seen.has(k) ? false : (seen.add(k), true);
	});
	console.log(`\n${title}: ${rows.length}`);
	for (const f of rows) console.log(`  ${f.slug}  [${f.type}]  ${f.detail}`);
};

report("Undeclared props (uneditable in admin)", undeclared);
report("Sections with no SectionDef", unknownType);
report("Card item keys the builder cannot edit", unknownItemKey);

const total = undeclared.length + unknownType.length + unknownItemKey.length;
console.log(`\nPages checked: ${rows.length}. Problems: ${total}.`);
db.close();
process.exit(total === 0 ? 0 : 1);
