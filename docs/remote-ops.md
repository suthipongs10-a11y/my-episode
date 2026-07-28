# Operating the VPS from GitHub

Once this is set up you never open a terminal again. You ask for something, a
workflow runs, and its log is the answer — readable from the GitHub mobile app,
or by whoever is driving the repo.

```
you ask  →  workflow dispatched  →  Actions runner SSHes to the VPS
         →  runs the operation   →  the run log is the result
```

The point is not only automation. It is that **the Actions log is visible to
whoever is helping you**, so a failed deploy can be diagnosed without anyone
copying terminal output by hand.

## What holds the secrets

Nothing in this repository, and nothing in any chat. Four values live in
**GitHub → Settings → Secrets and variables → Actions**, encrypted, write-only
once entered:

| Secret | What it is |
|---|---|
| `VPS_HOST` | the VPS address |
| `VPS_USER` | `ro` |
| `VPS_SSH_KEY` | private half of a key that exists only to let Actions log in |
| `VPS_KNOWN_HOSTS` | the VPS's host key, so Actions cannot be tricked into handing the key to an impostor |

## Only one key is needed

The repository is **public**, so the VPS reads it over HTTPS with no credentials
at all. Nothing to create, nothing to rotate, nothing that can be stolen off the
box. Traffic goes one direction only:

| Direction | Private half lives | Purpose |
|---|---|---|
| GitHub → VPS | GitHub Secrets, `VPS_SSH_KEY` | Actions runs commands on the VPS |

> **If the repository is ever made private**, the VPS can no longer clone
> anonymously and needs a read-only deploy key of its own. See *Switching to a
> private repository* at the end of this document — it is two commands and a
> one-line change.

---

## One-time setup

> Repository secrets cannot be added from the GitHub mobile app — it does not
> expose repository Settings. Use a browser, on a phone or otherwise.

### 1. Let Actions log in to the VPS

Run as `ro`, not root. The key goes into `ro`'s `authorized_keys`, and
`VPS_USER` is `ro`:

```bash
su - ro          # skip if the prompt already says ro@
whoami           # must print: ro
```

```bash
ssh-keygen -t ed25519 -C "github-actions" -f /tmp/actions_key -N ""
mkdir -p ~/.ssh && chmod 700 ~/.ssh
cat /tmp/actions_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat /tmp/actions_key
```

That last command prints the **private** key. Copy all of it, including both
delimiter lines:

```
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

Put it in **Settings → Secrets and variables → Actions → New repository
secret**, named `VPS_SSH_KEY`.

> The commonest mistake here is pasting `actions_key.pub` instead. The public
> half is one line starting `ssh-ed25519`; the private half is a block starting
> `-----BEGIN`. Only the block goes in the secret.

Then remove it from the VPS — GitHub holds it now, and a private key sitting in
`/tmp` is one `cat` away from anyone who gets a shell:

```bash
shred -u /tmp/actions_key /tmp/actions_key.pub
```

### 2. The remaining secrets

`VPS_KNOWN_HOSTS` pins the server's identity so Actions cannot be tricked into
handing the deploy key to something else answering on that address. Build it
from the host's own public keys rather than `ssh-keyscan`: reading the files is
exact, and it does not depend on the VPS being able to reach its own public
address, which some providers' NAT does not allow.

Two separate commands, deliberately. An earlier version printed a
`detected: <ip>` status line into the same block as the key lines, and it is not
obvious which of the four lines belongs in the secret — the status line does
not, and pasting it makes the whole file invalid.

**`VPS_HOST`** — prints one line, the address and nothing else:

```bash
curl -fsS ifconfig.me; echo
```

**`VPS_KNOWN_HOSTS`** — prints only key lines, usually three:

```bash
IP="$(curl -fsS ifconfig.me)"
for f in /etc/ssh/ssh_host_*_key.pub; do echo "${IP} $(cut -d' ' -f1,2 "${f}")"; done
```

Paste all of those lines into the one secret. Every line must start with the
address and have exactly three space-separated fields:

```
203.0.113.10 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...
<address>    <key type>  <key>
```

Add three more secrets:

| Name | Value |
|---|---|
| `VPS_HOST` | the address — one line, digits and dots only |
| `VPS_USER` | `ro` — two letters, no dash, no quotes |
| `VPS_KNOWN_HOSTS` | every line from the loop above, together in one secret |

### Check it before the long one

Do not verify with a deploy — that compiles rAthena and takes twenty minutes to
tell you a secret has a typo. Run **VPS ops → `status`** instead. It is seconds,
read-only, and reaches the box the same way.

| What you see | Meaning |
|---|---|
| `no checkout at ~/ro-ep4 — run the Deploy workflow first` | **all four secrets are correct.** SSH worked; there is simply nothing deployed yet |
| `cannot reach the VPS over SSH` | one of the four is wrong — the step names which are empty |
| `Host key verification failed` | `VPS_KNOWN_HOSTS` does not match, or `VPS_HOST` is a different address than the one in those lines |
| `Permission denied (publickey)` | `VPS_SSH_KEY` is not the private half of the key in `ro`'s `authorized_keys`, or `VPS_USER` is wrong |

### 3. First deploy

**Actions → Deploy to VPS → Run workflow.**

On the first run fill in `acme_email` — a real address, it is where Let's
Encrypt sends certificate expiry notices. `public_host` only matters once you
have a domain; leave it blank until then.

That run clones the repository to `~/ro-ep4`, creates `.env` from
`.env.example`, generates every password, sets `RO_ADVERTISE_IP` from
`VPS_HOST`, builds the images and starts the services.

---

## Day to day

### Deploy to VPS

| Input | Meaning |
|---|---|
| `services` | which to start. Default `db login char map1` — Phase 1 only, no Caddy, so nothing competes for port 80 |
| `rebuild` | discard the layer cache. rAthena recompiles: 15–20 minutes on 2 vCPU |
| `public_host` / `acme_email` | only read on first setup |

### VPS ops

| Operation | Does |
|---|---|
| `status` | compose state, every container on the host, deployed commit |
| `logs` | last N lines, one service or all |
| `diagnostics` | memory, swap, disk, docker usage, listening ports, `.env` check |
| `db-init` | import the rAthena schema (Phase 1) — needs `confirm` |
| `restart` / `stop` / `start` | one service or all |
| `backup-now` | take an off-host backup immediately |
| `prune-docker` | reclaim old image layers — needs `confirm`. Never touches volumes |

`db-init` and `prune-docker` require typing the operation name into the
`confirm` box. They change or destroy state, and a menu you can pick from with
one tap needs the destructive entries to cost more than one tap.

---

## What this does not do

- **No automatic deploy on push.** Every deploy is dispatched deliberately.
  Pushing a broken commit does not take the server down.
- **No arbitrary shell.** The ops menu is a fixed list. Anyone who can dispatch
  a workflow could reach the box anyway, but a menu keeps the run history
  legible and makes a destructive act a choice rather than a typo.
- **No secrets in the repository or in chat**, in either direction. The
  workflow prints service status and logs; it never prints `.env`.

## If it stops working

**`cannot reach the VPS over SSH`** — the connection check failed before
anything ran. One of the four secrets is wrong, the VPS is down, or its host key
changed (rebuilt the box? regenerate `VPS_KNOWN_HOSTS`).

**`Permission denied (publickey)` while cloning on the VPS** — the repository
went private but `REPO_URL` is still the HTTPS one, or the deploy key is
missing. See *Switching to a private repository* below.

**`could not read Username for 'https://github.com'`** — same cause: an
anonymous HTTPS clone of a repository that is no longer public.

**`.env is incomplete on the VPS`** — a later phase added a key. The deploy
tries `check-env.sh --fix` itself; if it still fails, the value needs a human.
The log names it.

**Everything hangs at the build** — first build compiles rAthena, 15–20 minutes
on 2 vCPU. The job allows 60.

## Going back to doing it by hand

Nothing here replaces the manual path. `docs/vps-setup.md` still works, and
`ssh ro@<host>` with the tools in `tools/` is always available. The automation
is a convenience layer over the same scripts, not a different system.

---

## Switching to a private repository

Public was chosen deliberately. If that changes, the VPS loses anonymous read
access and needs its own read-only key. Two commands and a one-line edit:

On the VPS, as `ro`:

```bash
ssh-keygen -t ed25519 -C "ro-ep4-vps-pull" -f ~/.ssh/id_deploy_github -N ""
cat >> ~/.ssh/config <<'CONF'
Host github.com
  User git
  IdentityFile ~/.ssh/id_deploy_github
  IdentitiesOnly yes
CONF
chmod 600 ~/.ssh/config
ssh-keyscan github.com >> ~/.ssh/known_hosts
cat ~/.ssh/id_deploy_github.pub
```

On GitHub: **Settings → Deploy keys → Add deploy key**, paste it, and leave
**"Allow write access" unchecked** — the VPS deploys what has already been built
and reviewed, it never pushes. A key that can write is a key that can rewrite
history if the box is taken.

Verify with `ssh -T git@github.com`, then change `REPO_URL` in
`.github/workflows/deploy.yml`:

```yaml
REPO_URL: git@github.com:${{ github.repository }}.git
```

The existing checkout also needs repointing, once:

```bash
cd ~/ro-ep4 && git remote set-url origin git@github.com:<owner>/<repo>.git
```

(The deploy workflow sets the remote URL on every run, so this is only needed if
you want to pull by hand before the next deploy.)

One other thing changes: private repositories draw from the free tier's 2,000
Actions minutes a month, where public ones are unlimited. A CI run here is about
six minutes and a deploy two to twenty, which is comfortable, but it stops being
free-forever.
