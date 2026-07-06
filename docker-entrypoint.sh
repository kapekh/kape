#!/usr/bin/env sh
set -e

# src/server/db.ts self-migrates on import (see that file), so no separate
# migrate step is needed here — just make sure the volume-mounted DB's parent
# directory exists before Bun tries to open/create the file.
mkdir -p "$(dirname "${DATABASE_PATH:-/data/kape.db}")"

exec "$@"
