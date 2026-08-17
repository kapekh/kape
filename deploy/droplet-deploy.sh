#!/usr/bin/env bash
# Installed at /usr/local/bin/kape-deploy.sh and pinned as the forced command on
# CI's SSH key, so a leaked DEPLOY_SSH_KEY can run this and nothing else. Root
# owns it deliberately: `git pull` below must not be able to rewrite it.
set -euo pipefail

cd /srv/kape
git pull --ff-only
docker compose pull app
docker compose up -d

# Against the origin, not the public URL: anything in front of the site
# (Cloudflare Access, basic auth) would fail a healthy deploy. / redirects to
# the default language path, so follow it.
for i in $(seq 1 30); do
	code=$(curl -sSL -o /dev/null -w '%{http_code}' --max-time 10 \
		-H "Host: ${HEALTH_HOST:-$(grep -oP '(?<=^ALLOWED_HOSTS=)[^,]+' .env)}" \
		http://127.0.0.1:3000/ || true)
	if [ "$code" = "200" ]; then
		echo "up after $((i * 10))s"
		docker image prune -f
		exit 0
	fi
	sleep 10
done

echo "app did not answer 200 within five minutes; leaving the image in place for docker compose logs" >&2
exit 1
