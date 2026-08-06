#!/usr/bin/env sh
set -e

# src/server/db.ts self-migrates on import (see that file), so no separate
# migrate step is needed here — just make sure the volume-mounted DB's parent
# directory exists before Bun tries to open/create the file.
mkdir -p "$(dirname "${DATABASE_PATH:-/data/kape.db}")"

# First boot on an empty volume has nothing to serve — not even a home page — so
# install before starting. A no-op once the database has rows. Set ADMIN_EMAIL,
# ADMIN_PASSWORD and SITE_NAME to control it; with ADMIN_PASSWORD unset the
# generated one is printed here and nowhere else.
bun src/server/install.ts

exec "$@"
