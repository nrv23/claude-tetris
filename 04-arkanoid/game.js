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

// Estado de partida
const state = {
  screen: 'start', // 'start' | 'playing' | 'gameover' | 'win'
  score: 0,
  lives: START_LIVES,
  paddle: { x: 190, y: 600, w: 100, h: 14, speed: 7 },
  ball: { x: 240, y: 580, dx: 4, dy: -4, r: 8 },
  bricks: [], // [{ x, y, w, h, color, alive }]
  keys: { left: false, right: false },
  explosions: [], // [{ x, y, w, h, color, startTime }]
};

// Bloques
function createBricks() {
  const bricks = [];
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        x: col * BRICK_W,
        y: BRICK_TOP + row * BRICK_H,
        w: BRICK_W,
        h: BRICK_H,
        color: BRICK_COLORS[row],
        alive: true,
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
  state.bricks = createBricks();
  state.keys = { left: false, right: false };
  state.explosions = [];
}

resetGame();

// Pantallas
function startGame() {
  resetGame();
  state.screen = 'playing';
}

// Tecla o clic en pantallas que no son de juego
function handleScreenInput() {
  if (state.screen === 'start' || state.screen === 'gameover' || state.screen === 'win') {
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

const BALL_SPEED = Math.hypot(4, 4); // módulo constante de la velocidad
const MIN_BOUNCE_ANGLE = Math.PI / 6; // 30°, evita rebotes casi planos

function resetBall() {
  const p = state.paddle;
  const b = state.ball;
  b.x = p.x + p.w / 2;
  b.y = p.y - b.r - 2;
  b.dx = 4;
  b.dy = -4;
}

function loseLife() {
  state.lives -= 1;
  if (state.lives <= 0) {
    state.lives = 0;
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
  b.dx = BALL_SPEED * Math.sin(angle);
  b.dy = -BALL_SPEED * Math.cos(angle);
  b.y = p.y - b.r;
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
  } else if (b.x + b.r > CANVAS_W) {
    b.x = CANVAS_W - b.r;
    b.dx = -b.dx;
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
      brick.alive = false;
      state.explosions.push({
        x: brick.x,
        y: brick.y,
        w: brick.w,
        h: brick.h,
        color: brick.color,
        startTime: performance.now(),
      });
      b.dy = -b.dy;
      state.score += BRICK_POINTS;
      break; // un solo bloque por frame
    }
  }

  if (!state.bricks.some((brick) => brick.alive) && state.explosions.length === 0) {
    state.screen = 'win';
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
    drawSprite(ctx, `block_${brick.color}`, brick.x, brick.y, brick.w, brick.h);
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
  requestAnimationFrame(loop);
});
