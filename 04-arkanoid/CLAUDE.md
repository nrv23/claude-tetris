# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arkanoid/Breakout clone in plain HTML, CSS and JavaScript with **zero dependencies** (no `package.json`, no bundler, no framework, no test runner). The game is implemented and playable: `index.html` (15 lines) + `style.css` (26 lines) + `game.js` (~500 lines), plus the art/sound assets in `assets/`. All UI text is Spanish, and so are the specs and the language used to reply to prompts in this project.

Four specs are implemented so far: MVP (01), block explosions (02), sounds (03) and five score-based levels (04). Sibling folders in the parent repo (`../03-claude-tetris`) follow the same vanilla-JS pattern and are a good reference for conventions (`localStorage` keys prefixed by game name, Spanish UI text).

## Running

Nothing to install or build. Because `assets/spritesheet.js` loads a PNG via `new Image()`, serve the folder over HTTP rather than `file://` to avoid canvas taint issues:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
# or
npx serve .
```

Verification is manual in the browser (each spec's acceptance criteria list is the checklist). There are no automated tests or linters.

## Development workflow: spec first

This is a spec-driven repository. **Every sizable feature goes through `/spec` before any code is written.** Two project skills (installed from `Klerith/fernando-skills`, pinned in `skills-lock.json`, symlinked `.claude/skills/* -> .agents/skills/*`) define the process:

- `/spec <feature description>` — asks clarifying questions, then writes `specs/NN-slug.md` with state `Borrador`. Never writes code. Replies in the language of the prompt (Spanish here).
- `/spec-impl <NN-slug>` — refuses unless the spec state means approved (a human edits `Estado:` to `Aprobado`), creates/switches to branch `spec-NN-slug` (`AutoCreateBranch: true` in `specs/.spec-config.yml`), then implements the plan **one numbered step at a time**, pausing for diff review. Never commits on its own.

The next spec number is `05-`.

### Spec document structure

Every file in `specs/` follows the same shape — match it when writing a new one:

```markdown
# SPEC NN — <title in Spanish>

> **Estado:** Borrador | En revisión | Aprobado | Implementado | Obsoleto
> **Depende de:** SPEC 01, SPEC 02 | —
> **Fecha:** YYYY-MM-DD
> **Objetivo:** <one paragraph>
```

Then these `##` sections, in order: `Alcance` (with **In:** and **Fuera de alcance (para specs futuros):** bullet lists), `Modelo de datos` (real `js` snippets of the constants and `state` fields being added), `Plan de implementación`, `Criterios de aceptación`, `Decisiones`, `Riesgos`, `Qué **no** entra en este spec`. Extra `###` subsections are fine where a spec needs analysis (e.g. `### Alcanzabilidad de los umbrales` in SPEC 04).

Conventions that make the pattern work:

- **Plan steps are individually runnable.** Each numbered step ends with a `Prueba manual:` sentence, and the step must leave the game playable over HTTP. Steps name the exact functions and constants they touch.
- **Acceptance criteria are `- [ ]` checkboxes**, ticked to `- [x]` as the implementation is verified in the browser. They always include a regression line for previous specs' behaviour and the line `No existe package.json ni ninguna dependencia externa.`
- **Out-of-scope lists are explicit and reused.** Power-ups, pause menu, touch controls, skins, `localStorage` records and multiple grid layouts have been deferred spec after spec; keep deferring them rather than sneaking them in.
- Specs state which earlier behaviour **must not change** (e.g. SPEC 04 leaves SPEC 02's win condition untouched).

### Git conventions

Branch per spec: `spec-NN-slug`. One implementation commit `feat(<scope>): <summary> (SPEC NN)`, then a merge commit into `main` titled `Merge SPEC NN: <summary>`. Marking a spec as implemented is its own commit: `docs(spec): marcar SPEC NN <slug> como implementado`.

## Code architecture (`game.js`)

Single classic script, no modules, no classes; everything is top-level constants, pure helper functions and one mutable `state` object. Comments are in Spanish. Rough order of the file, which new code should preserve:

1. Canvas/`ctx` lookup and geometry constants (`CANVAS_W`, `CANVAS_H`, `BRICK_ROWS/COLS/W/H/TOP`, `START_LIVES`, `BRICK_COLORS` — one colour per row).
2. Level constants (`BALL_SPEED_BASE`, `LEVEL_THRESHOLDS`, `MAX_LEVEL`, `DAMAGED_ALPHA`) and audio config (`SOUND_PADDLE/WALL/BRICK` objects with `src`, `playbackRate`, `volume`).
3. Audio: `preloadSound`/`playSound` over an `audioCache` Map of `HTMLAudioElement`s for the mp3s, plus a lazily created `AudioContext` (`getAudioContext`) driving `playTone`/`playArpeggio` for the synthesized start arpeggio and game-over sweep. The context is lazy on purpose — created at load it would be born `suspended`.
4. `state`: `{ screen: 'start' | 'playing' | 'gameover' | 'win', score, lives, level, ballSpeed, paddle, ball, bricks, explosions }`. No persistence anywhere.
5. Pure level helpers: `levelForScore`, `hitsForLevel`, `ballSpeedForLevel`, `brickPoints(level, row)`.
6. Lifecycle: `createBricks(level)`, `resetGame`, `startGame`, `handleScreenInput`, `loseLife`, `resetBall`.
7. Update pass: `updatePaddle`, `updateBall`, `updateBricks`, `updateLevel`, `updateExplosions`, orchestrated by `update()`.
8. Draw pass: `drawPaddle`, `drawBall`, `drawBricks`, `drawExplosions`, `drawHUD`, `drawOverlay(lines)`, `drawScreen`, orchestrated by `draw()`.
9. `loop()` (`requestAnimationFrame`), started from the `loadSpritesheet` callback.

Bricks carry `{ x, y, color, row, alive, hitsLeft }`; a brick with one hit left on a two-hit level is drawn at `globalAlpha = DAMAGED_ALPHA` and the alpha is restored per brick. Levels advance by cumulative score and **never regenerate the grid**.

## Assets (`assets/`)

- `spritesheet-breakout.png` + `spritesheet.js`: classic script (no exports) exposing globals `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION` (150 ms), `loadSpritesheet(cb)`, `drawSprite(ctx, name, x, y, w, h)` and `drawFrame(ctx, frame, x, y, w, h)`. Included with a `<script>` tag before `game.js`.
  - `loadSpritesheet` copies the image into an offscreen canvas and queues callbacks; `drawSprite`/`drawFrame` silently no-op until loaded, so the game loop starts from the callback.
  - Sprite names: `paddle` (162×14 source), `ball` (16×16), and `block_<color>` where color ∈ `gray, red, yellow, cyan, magenta, hotpink, green` (each 32×16). `EXPLOSION_FRAMES[color]` is an array of 4 frames of the same size (gray reuses red's frames).
- `sounds/ball-bounce.mp3` (paddle and wall bounces, differentiated by `playbackRate`), `sounds/break-sound.mp3` (brick hit).
