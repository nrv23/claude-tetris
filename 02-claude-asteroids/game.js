'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};        // estado mantenido: true mientras la tecla está presionada
const justPressed = {}; // flanco: true solo en el frame en que se pulsa la tecla

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// Devuelve true solo una vez por pulsación; consume el flanco
function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.tripleShot    = 0;   // segundos restantes de disparo triple
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot > 0) {
      const SPREAD = 0.22; // rad entre balas del abanico
      return [
        new Bullet(ox, oy, this.angle - SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-up: disparo triple ──────────────────────────────────────────────────
const TRIPLE_DURATION = 5;    // segundos de efecto
const POWERUP_CHANCE  = 0.2;  // probabilidad de soltar power-up al destruir asteroide

class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(15, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 10;
    this.ttl  = 8;   // desaparece si no se recoge
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadea los últimos 2 segundos
    if (this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = '#4cf';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    // Tres trazos en abanico
    ctx.beginPath();
    for (const a of [-0.5, 0, 0.5]) {
      ctx.moveTo(0, 3);
      ctx.lineTo(Math.sin(a) * 6, 3 - Math.cos(a) * 8);
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ítem: Bomba Nova ──────────────────────────────────────────────────────────
// Aparece cada NOVA_KILLS_NEEDED asteroides destruidos por bala. Al tocarla la
// nave detona al instante y elimina todos los asteroides en pantalla (sin puntos).
const NOVA_KILLS_NEEDED = 3;

class NovaBomb {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(15, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 10;
    this.ttl  = 8;   // desaparece si no se recoge
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadea los últimos 2 segundos
    if (this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = '#ff2a2a';
    ctx.fillStyle   = '#ff2a2a';
    ctx.lineWidth   = 1.5;
    // Anillo exterior
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    // Núcleo relleno
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Cuatro rayos de la nova
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
      ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups, bombs;
let powerupSpawned; // true cuando el power-up ya apareció en este nivel
let killCount;      // asteroides destruidos por bala desde la última bomba
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;

// Genera asteroides grandes lejos de (cx, cy); por defecto el centro, donde reaparece la nave
function spawnAsteroids(count, cx = W / 2, cy = H / 2) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - cx, y - cy) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  bombs     = [];
  powerupSpawned = false;
  killCount = 0;
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

// keepShip: true cuando el nivel lo limpió la Bomba Nova. La nave conserva su
// posición y estado, y las partículas de la explosión siguen visibles.
function nextLevel(keepShip = false) {
  level++;
  bombs     = [];
  killCount = 0;
  if (keepShip) {
    // Balas, partículas y power-up flotante se conservan; solo llegan asteroides nuevos
    powerupSpawned = powerups.length > 0;
    spawnAsteroids(3 + level, ship.x, ship.y);
    return;
  }
  bullets   = [];
  particles = [];
  powerups  = [];
  powerupSpawned = false;
  const triple = ship.tripleShot; // conservar el power-up entre niveles
  ship.reset();
  ship.tripleShot = triple;
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

// Bomba Nova: elimina todos los asteroides visibles. Sin puntos, sin fragmentos.
function detonateNova() {
  for (const a of asteroids) explode(a.x, a.y, a.size * 5);
  asteroids = [];
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerups.forEach(p => p.update(dt));
    powerups = powerups.filter(p => !p.dead);
    bombs.forEach(b => b.update(dt));
    bombs = bombs.filter(b => !b.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));
  bombs.forEach(b => b.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);
  bombs     = bombs.filter(b => !b.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        // Bomba Nova: cada NOVA_KILLS_NEEDED asteroides destruidos por bala
        killCount++;
        if (killCount >= NOVA_KILLS_NEEDED) {
          killCount = 0;
          // Solo una bomba a la vez: la nueva reemplaza a la que estuviera flotando
          bombs = [new NovaBomb(a.x, a.y)];
        }
        // Power-up: uno por nivel, garantizado a más tardar en el último asteroide
        if (!powerupSpawned) {
          const isLast = a.size === 1
            && newAsteroids.length === 0
            && asteroids.every(x => x.dead);
          if (isLast || Math.random() < POWERUP_CHANCE) {
            powerups.push(new PowerUp(a.x, a.y));
            powerupSpawned = true;
          }
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs power-up
  for (const p of powerups) {
    if (dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      ship.tripleShot = TRIPLE_DURATION;
    }
  }
  powerups = powerups.filter(p => !p.dead);

  // Nave vs bomba: detona al contacto (antes de la colisión nave-asteroide)
  let novaCleared = false;
  for (const b of bombs) {
    if (dist(ship, b) < ship.radius + b.radius) {
      b.dead = true;
      detonateNova();
      novaCleared = true;
      break;
    }
  }
  bombs = bombs.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Nivel completado (espera a que el power-up se recoja o expire)
  // Si lo limpió la bomba, avanza sin reiniciar la nave ni borrar la explosión
  if (asteroids.length === 0 && (novaCleared || powerups.length === 0)) nextLevel(novaCleared);
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  if (ship.tripleShot > 0) {
    const secs = ship.tripleShot.toFixed(1);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4cf';
    ctx.fillText(`DISPARO TRIPLE ${secs}s`, W / 2, H - 26);

    // Barra de tiempo restante: se vacía de derecha a izquierda
    const BAR_W = 200;
    const BAR_H = 6;
    const bx = W / 2 - BAR_W / 2;
    const by = H - 18;
    const ratio = Math.max(0, ship.tripleShot / TRIPLE_DURATION);
    ctx.strokeStyle = '#4cf';
    ctx.lineWidth   = 1;
    ctx.strokeRect(bx, by, BAR_W, BAR_H);
    ctx.fillRect(bx, by, BAR_W * ratio, BAR_H);
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  powerups.forEach(p => p.draw());
  bombs.forEach(b => b.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
