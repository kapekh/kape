import { readFileSync, readdirSync } from "node:fs";

const TAIL =
  "Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team.";

const rows: string[][] = [];
let bad = 0;
for (const f of readdirSync("/home/userx/.herdr/worktrees/kape/seed-copy/.work/kape-copy/rendered-16").sort()) {
  const raw = readFileSync(`/home/userx/.herdr/worktrees/kape/seed-copy/.work/kape-copy/rendered-16/${f}`, "utf8").replace(/^result: /, "").trim();
  const dom: string = JSON.parse(JSON.parse(raw));
  const lines = dom.split("\n");
  const paras = lines.filter((l) => l.startsWith("P | ")).map((l) => l.slice(4));
  const h2 = lines.filter((l) => l.startsWith("H2 | ")).map((l) => l.slice(5));
  const h3 = lines.filter((l) => l.startsWith("H3 | "));
  const ok =
    paras.length === 2 && paras[1] === TAIL && h2.length === 1 && h3.length === 0;
  if (!ok) bad++;
  rows.push([
    f.replace(".txt", ""),
    String(paras.length),
    paras[1] === TAIL ? "TAIL" : "NOT-TAIL",
    h2.join(" / "),
    String(h3.length),
    ok ? "placeholder-only" : "HAS EXTRA",
  ]);
}
for (const r of rows) console.log(r.map((c, i) => (i === 0 ? c.padEnd(26) : c.padEnd(i === 3 ? 40 : 10))).join(""));
console.log(bad === 0 ? "\nALL 16 PLACEHOLDER-ONLY ON THE LIVE PAGE" : `\n${bad} pages carry extra content`);
