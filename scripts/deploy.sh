#!/usr/bin/env bash
set -euo pipefail

# Deploy cybercore-website to a remote server over SSH.
#
# Usage:
#   ./scripts/deploy.sh              # build, upload, and deploy
#   ./scripts/deploy.sh --install    # first-time server setup + deploy
#
# Override defaults with environment variables:
#   DEPLOY_SSH_HOST      SSH host alias (default: the-bear-2)
#   DEPLOY_REMOTE_PATH   Web root on server (default: /var/www/cybercore-website)
#   DEPLOY_DOMAIN        Primary domain (default: cybercore.network)
#   DEPLOY_CERT_EMAIL    Let's Encrypt contact email (default: contact@cybercore.network)
#   DEPLOY_APP_NAME      App / nginx site name (default: cybercore-website)

SSH_HOST="${DEPLOY_SSH_HOST:-the-bear-2}"
REMOTE_PATH="${DEPLOY_REMOTE_PATH:-/var/www/cybercore-website}"
DOMAIN="${DEPLOY_DOMAIN:-cybercore.network}"
WWW_DOMAIN="www.${DOMAIN}"
CERT_EMAIL="${DEPLOY_CERT_EMAIL:-contact@cybercore.network}"
APP_NAME="${DEPLOY_APP_NAME:-cybercore-website}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/dist"
ARCHIVE_NAME="${APP_NAME}-deploy.zip"
LOCAL_ARCHIVE="$PROJECT_ROOT/.deploy/${ARCHIVE_NAME}"
REMOTE_ARCHIVE="/tmp/${ARCHIVE_NAME}"
NGINX_SITE="/etc/nginx/sites-available/${APP_NAME}"

INSTALL=false

usage() {
  cat <<EOF
Usage: $(basename "$0") [--install]

Build the Vite app, zip dist/, upload to ${SSH_HOST}, and deploy to ${REMOTE_PATH}.

Options:
  --install   First-time server setup: install nginx/certbot if needed, configure site, and enable SSL
  -h, --help  Show this help

Environment:
  DEPLOY_SSH_HOST      SSH host (default: ${SSH_HOST})
  DEPLOY_REMOTE_PATH   Remote web root (default: ${REMOTE_PATH})
  DEPLOY_DOMAIN        Domain name (default: ${DOMAIN})
  DEPLOY_CERT_EMAIL    Certbot email (default: ${CERT_EMAIL})
  DEPLOY_APP_NAME      App name (default: ${APP_NAME})
EOF
}

for arg in "$@"; do
  case "$arg" in
    --install) INSTALL=true ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

log() {
  printf '==> %s\n' "$*"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    exit 1
  fi
}

build_project() {
  log "Building project"
  cd "$PROJECT_ROOT"
  npm run build

  if [[ ! -d "$BUILD_DIR" ]] || [[ ! -f "$BUILD_DIR/index.html" ]]; then
    echo "Build failed: ${BUILD_DIR}/index.html not found" >&2
    exit 1
  fi
}

create_archive() {
  log "Creating deployment archive"
  require_command zip

  mkdir -p "$(dirname "$LOCAL_ARCHIVE")"
  rm -f "$LOCAL_ARCHIVE"

  (
    cd "$BUILD_DIR"
    zip -rq "$LOCAL_ARCHIVE" .
  )

  log "Archive created: $LOCAL_ARCHIVE ($(du -h "$LOCAL_ARCHIVE" | awk '{print $1}'))"
}

upload_archive() {
  log "Uploading archive to ${SSH_HOST}:${REMOTE_ARCHIVE}"
  require_command scp
  scp "$LOCAL_ARCHIVE" "${SSH_HOST}:${REMOTE_ARCHIVE}"
}

remote_install() {
  log "Running first-time server setup on ${SSH_HOST}"

  ssh "$SSH_HOST" "sudo bash -s" <<REMOTE
set -euo pipefail

APP_NAME="${APP_NAME}"
REMOTE_PATH="${REMOTE_PATH}"
DOMAIN="${DOMAIN}"
WWW_DOMAIN="${WWW_DOMAIN}"
CERT_EMAIL="${CERT_EMAIL}"
NGINX_SITE="${NGINX_SITE}"
NGINX_ENABLED="/etc/nginx/sites-enabled/\${APP_NAME}"

ensure_packages() {
  local packages=()

  if ! command -v nginx >/dev/null 2>&1; then
    packages+=(nginx)
  fi

  if ! command -v certbot >/dev/null 2>&1; then
    packages+=(certbot python3-certbot-nginx)
  fi

  if ! command -v unzip >/dev/null 2>&1; then
    packages+=(unzip)
  fi

  if ! command -v rsync >/dev/null 2>&1; then
    packages+=(rsync)
  fi

  if [[ \${#packages[@]} -eq 0 ]]; then
    echo "All required packages already installed"
    return 0
  fi

  echo "Installing missing packages: \${packages[*]}"

  if command -v apt-get >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y "\${packages[@]}"
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y "\${packages[@]}"
  elif command -v yum >/dev/null 2>&1; then
    yum install -y "\${packages[@]}"
  else
    echo "No supported package manager found (apt-get/dnf/yum). Install manually: \${packages[*]}" >&2
    exit 1
  fi
}

ensure_packages

if ! systemctl is-enabled nginx >/dev/null 2>&1; then
  systemctl enable nginx
fi

if ! systemctl is-active nginx >/dev/null 2>&1; then
  systemctl start nginx
fi

mkdir -p "\${REMOTE_PATH}"
chown -R www-data:www-data "\${REMOTE_PATH}"

cat > "\${NGINX_SITE}" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER WWW_DOMAIN_PLACEHOLDER;

    root REMOTE_PATH_PLACEHOLDER;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files \$uri =404;
    }

    location = /manifest.json {
        add_header Cache-Control "no-cache";
        try_files \$uri =404;
    }

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files \$uri =404;
    }
}
NGINX

sed -i "s|DOMAIN_PLACEHOLDER|${DOMAIN}|g; s|WWW_DOMAIN_PLACEHOLDER|${WWW_DOMAIN}|g; s|REMOTE_PATH_PLACEHOLDER|${REMOTE_PATH}|g" "\${NGINX_SITE}"

ln -sf "\${NGINX_SITE}" "\${NGINX_ENABLED}"

nginx -t
systemctl reload nginx

if ! certbot certificates 2>/dev/null | grep -q "Certificate Name: \${DOMAIN}"; then
  certbot --nginx \
    -d "\${DOMAIN}" \
    -d "\${WWW_DOMAIN}" \
    --non-interactive \
    --agree-tos \
    -m "\${CERT_EMAIL}" \
    --redirect
else
  echo "SSL certificate for \${DOMAIN} already exists; skipping certbot"
fi

echo "Server setup complete"
REMOTE
}

remote_deploy() {
  log "Deploying on ${SSH_HOST}"

  ssh "$SSH_HOST" "sudo bash -s" <<REMOTE
set -euo pipefail

REMOTE_PATH="${REMOTE_PATH}"
REMOTE_ARCHIVE="${REMOTE_ARCHIVE}"
STAGING_DIR="\$(mktemp -d /tmp/${APP_NAME}-deploy.XXXXXX)"

ensure_deploy_tools() {
  local packages=()

  if ! command -v unzip >/dev/null 2>&1; then
    packages+=(unzip)
  fi

  if ! command -v rsync >/dev/null 2>&1; then
    packages+=(rsync)
  fi

  if [[ \${#packages[@]} -eq 0 ]]; then
    return 0
  fi

  echo "Installing missing deploy tools: \${packages[*]}"

  if command -v apt-get >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y "\${packages[@]}"
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y "\${packages[@]}"
  elif command -v yum >/dev/null 2>&1; then
    yum install -y "\${packages[@]}"
  else
    echo "No supported package manager found (apt-get/dnf/yum). Install manually: \${packages[*]}" >&2
    exit 1
  fi
}

ensure_deploy_tools

cleanup() {
  rm -rf "\${STAGING_DIR}"
}
trap cleanup EXIT

if [[ ! -f "\${REMOTE_ARCHIVE}" ]]; then
  echo "Remote archive not found: \${REMOTE_ARCHIVE}" >&2
  exit 1
fi

unzip -oq "\${REMOTE_ARCHIVE}" -d "\${STAGING_DIR}"

mkdir -p "\${REMOTE_PATH}"
rsync -a --delete "\${STAGING_DIR}/" "\${REMOTE_PATH}/"
chown -R www-data:www-data "\${REMOTE_PATH}"
rm -f "\${REMOTE_ARCHIVE}"

if command -v nginx >/dev/null 2>&1; then
  nginx -t
  systemctl reload nginx
fi

echo "Deployed to \${REMOTE_PATH}"
REMOTE
}

main() {
  require_command npm
  require_command ssh

  build_project
  create_archive
  upload_archive

  if [[ "$INSTALL" == true ]]; then
    remote_install
  fi

  remote_deploy

  log "Deployment complete"
  if [[ "$INSTALL" == true ]]; then
    log "Site should be live at https://${DOMAIN}"
  else
    log "Updated files on ${SSH_HOST}:${REMOTE_PATH}"
  fi
}

main
