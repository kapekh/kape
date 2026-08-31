#!/usr/bin/env bash
# Deploy from a workstation, without CI: push, then build the image on the
# droplet itself and swap the container. `deploy/droplet-deploy.sh` is the other
# half of this pair and pulls a registry image instead; it needs CI to have built
# one, which is exactly what this script exists to do without.
#
#   deploy/ship.sh              # gates, push, back up, build, swap, health-check
#   deploy/ship.sh --no-checks  # skip the local gates (they ran a moment ago)
#
# The host comes from KAPE_DEPLOY_HOST or deploy/.host (untracked), so the origin
# address behind Cloudflare stays out of the repository.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

STACK="${KAPE_DEPLOY_STACK:-/srv/kape}"
BRANCH="${KAPE_DEPLOY_BRANCH:-main}"
BUILD_LOG=/tmp/kape-build.log
RUN_CHECKS=1
case "${1:-}" in
	"") ;;
	--no-checks) RUN_CHECKS=0 ;;
	*) echo "usage: deploy/ship.sh [--no-checks]" >&2; exit 2 ;;
esac

die() { printf '\n%s\n' "$*" >&2; exit 1; }
step() { printf '\n==> %s\n' "$*"; }

HOST="${KAPE_DEPLOY_HOST:-}"
if [ -z "$HOST" ] && [ -f deploy/.host ]; then
	HOST="$(tr -d '[:space:]' <deploy/.host)"
fi
[ -n "$HOST" ] || die "No deploy host. Put deploy@<ip> in deploy/.host, or set KAPE_DEPLOY_HOST."

# A deploy names a commit, so the tree has to be one.
[ -z "$(git status --porcelain)" ] || die "Working tree is dirty. Commit or stash first."
CURRENT="$(git rev-parse --abbrev-ref HEAD)"
[ "$CURRENT" = "$BRANCH" ] || die "On '$CURRENT', not '$BRANCH'. Switch branch or set KAPE_DEPLOY_BRANCH."
SHA="$(git rev-parse --short HEAD)"

if [ "$RUN_CHECKS" = 1 ]; then
	step "Gates (the ones CI used to run)"
	bunx tsc --noEmit
	bun run lint
	bunx vitest run
fi

step "Push $BRANCH ($SHA)"
git push origin "$BRANCH"

# One session per step: the build's memory pressure has reset the connection
# before now, and a foreground build dies with it.
ssh_do() { ssh -o BatchMode=yes "$HOST" "set -euo pipefail; cd $STACK; $1"; }

step "Back up the database"
# R2_BUCKET set only to skip the uploads tarball: 573MB that a code deploy
# cannot change, and the nightly cron already takes it.
ssh_do "R2_BUCKET=skip sh deploy/backup.sh"

step "Fetch $SHA on the droplet"
ssh_do "git pull --ff-only"
REMOTE_SHA="$(ssh_do 'git rev-parse --short HEAD')"
[ "$REMOTE_SHA" = "$SHA" ] || die "Droplet is on $REMOTE_SHA, expected $SHA."

# Tag what is running now, so a bad deploy is one command away from undone.
step "Tag the running image as kape:previous"
ssh_do 'id=$(docker compose images -q app || true); if [ -n "$id" ]; then docker tag "$id" kape:previous; else echo "nothing running to tag"; fi'

step "Build on the droplet (detached; this takes a few minutes)"
ssh_do "rm -f $BUILD_LOG; nohup sh -c 'cd $STACK && docker compose build app; echo \"EXIT:\$?\"' >$BUILD_LOG 2>&1 & sleep 2"

while ! ssh_do "grep -q '^EXIT:' $BUILD_LOG" 2>/dev/null; do
	printf '.'
	sleep 20
done
printf '\n'
BUILD_EXIT="$(ssh_do "sed -n 's/^EXIT://p' $BUILD_LOG | tail -1")"
if [ "$BUILD_EXIT" != "0" ]; then
	ssh_do "tail -30 $BUILD_LOG" || true
	die "Build failed (exit $BUILD_EXIT). The old container is still serving."
fi

step "Swap the container"
ssh_do "docker compose up -d"

step "Health check"
if ssh_do '
	host=$(grep -oP "(?<=^ALLOWED_HOSTS=)[^,]+" .env)
	for i in $(seq 1 30); do
		code=$(curl -sSL -o /dev/null -w "%{http_code}" --max-time 10 -H "Host: $host" http://127.0.0.1:3000/ || true)
		if [ "$code" = "200" ]; then
			echo "200 after $((i * 5))s"
			exit 0
		fi
		sleep 5
	done
	echo "last status: $code" >&2
	exit 1'
then
	ssh_do "docker image prune -f >/dev/null; docker images --format '{{.Repository}}:{{.Tag}} {{.CreatedSince}}' | head -3"
	step "$SHA is live. Rollback, if it comes to that:"
	echo "    ssh $HOST 'cd $STACK && APP_IMAGE=kape:previous docker compose up -d'"
else
	ssh_do "docker compose logs --tail 40 app" || true
	die "Did not answer 200 within 150s. Roll back with:
    ssh $HOST 'cd $STACK && APP_IMAGE=kape:previous docker compose up -d'"
fi
