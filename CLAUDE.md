# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Classic Tetris in vanilla JavaScript (ES6+) with HTML5 Canvas. Three source files: `index.html`, `style.css`, `game.js`. No `package.json`, no bundler, no transpiler, no test suite, no linter. README and in-game UI text are in Spanish.

## Running

Nothing to install or build. Either open `index.html` directly or serve the folder statically and open `http://localhost:8000`:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Verification is manual: load the page in a browser and play. There are no automated tests.

## Architecture (`game.js`)

All game logic lives in a single script executed at load time, using module-level mutable state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `dropAccum`, `lastTime`, `animId`). `init()` resets all of it and is also the restart handler.

- **Board model**: `ROWS × COLS` matrix; `0` = empty, `1–7` = color/piece index. `COLORS` and `PIECES` are 1-indexed (index 0 is `null`) so a cell value doubles as a color lookup.
- **Pieces**: square matrices whose non-zero cells hold the piece's own index. Rotation is `rotateCW` (transpose + reverse); `tryRotate` applies wall kicks `[0, -1, 1, -2, 2]` against `collide`.
- **Collision**: `collide(shape, x, y)` treats `ny < 0` as allowed (pieces may spawn partially above the board) but out-of-bounds left/right/bottom or overlapping a fixed cell as a hit. Every move/rotate/drop goes through it.
- **Lock sequence**: `lockPiece()` = `merge()` → `clearLines()` → `spawn()`. `spawn()` promotes `next` to `current` and ends the game if the new piece already collides.
- **Scoring/levels**: `clearLines` applies `LINE_SCORES[cleared] * level`, recomputes `level = floor(lines/10) + 1` and `dropInterval = max(100, 1000 - (level-1)*90)`. Soft drop adds 1/row, hard drop 2/row.
- **Loop**: `requestAnimationFrame`-driven `loop(ts)` accumulates elapsed ms into `dropAccum` and drops one row when it exceeds `dropInterval`, then redraws everything (grid, fixed board, ghost piece at alpha 0.2, current piece). Pause cancels the frame and re-seeds `lastTime` on resume to avoid a dt jump.
- **Rendering**: `drawBlock(context, x, y, colorIndex, size, alpha)` is shared by the main board (`BLOCK = 30`) and the next-piece preview (`NB = 30` on a 4×4 grid in a 120×120 canvas).
- **Input**: single `keydown` listener; `P` toggles pause even when otherwise blocked, all other keys are ignored while paused or game over.

## Coupling to keep in sync

- `<canvas id="board" width="300" height="600">` in `index.html` must equal `COLS*BLOCK × ROWS*BLOCK`. Changing `COLS`, `ROWS` or `BLOCK` requires updating the canvas attributes too.
- `game.js` grabs DOM elements by id at load (`board`, `next-canvas`, `score`, `lines`, `level`, `overlay`, `overlay-title`, `overlay-score`, `restart-btn`). Renaming ids in `index.html` breaks the script.
- The `hidden` class on `#overlay` (defined in `style.css`) is what shows/hides the pause and game-over screens.

## Skins (`skins.js`)

Loaded right after `game.js`. Exposes `window.Skins` with `current()`, `set(key)`, `drawBlock(...)` and `list()`. `SKINS = { retro, neon, pastel, pixel }`; each entry has `name`, a 1-indexed `colors` palette, a `grid` color and a `draw(context, x, y, colorIndex, size, alpha)` function. `game.js` keeps the original renderer as `defaultDrawBlock` and its `drawBlock` delegates to `Skins.drawBlock` when the global exists; `drawGrid` reads `Skins.current().grid`. `set()` writes `document.body.dataset.skin` (used by the `body[data-skin=...]` rules at the end of `style.css`), persists to `localStorage` key `tetris.skin` and redraws immediately. Every skin's `draw` must return on `!colorIndex`, honor `alpha` (the ghost piece uses 0.2), and leave `globalAlpha = 1` and `shadowBlur = 0` when done. The selector `<select id="skin-select">` is injected into `.panel` from JS; it blurs itself after each change so arrow keys stay with the game.
