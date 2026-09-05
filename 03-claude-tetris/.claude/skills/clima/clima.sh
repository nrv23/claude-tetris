#!/usr/bin/env bash
# Consulta el clima actual en Open-Meteo (API gratuita, sin key).
# Uso: clima.sh [lat] [lon]
# Por defecto: San José, Curridabat, José María Zeledón, Costa Rica.
set -euo pipefail

LAT="${1:-9.9198}"
LON="${2:--84.0410}"
LUGAR="San José, Curridabat, José María Zeledón, Costa Rica"
[ $# -ge 1 ] && LUGAR="lat ${LAT}, lon ${LON}"
TZ_NAME="America%2FCosta_Rica"

URL="https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,apparent_temperature,relative_humidity_2m&timezone=${TZ_NAME}"

RESP="$(curl -sf "$URL")" || { echo "Error: no se pudo consultar Open-Meteo ($URL)" >&2; exit 1; }

if command -v jq >/dev/null 2>&1; then
  echo "Lugar: $LUGAR"; echo "$RESP" | jq -r '.current | "Hora: \(.time)\nTemperatura: \(.temperature_2m) °C\nSensación térmica: \(.apparent_temperature) °C\nHumedad: \(.relative_humidity_2m) %"'
else
  echo "$RESP"
fi
