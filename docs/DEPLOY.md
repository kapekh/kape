# Deploying to a DigitalOcean droplet, behind Cloudflare

One droplet runs the app in Docker and Caddy in front of it for TLS.
Cloudflare holds the DNS and proxies traffic to the droplet.
The source stays on GitHub; the droplet pulls it with a read-only deploy key and builds the image itself.

```
visitor -> Cloudflare (TLS, DNS, WAF) -> droplet :443 Caddy -> 127.0.0.1:3000 app container
                                                                  |
                                                      /data/cms.db + /app/public/uploads (volumes)
```

Everything below assumes `www.example.org` and the repo `koompi/kape`.
Substitute your own.

## What you need first

- A DigitalOcean account and an SSH key you can add to a droplet.
- The domain's nameservers pointing at Cloudflare, or the ability to change them at the registrar.
- Push access to the GitHub repo, with `main` actually pushed:

```bash
git push origin main
```

The droplet builds what is on GitHub, so anything unpushed is not deployed.

## 1. Droplet

Create it: **Ubuntu 24.04 LTS**, **Basic / Regular, 2 GB RAM / 1 vCPU / 50 GB** ($12/mo), region **Singapore (sgp1)** for Cambodia.
Add your SSH key at creation time and no password login.

2 GB is the floor, not a preference.
The Vite build is what needs it; 1 GB gets the build OOM-killed halfway through.

```bash
ssh root@<droplet-ip>

adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy/

# The account has no password, so `sudo` can never prompt for one and every
# later step that needs it fails. Key-only login is what makes this safe.
echo 'deploy ALL=(ALL) NOPASSWD:ALL' >/etc/sudoers.d/deploy
chmod 440 /etc/sudoers.d/deploy
visudo -c -f /etc/sudoers.d/deploy

# Build headroom on top of the 2 GB.
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >>/etc/fstab

ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
apt update && apt install -y unattended-upgrades

curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
```

Reconnect as `deploy` from here on.

The app is published on `127.0.0.1:3000` (step 4), so it never appears in the firewall.
That matters: Docker's published ports write their own iptables rules and bypass `ufw` entirely, so a `0.0.0.0` binding would be open to the internet no matter what `ufw` says.

A DigitalOcean cloud firewall is worth adding for the same reason.
It runs outside the droplet, so nothing on the box can write a rule around it:

```bash
doctl compute firewall create --name kape-web --droplet-ids <droplet-id> \
  --inbound-rules "protocol:tcp,ports:22,address:0.0.0.0/0,address:::/0 protocol:tcp,ports:80,address:0.0.0.0/0,address:::/0 protocol:tcp,ports:443,address:0.0.0.0/0,address:::/0 protocol:icmp,address:0.0.0.0/0,address:::/0" \
  --outbound-rules "protocol:tcp,ports:all,address:0.0.0.0/0,address:::/0 protocol:udp,ports:all,address:0.0.0.0/0,address:::/0 protocol:icmp,address:0.0.0.0/0,address:::/0"
```

### Locking down SSH

Once you have logged in as `deploy` and confirmed `sudo` works, close the rest:

```bash
sudo tee /etc/ssh/sshd_config.d/99-hardening.conf >/dev/null <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitEmptyPasswords no
AuthenticationMethods publickey
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
MaxAuthTries 3
LoginGraceTime 20
AllowUsers deploy
EOF
sudo sshd -t && sudo systemctl restart ssh

sudo apt install -y fail2ban
printf '[sshd]\nenabled = true\nbackend = systemd\nmaxretry = 3\nfindtime = 10m\nbantime = 1h\n' | sudo tee /etc/fail2ban/jail.local
sudo systemctl enable --now fail2ban
```

Verify from another terminal before closing the one you are in: `ssh deploy@<ip>` works, `ssh root@<ip>` comes back `Permission denied (publickey)`.
`AllowUsers deploy` means a second operator needs adding to that line as well as to `authorized_keys`.

## 2. Deploy key and clone

The repo is private, so the droplet needs its own read-only key.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/kape_deploy -N ""
printf 'Host github.com\n  IdentityFile ~/.ssh/kape_deploy\n  IdentitiesOnly yes\n' >>~/.ssh/config
cat ~/.ssh/kape_deploy.pub
```

Paste that public key at `https://github.com/koompi/kape/settings/keys` as a deploy key, **without** write access.
Then:

```bash
sudo mkdir -p /srv && sudo chown deploy:deploy /srv
git clone git@github.com:koompi/kape.git /srv/kape
cd /srv/kape
```

The directory name becomes the Compose project name, so the volumes end up `kape_cms-data` and `kape_cms-uploads`.

## 3. Configuration

```bash
cp .env.example .env
bun -e "console.log(Array.from(crypto.getRandomValues(new Uint8Array(48))).map(b=>b.toString(16).padStart(2,'0')).join(''))"
# or, without bun on the droplet:
openssl rand -hex 48
```

Fill `/srv/kape/.env`:

```ini
NODE_ENV=production
BIND_ADDR=127.0.0.1
DATABASE_PATH=/data/cms.db
VITE_SITE_URL=https://www.example.org
ALLOWED_HOSTS=www.example.org,example.org
AUTH_SECRET=<the 96-char string you just generated>
TRUSTED_PROXY_HEADER=cf-connecting-ip

# First boot only, ignored once the database holds an install.
SITE_NAME=KAPE
SITE_DEFAULT_LANG=en
ADMIN_EMAIL=admin@example.org

# Optional, all degrade gracefully when empty: R2_*, SMTP_*, MAIL_*, BARAY_*.
```

Four of these decide whether the deploy works at all:

- **`AUTH_SECRET`** is generated once and never changed.
  Change it and every logged-in admin is signed out.
  It is also the one value that must never reach the repo.
- **`ALLOWED_HOSTS`** is a Host header allowlist.
  Unset, every request comes back `Blocked request`, including yours.
- **`VITE_SITE_URL`** is read at **build** time, not at runtime, because Vite inlines `VITE_*` into the bundle.
  Changing it later means rebuilding the image, not just restarting.
- **`TRUSTED_PROXY_HEADER=cf-connecting-ip`** is safe only once step 6 closes the origin to non-Cloudflare traffic.
  Until then leave it empty; with it set on an open origin, anyone can forge a client address and get unlimited password guesses.

`chmod 600 .env`.
It is already in `.gitignore`.

## 4. First boot

```bash
cd /srv/kape
docker compose up -d --build
docker compose logs -f app
```

The build takes 5-10 minutes on a 2 GB droplet.
The entrypoint runs the installer before the server starts: on an empty volume it creates the administrator and a home page, and on a database that is already installed it prints `Already installed - skipping.` and moves on.

With `ADMIN_PASSWORD` unset, the generated password is printed in those logs **once** and stored nowhere else.
Copy it now, log in, change it.

```bash
curl -H 'Host: www.example.org' http://127.0.0.1:3000/ -o /dev/null -w '%{http_code}\n'
```

### Bringing the existing content across

Skip this if you are starting fresh.
To carry the site that already exists locally, move the database and the uploads into the volumes with the stack stopped.

On your machine, with the local dev server stopped:

```bash
sqlite3 kape.db "VACUUM INTO 'kape-deploy.db'"     # consistent snapshot, WAL included
# without sqlite3 installed:
# bun -e 'import{Database}from"bun:sqlite";new Database("kape.db").exec("VACUUM INTO \x27kape-deploy.db\x27")'
tar czf uploads.tgz -C public uploads
scp kape-deploy.db uploads.tgz deploy@<droplet-ip>:/tmp/
```

On the droplet:

```bash
cd /srv/kape
docker compose down
# The -wal and -shm files MUST go with the old .db. SQLite replays a leftover WAL
# on open, so copying only cms.db silently restores the database you replaced.
docker run --rm -v kape_cms-data:/data -v /tmp:/in alpine sh -c \
	'rm -f /data/cms.db /data/cms.db-wal /data/cms.db-shm && cp /in/kape-deploy.db /data/cms.db'
docker run --rm -v kape_cms-uploads:/up -v /tmp:/in alpine sh -c 'tar xzf /in/uploads.tgz -C /tmp && cp -a /tmp/uploads/. /up/'
docker compose up -d
rm /tmp/kape-deploy.db /tmp/uploads.tgz
```

Migrations run on import, so a database from an older schema is upgraded on the next boot.
Log in with the accounts that database already holds; the installer will not create another administrator over it.

Count something before you trust it.
`Already installed - skipping.` in the logs only proves *a* database is there, not that it is yours:

```bash
docker compose exec -T app bun -e 'import { Database } from "bun:sqlite";
const db = new Database("/data/cms.db", { readonly: true });
for (const t of ["pages", "posts", "media", "users"]) console.log(t, db.query(`select count(*) c from "${t}"`).get().c);'
```

## 5. Caddy and the certificate

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

sudo cp /srv/kape/deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile      # your domains, your email
sudo systemctl reload caddy
sudo journalctl -u caddy -n 50 --no-pager
```

**Point the DNS at the droplet before reloading, with the proxy off.**
In Cloudflare, `A  @  <droplet-ip>` and `A  www  <droplet-ip>`, both **DNS only** (grey cloud) for now.
Caddy needs to answer Let's Encrypt directly to get the first certificate; through the orange cloud the challenge is fragile.

Wait for `certificate obtained successfully` in the journal, then:

```bash
curl -I https://www.example.org
```

## 6. Turn on Cloudflare

In the Cloudflare dashboard:

1. Flip both A records to **Proxied** (orange cloud).
2. **SSL/TLS -> Overview -> Full (strict)**.
   Anything less either breaks the site or leaves the Cloudflare-to-droplet hop unencrypted.
3. Leave **Always Use HTTPS off**.
   Caddy already redirects, and this setting sits in front of the ACME challenge path that renewals depend on.
4. Speed -> Brotli on. Leave caching at default; a "Cache Everything" rule will serve one visitor's admin pages to another.

Then close the origin so `cf-connecting-ip` can be trusted:

```bash
for ip in $(curl -s https://www.cloudflare.com/ips-v4) $(curl -s https://www.cloudflare.com/ips-v6); do
	sudo ufw allow proto tcp from "$ip" to any port 80,443 comment 'cloudflare'
done
sudo ufw delete allow 80
sudo ufw delete allow 443
sudo ufw status numbered
```

Until this is done, anyone who knows the droplet's IP can send `cf-connecting-ip: <anything>` straight past Cloudflare and defeat the login rate limit.

After it is done the origin IP no longer answers directly, which is also how you should test it: `curl https://<droplet-ip>` should hang or refuse, `https://www.example.org` should work.
Cloudflare publishes new ranges occasionally, so re-run the loop after a Cloudflare IP change notice.

Uploads pass through Cloudflare, and the free plan caps a request body at 100 MB.
Large media needs R2 (`R2_*` in `.env`), or a direct-to-origin hostname.

## 7. Verify

- `https://www.example.org` and `https://example.org` both load.
- `?lang=km` renders Khmer.
- `/admin` login works, and survives `docker compose restart app`.
  If it does not, `AUTH_SECRET` is changing between boots.
- Submit the contact form, then find it in the admin inbox.
- Upload an image in the media library and load it on a page.
- `docker compose logs app | grep -i warn` mentions no proxy header warning.

## Updating

A push to `main` deploys itself: `.github/workflows/deploy.yml` runs `tsc`, lint and the test suite,
builds the image on a GitHub runner, pushes it to `ghcr.io/koompi/kape`, then SSHes in and restarts
the droplet on the new image.
Building on the runner rather than the droplet takes a deploy from 5-10 minutes to seconds, and a
1 vCPU box never has to survive the Vite build.

It needs, once:

| Where | Name | Value |
| --- | --- | --- |
| Repo variable | `VITE_SITE_URL` | `https://www.example.org` — baked into the bundle at build time |
| Repo variable | `DEPLOY_ENABLED` | `true`; anything else builds the image and stops |
| Repo secret | `DEPLOY_HOST` | the droplet's IP |
| Repo secret | `DEPLOY_SSH_KEY` | private half of a key whose public half is in `deploy`'s `authorized_keys` |
| Repo secret | `DEPLOY_HOST_KEY` | the droplet's `known_hosts` line, so the runner is not trusting whatever answers |
| On the droplet | `docker login ghcr.io` | a `read:packages` token, because a private repo's package is private too |
| On the droplet | `/usr/local/bin/kape-deploy.sh` | what CI's key is allowed to run, see below |

Give CI its own key rather than reusing yours, and pin it to that one command.
A leaked `DEPLOY_SSH_KEY` then buys a deploy, not a shell:

```bash
sudo install -o root -g root -m 755 /srv/kape/deploy/droplet-deploy.sh /usr/local/bin/kape-deploy.sh
ssh-keygen -t ed25519 -f ~/.ssh/ci_deploy -N "" -C "github-actions"
printf 'command="/usr/local/bin/kape-deploy.sh",no-agent-forwarding,no-port-forwarding,no-pty,no-X11-forwarding %s\n' \
	"$(cat ~/.ssh/ci_deploy.pub)" >>~/.ssh/authorized_keys
cat ~/.ssh/ci_deploy      # paste into the DEPLOY_SSH_KEY secret, then delete it here
rm ~/.ssh/ci_deploy
```

Root owns the script on purpose: the `git pull` inside it must not be able to rewrite what the
restricted key executes.
It also holds the health check, which runs against `127.0.0.1:3000` rather than the public URL.
Checking the public URL from the runner tests Cloudflare instead of the deploy, and anything you put
in front of the site — Cloudflare Access, basic auth — then fails a release that is perfectly healthy.

Doing it by hand still works and is the rollback path:

```bash
cd /srv/kape
git pull
docker compose pull app && docker compose up -d   # the image CI built
docker compose up -d --build                      # or build it here
docker compose logs -f app
```

The old container keeps serving until the new image is ready.
Nothing in `/data` is touched, and schema migrations apply on the new container's first import.
To pin a specific commit, `APP_IMAGE=ghcr.io/koompi/kape:<sha> docker compose up -d`.

Rolling back is one command, because every commit is a tag in the registry:
`APP_IMAGE=ghcr.io/koompi/kape:<sha> docker compose up -d`.
A database that has already migrated forward will not migrate back, so a rollback across a schema change needs a restore from step 8.

## Backups

`deploy/backup.sh` writes a consistent SQLite snapshot plus the uploads to `/srv/backups` and prunes anything older than 14 days.

```bash
sudo mkdir -p /srv/backups && sudo chown deploy:deploy /srv/backups
/srv/kape/deploy/backup.sh
crontab -e
# 15 2 * * *  /srv/kape/deploy/backup.sh >>/srv/backups/backup.log 2>&1
```

That is a copy on the same disk, which covers a bad deploy and not a dead droplet.
Add DigitalOcean's weekly droplet backups ($2.40/mo at this size), or `rclone` the directory to R2, for the second case.

Restoring is step 4's migration procedure with a backup file in place of the local one.

## When it breaks

| Symptom | Cause |
| --- | --- |
| `Blocked request` on every page | `ALLOWED_HOSTS` missing the domain you asked for |
| Cloudflare 521 / 522 | container down, or `ufw` closed to Cloudflare's ranges - check `docker compose ps` first |
| Site loads, admins signed out after each deploy | `AUTH_SECRET` unset or regenerated; it must be constant |
| Site comes back blank after a change | `DATABASE_PATH` or the volume name points at a different file - `docker compose exec app ls -la /data` |
| Everyone rate-limited at once | proxy in front with `TRUSTED_PROXY_HEADER` empty; the app logs this as a warning |
| Login rate limit useless | `TRUSTED_PROXY_HEADER` set while the origin is still reachable around Cloudflare (step 6) |
| Canonical/OG tags relative | `VITE_SITE_URL` was unset **at build time**; rebuild, do not just restart |
| Build killed around 90% | swap missing, or a 1 GB droplet |
