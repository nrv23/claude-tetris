# SPEC 04 — Cinco niveles por puntuación acumulada

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02, SPEC 03
> **Fecha:** 2026-09-06
> **Objetivo:** Convertir el nivel único del MVP en cinco niveles que se desbloquean por puntuación acumulada sobre una sola rejilla, cada uno con su propia velocidad de bola, su tabla de puntos por fila y bloques de dos golpes a partir del nivel 2.

---

## Alcance

**In:**

- Cinco niveles que avanzan **por puntuación acumulada**, no por limpiar la pantalla. Umbrales de entrada: 0, 150, 220, 290, 360.
- **La rejilla no se regenera nunca.** Una sola rejilla de 7 filas × 10 columnas por partida; subir de nivel no devuelve bloques.
- Al subir de nivel, los bloques vivos pasan a exigir 2 golpes: `hitsLeft = Math.max(hitsLeft, hitsForLevel(nivel))`. Un bloque ya dañado sigue dañado, no se cura.
- Nivel 1: bloques de un golpe y 10 puntos planos por bloque (comportamiento actual de SPEC 01).
- Niveles 2 a 5: bloques de **dos golpes**. La primera fila vale `nivel` puntos y cada fila siguiente suma 1 (nivel 2 → 2..8, nivel 5 → 5..11).
- Los puntos de un bloque se suman **solo cuando se rompe**, en el segundo golpe. El primer golpe no puntúa.
- Bloque a medio romper: se dibuja el mismo sprite de su color con `globalAlpha = 0.5`. El segundo golpe lanza la explosión de SPEC 02 y lo elimina.
- Velocidad de la bola **absoluta** por nivel: `BALL_SPEED_BASE + (nivel - 1)`, es decir 5.66, 6.66, 7.66, 8.66 y 9.66 px por frame. Al subir de nivel se reescala el vector de velocidad al módulo nuevo, sin recolocar la bola.
- Victoria al limpiar la rejilla: no quedan bloques vivos **y** la lista de explosiones está vacía (condición de SPEC 02, sin cambios).
- Etiqueta `Nivel N` en el HUD, junto a la puntuación y las vidas.
- `resetGame` vuelve al nivel 1 con la rejilla y la velocidad del nivel 1.

**Fuera de alcance (para specs futuros):**

- Regenerar la rejilla, ni al subir de nivel ni al vaciarse.
- Umbral de victoria por puntuación. El puntaje final de una partida es libre.
- Pantalla o mensaje intermedio de "Nivel 2" entre niveles. El cambio es inmediato y silencioso.
- Sonido propio al subir de nivel.
- Disposiciones de rejilla distintas por nivel (todos los niveles usan la misma rejilla 7 × 10 de SPEC 01).
- Bloques de tres golpes o más, y bloques indestructibles.
- Sprite agrietado para el bloque dañado (se usa transparencia, no un sprite nuevo).
- Récords persistentes, `localStorage` o cualquier persistencia.
- Power-ups, menú de pausa, controles táctiles, skins.
- Ajuste de la velocidad o del ancho de la paleta por nivel.

---

## Modelo de datos

Todo vive en `game.js`. No hay persistencia.

```js
const BALL_SPEED_BASE = Math.hypot(4, 4); // ≈ 5.66; ya existe como BALL_SPEED en SPEC 01

// Puntos de entrada de cada nivel, por índice: LEVEL_THRESHOLDS[0] es el nivel 1
const LEVEL_THRESHOLDS = [0, 150, 220, 290, 360];
const MAX_LEVEL = LEVEL_THRESHOLDS.length; // 5

const LEVEL_1_BRICK_POINTS = 10; // BRICK_POINTS de SPEC 01, solo aplica al nivel 1
const DAMAGED_ALPHA = 0.5;

const state = {
  // ...campos de SPEC 01 a 03...
  level: 1,
  ballSpeed: BALL_SPEED_BASE, // reemplaza la constante BALL_SPEED en bouncePaddle
};
```

Cambios en el bloque, que pasa de `{ x, y, w, h, color, alive }` a:

```js
{ x, y, w, h, row, color, alive, hitsLeft } // hitsLeft: 1 en el nivel 1, 2 en los niveles 2 a 5
```

Convenciones:

- `state.level` va de 1 a `MAX_LEVEL`. Es el único origen de la velocidad, los puntos por fila y los golpes por bloque.
- `levelForScore(score)` devuelve el nivel que corresponde a una puntuación: el índice más alto de `LEVEL_THRESHOLDS` cuyo umbral no supera `score`, más uno.
- `brickPoints(level, row)`: `level === 1` → `LEVEL_1_BRICK_POINTS`; en el resto, `level + row` (con `row` de 0 a 6).
- `hitsForLevel(level)`: 1 si `level === 1`, 2 en el resto.
- `ballSpeedForLevel(level)`: `BALL_SPEED_BASE + (level - 1)`.
- Un bloque está a medio romper cuando `hitsLeft === 1` **y** su nivel exige 2 golpes. Se dibuja con `globalAlpha = DAMAGED_ALPHA` y se restaura el alpha a 1 después.
- Las explosiones de SPEC 02 se crean solo al llegar `hitsLeft` a 0.

### Alcanzabilidad de los umbrales

Con una sola rejilla los umbrales tienen que caber en los 70 bloques disponibles:

| Nivel | Entrada | Puntos por fila (1ª a 7ª) | Velocidad | Golpes |
| --- | --- | --- | --- | --- |
| 1 | 0 | 10 planos | 5.66 | 1 |
| 2 | 150 | 2, 3, 4, 5, 6, 7, 8 | 6.66 | 2 |
| 3 | 220 | 3, 4, 5, 6, 7, 8, 9 | 7.66 | 2 |
| 4 | 290 | 4, 5, 6, 7, 8, 9, 10 | 8.66 | 2 |
| 5 | 360 | 5, 6, 7, 8, 9, 10, 11 | 9.66 | 2 |

El nivel 1 consume 15 bloques (15 × 10 = 150) y deja 55. Cada salto posterior cuesta 70 puntos, unos 10 bloques a la media de la tabla, así que los cinco niveles caben en una rejilla con margen.

---

## Plan de implementación

Cada paso deja el juego ejecutable sirviendo la carpeta por HTTP.

1. Añadir las constantes (`BALL_SPEED_BASE`, `LEVEL_THRESHOLDS`, `MAX_LEVEL`, `LEVEL_1_BRICK_POINTS`, `DAMAGED_ALPHA`) y los campos `level: 1` y `ballSpeed: BALL_SPEED_BASE` al `state`. `resetGame` los deja en el nivel 1. Añadir las funciones puras `levelForScore`, `brickPoints`, `hitsForLevel` y `ballSpeedForLevel`. Prueba manual: el juego arranca y se juega igual que antes, sin errores en consola.
2. Sustituir el uso de la constante `BALL_SPEED` en `bouncePaddle()` por `state.ballSpeed`, y hacer que `resetBall()` reparta el módulo `state.ballSpeed` entre `dx` y `dy` en diagonal. Prueba manual: la bola se comporta igual que antes en el nivel 1.
3. Dar a `createBricks(level)` el parámetro de nivel: cada bloque nace con `hitsLeft: hitsForLevel(level)`. Guardar también el `row` del bloque para poder calcular sus puntos. `resetGame` llama a `createBricks(1)`. Prueba manual: sin cambios visibles en el nivel 1.
4. En `updateBricks`, restar 1 a `brick.hitsLeft` en cada golpe. Si queda en 0: marcar `alive = false`, crear la explosión de SPEC 02, sonar `SOUND_BRICK` y sumar `brickPoints(state.level, brick.row)`. Si queda en 1: solo rebotar y sonar `SOUND_BRICK`, sin puntos ni explosión. Prueba manual: en el nivel 1 todo igual; forzando `state.level = 2` en consola, los bloques aguantan dos golpes.
5. En `drawBricks`, dibujar con `ctx.globalAlpha = DAMAGED_ALPHA` los bloques cuyo `hitsLeft` es 1 y cuyo nivel exige 2 golpes, restaurando `ctx.globalAlpha = 1` después de cada bloque. Prueba manual: con `state.level = 2`, el bloque golpeado una vez se ve semitransparente.
6. Crear `updateLevel()`: calcula `Math.min(MAX_LEVEL, levelForScore(state.score))` y, si es mayor que `state.level`, actualiza `state.level`, pone `state.ballSpeed = ballSpeedForLevel(nivel)`, reescala el vector `dx`/`dy` de la bola al módulo nuevo conservando su dirección, y sube el `hitsLeft` de los bloques vivos con `Math.max`. **No regenera la rejilla.** Llamarla desde `update()` después de `updateBricks()`. Prueba manual: al cruzar 150 puntos el HUD marca `Nivel 2`, la bola acelera, los bloques restantes siguen donde estaban y ahora aguantan dos golpes.
7. Añadir la etiqueta `Nivel N` al HUD en `drawHUD`, entre la puntuación y las vidas. Prueba manual: el número sube de 1 a 5 al cruzar cada umbral.

La condición de victoria de SPEC 02 (rejilla vacía y sin explosiones pendientes) **no se toca**.

---

## Criterios de aceptación

- [x] Servido por HTTP, `index.html` carga sin errores en la consola.
- [x] El HUD muestra `Nivel 1` al empezar la partida.
- [x] En el nivel 1, cada bloque se rompe con un golpe y suma exactamente 10 puntos.
- [x] Al cruzar 150 puntos, el HUD muestra `Nivel 2` y los bloques restantes **siguen siendo los mismos**: no reaparece ninguno.
- [x] Los umbrales 220, 290 y 360 pasan a los niveles 3, 4 y 5 respectivamente.
- [x] En el nivel 5 no hay nivel 6: el nivel se queda en 5 hasta el final de la partida.
- [x] A partir del nivel 2, el primer golpe deja el bloque semitransparente, sin sumar puntos y sin explosión.
- [x] A partir del nivel 2, el segundo golpe lanza la explosión, suma los puntos de la fila y elimina el bloque.
- [x] En el nivel 2, un bloque de la primera fila suma 2 puntos y uno de la última suma 8.
- [x] En el nivel 5, un bloque de la primera fila suma 5 puntos y uno de la última suma 11.
- [x] Un bloque dañado en el nivel 2 sigue necesitando un solo golpe al pasar al nivel 3: subir de nivel no lo cura.
- [x] La velocidad de la bola es 5.66 en el nivel 1 y 9.66 en el nivel 5 (comprobable con `state.ballSpeed` en consola).
- [x] Al subir de nivel la bola acelera sin cambiar de dirección ni volver a la paleta.
- [x] Al limpiar la rejilla aparece la pantalla de victoria, tras la última explosión.
- [x] Las vidas y la puntuación se conservan al cambiar de nivel.
- [x] Reiniciar desde game over o victoria deja `state.level` en 1, la velocidad base y la rejilla completa.
- [x] Los sonidos de SPEC 03 siguen funcionando: paleta, paredes laterales, bloque, arranque y derrota.
- [x] El bloque semitransparente no deja el `globalAlpha` alterado: paleta, bola y HUD se dibujan opacos.
- [x] No existe `package.json` ni ninguna dependencia externa.

---

## Decisiones

- **Sí:** avance por puntuación acumulada. Es lo que pidió el usuario; los umbrales definen el progreso.
- **No:** avance por limpiar la pantalla. Con una sola rejilla, limpiarla es el final de la partida, no un cambio de nivel.
- **Sí:** una sola rejilla por partida, sin regeneración. Decisión explícita del usuario: regenerarla hacía que el marcador subiese sin límite.
- **No:** regenerar la rejilla en cada nivel (planteamiento inicial de este spec). Descartado por el usuario tras ver la primera implementación.
- **Sí:** victoria al limpiar la rejilla, como en SPEC 02. Sin regeneración, la rejilla vacía vuelve a ser un final alcanzable y no hace falta umbral de puntos.
- **No:** victoria a 700 puntos. Con una sola rejilla el techo real de la partida ronda los 425 puntos, así que 700 sería inalcanzable y el juego solo se podría perder.
- **Sí:** umbrales 0, 150, 220, 290, 360. Decisión explícita del usuario tras ver que 300/450/600 dejaban los niveles 4 y 5 fuera de alcance con 70 bloques.
- **Aclaración:** los 700 puntos del planteamiento inicial eran el total de limpiar la rejilla del nivel 1 con las reglas de SPEC 01 (70 × 10), no un puntaje preexistente del juego.
- **Sí:** subir el `hitsLeft` de los bloques vivos con `Math.max` al cambiar de nivel. Sin esto, los bloques nacidos en el nivel 1 nunca exigirían dos golpes y la mecánica principal de los niveles 2-5 no se activaría.
- **No:** reasignar `hitsLeft` a pelo. Curaría los bloques ya dañados al subir de nivel, que es un castigo injusto y visualmente confuso.
- **Sí:** velocidad absoluta `BALL_SPEED_BASE + (nivel - 1)`, máximo 9.66. Decisión explícita del usuario.
- **No:** velocidad acumulativa (5.66 + 2 + 3 + 4 + 5 = 19.66). El nivel 5 quedaría injugable y la bola podría atravesar bloques entre frames.
- **Sí:** reescalar el vector de la bola al subir de nivel, conservando la dirección. Recolocarla en la paleta interrumpiría la jugada sin motivo, ya que la rejilla no cambia.
- **Sí:** `hitsLeft` en el bloque. La resistencia es parte del estado de colisión, no de la animación, así que vive con el bloque y no en una lista aparte como las explosiones.
- **Sí:** transparencia (`globalAlpha = 0.5`) para el bloque dañado. Decisión explícita del usuario; el spritesheet no tiene sprite agrietado y así no hacen falta assets nuevos.
- **No:** dibujar el bloque dañado con el color de la fila siguiente. Se descartó en favor de la transparencia.
- **Sí:** los puntos se suman solo al romper el bloque. Puntuar el primer golpe haría que los umbrales llegasen al doble de rápido y descuadraría la tabla.
- **Sí:** el nivel 1 mantiene sus 10 puntos planos. El usuario firmó la tabla con esa fila, aunque implique que el nivel 2 puntúe menos por bloque.
- **Sí:** la etiqueta `Nivel N` en el HUD. El "agregado" que pedía el usuario resultó ser esta etiqueta, no un bonus de puntos.
- **No:** pantalla intermedia entre niveles y sonido de subida de nivel. Amplían alcance; van en su propio spec.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| A 9.66 px por frame la bola puede saltarse un bloque de 24 px de alto entre frames | 9.66 sigue por debajo de la altura del bloque, así que la colisión no se pierde. Es el motivo de rechazar la velocidad acumulativa. |
| Olvidar restaurar `ctx.globalAlpha` deja translúcidos paleta, bola y HUD | El criterio de aceptación lo comprueba explícitamente; la restauración va en el mismo bucle de `drawBricks`. |
| Cruzar dos umbrales con un solo bloque muy valioso | `levelForScore` calcula el nivel desde la puntuación, no incrementa de uno en uno, así que el salto directo es correcto por construcción. |
| Con muy mala distribución de golpes, la partida podría terminar antes de llegar al nivel 5 | Los umbrales se calcularon con margen (15 bloques para el nivel 2 y ~10 por salto sobre 55 restantes). Es un riesgo de equilibrio, no de corrección. |
| Perder la última vida justo al limpiar la rejilla | `loseLife` decide game over con 0 vidas y se evalúa antes que la victoria en el bucle, igual que en SPEC 02. Aceptado. |

---

## Qué **no** entra en este spec

- Regeneración de la rejilla.
- Umbral de victoria por puntuación.
- Pantalla o sonido de cambio de nivel.
- Disposiciones de rejilla distintas por nivel.
- Bloques de tres golpes o indestructibles.
- Sprite agrietado.
- Récords, persistencia, power-ups, pausa, móvil, skins.
- Cambios en la paleta por nivel.

Cada uno de ellos, si llega, va en su propio spec.
