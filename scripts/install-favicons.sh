#!/usr/bin/env bash
set -euo pipefail

# Copy favicon_pack assets into public/ using CINDERBLOCK naming conventions.
#
# Expected layout in favicon_pack/:
#   favicon.ico
#   favicon-16x16.png
#   favicon-32x32.png
#   apple-touch-icon.png
#   android-chrome-192x192.png
#   android-chrome-512x512.png
#   site.webmanifest          (ignored — public/manifest.json is canonical)
#
# Usage (from repo root):
#   ./scripts/install-favicons.sh
#
# Options:
#   --keep-pack   Do not delete favicon_pack/ after install

KEEP_PACK=0
if [[ "${1:-}" == "--keep-pack" ]]; then
  KEEP_PACK=1
elif [[ -n "${1:-}" ]]; then
  echo "Unknown option: $1" >&2
  echo "Usage: $0 [--keep-pack]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PACK_DIR="$PROJECT_ROOT/favicon_pack"
PUBLIC_DIR="$PROJECT_ROOT/public"
ICONS_DIR="$PUBLIC_DIR/icons"

required_files=(
  favicon.ico
  favicon-16x16.png
  favicon-32x32.png
  apple-touch-icon.png
  android-chrome-192x192.png
  android-chrome-512x512.png
)

if [[ ! -d "$PACK_DIR" ]]; then
  echo "Error: favicon_pack/ not found at $PACK_DIR" >&2
  exit 1
fi

for file in "${required_files[@]}"; do
  if [[ ! -f "$PACK_DIR/$file" ]]; then
    echo "Error: missing $PACK_DIR/$file" >&2
    exit 1
  fi
done

mkdir -p "$ICONS_DIR"

cp "$PACK_DIR/favicon.ico" "$PUBLIC_DIR/favicon.ico"
cp "$PACK_DIR/favicon-16x16.png" "$PUBLIC_DIR/icon-16x16.png"
cp "$PACK_DIR/favicon-32x32.png" "$PUBLIC_DIR/icon-light-32x32.png"
cp "$PACK_DIR/favicon-32x32.png" "$PUBLIC_DIR/icon-dark-32x32.png"
cp "$PACK_DIR/apple-touch-icon.png" "$PUBLIC_DIR/apple-icon.png"
cp "$PACK_DIR/android-chrome-192x192.png" "$ICONS_DIR/icon-192x192.png"
cp "$PACK_DIR/android-chrome-512x512.png" "$ICONS_DIR/icon-512x512.png"

echo "Installed favicons:"
echo "  public/favicon.ico"
echo "  public/icon-16x16.png"
echo "  public/icon-light-32x32.png"
echo "  public/icon-dark-32x32.png"
echo "  public/apple-icon.png"
echo "  public/icons/icon-192x192.png"
echo "  public/icons/icon-512x512.png"

if [[ "$KEEP_PACK" -eq 0 ]]; then
  rm -rf "$PACK_DIR"
  echo "Removed favicon_pack/"
else
  echo "Kept favicon_pack/ (--keep-pack)"
fi
