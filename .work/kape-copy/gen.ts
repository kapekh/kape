import { readFileSync, writeFileSync } from "node:fs";

type Card = { title: string; text: string };
type Block =
	| { heading: string; kind: "paragraphs" | "list"; items: string[] }
	| { heading: string; kind: "cards"; items: Card[] };

const src = JSON.parse(
	readFileSync(".work/kape-copy/projects.json", "utf8"),
) as Record<
	string,
	{ blocks: Block[]; snapshots: { value: string; label: string }[]; bodyDoc: { en: unknown } }
>;

const heading = (level: number, text: string) => ({
	type: "heading",
	attrs: { level },
	content: [{ type: "text", text }],
});
const paragraph = (text: string) => ({
	type: "paragraph",
	content: [{ type: "text", text }],
});

function docOf(blocks: Block[]) {
	const content: unknown[] = [];
	for (const b of blocks) {
		content.push(heading(2, b.heading));
		if (b.kind === "cards") {
			for (const c of b.items) {
				content.push(heading(3, c.title));
				content.push(paragraph(c.text));
			}
		} else if (b.kind === "list") {
			content.push({
				type: "bulletList",
				content: b.items.map((t) => ({
					type: "listItem",
					content: [paragraph(t)],
				})),
			});
		} else {
			for (const t of b.items) content.push(paragraph(t));
		}
	}
	return { type: "doc", content };
}

let bad = 0;
for (const [code, p] of Object.entries(src)) {
	const mine = JSON.stringify(docOf(p.blocks));
	const k1 = JSON.stringify(p.bodyDoc.en);
	const ok = mine === k1;
	if (!ok) bad++;
	const text = docOf(p.blocks)
		.content.flatMap(function walk(n: any): string[] {
			if (n.type === "text") return [n.text];
			return (n.content ?? []).flatMap(walk);
		})
		.join(" ");
	console.log(
		`${code.padEnd(8)} builder==K1 ${ok ? "yes" : "NO"}  nodes=${String(docOf(p.blocks).content.length).padEnd(3)} chars=${text.length}`,
	);
}
console.log(bad === 0 ? "builder reproduces all 8 bodyDoc.en exactly" : `${bad} mismatch`);

const q = (s: string) => JSON.stringify(s);
const out: string[] = [];
for (const code of ["AIR", "IDEAL", "MIDL", "DVITSA", "DWD", "LOTUS"]) {
	const p = src[code];
	const lines: string[] = [`/* ===== ${code} ===== */`];
	lines.push(
		`snapshots: [\n${p.snapshots.map((s) => `\t{ value: ${q(s.value)}, label: ${q(s.label)} },`).join("\n")}\n],`,
	);
	lines.push("blocks: [");
	for (const b of p.blocks) {
		lines.push(`\t{`);
		lines.push(`\t\theading: ${q(b.heading)},`);
		lines.push(`\t\tkind: ${q(b.kind)},`);
		lines.push(`\t\titems: [`);
		for (const it of b.items) {
			lines.push(
				typeof it === "string"
					? `\t\t\t${q(it)},`
					: `\t\t\t{\n\t\t\t\ttitle: ${q(it.title)},\n\t\t\t\ttext: ${q(it.text)},\n\t\t\t},`,
			);
		}
		lines.push(`\t\t],`);
		lines.push(`\t},`);
	}
	lines.push("],");
	out.push(lines.join("\n"));
}
writeFileSync(".work/kape-copy/seed-fragments.txt", `${out.join("\n\n")}\n`);
console.log("fragments written");
