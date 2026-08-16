#!/bin/sh
set -eu

STACK="${STACK:-/srv/kape}"
OUT="${OUT:-/srv/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%F-%H%M)"

mkdir -p "$OUT"
cd "$STACK"

# A running SQLite database cannot be copied byte for byte: the -wal file holds
# committed pages the .db does not, so a plain cp can land a torn snapshot.
# VACUUM INTO writes a consistent one.
docker compose exec -T app bun -e 'import { Database } from "bun:sqlite"; import { rmSync } from "node:fs"; rmSync("/data/.backup.db", { force: true }); new Database(process.env.DATABASE_PATH || "/data/cms.db").exec("VACUUM INTO \x27/data/.backup.db\x27")'
docker compose cp app:/data/.backup.db "$OUT/cms-$STAMP.db"
docker compose exec -T app rm -f /data/.backup.db

# Skip when uploads live in R2 - the bucket is already off-box.
if [ -z "${R2_BUCKET:-}" ]; then
	docker compose exec -T app tar czf - -C /app/public uploads >"$OUT/uploads-$STAMP.tgz"
fi

find "$OUT" -maxdepth 1 -name 'cms-*.db' -mtime "+$KEEP_DAYS" -delete
find "$OUT" -maxdepth 1 -name 'uploads-*.tgz' -mtime "+$KEEP_DAYS" -delete
