#!/usr/bin/env bash
# Renames a screenshot to an SEO-friendly filename, compresses it to WebP,
# puts it into docs/screenshots/ and pushes it to the repo.
#
#   ./scripts/add-screenshot.sh album
#   ./scripts/add-screenshot.sh admin ~/Desktop/my-shot.png
#   ./scripts/add-screenshot.sh album --no-push
#
# Without a file argument the newest screenshot on your Desktop is used.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/docs/screenshots"
MAX_WIDTH=1200
QUALITY=82
PUSH=1

usage() {
	cat <<'USAGE'
Usage: ./scripts/add-screenshot.sh <view> [source-file] [--no-push]

Views and the filenames they produce:
  album       wedding-photo-sharing-app-shared-album.webp
  fullscreen  wedding-photo-sharing-app-full-screen-photo-view.webp
  upload      wedding-photo-sharing-app-guest-photo-upload.webp
  welcome     wedding-photo-sharing-app-guest-welcome-screen.webp
  admin       wedding-photo-sharing-app-admin-dashboard.webp
  qr          wedding-photo-sharing-app-qr-code-print.webp
USAGE
}

slug_for() {
	case "$1" in
		album) echo "wedding-photo-sharing-app-shared-album" ;;
		fullscreen) echo "wedding-photo-sharing-app-full-screen-photo-view" ;;
		upload) echo "wedding-photo-sharing-app-guest-photo-upload" ;;
		welcome) echo "wedding-photo-sharing-app-guest-welcome-screen" ;;
		admin) echo "wedding-photo-sharing-app-admin-dashboard" ;;
		qr) echo "wedding-photo-sharing-app-qr-code-print" ;;
		*) return 1 ;;
	esac
}

newest_desktop_screenshot() {
	find "$HOME/Desktop" -maxdepth 1 -type f \
		\( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.heic" \) \
		-print0 2>/dev/null |
		xargs -0 ls -t 2>/dev/null | head -1
}

VIEW=""
SOURCE=""
for arg in "$@"; do
	case "$arg" in
		--no-push) PUSH=0 ;;
		-h | --help)
			usage
			exit 0
			;;
		*)
			if [ -z "$VIEW" ]; then VIEW="$arg"; else SOURCE="$arg"; fi
			;;
	esac
done

if [ -z "$VIEW" ]; then
	usage
	exit 1
fi

if ! SLUG="$(slug_for "$VIEW")"; then
	echo "Unknown view: $VIEW" >&2
	usage
	exit 1
fi

if [ -z "$SOURCE" ]; then
	SOURCE="$(newest_desktop_screenshot)"
	[ -n "$SOURCE" ] || {
		echo "No screenshot found on your Desktop. Pass a file path." >&2
		exit 1
	}
	echo "Using newest Desktop file: $SOURCE"
fi

[ -f "$SOURCE" ] || {
	echo "File not found: $SOURCE" >&2
	exit 1
}

TARGET="$OUT_DIR/$SLUG.webp"
mkdir -p "$OUT_DIR"

node --input-type=module -e '
import sharp from "sharp";
const [src, dest, width, quality] = process.argv.slice(1);
const image = sharp(src, { failOn: "none" }).rotate();
const { width: w, height: h } = await image.metadata();
const info = await image
  .resize({ width: Math.min(Number(width), w ?? Number(width)), withoutEnlargement: true })
  .webp({ quality: Number(quality) })
  .toFile(dest);
console.log(`${w}x${h} -> ${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)} KB`);
' "$SOURCE" "$TARGET" "$MAX_WIDTH" "$QUALITY"

echo "Wrote docs/screenshots/$SLUG.webp"
echo
echo "Markdown for the README:"
echo "![$VIEW](docs/screenshots/$SLUG.webp)"
echo

cd "$ROOT"
git add "docs/screenshots/$SLUG.webp"
if git diff --cached --quiet; then
	echo "Nothing changed, the file is identical to the committed one."
	exit 0
fi

git commit -q -m "docs: add $VIEW screenshot"
if [ "$PUSH" -eq 1 ]; then
	git push -q
	echo "Pushed to $(git rev-parse --abbrev-ref HEAD)."
else
	echo "Committed. Run git push when you are ready."
fi
