# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arkanoid/Breakout clone to be built in plain HTML, CSS and JavaScript with **zero dependencies** (no `package.json`, no bundler, no framework, no test runner). The game itself is **not implemented yet**: the repo currently holds only the art/sound assets, a one-line `.README.md` (Spanish) and the spec-driven workflow skills. Sibling folders in the parent repo (`../03-claude-tetris`) follow the same vanilla-JS pattern (`index.html` + `style.css` + `game.js`, Spanish UI text, `localStorage` keys prefixed by game name) and are a good reference for conventions.

## Running

Nothing to install or build. Because `assets/spritesheet.js` loads a PNG via `new Image()`, serve the folder over HTTP rather than `file://` to avoid canvas taint issues:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
# or
npx serve .
```

Verification is manual in the browser. There are no automated tests or linters.

## Development workflow: spec first

Two project skills (installed from `Klerith/fernando-skills`, pinned in `skills-lock.json`, symlinked `.claude/skills/* -> .agents/skills/*`) define how features are built:

- `/spec <feature description>` — asks clarifying questions, then writes `specs/NN-slug.md` (state `Draft`) and seeds `specs/.spec-config.yml`. Never writes code. Replies in the language of the prompt (this project is Spanish).
- `/spec-impl <NN-slug>` — refuses unless the spec state means `Approved` (human changes it), creates/switches to branch `spec-NN-slug` (controlled by `AutoCreateBranch`), then implements the plan one step at a time, pausing for diff review. Never commits on its own.

Start any sizable feature (including the initial game) through `/spec`; `specs/` does not exist yet, so the first one is `01-`.

## Assets (`assets/`)

- `spritesheet-breakout.png` + `spritesheet.js`: classic script (no exports) exposing globals `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION` (150 ms), `loadSpritesheet(cb)`, `drawSprite(ctx, name, x, y, w, h)` and `drawFrame(ctx, frame, x, y, w, h)`. Include it with a `<script>` tag before the game script.
  - `loadSpritesheet` copies the image into an offscreen canvas and queues callbacks; `drawSprite`/`drawFrame` silently no-op until loaded, so start the game loop from the callback.
  - Sprite names: `paddle` (162×14 source), `ball` (16×16), and `block_<color>` where color ∈ `gray, red, yellow, cyan, magenta, hotpink, green` (each 32×16). `EXPLOSION_FRAMES[color]` is an array of 4 frames of the same size (gray reuses red's frames).
- `sounds/ball-bounce.mp3`, `sounds/break-sound.mp3`.
