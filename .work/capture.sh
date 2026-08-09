#!/usr/bin/env bash
# Capture the server-rendered HTML of every page that exercises a section
# template, into /tmp/noany-html/<label>/. Run once before the typing change and
# once after; the two directories must be byte-identical.
#
# The dev server must run with PORT matching its --port: the SSR half calls its
# own tRPC API at http://localhost:$PORT, so an unset PORT silently resolves
# every page against whatever serves :3000.
set -euo pipefail

OUT="/tmp/noany-html/${1:?usage: capture.sh <before|after>}"
BASE="http://localhost:3004"
mkdir -p "$OUT"

paths=$(bun -e '
const {Database} = require("bun:sqlite");
const db = new Database("./noany.db", {readonly:true});
for (const r of db.query("select slug from pages where status = \"published\" order by slug").all())
  console.log(r.slug);
')

capture() { # <url-path> <file>
  curl -sS --fail-with-body -o "$OUT/$2.html" "$BASE$1"
}

for slug in $paths; do
  capture "/en/$slug" "en__${slug//\//_}"
done
for slug in home news team who-we-are/about; do
  capture "/km/$slug" "km__${slug//\//_}"
done
capture "/en" "en__root"

echo "$(ls "$OUT" | wc -l) pages -> $OUT"
