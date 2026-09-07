# SPEC 01 — MVP jugable de Arkanoid

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-09-06
> **Objetivo:** Construir un Arkanoid jugable en el navegador con HTML, CSS y JavaScript sin dependencias, con un nivel, vidas, puntuación y los sprites de `assets/`.

---

## Alcance

**In:**

- Canvas 2D de 480×640 px centrado en la página, con texto de interfaz en español.
- Paleta controlada con flechas izquierda/derecha del teclado y con el movimiento del ratón sobre el canvas.
- Bola que rebota en paredes laterales, techo, paleta y bloques. Si sale por abajo se pierde una vida.
- Un único nivel fijo: rejilla de 7 filas × 10 columnas de bloques, una fila por cada color del spritesheet.
- Los bloques desaparecen al instante al ser golpeados. Cada bloque suma 10 puntos.
- 3 vidas. HUD con vidas y puntuación.
- Pantallas de inicio, game over y victoria, con reinicio mediante tecla o clic.
- Dibujo de paleta, bola y bloques con `drawSprite` del spritesheet existente.

**Fuera de alcance (para specs futuros):**

- Animación de explosión de bloques (`EXPLOSION_FRAMES`). Se decidió no usarla en el MVP.
- Sonidos (`assets/sounds/ball-bounce.mp3`, `assets/sounds/break-sound.mp3`). El usuario no quiere audio en el MVP.
- Varios niveles o niveles con distinta disposición.
- Power-ups (paleta ancha, multibola, láser, etc.).
- Récords persistentes en `localStorage`.
- Menú de pausa.
- Controles táctiles / versión móvil.
- Skins o temas visuales.
- Puntuación distinta por color de bloque.

---

## Modelo de datos

Todo vive en `game.js`. No hay persistencia.

```js
// Constantes
const CANVAS_W = 480;
const CANVAS_H = 640;
const BRICK_ROWS = 7;
const BRICK_COLS = 10;
const BRICK_W = 48;   // 480 / 10; el sprite fuente (32×16) se escala
const BRICK_H = 24;
const BRICK_TOP = 60; // margen superior para el HUD
const BRICK_POINTS = 10;
const START_LIVES = 3;
const BRICK_COLORS = ['red', 'hotpink', 'magenta', 'yellow', 'green', 'cyan', 'gray']; // una por fila, de arriba a abajo

// Estado de partida
const state = {
  screen: 'start',        // 'start' | 'playing' | 'gameover' | 'win'
  score: 0,
  lives: START_LIVES,
  paddle: { x: 190, y: 600, w: 100, h: 14, speed: 7 },
  ball: { x: 240, y: 580, dx: 4, dy: -4, r: 8 },
  bricks: [],             // [{ x, y, w, h, color, alive }]
  keys: { left: false, right: false },
};
```

Convenciones:

- Coordenadas con origen en la esquina superior izquierda del canvas.
- Velocidades en píxeles por frame (bucle con `requestAnimationFrame`).
- La bola se dibuja con el sprite `ball` de 16×16 centrado en `(ball.x, ball.y)`.
- La paleta se dibuja con el sprite `paddle` escalado a `paddle.w × paddle.h`.

---

## Plan de implementación

Cada paso deja el juego ejecutable en el navegador sirviendo la carpeta por HTTP.

1. Crear `index.html` con el `<canvas id="game">`, título en español, enlace a `style.css` y las etiquetas `<script>` de `assets/spritesheet.js` y `game.js` en ese orden. Crear `style.css` con fondo oscuro y canvas centrado. Prueba manual: la página carga sin errores y muestra el canvas vacío.
2. En `game.js`, obtener el contexto 2D, definir constantes y `state`, y arrancar el bucle `requestAnimationFrame` desde el callback de `loadSpritesheet`. Dibujar solo la paleta con `drawSprite`. Prueba manual: paleta visible en la parte inferior.
3. Añadir lectura de teclado (`keydown`/`keyup` de `ArrowLeft`/`ArrowRight`) y de ratón (`mousemove` sobre el canvas). Mover la paleta y limitarla a los bordes del canvas. Prueba manual: la paleta se mueve y nunca sale del canvas.
4. Añadir la bola: movimiento, rebote en paredes laterales y techo, rebote en la paleta con ángulo según el punto de impacto. Al salir por abajo, restar una vida y recolocar bola sobre la paleta. Prueba manual: la bola rebota y las vidas bajan en consola.
5. Generar `state.bricks` en rejilla de 7×10 con un color por fila, dibujarlos con `drawSprite('block_<color>')` y detectar colisión bola-bloque. Al golpear: `alive = false`, invertir `dy`, sumar 10 puntos. Prueba manual: los bloques desaparecen al ser golpeados.
6. Dibujar el HUD en el canvas: `Puntos: N` a la izquierda y, a la derecha, las vidas representadas con un sprite `ball` (16×16) por cada vida disponible, en la franja superior. Prueba manual: los valores cambian en tiempo real y desaparece una bola del HUD por cada vida perdida.
7. Implementar las pantallas según `state.screen`: inicio (“Pulsa una tecla o haz clic para empezar”), game over (“Fin de la partida”, puntuación, “Pulsa para reiniciar”) y victoria (“¡Has ganado!”, puntuación, “Pulsa para reiniciar”). Pasar a `gameover` con 0 vidas y a `win` cuando no quedan bloques vivos. Reiniciar restaura `state` completo. Prueba manual: se recorren las cuatro pantallas.

---

## Criterios de aceptación

- [ x ] Servido por HTTP, `index.html` carga sin errores en la consola.
- [ x ] La paleta se mueve con flechas izquierda/derecha y con el ratón, y nunca sale del canvas.
- [ x ] La bola rebota en paredes laterales, techo y paleta.
- [ x ] La bola atraviesa el borde inferior y el contador de vidas baja en 1.
- [ ] El HUD muestra las vidas como sprites de bola (una por vida), no como número.
- [ x ] Al inicio hay exactamente 70 bloques (7 filas × 10 columnas) con 7 colores distintos.
- [ x ] Golpear un bloque lo hace desaparecer al instante y suma exactamente 10 puntos.
- [ x ] El juego no reproduce ningún sonido.
- [ x ] Con 0 vidas aparece la pantalla de game over con la puntuación final.
- [ x ] Al romper los 70 bloques aparece la pantalla de victoria con la puntuación final.
- [ x ] Desde game over o victoria, una tecla o clic reinicia la partida con 3 vidas, 0 puntos y 70 bloques.
- [x  ] La pantalla de inicio se muestra al cargar y la partida no empieza hasta pulsar tecla o clic.
- [x ] Todo el texto visible está en español.
- [x ] No existe `package.json` ni ninguna dependencia externa.

---

## Decisiones

- **Sí:** canvas 2D para todo el dibujo. Coherente con `../03-claude-tetris` y con `assets/spritesheet.js`.
- **No:** elementos DOM para paleta/bola/bloques. Más complejo para colisiones y no aprovecha el spritesheet.
- **Sí:** un solo archivo `game.js` como script clásico. `spritesheet.js` expone globales sin `export`; los módulos ES complicarían la carga sin aportar nada al MVP.
- **Sí:** sprites del spritesheet para paleta, bola y bloques. Los assets ya existen y evitan dibujo procedural.
- **No:** animación de explosión. El usuario decidió que desaparecer es suficiente para el MVP.
- **No:** sonidos. El usuario no quiere audio en el MVP aunque los archivos existan en `assets/sounds/`.
- **Sí:** teclado y ratón a la vez. Coste bajo y cubre ambas preferencias.
- **Sí:** 10 puntos por bloque sin distinción de color. Puntuación por color queda para otro spec.
- **Sí:** 3 vidas, 7×10 bloques, canvas 480×640. Valores por defecto aceptados por el usuario.
- **Sí:** bloques de 48×24 escalando el sprite de 32×16. Mantiene la proporción 2:1 y llena el ancho del canvas.
- **No:** persistencia en `localStorage`. Los récords son otro spec.
- **No:** pausa. Otro spec.
- **Nota:** definición rápida. El usuario aceptó los valores recomendados sin discusión detallada.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Abrir con `file://` mancha el canvas y `drawSprite` falla | Servir con `python3 -m http.server 8000` o `npx serve .`. Documentado en `CLAUDE.md`. |
| Bola rápida atraviesa un bloque sin detectarse (túnel) | Velocidad de 4 px/frame frente a bloques de 24 px de alto. Suficiente para el MVP. |
| Bola atascada en rebote horizontal casi plano | Ángulo mínimo de rebote en la paleta según el punto de impacto. |

---

## Qué **no** entra en este spec

- Explosiones de bloques.
- Sonidos.
- Varios niveles.
- Power-ups.
- Récords en `localStorage`.
- Menú de pausa.
- Controles táctiles / móvil.
- Skins.
- Puntuación por color.

Cada uno de ellos, si llega, va en su propio spec.
