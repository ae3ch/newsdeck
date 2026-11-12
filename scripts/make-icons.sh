#!/bin/sh
# Erzeugt die App-Icons in public/icons aus dem Favicon. Braucht rsvg-convert (librsvg).
set -eu
cd "$(dirname "$0")/.."
out=public/icons
mkdir -p "$out"

# Vollflächige Fassung für iOS und «maskable»: Das System schneidet die Form selbst zu,
# deshalb ohne runde Ecken und mit dem Zeichen in der sicheren Mitte.
full=$(mktemp)
trap 'rm -f "$full"' EXIT
cat > "$full" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#c2410c"/><g transform="translate(16 16) scale(.68) translate(-16 -16)"><path d="M8 10h16M8 16h10M8 22h13" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></g></svg>
SVG

rsvg-convert -w 192 -h 192 public/favicon.svg -o "$out/icon-192.png"
rsvg-convert -w 512 -h 512 public/favicon.svg -o "$out/icon-512.png"
rsvg-convert -w 512 -h 512 "$full" -o "$out/maskable-512.png"
rsvg-convert -w 180 -h 180 "$full" -o "$out/apple-touch-icon.png"
