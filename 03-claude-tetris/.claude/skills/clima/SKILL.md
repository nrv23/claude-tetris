---
name: clima
description: Consulta la temperatura, sensación térmica y humedad actuales de la ubicación del usuario (San José, Curridabat, José María Zeledón, Costa Rica) usando la API gratuita Open-Meteo. Úsalo cuando el usuario pregunte por el clima, la temperatura, la humedad o "qué tiempo hace". Acepta opcionalmente otra ciudad como argumento.
---

# Clima local

Obtiene el clima actual con **Open-Meteo** (`https://api.open-meteo.com`), API gratuita, sin API key ni registro.

## Ubicación por defecto

**San José, Curridabat, José María Zeledón, Costa Rica.** Úsala siempre que el usuario no indique otra ciudad.
- Latitud: `9.9198`
- Longitud: `-84.0410`
- Zona horaria: `America/Costa_Rica`

## Pasos

1. Si el usuario pasa una ciudad como argumento (`/clima <ciudad>`), geocodifícala primero con Nominatim (OpenStreetMap, gratis). Envía siempre un header `User-Agent`:

   ```bash
   curl -s "https://nominatim.openstreetmap.org/search?q=<ciudad>&format=json&limit=1" -H "User-Agent: claude-code-clima"
   ```

   Toma `lat` y `lon` del primer resultado. Si no hay argumento, usa las coordenadas por defecto.

2. Ejecuta el script incluido con esas coordenadas:

   ```bash
   bash .claude/skills/clima/clima.sh [lat] [lon]
   ```

   O directamente la llamada HTTP:

   ```bash
   curl -s "https://api.open-meteo.com/v1/forecast?latitude=9.9198&longitude=-84.0410&current=temperature_2m,apparent_temperature,relative_humidity_2m&timezone=America%2FCosta_Rica"
   ```

3. Responde al usuario en español con una tabla corta:

   | Dato | Valor |
   |---|---|
   | Temperatura | `current.temperature_2m` °C |
   | Sensación térmica | `current.apparent_temperature` °C |
   | Humedad | `current.relative_humidity_2m` % |

   Incluye la hora de la lectura (`current.time`) y menciona que la fuente es Open-Meteo.

## Notas

- Open-Meteo usa una malla de ~11 km; barrios cercanos devuelven el mismo punto de malla.
- Si `curl` falla, reporta el error exacto y no inventes valores.
- Para consultas recurrentes, combina con `/loop`, por ejemplo: `/loop 1m /clima`.
