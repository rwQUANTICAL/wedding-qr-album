#!/usr/bin/env bash
# First-time setup. Writes .env with generated secrets and prints the setup link.
#
#   ./scripts/setup.sh            deployment on a server with Docker
#   ./scripts/setup.sh --local    local development with npm run dev
#   ./scripts/setup.sh --force    overwrite an existing .env

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env"
MODE="server"
FORCE=0

for arg in "$@"; do
	case "$arg" in
		--local) MODE="local" ;;
		--force) FORCE=1 ;;
		-h | --help)
			sed -n '2,8p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
			exit 0
			;;
		*)
			echo "Unknown option: $arg" >&2
			exit 1
			;;
	esac
done

if [ -f "$ENV_FILE" ] && [ "$FORCE" -eq 0 ]; then
	echo ".env already exists. Run with --force to replace it." >&2
	exit 1
fi

command -v openssl >/dev/null || {
	echo "openssl is missing, install it first." >&2
	exit 1
}

ADMIN_KEY="$(openssl rand -hex 16)"
COOKIE_SECRET="$(openssl rand -hex 32)"

if [ "$MODE" = "local" ]; then
	BASE_URL="http://localhost:5173"
	DOMAIN="localhost"
	DATA_DIR="./data"
else
	read -r -p "Your domain (for example photos.example.com): " DOMAIN
	DOMAIN="${DOMAIN#http://}"
	DOMAIN="${DOMAIN#https://}"
	DOMAIN="${DOMAIN%%/*}"
	[ -n "$DOMAIN" ] || {
		echo "A domain is required." >&2
		exit 1
	}
	BASE_URL="https://$DOMAIN"
	DATA_DIR="/data"
fi

cat > "$ENV_FILE" <<ENVFILE
# Written by scripts/setup.sh. Keep this file out of git.

# Where the database and the media files live (inside the container: /data)
DATA_DIR=$DATA_DIR
# Your admin link: $BASE_URL/admin?key=$ADMIN_KEY
ADMIN_KEY=$ADMIN_KEY
# Signs the cookie that identifies a guest
COOKIE_SECRET=$COOKIE_SECRET
# Public address the QR code points to
PUBLIC_BASE_URL=$BASE_URL
# Domain for Caddy and its TLS certificate
DOMAIN=$DOMAIN
ORIGIN=$BASE_URL
# Optional fallback for the header. The setup wizard writes the real one.
EVENT_TITLE=
ENVFILE

chmod 600 "$ENV_FILE"
echo "Wrote .env"

if [ "$MODE" = "local" ]; then
	cat <<NEXT

Next:
  npm install
  npm run dev

Then open this link once to name the couple and pick a photo:
  $BASE_URL/setup?key=$ADMIN_KEY
NEXT
	exit 0
fi

command -v docker >/dev/null || {
	echo "Docker is missing. Install it, then run: docker compose -f deploy/docker-compose.image.yml up -d" >&2
	exit 1
}

echo "Creating /data/db, /data/media and /data/caddy"
sudo mkdir -p /data/db /data/media /data/caddy

read -r -p "Start the containers now? [Y/n] " START
if [ -z "$START" ] || [ "$START" = "y" ] || [ "$START" = "Y" ]; then
	docker compose -f "$ROOT/deploy/docker-compose.image.yml" pull
	docker compose -f "$ROOT/deploy/docker-compose.image.yml" up -d
else
	echo "Start them later with: docker compose -f deploy/docker-compose.image.yml up -d"
fi

cat <<NEXT

Point $DOMAIN at this server, then open this link once to name the couple and pick a photo:
  $BASE_URL/setup?key=$ADMIN_KEY

Your admin panel stays at:
  $BASE_URL/admin?key=$ADMIN_KEY

Both links are in .env. Keep them private.
NEXT
