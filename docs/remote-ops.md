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

## Two keys, two directions

Easy to conflate, so keep them straight:

| | Direction | Where the private half lives | Purpose |
|---|---|---|---|
| **Key A** — deploy key | VPS → GitHub | on the VPS, `~/.ssh/id_deploy_github` | the VPS pulls the code |
| **Key B** — actions key | GitHub → VPS | GitHub Secrets, `VPS_SSH_KEY` | Actions runs commands |

Key A is **read-only** on the repository: the VPS deploys what has already been
reviewed and built, it never pushes. A key that can write is a key that can
rewrite history if the box is taken.

---

## One-time setup

### 1. Make the repository private

**Settings → General → Danger Zone → Change repository visibility → Private.**

Not required for any of this to work, but it is the recommended posture —
CLAUDE.md §9 notes the copyright exposure grows with visibility, and going
public later is easy while un-publishing is not.

> Private repositories draw from the free tier's Actions minutes (2,000/month)
> where public ones are unlimited. A CI run here is about 6 minutes and a deploy
> 2–20, so it is comfortable, but it is no longer free-forever the way public is.

### 2. Key A — let the VPS read the repository

On the VPS, as `ro`:

```bash
su - ro          # from your root session, if you are not already ro
ssh-keygen -t ed25519 -C "ro-ep4-vps-pull" -f ~/.ssh/id_deploy_github -N ""
cat ~/.ssh/id_deploy_github.pub
```

Tell SSH to use it for GitHub:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
  User git
  IdentityFile ~/.ssh/id_deploy_github
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
ssh-keyscan github.com >> ~/.ssh/known_hosts
```

On GitHub: **Settings → Deploy keys → Add deploy key.** Paste the `.pub` output,
name it after the host, and leave **"Allow write access" unchecked**.

Check it:

```bash
ssh -T git@github.com     # "You've successfully authenticated"
```

### 3. Key B — let Actions log in to the VPS

Still as `ro`:

```bash
ssh-keygen -t ed25519 -C "github-actions" -f /tmp/actions_key -N ""
cat /tmp/actions_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat /tmp/actions_key          # copy this whole block, BEGIN and END lines included
```

Put that private key in **Settings → Secrets and variables → Actions → New
repository secret**, named `VPS_SSH_KEY`.

Then delete it from the VPS — GitHub is where it lives now:

```bash
shred -u /tmp/actions_key /tmp/actions_key.pub
```

### 4. The remaining secrets

```bash
ssh-keyscan -H "$(curl -s ifconfig.me)"      # output goes in VPS_KNOWN_HOSTS
```

Add three more secrets:

| Name | Value |
|---|---|
| `VPS_HOST` | the address |
| `VPS_USER` | `ro` |
| `VPS_KNOWN_HOSTS` | the `ssh-keyscan` output above |

### 5. First deploy

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

**`Permission denied (publickey)` while cloning on the VPS** — key A. Confirm
the deploy key is on the repository and `ssh -T git@github.com` works as `ro`.

**`.env is incomplete on the VPS`** — a later phase added a key. The deploy
tries `check-env.sh --fix` itself; if it still fails, the value needs a human.
The log names it.

**Everything hangs at the build** — first build compiles rAthena, 15–20 minutes
on 2 vCPU. The job allows 60.

## Going back to doing it by hand

Nothing here replaces the manual path. `docs/vps-setup.md` still works, and
`ssh ro@<host>` with the tools in `tools/` is always available. The automation
is a convenience layer over the same scripts, not a different system.
