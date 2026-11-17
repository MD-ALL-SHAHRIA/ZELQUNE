# Deploying Zelqune to the VPS

One server runs everything with Docker. Only Caddy is open to the internet (ports 80 and 443);
it gets free HTTPS certificates by itself. Files: `infra/docker-compose.prod.yml`,
`infra/caddy/Caddyfile`, `infra/.env.production.example`, `infra/scripts/backup.sh`.

| Address | What |
|---|---|
| `https://zelqune.com` | Storefront (`www.` redirects here) |
| `https://admin.zelqune.com` | Dashboard |
| `https://api.zelqune.com` | API (gateway) |
| `https://media.zelqune.com` | Product photos (when `STORAGE_DRIVER=local`) |

## 1. Server (once)
Ubuntu 24.04, 8 GB RAM or more. Log in as root, then:

```sh
apt update && apt upgrade -y
apt install -y docker.io docker-compose-v2 git ufw unattended-upgrades
# Firewall: SSH and web only. Docker-published ports are only Caddy's 80/443.
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443 && ufw --force enable
adduser --disabled-password deploy && usermod -aG docker deploy
```
Use SSH keys, not passwords (`PasswordAuthentication no` in `/etc/ssh/sshd_config`).

## 2. DNS (Cloudflare)
Add five **A records** with the server's IP: `@`, `www`, `admin`, `api`, `media`.
Set each to **DNS only (grey cloud)** so Caddy can get its certificates. After the site works over
HTTPS you may switch them to Proxied (orange); then set SSL/TLS mode to **Full (strict)** and,
because Cloudflare becomes a second proxy hop, change `TRUST_PROXY` in the compose file to `2`.

## 3. Code and settings
```sh
su - deploy
git clone https://github.com/MD-ALL-SHAHRIA/ZELQUNE.git /srv/zelqune && cd /srv/zelqune
node infra/scripts/dev-keys.mjs --prod   # creates infra/.env.production with fresh secrets
nano infra/.env.production               # fill the rest: Turnstile keys, owner, bKash/Nagad, email
```
(No Node on the server? Run the key script on your Mac and copy the file over with `scp`.)
Never commit `infra/.env.production`; keep a copy in a password manager.

## 4. Start
```sh
cd /srv/zelqune
export RELEASE=$(git rev-parse --short HEAD)
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.production build
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.production up -d
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.production ps   # all healthy
```
Each service applies its own database migrations at start. After the first start, remove
`OWNER_PASSWORD` from `.env.production` (the account already exists).

## 5. Backups
```sh
crontab -e   # add:
30 3 * * * /srv/zelqune/infra/scripts/backup.sh >> /srv/zelqune/infra/backups/backup.log 2>&1
```
Every night: database dump + product photos, kept 14 days in `infra/backups/`. Copy that folder
off the server regularly (to your Mac: `scp -r deploy@SERVER:/srv/zelqune/infra/backups .`).
A backup you never restored is not a backup: try **Restore** once on a test machine.

**Restore** (stops every app, restores, starts them again):
```sh
infra/scripts/restore.sh infra/backups/db-YYYYMMDD-HHMMSS.dump
```

## 6. Update and roll back
```sh
git pull && export RELEASE=$(git rev-parse --short HEAD)
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.production up -d --build
```
Roll back: `export RELEASE=<previous tag>` (see `docker images`) and run `up -d` without
`--build`. Migrations are additive (new columns are nullable), so older code runs on a newer
database. Downtime per update is a few seconds per container.

## 7. Check after every deploy
- `https://zelqune.com/en`, `https://admin.zelqune.com`, `https://api.zelqune.com/health` load
  with a padlock.
- `https://api.zelqune.com/docs` returns 404 (API docs are off in production).
- Place a test COD order, see it in the dashboard, cancel it.
- `docker compose ... logs --tail 50 gateway` shows no errors.

## Monitoring (free, needs your sign-up)
- **Uptime:** UptimeRobot or Better Stack free plan, checking `https://zelqune.com/en` and
  `https://api.zelqune.com/health` every 5 minutes, alerting your email.
- **Errors:** container logs are JSON and rotated (5 × 20 MB per container). Sentry's free plan
  can be added later (needs approval).
