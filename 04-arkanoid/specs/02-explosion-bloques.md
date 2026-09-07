# SPEC 02 — Animación de explosión al destruir bloques

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-09-06
> **Objetivo:** Mostrar la animación de explosión del spritesheet (`EXPLOSION_FRAMES`) durante 150 ms en el lugar de cada bloque destruido, sin alterar la jugabilidad del MVP.

---

## Alcance

**In:**

- Al golpear un bloque, además de marcarlo como muerto, se crea una explosión en su misma posición y tamaño (48×24).
- La explosión recorre los 4 frames de `EXPLOSION_FRAMES[color]` a lo largo de `EXPLOSION_DURATION` (150 ms), medidos con `performance.now()`.
- La explosión se dibuja con `drawFrame` después de los bloques y antes de la paleta y la bola.
- Al terminar los 150 ms la explosión se elimina de la lista.
- El bloque deja de colisionar y de dibujarse en el mismo instante del golpe (comportamiento actual de `alive = false`).
- La pantalla de victoria espera a que no queden bloques vivos **y** a que la lista de explosiones esté vacía.
- Perder una vida no interrumpe las explosiones en curso.
- Reiniciar la partida (`resetGame`) vacía la lista de explosiones.

**Fuera de alcance (para specs futuros):**

- Sonido de rotura (`assets/sounds/break-sound.mp3`) y sonido de rebote.
- Explosión de tamaño distinto al bloque o efectos de partículas.
- Puntuación distinta por color de bloque.
- Bloques con varios golpes de resistencia.
- Cualquier otro punto ya excluido en SPEC 01 (niveles, power-ups, récords, pausa, móvil, skins).

---

## Modelo de datos

Se añade una lista al `state` de `game.js`. No hay persistencia.

```js
const EXPLOSION_FRAME_COUNT = 4; // longitud de EXPLOSION_FRAMES[color]

const state = {
  // ...campos de SPEC 01...
  explosions: [], // [{ x, y, w, h, color, startTime }]
};
```

Convenciones:

- `x, y, w, h` se copian del bloque destruido (`brick.x, brick.y, brick.w, brick.h`).
- `color` es el color del bloque; indexa `EXPLOSION_FRAMES[color]` (gray reutiliza los frames de red, ya resuelto en `spritesheet.js`).
- `startTime` es `performance.now()` en el momento del golpe.
- Frame actual: `Math.min(EXPLOSION_FRAME_COUNT - 1, Math.floor(elapsed / (EXPLOSION_DURATION / EXPLOSION_FRAME_COUNT)))`, con `elapsed = now - startTime`.
- Una explosión termina cuando `elapsed >= EXPLOSION_DURATION`.

---

## Plan de implementación

Cada paso deja el juego ejecutable sirviendo la carpeta por HTTP.

1. Añadir `explosions: []` a `state` y la constante `EXPLOSION_FRAME_COUNT`. En `resetGame` poner `state.explosions = []`. Prueba manual: el juego arranca y se juega igual que antes, sin errores en consola.
2. En `updateBricks`, al marcar `brick.alive = false`, hacer `state.explosions.push({ x, y, w, h, color, startTime: performance.now() })`. Prueba manual: `state.explosions.length` crece en consola al romper bloques.
3. Crear `updateExplosions()` que elimina de `state.explosions` las que superan `EXPLOSION_DURATION`. Llamarla desde `update()` después de `updateBricks()`. Prueba manual: la lista vuelve a vaciarse ~150 ms después de cada golpe.
4. Crear `drawExplosions()` que, para cada explosión, calcula el frame según el tiempo transcurrido y llama a `drawFrame(ctx, EXPLOSION_FRAMES[color][frame], x, y, w, h)`. Llamarla en `draw()` justo después de `drawBricks()` y antes de `drawPaddle()`. Prueba manual: al romper un bloque se ve la explosión de 4 frames en su sitio.
5. Cambiar la condición de victoria en `updateBricks` a: ningún bloque vivo **y** `state.explosions.length === 0`. Prueba manual: al romper el último bloque se ve su explosión completa antes de aparecer “¡Has ganado!”.

---

## Criterios de aceptación

- [x ] Servido por HTTP, `index.html` carga sin errores en la consola.
- [x ] Al golpear un bloque aparece una explosión en el mismo rectángulo (48×24) donde estaba el bloque.
- [x ] La explosión muestra los 4 frames del color del bloque y desaparece tras ~150 ms.
- [x ] El bloque golpeado deja de dibujarse y de colisionar en el mismo frame del golpe.
- [ x] La bola y la paleta se dibujan por encima de las explosiones.
- [x ] Un bloque gris explota con los frames rojos sin errores.
- [ x] Tras terminar la explosión, `state.explosions` queda vacía (comprobable en consola).
- [x ] Al romper el último bloque, la pantalla de victoria aparece solo cuando su explosión ha terminado.
- [x ] Perder una vida mientras hay explosiones en curso no las corta.
- [x ] Reiniciar desde game over o victoria deja `state.explosions` vacía.
- [x ] La puntuación sigue sumando exactamente 10 puntos por bloque.
- [x ] El juego sigue sin reproducir ningún sonido.
- [x ] No existe `package.json` ni ninguna dependencia externa.

---

## Decisiones

- **Sí:** lista aparte `state.explosions`. Separa colisión (bloques) de animación (efectos) y deja `drawBricks` intacto.
- **No:** estado `exploding` dentro del bloque. Mezcla la lógica de colisión con la de dibujo y complica la condición de victoria.
- **Sí:** tiempo real con `performance.now()` y `EXPLOSION_DURATION`. Dura 150 ms en cualquier monitor.
- **No:** contador de ticks de `requestAnimationFrame`. La duración dependería de los FPS.
- **Sí:** la victoria espera a que termine la última explosión. Sin esto la última explosión nunca se ve.
- **Sí:** perder vida no borra explosiones; reiniciar sí. Perder vida es un evento dentro de la partida; reiniciar es partida nueva.
- **Sí:** explosión del mismo tamaño que el bloque. Los frames fuente (32×16) tienen la misma proporción que los bloques (32×16 escalados a 48×24).
- **No:** explosión más grande o partículas. Requiere ajustes visuales sin valor claro ahora.
- **Sí:** dibujar tras los bloques y antes de paleta y bola. La bola nunca queda tapada.
- **No:** sonido de rotura. Amplía alcance (política de autoplay, mute). Va en su propio spec.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Golpear el último bloque y perder la última vida durante los 150 ms de espera | `loseLife` ya decide game over con 0 vidas; ese estado prevalece porque se evalúa antes que la victoria en el bucle. Aceptado: caso extremo de 150 ms. |
| `drawFrame` no-op si el spritesheet no está cargado | El bucle ya arranca desde el callback de `loadSpritesheet` (SPEC 01). |

---

## Qué **no** entra en este spec

- Sonidos.
- Explosiones con tamaño distinto o partículas.
- Puntuación por color.
- Bloques resistentes.
- Niveles, power-ups, récords, pausa, móvil, skins.

Cada uno de ellos, si llega, va en su propio spec.
