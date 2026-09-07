# SPEC 03 — Sonidos de colisión, arranque y derrota

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-09-06
> **Objetivo:** Añadir audio al juego: un sonido distinto para el rebote en la paleta, el rebote en las paredes laterales y la rotura de un bloque, más un arpegio sintetizado al arrancar la partida y un barrido descendente al perderla.

---

## Alcance

**In:**

- Rebote de la bola en la paleta: `assets/sounds/ball-bounce.mp3` a `playbackRate = 1.0`.
- Rebote de la bola en las paredes laterales: el mismo `ball-bounce.mp3` a `playbackRate = 1.5`, para que se distinga del de la paleta sin añadir archivos.
- Rotura de un bloque: `assets/sounds/break-sound.mp3` (es el sonido tipo explosión que ya existe), disparado en el mismo instante del golpe que crea la explosión de SPEC 02.
- Sonido de arranque sintetizado con Web Audio API: arpegio ascendente de 3 notas (523 / 659 / 784 Hz), oscilador `square`, 90 ms por nota. Se dispara en la primera tecla o clic sobre la pantalla de inicio.
- Sonido de derrota sintetizado con Web Audio API: barrido descendente 440 Hz → 110 Hz en 0.6 s, oscilador `sawtooth`, con envolvente de gain que decae a 0. Se dispara al perder la última vida.
- Los sonidos de golpes seguidos se solapan sin cortarse: cada disparo clona el nodo `Audio` precargado.
- Si el navegador bloquea el audio, el juego sigue jugable y no lanza excepciones en consola.

**Fuera de alcance (para specs futuros):**

- Control de silencio (tecla M) o de volumen, e indicador de mute en el HUD.
- Persistencia de la preferencia de audio en `localStorage`.
- Sonido en el rebote contra el techo (suena solo en las paredes laterales).
- Sonido al perder una vida sin llegar a cero.
- Sonido en la pantalla de victoria.
- Música de fondo.
- Archivos de audio nuevos en `assets/sounds/`.
- Cualquier otro punto ya excluido en SPEC 01 y SPEC 02 (niveles, power-ups, récords, pausa, móvil, skins).

---

## Modelo de datos

Todo vive en `game.js`. No hay persistencia y no se añade nada al `state` de la partida: el audio no forma parte del estado de juego.

```js
// Sonidos de archivo: { src, playbackRate, volume }
const SOUND_PADDLE = { src: 'assets/sounds/ball-bounce.mp3', playbackRate: 1.0, volume: 0.6 };
const SOUND_WALL = { src: 'assets/sounds/ball-bounce.mp3', playbackRate: 1.5, volume: 0.5 };
const SOUND_BRICK = { src: 'assets/sounds/break-sound.mp3', playbackRate: 1.0, volume: 0.7 };

// Sonidos sintetizados
const START_NOTES = [523, 659, 784]; // do, mi, sol
const START_NOTE_DURATION = 0.09; // segundos por nota
const GAMEOVER_FREQ_START = 440;
const GAMEOVER_FREQ_END = 110;
const GAMEOVER_DURATION = 0.6; // segundos

let audioContext = null; // creado de forma perezosa en el primer uso
const audioCache = new Map(); // src -> HTMLAudioElement precargado
```

Convenciones:

- `audioCache` guarda un `Audio` por ruta con `preload = 'auto'`. Cada disparo usa `cloneNode()` de ese elemento, nunca el original, para permitir solapes.
- `audioContext` se crea con `new AudioContext()` la primera vez que hace falta, no al cargar el script (así no queda en estado `suspended` desde el arranque).
- Las duraciones de los sonidos sintetizados están en segundos porque Web Audio trabaja en segundos, a diferencia de `EXPLOSION_DURATION` (ms).

---

## Plan de implementación

Cada paso deja el juego ejecutable sirviendo la carpeta por HTTP.

1. Añadir el módulo de audio de archivo: las constantes `SOUND_PADDLE`, `SOUND_WALL`, `SOUND_BRICK`, el `audioCache`, una función `preloadSound(src)` y `playSound(config)` que clona el nodo, aplica `playbackRate` y `volume` y llama a `play().catch(() => {})` para tragar el rechazo por política de autoplay. Precargar los dos mp3 en el callback de `loadSpritesheet`. Prueba manual: el juego carga sin errores y `playSound(SOUND_PADDLE)` en consola suena.
2. Añadir el módulo de audio sintetizado: `getAudioContext()` (creación perezosa), `playTone({ type, freqStart, freqEnd, duration, volume })` con `OscillatorNode` + `GainNode`, rampa de frecuencia y envolvente que decae a 0, y `playArpeggio(notes)` que encadena tonos con `START_NOTE_DURATION`. Prueba manual: `playTone(...)` en consola suena tras haber hecho clic en la página.
3. Llamar `playSound(SOUND_PADDLE)` dentro de `bouncePaddle()`. Prueba manual: cada rebote en la paleta suena una sola vez.
4. Llamar `playSound(SOUND_WALL)` en las dos ramas de colisión lateral de `updateBall()` (`b.x - b.r < 0` y `b.x + b.r > CANVAS_W`). Prueba manual: suena en ambos lados con un tono más agudo que el de la paleta, y el techo sigue en silencio.
5. Llamar `playSound(SOUND_BRICK)` en `updateBricks()`, junto al `push` de la explosión. Prueba manual: la explosión visual y el sonido arrancan en el mismo frame.
6. Crear `playGameOverSound()` (barrido `sawtooth` de `GAMEOVER_FREQ_START` a `GAMEOVER_FREQ_END` en `GAMEOVER_DURATION`) y llamarla en `loseLife()`, solo dentro de la rama `state.lives <= 0`, antes de `state.screen = 'gameover'`. Prueba manual: suena al perder la tercera vida y no al perder la primera ni la segunda.
7. Crear `playStartSound()` (arpegio con `START_NOTES`) y llamarla en `handleScreenInput()` únicamente cuando `state.screen === 'start'`, junto con `getAudioContext().resume()`. Prueba manual: la primera tecla o clic reproduce el arpegio; reiniciar desde game over o victoria no lo repite.

---

## Criterios de aceptación

- [x ] Servido por HTTP, `index.html` carga sin errores en la consola.
- [ x] La primera tecla o clic en la pantalla de inicio reproduce el arpegio ascendente de 3 notas.
- [x ] Reiniciar desde game over o victoria **no** repite el arpegio.
- [ x] Cada rebote de la bola en la paleta reproduce un sonido, una sola vez por rebote.
- [ x] Cada rebote en una pared lateral reproduce el mismo sonido a un tono claramente más agudo.
- [x ] El rebote contra el techo no reproduce ningún sonido.
- [x ] Romper un bloque reproduce el sonido de explosión en el mismo frame en que aparece la explosión visual.
- [x ] Dos colisiones separadas por menos de 150 ms suenan las dos, sin que la segunda corte a la primera.
- [x ] Perder la última vida reproduce el barrido descendente, una sola vez.
- [ x] Perder una vida sin llegar a cero **no** reproduce el sonido de derrota.
- [x ] `assets/sounds/` sigue conteniendo únicamente `ball-bounce.mp3` y `break-sound.mp3`.
- [ x] Con el audio bloqueado por el navegador (pestaña sin gesto previo), el juego sigue jugable y la consola queda limpia.
- [ x] La puntuación sigue sumando exactamente 10 puntos por bloque y las explosiones se comportan igual que en SPEC 02.
- [x ] No existe `package.json` ni ninguna dependencia externa.

---

## Decisiones

- **Sí:** paleta y paredes comparten `ball-bounce.mp3` con `playbackRate` distinto. Se pidieron tres sonidos diferenciables y solo hay dos archivos; el cambio de tono los distingue sin añadir assets.
- **No:** añadir un tercer mp3. Obligaría a buscar o generar un archivo y a versionarlo; el `playbackRate` resuelve lo mismo con una línea.
- **Sí:** `break-sound.mp3` para el bloque. Es el sonido de rotura/explosión que ya trae el proyecto y encaja con la explosión visual de SPEC 02.
- **Sí:** `cloneNode()` por disparo. Los golpes en racha se solapan; con un único `Audio` reiniciado, cada golpe cortaría el anterior y sonaría pobre.
- **No:** pool fijo de nodos. Más código para un juego con pocos disparos simultáneos.
- **Sí:** Web Audio API para arranque y derrota. Cubre "un sonido que crees tú" sin archivos nuevos y permite ajustar frecuencias y duración en el propio código.
- **Sí:** `AudioContext` creado de forma perezosa y con `resume()` en el primer gesto. Creado al cargar el script nacería `suspended` y el primer sonido se perdería.
- **Sí:** el sonido de arranque se dispara en la primera tecla o clic, no al terminar de cargar la página. La política de autoplay bloquea cualquier audio previo al primer gesto del usuario; es lo más cercano posible a "al cargar".
- **Sí:** el sonido de derrota solo en game over, no en cada vida perdida. "Perder" se interpretó como perder la partida.
- **No:** control de mute o volumen. Amplía alcance (tecla, indicador en el HUD, posible persistencia). Va en su propio spec.
- **No:** sonido en el techo ni en la victoria. No se pidieron; añadirlos ahora ampliaría el alcance sin acuerdo.
- **Nota de proceso:** definición rápida sin la ronda de preguntas de aclaración. Los supuestos se acordaron sobre el plan de ejecución y quedan recogidos arriba.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `play()` rechaza la promesa por política de autoplay | Todos los disparos llevan `.catch(() => {})`. El juego nunca depende del audio para avanzar. |
| Rachas de colisiones creando muchos nodos `Audio` clonados | Los clones son de vida corta y el navegador los libera al terminar. Si se detecta presión de memoria, se cambia a un pool fijo en un spec posterior. |
| `AudioContext` no disponible o con prefijo en navegadores antiguos | `getAudioContext()` devuelve `null` si el constructor no existe y las funciones sintetizadas hacen no-op. |
| El mismo archivo a dos `playbackRate` puede no diferenciarse lo bastante | `1.5` es un ajuste inicial; si no convence, se afina la constante sin tocar la estructura. |

---

## Qué **no** entra en este spec

- Control de silencio o volumen, e indicador en el HUD.
- Persistencia de la preferencia de audio.
- Sonido en el techo, al perder una vida o en la victoria.
- Música de fondo.
- Archivos de audio nuevos.
- Niveles, power-ups, récords, pausa, móvil, skins.

Cada uno de ellos, si llega, va en su propio spec.
