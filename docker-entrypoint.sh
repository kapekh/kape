#!/usr/bin/env sh
set -e

DB="${DATABASE_PATH:-/data/cms.db}"
DIR="$(dirname "$DB")"

# src/server/db.ts self-migrates on import (see that file), so no separate
# migrate step is needed here — just make sure the volume-mounted DB's parent
# directory exists before Bun tries to open/create the file.
if ! mkdir -p "$DIR" 2>/dev/null; then
	echo "Cannot create $DIR, so there is nowhere to keep the database." >&2
	echo "DATABASE_PATH=$DB. Check the volume mount and its ownership." >&2
	exit 1
fi

# db.ts opens the database and sets journal_mode=WAL as its first statement, so a
# file or mount the container cannot write to fails there, inside an import, as a
# raw bun:sqlite stack trace with no mention of permissions. Say it here instead.
if ! (: >>"$DB") 2>/dev/null; then
	echo "Cannot write to $DB." >&2
	echo "The installer and the running site both need write access; a read-only file or a read-only mount will not do. Check the file's ownership and mode, and that the volume is not mounted :ro." >&2
	exit 1
fi
if ! (: >>"$DIR/.write-probe") 2>/dev/null; then
	echo "Cannot write to $DIR." >&2
	echo "SQLite keeps $DB's -wal and -shm files beside it, so the directory has to be writable too, not just the database file." >&2
	exit 1
fi
rm -f "$DIR/.write-probe"

# First boot on an empty volume has nothing to serve — not even a home page — so
# install before starting. A no-op once the database holds a finished install.
# Set ADMIN_EMAIL, ADMIN_PASSWORD and SITE_NAME to control it; with
# ADMIN_PASSWORD unset the generated one is printed here and nowhere else.
#
# `set -e` above is load-bearing: the installer exits non-zero when the database
# is missing rows the site cannot run without, such as an administrator. Starting
# the server over one of those serves a site nobody can log in to repair, so the
# container must stop instead. It exits 0, with warnings, for the things an
# administrator can put back from the admin.
bun src/server/install.ts

exec "$@"
