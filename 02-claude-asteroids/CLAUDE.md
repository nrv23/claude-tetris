# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Asteroids clone in pure HTML5 Canvas + vanilla ES6 JavaScript. No dependencies, no bundler, no build step, no tests, no linter. Deployed as a static site (GitHub Pages). UI text, comments and README are in Spanish; keep new user-facing strings and comments in Spanish.

## Running

Open `index.html` directly in a browser, or serve locally:

```bash
npx serve .
```

Then visit `http://localhost:3000`. There is nothing to build; reload the page to see changes.

## Architecture

Three files matter: `index.html` (800x600 canvas + script tag), `favicon.svg`, and `game.js`, which holds the whole game.

`game.js` is organized top to bottom:

1. **Input** — `keys` (held state) and `justPressed` (edge-triggered). Use `keys[code]` for continuous actions (rotate, thrust) and `pressed(code)` for one-shot actions (shoot, restart). `pressed()` consumes the edge, so call it at most once per frame per key.
2. **Utils** — `wrap` (toroidal wraparound against `W`/`H`), `dist`, `rand`, `randInt`.
3. **Entities** — `Bullet`, `Asteroid`, `Ship`, `Particle`. Every entity follows the same contract: `update(dt)`, `draw()`, and a `dead` flag; the update loop filters dead entities with `.filter(e => !e.dead)`. Entities draw to the module-level `ctx` directly.
4. **Game state** — module-level `ship`, `bullets`, `asteroids`, `particles`, `score`, `lives`, `level`, and `state` (`'playing' | 'dead' | 'gameover'`). `initGame()` resets everything; `nextLevel()` spawns `3 + level` large asteroids after the ship resets.
5. **update(dt)** — state machine branch first (gameover/dead return early), then input, entity updates, bullet-vs-asteroid collision (splits via `Asteroid.split()`), ship-vs-asteroid collision (skipped while `ship.invincible > 0`), then level-complete check.
6. **draw()** — clears, draws particles, asteroids, bullets, ship, HUD, then overlay when gameover.
7. **Loop** — `requestAnimationFrame` with `dt` in seconds, clamped to 0.05 s. All speeds are in px/s or rad/s, so tuning constants are frame-rate independent.

Asteroid sizes are indexed 1..3 (small, medium, large) via the parallel arrays `RADII`, `SPEEDS`, `POINTS` (index 0 is unused padding). Splitting produces two asteroids of `size - 1`; size 1 yields none.

Collision is circle-based using each entity's `radius`. Ship collision uses `a.radius * 0.82` to be forgiving with the irregular asteroid polygons.

## Notes

- Power-ups and the shooting-star asteroid were removed (commit `13e713f`); the README still mentions them and is out of date on that point.
- Gameplay tuning constants (`SPEED`, `ROT`, `THRUST`, `DRAG`, cooldowns, `SAFE_DIST`) live inline next to their use rather than in a shared config block.


## Testing 

Vitests = usar la skill y la informacion de : @