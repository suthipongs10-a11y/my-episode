# Connecting the repository to a VPS

Written against Hostinger KVM2 (2 vCPU / 8GB / 100GB NVMe), but nothing here is
specific to Hostinger or to that size — CLAUDE.md §4 says the host is
disposable, so this document is the procedure for *any* Ubuntu host, and
running it again on a bigger box is how we move.

Everything below is run by you, on the VPS. Nothing in this repository ever
holds an address or a credential for it.

---

## 1. Create the VPS

In hPanel: **VPS → Operating System → Ubuntu 24.04 LTS**, plain, no panel image.
Add your SSH public key during setup rather than using a root password.

Then, from your machine:

```bash
ssh root@<vps-ip>
```

`<vps-ip>` lives in your SSH config and in `.env` on the server. It does not go
into this repository.

---

## 2. Prepare the host

```bash
apt-get update && apt-get install -y git
git clone <repo-url> /opt/ro-ep4-bootstrap
sudo /opt/ro-ep4-bootstrap/tools/vps-bootstrap.sh
```

That installs Docker Engine and the Compose plugin from Docker's own
repository, adds 4GB of swap, creates a non-root `ro` user in the `docker`
group, configures ufw down to SSH + 80/443, caps Docker's log growth, and
enables fail2ban for SSH.

The swap matters more than it looks: rAthena's `map.cpp` is a heavy translation
unit, and a parallel build on 8GB with no swap gets OOM-killed at link time with
an error that looks like something else entirely.

**Before you log out**, open a second terminal and confirm `ssh ro@<vps-ip>`
works. Only then consider disabling root SSH login.

---

## 3. Give the VPS read access to the repository

**The repository is public, so there is nothing to do here** — the VPS clones
over HTTPS with no credentials. Skip to step 4.

The rest of this section applies only if the repository is later made private.
Then the clone needs to work unattended, so use a **deploy key** — read-only,
scoped to this one repository, not your personal account.

On the VPS, as `ro`:

```bash
ssh-keygen -t ed25519 -C "ro-ep4-vps" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

On GitHub: **repository → Settings → Deploy keys → Add deploy key**. Paste it,
leave "Allow write access" **unchecked**, and name it after the host.

Verify:

```bash
ssh -T git@github.com     # "You've successfully authenticated"
```

Read-only is the right level. The VPS deploys what CI has already built and
tested; it never pushes. A key that can write is a key that can rewrite history
if the box is compromised, and per CLAUDE.md §9 that is not a hypothetical
threat model here.

---

## 4. Clone and configure

```bash
git clone --recurse-submodules https://github.com/<owner>/<repo>.git ~/ro-ep4
cd ~/ro-ep4

cp .env.example .env
./tools/gen-secrets.sh          # fills every password
$EDITOR .env
```

Four values need you:

| Key | Value |
|---|---|
| `PUBLIC_HOST` | your domain, e.g. `play.example.com` |
| `ACME_EMAIL` | a real address — Let's Encrypt sends expiry notices there |
| `RO_ADVERTISE_IP` | the VPS's public IPv4 |
| `DEPLOY_ENV` | `prod` |

`RO_ADVERTISE_IP` is the one people get wrong. It is not where the servers
listen — they listen on all interfaces inside their container. It is what the
char-server and map-server *tell the client* to connect to next. If it is wrong,
server select works and character select hangs, with nothing useful in the logs.

Point your domain's A record at the VPS before deploying, or Caddy's
certificate request will fail and retry on a backoff.

### Where `.env` lives, and why it is not in the repository

`.env` sits at the repository root — beside `README.md` — so on the VPS that is
`~/ro-ep4/.env`. It is gitignored and always will be. `git pull` never touches
it, never overwrites it, and never brings it to a new machine.

That is the point: it holds the database password, the inter-server password
and the backup passphrase, and CLAUDE.md §2.2 says none of those go in git. The
repository is the same on every host; `.env` is what makes one host different
from another.

Three consequences worth internalising:

> **Keep a copy of `.env` somewhere safe — a password manager, not the VPS.**
> `BACKUP_GPG_PASSPHRASE` lives in it and nowhere else. Dumps in your bucket are
> encrypted with it. Lose the VPS and `.env` together and the backups are
> undecryptable — you would have done everything else right and still lost the
> players. Back it up the day you create it.

> **`DB_PASSWORD` is fixed once the database has been initialised.** MariaDB
> applies it only when it creates an empty data directory. Editing it later
> changes what rAthena sends while the database still expects the old one, and
> every game server fails to connect with an authentication error that looks
> like a permissions problem. To rotate it properly, change it inside MariaDB
> with `ALTER USER` first, then update `.env`.

> **`.env` can go stale.** When a later phase adds a key to `.env.example`, your
> `.env` will not have it. `./tools/check-env.sh` reports exactly that, and
> `--fix` appends the missing keys with their documented defaults. `deploy.sh`
> runs the check after every pull, so you find out at deploy time rather than
> from a container that started with a silent default.

---

## 5. Deploy

```bash
./tools/deploy.sh
```

First run compiles rAthena: 10–20 minutes on 2 vCPU. Afterwards the layer cache
makes it near-instant unless the submodule moved.

Then import the schema — once, on first deploy:

```bash
./tools/db-init.sh
```

That loads `main.sql`, `logs.sql` and `web.sql`, then replaces rAthena's
shipped `s1`/`p1` inter-server account with the credentials from `.env`.
Leaving the default in place would let anyone who can reach the login port
register their own map-server against your char-server.

Check it came up:

```bash
./tools/compose.sh ps
./tools/compose.sh logs --tail 50 map1
```

---

## 6. Turn on off-host backups

Required from Phase 1 (CLAUDE.md §4). Cloudflare R2 and Backblaze B2 both have
a free tier that comfortably holds RO dumps.

Create a bucket and an API token with object read/write on it, then on the VPS:

```bash
docker run --rm -it -v ~/ro-ep4/infra/backup:/config/rclone \
  rclone/rclone config
```

Create a remote named to match `BACKUP_REMOTE` in `.env` (default `r2`). For R2
choose `s3` → `Cloudflare R2` and use the account's S3 endpoint.

`infra/backup/rclone.conf` is gitignored — it holds bucket credentials.

Enable it:

```bash
sed -i 's|^COMPOSE_PROFILES=.*|COMPOSE_PROFILES=backup|' .env
./tools/deploy.sh
./tools/compose.sh logs backup
```

The container takes one backup immediately rather than waiting for the first
scheduled slot, so a broken bucket or a wrong token surfaces during the deploy
instead of six hours later.

Then prove it restores, on a scratch database, before you need it.

---

## 7. Opening a port for the Phase 1 client test

The Phase 1 gate is a standard PC client connecting, creating a character and
walking around. That needs the raw game ports reachable, which the default
configuration deliberately prevents.

```bash
sed -i 's|^GAME_PORTS_BIND=.*|GAME_PORTS_BIND=0.0.0.0|' .env
sudo ufw allow 6900/tcp && sudo ufw allow 6121/tcp && sudo ufw allow 5121/tcp
./tools/deploy.sh
```

**Close it again when the gate passes:**

```bash
sed -i 's|^GAME_PORTS_BIND=.*|GAME_PORTS_BIND=127.0.0.1|' .env
sudo ufw delete allow 6900/tcp && sudo ufw delete allow 6121/tcp && sudo ufw delete allow 5121/tcp
./tools/deploy.sh
```

From Phase 3 the browser reaches the game through the WebSocket bridge on
443 and these ports stay shut for good (CLAUDE.md Phase 8).

> Docker publishes ports by writing iptables rules that bypass ufw. `ufw status`
> can show a port as denied while Docker is happily serving it. `GAME_PORTS_BIND`
> is the control that actually decides this; ufw is the second layer, not the
> first.

---

## 8. Moving to a bigger VPS

The whole point of the constraints in CLAUDE.md §2.

1. `./tools/compose.sh exec backup backup-db` on the old host.
2. Steps 1–5 on the new host.
3. Copy `.env`, change `RO_ADVERTISE_IP` to the new address.
4. `./tools/compose.sh exec backup restore-db <stamp>`.
5. Repoint DNS.
6. Keep the old host up for a day, then destroy it.

No code change, no rebuild from scratch, no notes about what was done by hand
last time.

---

## Troubleshooting

**`docker compose` warns about unset variables** — you ran it directly instead
of through `./tools/compose.sh`, so it never loaded `.env`.

**`map1` is unhealthy for the first few minutes** — normal. It loads the whole
map cache and NPC set; the healthcheck allows 180s.

**Character select hangs after server select** — `RO_ADVERTISE_IP` is wrong, or
the char/map ports are not reachable from the client. See step 7.

**Client disconnects immediately on login** — `PACKETVER` does not match your
client. It is a compile-time value, so changing it means a rebuild:
`./tools/compose.sh build --no-cache`.

**Caddy cannot get a certificate** — DNS is not pointing at the VPS yet, or 80
is blocked. Caddy needs inbound 80 for the ACME challenge even though it serves
on 443.

**Disk filling up** — `docker system prune -a` clears old build layers; rAthena
images are large and every rebuild leaves the previous one behind.
