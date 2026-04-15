#!/usr/bin/env bash
# DentalVis — start Expo with cloudflared tunnel
# Usage: bash start-tunnel.sh

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd "$(dirname "$0")"

echo "==> Starting Expo with cloudflared tunnel…"
npx expo start --tunnel
