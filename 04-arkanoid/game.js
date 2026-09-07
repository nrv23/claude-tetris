// Arkanoid — MVP (spec 01)

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Constantes
const CANVAS_W = 480;
const CANVAS_H = 640;
const BRICK_ROWS = 7;
const BRICK_COLS = 10;
const BRICK_W = 48; // 480 / 10; el sprite fuente (32×16) se escala
const BRICK_H = 24;
const BRICK_TOP = 60; // margen superior para el HUD
const BRICK_POINTS = 10;
const START_LIVES = 3;
const BRICK_COLORS = ['red', 'hotpink', 'magenta', 'yellow', 'green', 'cyan', 'gray']; // una por fila, de arriba a abajo
const EXPLOSION_FRAME_COUNT = 4; // longitud de EXPLOSION_FRAMES[color]

// Niveles
const BALL_SPEED_BASE = Math.hypot(4, 4); // ≈ 5.66 px por frame
const LEVEL_THRESHOLDS = [0, 150, 220, 290, 360]; // puntos de entrada; el índice 0 es el nivel 1
const MAX_LEVEL = LEVEL_THRESHOLDS.length;
const LEVEL_1_BRICK_POINTS = BRICK_POINTS; // 10 puntos planos, solo en el nivel 1
const DAMAGED_ALPHA = 0.5;

// Sonidos de archivo: { src, playbackRate, volume }
const SOUND_PADDLE = { src: 'assets/sounds/ball-bounce.mp3', playbackRate: 1.0, volume: 0.6 };
const SOUND_WALL = { src: 'assets/sounds/ball-bounce.mp3', playbackRate: 1.5, volume: 0.5 };
const SOUND_BRICK = { src: 'assets/sounds/break-sound.mp3', playbackRate: 1.0, volume: 0.7 };

// Audio de archivo
const audioCache = new Map(); // src -> HTMLAudioElement precargado

function preloadSound(src) {
  if (audioCache.has(src)) return;
  const audio = new Audio(src);
  audio.preload = 'auto';
  audioCache.set(src, audio);
}

// Clona el nodo precargado para que dos golpes seguidos se solapen sin cortarse
function playSound(config) {
  preloadSound(config.src);
  const source = audioCache.get(config.src);
  const sound = source.cloneNode();
  sound.playbackRate = config.playbackRate;
  sound.volume = config.volume;
  sound.play().catch(() => {}); // la política de autoplay puede rechazar; el juego no depende del audio
}

// Sonidos sintetizados (Web Audio API): duraciones en segundos
const START_NOTES = [523, 659, 784]; // do, mi, sol
const START_NOTE_DURATION = 0.09;
const GAMEOVER_FREQ_START = 440;
const GAMEOVER_FREQ_END = 110;
const GAMEOVER_DURATION = 0.6;

let audioContext = null; // creado de forma perezosa: creado al cargar el script nacería suspended

function getAudioContext() {
  if (audioContext) return audioContext;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null; // navegador sin Web Audio: los sonidos sintetizados no suenan
  audioContext = new Ctor();
  return audioContext;
}

function playTone({ type, freqStart, freqEnd, duration, volume, startTime = 0 }) {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime + startTime;
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freqStart, t0);
  if (freqEnd !== freqStart) {
    oscillator.frequency.exponentialRampToValueAtTime(freqEnd, t0 + duration);
  }
  // Envolvente: ataque corto y decaimiento hasta 0 para que no chasquee al cortar
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start(t0);
  oscillator.stop(t0 + duration);
}

function playArpeggio(notes) {
  notes.forEach((freq, i) => {
    playTone({
      type: 'square',
      freqStart: freq,
      freqEnd: freq,
      duration: START_NOTE_DURATION,
      volume: 0.2,
      startTime: i * START_NOTE_DURATION,
    });
  });
}

// Estado de partida
const state = {
  screen: 'start', // 'start' | 'playing' | 'gameover' | 'win'
  score: 0,
  lives: START_LIVES,
  paddle: { x: 190, y: 600, w: 100, h: 14, speed: 7 },
  ball: { x: 240, y: 580, dx: 4, dy: -4, r: 8 },
  bricks: [], // [{ x, y, w, h, row, color, alive, hitsLeft }]
  keys: { left: false, right: false },
  explosions: [], // [{ x, y, w, h, color, startTime }]
  level: 1,
  ballSpeed: BALL_SPEED_BASE,
};

// Reglas derivadas del nivel
function levelForScore(score) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (score >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

function hitsForLevel(level) {
  return level === 1 ? 1 : 2;
}

function ballSpeedForLevel(level) {
  return BALL_SPEED_BASE + (level - 1);
}

// La primera fila vale `level` puntos y cada fila siguiente suma 1
function brickPoints(level, row) {
  if (level === 1) return LEVEL_1_BRICK_POINTS;
  return level + row;
}

// Bloques
function createBricks(level) {
  const bricks = [];
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        x: col * BRICK_W,
        y: BRICK_TOP + row * BRICK_H,
        w: BRICK_W,
        h: BRICK_H,
        row,
        color: BRICK_COLORS[row],
        alive: true,
        hitsLeft: hitsForLevel(level),
      });
    }
  }
  return bricks;
}

// Reinicio completo de la partida
function resetGame() {
  state.score = 0;
  state.lives = START_LIVES;
  state.paddle = { x: 190, y: 600, w: 100, h: 14, speed: 7 };
  state.ball = { x: 240, y: 580, dx: 4, dy: -4, r: 8 };
  state.bricks = createBricks(1);
  state.keys = { left: false, right: false };
  state.explosions = [];
  state.level = 1;
  state.ballSpeed = BALL_SPEED_BASE;
}

resetGame();

// Pantallas
function startGame() {
  resetGame();
  state.screen = 'playing';
}

function playStartSound() {
  playArpeggio(START_NOTES);
}

// Tecla o clic en pantallas que no son de juego
function handleScreenInput() {
  if (state.screen === 'start' || state.screen === 'gameover' || state.screen === 'win') {
    // Solo el arranque inicial suena; los reinicios desde game over o victoria no repiten el arpegio
    const isFirstStart = state.screen === 'start';
    // El primer gesto del usuario es lo que desbloquea el audio: la política de autoplay
    // impide sonar antes, así que este es el momento más cercano posible a "al cargar"
    const audioCtx = getAudioContext();
    if (audioCtx) audioCtx.resume().catch(() => {});
    if (isFirstStart) playStartSound();
    startGame();
  }
}

// Entrada
function clampPaddle() {
  const p = state.paddle;
  if (p.x < 0) p.x = 0;
  if (p.x + p.w > CANVAS_W) p.x = CANVAS_W - p.w;
}

document.addEventListener('keydown', (e) => {
  if (state.screen !== 'playing') {
    handleScreenInput();
    return;
  }
  if (e.key === 'ArrowLeft') state.keys.left = true;
  if (e.key === 'ArrowRight') state.keys.right = true;
});

canvas.addEventListener('click', () => {
  handleScreenInput();
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft') state.keys.left = false;
  if (e.key === 'ArrowRight') state.keys.right = false;
});

canvas.addEventListener('mousemove', (e) => {
  if (state.screen !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (CANVAS_W / rect.width);
  state.paddle.x = mouseX - state.paddle.w / 2;
  clampPaddle();
});

// Actualización
function updatePaddle() {
  const p = state.paddle;
  if (state.keys.left) p.x -= p.speed;
  if (state.keys.right) p.x += p.speed;
  clampPaddle();
}

const MIN_BOUNCE_ANGLE = Math.PI / 6; // 30°, evita rebotes casi planos

function resetBall() {
  const p = state.paddle;
  const b = state.ball;
  b.x = p.x + p.w / 2;
  b.y = p.y - b.r - 2;
  // El módulo de state.ballSpeed repartido en diagonal hacia arriba
  const component = state.ballSpeed / Math.SQRT2;
  b.dx = component;
  b.dy = -component;
}

function playGameOverSound() {
  playTone({
    type: 'sawtooth',
    freqStart: GAMEOVER_FREQ_START,
    freqEnd: GAMEOVER_FREQ_END,
    duration: GAMEOVER_DURATION,
    volume: 0.25,
  });
}

function loseLife() {
  state.lives -= 1;
  if (state.lives <= 0) {
    state.lives = 0;
    playGameOverSound();
    state.screen = 'gameover';
    return;
  }
  resetBall();
}

function bouncePaddle() {
  const p = state.paddle;
  const b = state.ball;
  // -1 en el extremo izquierdo, 0 en el centro, 1 en el derecho
  const hit = ((b.x - p.x) / p.w) * 2 - 1;
  const clamped = Math.max(-1, Math.min(1, hit));
  // Ángulo respecto a la vertical: 0 = recto hacia arriba
  const maxTilt = Math.PI / 2 - MIN_BOUNCE_ANGLE;
  const angle = clamped * maxTilt;
  b.dx = state.ballSpeed * Math.sin(angle);
  b.dy = -state.ballSpeed * Math.cos(angle);
  b.y = p.y - b.r;
  playSound(SOUND_PADDLE);
}

function updateBall() {
  const b = state.ball;
  const p = state.paddle;
  b.x += b.dx;
  b.y += b.dy;

  // Paredes laterales
  if (b.x - b.r < 0) {
    b.x = b.r;
    b.dx = -b.dx;
    playSound(SOUND_WALL);
  } else if (b.x + b.r > CANVAS_W) {
    b.x = CANVAS_W - b.r;
    b.dx = -b.dx;
    playSound(SOUND_WALL);
  }

  // Techo
  if (b.y - b.r < 0) {
    b.y = b.r;
    b.dy = -b.dy;
  }

  // Paleta (solo si la bola baja)
  if (
    b.dy > 0 &&
    b.y + b.r >= p.y &&
    b.y - b.r <= p.y + p.h &&
    b.x + b.r >= p.x &&
    b.x - b.r <= p.x + p.w
  ) {
    bouncePaddle();
  }

  // Suelo
  if (b.y - b.r > CANVAS_H) {
    loseLife();
  }
}

function updateBricks() {
  const b = state.ball;
  for (const brick of state.bricks) {
    if (!brick.alive) continue;
    if (
      b.x + b.r > brick.x &&
      b.x - b.r < brick.x + brick.w &&
      b.y + b.r > brick.y &&
      b.y - b.r < brick.y + brick.h
    ) {
      brick.hitsLeft -= 1;
      playSound(SOUND_BRICK);
      b.dy = -b.dy;
      // El bloque solo puntúa y explota cuando se rompe; el primer golpe solo lo daña
      if (brick.hitsLeft <= 0) {
        brick.alive = false;
        state.explosions.push({
          x: brick.x,
          y: brick.y,
          w: brick.w,
          h: brick.h,
          color: brick.color,
          startTime: performance.now(),
        });
        state.score += brickPoints(state.level, brick.row);
      }
      break; // un solo bloque por frame
    }
  }

  if (!state.bricks.some((brick) => brick.alive) && state.explosions.length === 0) {
    state.screen = 'win';
  }
}

// El nivel se deriva de la puntuación, así que un solo bloque puede saltar más de un umbral
function updateLevel() {
  const level = Math.min(MAX_LEVEL, levelForScore(state.score));
  if (level <= state.level) return;
  state.level = level;
  state.ballSpeed = ballSpeedForLevel(level);

  // La bola acelera conservando su dirección: la rejilla no cambia, no hay motivo para recolocarla
  const b = state.ball;
  const speed = Math.hypot(b.dx, b.dy);
  if (speed > 0) {
    b.dx = (b.dx / speed) * state.ballSpeed;
    b.dy = (b.dy / speed) * state.ballSpeed;
  }

  // Los bloques vivos pasan a exigir 2 golpes; Math.max evita curar los ya dañados
  const hits = hitsForLevel(level);
  for (const brick of state.bricks) {
    if (brick.alive) brick.hitsLeft = Math.max(brick.hitsLeft, hits);
  }
}

function updateExplosions() {
  const now = performance.now();
  state.explosions = state.explosions.filter(
    (explosion) => now - explosion.startTime < EXPLOSION_DURATION
  );
}

function update() {
  if (state.screen !== 'playing') return;
  updatePaddle();
  updateBall();
  updateBricks();
  updateLevel();
  updateExplosions();
}

// Dibujo
function drawPaddle() {
  const p = state.paddle;
  drawSprite(ctx, 'paddle', p.x, p.y, p.w, p.h);
}

function drawBall() {
  const b = state.ball;
  drawSprite(ctx, 'ball', b.x - 8, b.y - 8, 16, 16);
}

function drawBricks() {
  for (const brick of state.bricks) {
    if (!brick.alive) continue;
    // A medio romper: le queda un golpe pero nació con más de uno
    const damaged = brick.hitsLeft === 1 && hitsForLevel(state.level) > 1;
    if (damaged) ctx.globalAlpha = DAMAGED_ALPHA;
    drawSprite(ctx, `block_${brick.color}`, brick.x, brick.y, brick.w, brick.h);
    if (damaged) ctx.globalAlpha = 1;
  }
}

function drawExplosions() {
  const now = performance.now();
  const frameDuration = EXPLOSION_DURATION / EXPLOSION_FRAME_COUNT;
  for (const explosion of state.explosions) {
    const elapsed = now - explosion.startTime;
    const frame = Math.min(EXPLOSION_FRAME_COUNT - 1, Math.floor(elapsed / frameDuration));
    drawFrame(
      ctx,
      EXPLOSION_FRAMES[explosion.color][frame],
      explosion.x,
      explosion.y,
      explosion.w,
      explosion.h
    );
  }
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(`Puntos: ${state.score}`, 12, BRICK_TOP / 2);
  ctx.textAlign = 'center';
  ctx.fillText(`Nivel ${state.level}`, CANVAS_W / 2, BRICK_TOP / 2);
  ctx.textAlign = 'left';
  // Vidas: una bola por cada vida disponible, alineadas a la derecha
  const lifeSize = 16;
  const lifeGap = 6;
  for (let i = 0; i < state.lives; i++) {
    const x = CANVAS_W - 12 - lifeSize - i * (lifeSize + lifeGap);
    drawSprite(ctx, 'ball', x, BRICK_TOP / 2 - lifeSize / 2, lifeSize, lifeSize);
  }
}

function drawOverlay(lines) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineHeight = 44;
  const startY = CANVAS_H / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.font = i === 0 ? 'bold 32px system-ui, sans-serif' : '20px system-ui, sans-serif';
    ctx.fillText(line, CANVAS_W / 2, startY + i * lineHeight);
  });
}

function drawScreen() {
  if (state.screen === 'start') {
    drawOverlay(['Arkanoid', 'Pulsa una tecla o haz clic para empezar']);
  } else if (state.screen === 'gameover') {
    drawOverlay(['Fin de la partida', `Puntuación: ${state.score}`, 'Pulsa para reiniciar']);
  } else if (state.screen === 'win') {
    drawOverlay(['¡Has ganado!', `Puntuación: ${state.score}`, 'Pulsa para reiniciar']);
  }
}

function draw() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawHUD();
  drawBricks();
  drawExplosions();
  drawPaddle();
  drawBall();
  drawScreen();
}

// Bucle principal
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loadSpritesheet(() => {
  preloadSound(SOUND_PADDLE.src);
  preloadSound(SOUND_BRICK.src);
  requestAnimationFrame(loop);
});
