#!/usr/bin/env bash
# =============================================================================
# Prepare a fresh Ubuntu VPS to run this stack
# =============================================================================
# Run once, as root, on a clean Hostinger KVM2 (or any Ubuntu 22.04/24.04 box):
#
#     curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/main/tools/vps-bootstrap.sh | bash
#   or, having already cloned:
#     sudo ./tools/vps-bootstrap.sh
#
# This script knows nothing about this particular VPS. It hardcodes no address
# and no credential — CLAUDE.md §2.1 and §4: the host is disposable, and
# rebuilding on a bigger box must be running this again, not remembering what
# was done by hand last time.
#
# What it does:
#   - installs Docker Engine + Compose plugin from Docker's own repository
#   - creates a non-root `ro` user in the docker group
#   - configures a firewall: SSH + 80/443 only
#   - adds swap, because 8GB with no swap makes a compile OOM
#   - caps Docker's log usage so a chatty map-server cannot fill the disk
#   - installs fail2ban for SSH
#
# It does NOT clone the repo or start anything. See docs/vps-setup.md.
# =============================================================================
set -euo pipefail

RO_USER="${RO_USER:-ro}"
SWAP_SIZE="${SWAP_SIZE:-4G}"
SSH_PORT="${SSH_PORT:-22}"

log()  { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[fatal]\033[0m %s\n' "$*" >&2; exit 1; }

[[ ${EUID} -eq 0 ]] || die "run as root (sudo $0)"
command -v apt-get >/dev/null || die "this script expects a Debian/Ubuntu host"

export DEBIAN_FRONTEND=noninteractive


log "Updating the base system"
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    ca-certificates curl gnupg git ufw fail2ban \
    htop iotop ncdu jq unzip


log "Adding ${SWAP_SIZE} of swap"
# rAthena's map.cpp is a heavy translation unit. On 8GB with no swap, a
# parallel build gets OOM-killed at link time and the error looks unrelated.
if swapon --show | grep -q '/swapfile'; then
    echo "  swapfile already present, leaving it alone"
else
    fallocate -l "${SWAP_SIZE}" /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "  ${SWAP_SIZE} swapfile active"
fi
# Prefer RAM but do not refuse to swap — the alternative is the OOM killer
# choosing a map-server mid-WoE.
sysctl -qw vm.swappiness=10
grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf


log "Installing Docker Engine"
if command -v docker >/dev/null; then
    echo "  docker already installed: $(docker --version)"
else
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" \
        > /etc/apt/sources.list.d/docker.list

    apt-get update -qq
    apt-get install -y -qq \
        docker-ce docker-ce-cli containerd.io \
        docker-buildx-plugin docker-compose-plugin
    echo "  installed: $(docker --version)"
fi


log "Capping Docker log growth"
# 100GB NVMe is not much once a busy map-server has been talking for a month.
# Compose sets per-service limits too; this covers anything that forgets.
mkdir -p /etc/docker
if [[ -f /etc/docker/daemon.json ]] && ! grep -q 'log-opts' /etc/docker/daemon.json; then
    warn "/etc/docker/daemon.json exists without log-opts — merge these by hand:"
    warn '  "log-driver": "json-file", "log-opts": {"max-size": "20m", "max-file": "5"}'
elif [[ ! -f /etc/docker/daemon.json ]]; then
    cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "5"
  },
  "live-restore": true
}
JSON
    systemctl restart docker
    echo "  daemon.json written"
else
    echo "  already configured"
fi


log "Creating the ${RO_USER} user"
if id "${RO_USER}" >/dev/null 2>&1; then
    echo "  ${RO_USER} already exists"
else
    adduser --disabled-password --gecos "" "${RO_USER}"
    echo "  created ${RO_USER} (no password; use an SSH key)"
fi
usermod -aG docker "${RO_USER}"

# Carry root's authorized_keys over so you are not locked out after disabling
# root login. Do not disable root SSH until you have tested the ro login.
if [[ -f /root/.ssh/authorized_keys ]]; then
    install -d -m 700 -o "${RO_USER}" -g "${RO_USER}" "/home/${RO_USER}/.ssh"
    install -m 600 -o "${RO_USER}" -g "${RO_USER}" \
        /root/.ssh/authorized_keys "/home/${RO_USER}/.ssh/authorized_keys"
    echo "  copied root's authorized_keys to ${RO_USER}"
else
    warn "no /root/.ssh/authorized_keys — add a key for ${RO_USER} before you log out"
fi


log "Configuring the firewall"
# CLAUDE.md Phase 8: only 80/443 public. Raw game ports stay closed; Compose
# binds them to loopback unless GAME_PORTS_BIND says otherwise, and even then
# ufw is the backstop.
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow "${SSH_PORT}/tcp"  comment 'ssh'      >/dev/null
ufw allow 80/tcp             comment 'http'     >/dev/null
ufw allow 443/tcp            comment 'https'    >/dev/null
ufw allow 443/udp            comment 'http3'    >/dev/null
ufw --force enable >/dev/null
ufw status verbose | sed 's/^/  /'

warn "Docker publishes ports by writing iptables rules that bypass ufw."
warn "Keep GAME_PORTS_BIND=127.0.0.1 in .env. When you need a direct client"
warn "connection for the Phase 1 gate, open the port explicitly and close it"
warn "again afterwards — see docs/vps-setup.md."


log "Enabling fail2ban for SSH"
cat > /etc/fail2ban/jail.d/ssh.local <<CONF
[sshd]
enabled  = true
port     = ${SSH_PORT}
maxretry = 5
bantime  = 1h
findtime = 10m
CONF
systemctl enable --now fail2ban >/dev/null
echo "  fail2ban active"


log "Done"
cat <<EOF

  Host prepared. Next, as ${RO_USER}:

    su - ${RO_USER}
    git clone <repo-url> ~/ro-ep4 && cd ~/ro-ep4
    git submodule update --init --recursive
    cp .env.example .env
    ./tools/gen-secrets.sh
    \$EDITOR .env          # PUBLIC_HOST, RO_ADVERTISE_IP, ACME_EMAIL
    ./tools/deploy.sh

  Full walkthrough: docs/vps-setup.md

EOF
