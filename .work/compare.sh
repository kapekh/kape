#!/usr/bin/env bash
# Compare two capture.sh runs. Two normalisations, both dev-only noise:
#   - epoch-ms in the hydration payload, which changes between any two runs
#   - data-tsd-source, injected by @tanstack/devtools-vite and gated on
#     `config.mode === "development"`, so it never reaches a build
set -euo pipefail

A="/tmp/noany-html/${1:?usage: compare.sh <before> <after>}"
B="/tmp/noany-html/${2:?usage: compare.sh <before> <after>}"

norm() { # <src-dir> <dst-dir>
  mkdir -p "$2"
  for f in "$1"/*.html; do
    sed -E -e 's/1[0-9]{12}/TS/g' -e 's/ data-tsd-source="[^"]*"//g' \
      "$f" > "$2/$(basename "$f")"
  done
}

norm "$A" "${A}_s"
norm "$B" "${B}_s"
diff -rq "${A}_s" "${B}_s" && echo "identical: $(ls "${A}_s" | wc -l) pages"
