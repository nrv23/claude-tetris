'use strict';

// Menú de pausa y pantalla de inicio. Se carga después de game.js y usa sus
// variables/funciones globales (init, paused, gameOver, current, overlay...).
(function () {
  const STORAGE_KEY = 'tetris.startLevel';
  const NAME_KEY = 'tetris.playerName';
  const MAX_NAME = 12;
  const MIN_LEVEL = 1;
  const MAX_LEVEL = 15;

  const overlayBox = document.querySelector('.overlay-box');
  if (!overlayBox) return;

  let open = false; // true mientras el menú de pausa o la pantalla de inicio están visibles

  // ---- Persistencia del nivel inicial ----
  function loadStartLevel() {
    try {
      const n = parseInt(localStorage.getItem(STORAGE_KEY), 10);
      if (Number.isInteger(n) && n >= MIN_LEVEL && n <= MAX_LEVEL) return n;
    } catch (_) { /* localStorage no disponible */ }
    return MIN_LEVEL;
  }

  function saveStartLevel(n) {
    try { localStorage.setItem(STORAGE_KEY, String(n)); } catch (_) { /* ignorar */ }
  }

  // ---- Nombre del jugador (se pide una sola vez por sesión) ----
  let playerNameValue = ''; // fijado al pulsar Jugar la primera vez

  function loadPlayerName() {
    try { return String(localStorage.getItem(NAME_KEY) ?? '').slice(0, MAX_NAME); } catch (_) { return ''; }
  }

  function savePlayerName(name) {
    try { localStorage.setItem(NAME_KEY, name); } catch (_) { /* ignorar */ }
  }

  // ---- Construcción del DOM ----
  const menu = document.createElement('div');
  menu.id = 'pause-menu';
  menu.className = 'hidden';

  const resumeBtn = document.createElement('button');
  resumeBtn.id = 'pm-resume';
  resumeBtn.className = 'pm-btn pm-btn-primary';
  resumeBtn.textContent = 'Reanudar';

  const playBtn = document.createElement('button');
  playBtn.id = 'pm-play';
  playBtn.className = 'pm-btn pm-btn-primary';
  playBtn.textContent = 'Jugar';

  const restartMenuBtn = document.createElement('button');
  restartMenuBtn.id = 'pm-restart';
  restartMenuBtn.className = 'pm-btn';
  restartMenuBtn.textContent = 'Reiniciar';

  const controlsBtn = document.createElement('button');
  controlsBtn.id = 'pm-controls';
  controlsBtn.className = 'pm-btn';
  controlsBtn.textContent = 'Ver controles';

  const controlsList = document.createElement('ul');
  controlsList.id = 'pm-controls-list';
  controlsList.className = 'hidden';
  const CONTROLS = [
    [['←', '→'], 'mover'],
    [['↑', 'X'], 'rotar'],
    [['↓'], 'bajar'],
    [['Space'], 'caída'],
    [['P', 'Esc'], 'pausa'],
  ];
  for (const [keys, label] of CONTROLS) {
    const li = document.createElement('li');
    keys.forEach((k, i) => {
      if (i > 0) li.append(' / ');
      const kbd = document.createElement('kbd');
      kbd.textContent = k;
      li.appendChild(kbd);
    });
    li.append(' ' + label);
    controlsList.appendChild(li);
  }

  const nameRow = document.createElement('label');
  nameRow.id = 'pm-name-row';
  nameRow.htmlFor = 'player-name';
  nameRow.append('Nombre');
  const nameInput = document.createElement('input');
  nameInput.id = 'player-name';
  nameInput.type = 'text';
  nameInput.maxLength = MAX_NAME;
  nameInput.placeholder = 'Tu nombre';
  nameInput.autocomplete = 'off';
  nameInput.value = loadPlayerName();
  nameRow.appendChild(nameInput);

  const levelRow = document.createElement('label');
  levelRow.id = 'pm-level-row';
  levelRow.htmlFor = 'start-level';
  levelRow.append('Nivel inicial');
  const levelSelect = document.createElement('select');
  levelSelect.id = 'start-level';
  for (let i = MIN_LEVEL; i <= MAX_LEVEL; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = String(i);
    levelSelect.appendChild(opt);
  }
  levelSelect.value = String(loadStartLevel());
  levelRow.appendChild(levelSelect);

  // Ancla vacía para que otras funcionalidades (récords, skins...) añadan
  // contenido a la pantalla de inicio.
  const startExtras = document.createElement('div');
  startExtras.id = 'start-extras';

  menu.append(playBtn, resumeBtn, restartMenuBtn, controlsBtn, controlsList, nameRow, levelRow, startExtras);
  overlayBox.appendChild(menu);

  // ---- Helpers ----
  // Nombre fijado para esta sesión ('' si aún no se ha pulsado Jugar).
  function playerName() {
    return playerNameValue;
  }

  function startLevel() {
    const n = parseInt(levelSelect.value, 10);
    return Number.isInteger(n) ? Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, n)) : MIN_LEVEL;
  }

  function setGameOverElementsVisible(visible) {
    restartBtn.classList.toggle('hidden', !visible);
    overlayScore.classList.toggle('hidden', !visible);
  }

  function openMenu(mode) {
    open = true;
    controlsList.classList.add('hidden');
    playBtn.classList.toggle('hidden', mode !== 'start');
    resumeBtn.classList.toggle('hidden', mode !== 'pause');
    restartMenuBtn.classList.toggle('hidden', mode !== 'pause');
    startExtras.classList.toggle('hidden', mode !== 'start');
    // El nombre solo se pide en la pantalla de inicio, una vez por sesión.
    nameRow.classList.toggle('hidden', mode !== 'start' || playerNameValue !== '');
    setGameOverElementsVisible(false);
    menu.classList.remove('hidden');
    overlay.classList.remove('hidden');
  }

  // ---- API pública ----
  function show() {
    overlayTitle.textContent = 'PAUSA';
    openMenu('pause');
  }

  function hide() {
    open = false;
    // Soltar el foco de cualquier botón/select del menú para que Space o las
    // flechas no lo reactiven durante la partida.
    if (menu.contains(document.activeElement)) document.activeElement.blur();
    menu.classList.add('hidden');
    setGameOverElementsVisible(true);
    overlay.classList.add('hidden');
  }

  function isOpen() {
    return open;
  }

  function showStart() {
    overlayTitle.textContent = 'TETRIS';
    overlayScore.textContent = '';
    levelEl.textContent = startLevel(); // el HUD refleja el nivel con el que se empezará
    // Tabla de records (records.js se carga antes que este script).
    startExtras.textContent = '';
    window.Records?.renderInto(startExtras);
    openMenu('start');
  }

  function startGame() {
    if (playerNameValue === '') {
      playerNameValue = nameInput.value.trim().slice(0, MAX_NAME) || 'Jugador';
      savePlayerName(playerNameValue);
    }
    hide();
    init(startLevel());
  }

  // ---- Eventos ----
  // Las teclas escritas en el input no deben llegar al juego; Enter = Jugar.
  nameInput.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); startGame(); }
  });

  playBtn.addEventListener('click', () => { playBtn.blur(); startGame(); });

  resumeBtn.addEventListener('click', () => {
    resumeBtn.blur();
    if (paused && !gameOver) togglePause(); // togglePause llama a hide()
  });

  restartMenuBtn.addEventListener('click', () => { restartMenuBtn.blur(); startGame(); });

  controlsBtn.addEventListener('click', () => {
    controlsBtn.blur();
    controlsList.classList.toggle('hidden');
  });

  levelSelect.addEventListener('change', () => {
    saveStartLevel(startLevel());
    if (!current) levelEl.textContent = startLevel(); // en la pantalla de inicio
  });

  // El panel lateral de controles vive en index.html; se le añaden las teclas
  // alternativas (X, Esc) para que coincida con la lista del menú.
  for (const li of document.querySelectorAll('.controls li')) {
    const key = li.querySelector('kbd')?.textContent;
    const extra = key === '↑' ? 'X' : key === 'P' ? 'Esc' : null;
    if (!extra || li.querySelectorAll('kbd').length > 1) continue;
    const kbd = document.createElement('kbd');
    kbd.textContent = extra;
    li.querySelector('kbd').after('/', kbd);
  }

  // Si el select tiene el foco, P/Esc deben cerrar el menú en vez de quedarse
  // en el control; se le quita el foco antes de que game.js procese la tecla.
  levelSelect.addEventListener('keydown', e => {
    if (e.code === 'KeyP' || e.code === 'Escape') levelSelect.blur();
  });

  window.PauseMenu = { show, hide, isOpen, showStart, startLevel, playerName };

  showStart();
  if (!nameInput.value) setTimeout(() => nameInput.focus(), 0);
})();
