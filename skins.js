'use strict';

// ---- Skins (temas visuales) ----
// Cada skin define su paleta (1-indexada, igual que COLORS), el color de la
// rejilla y una función draw(context, x, y, colorIndex, size, alpha) que
// game.js invoca a través de Skins.drawBlock para cada celda.

(function () {
  const STORAGE_KEY = 'tetris.skin';
  const DEFAULT_SKIN = 'retro';

  function resetShadow(context) {
    context.shadowBlur = 0;
    context.shadowColor = 'rgba(0,0,0,0)';
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
  }

  const darkenCache = new Map();
  function darken(hex, amount) {
    const key = hex + amount;
    let out = darkenCache.get(key);
    if (out) return out;
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((n >> 16) & 255) - amount);
    const g = Math.max(0, ((n >> 8) & 255) - amount);
    const b = Math.max(0, (n & 255) - amount);
    out = `rgb(${r},${g},${b})`;
    darkenCache.set(key, out);
    return out;
  }

  function isSkin(key) {
    return typeof key === 'string' && Object.prototype.hasOwnProperty.call(SKINS, key);
  }

  function roundedRectPath(context, x, y, w, h, r) {
    if (typeof context.roundRect === 'function') {
      context.beginPath();
      context.roundRect(x, y, w, h, r);
      return;
    }
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + w - r, y);
    context.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    context.lineTo(x + w, y + h - r);
    context.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    context.lineTo(x + r, y + h);
    context.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    context.lineTo(x, y + r);
    context.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    context.closePath();
  }

  const SKINS = {
    retro: {
      name: 'Retro',
      colors: COLORS.slice(),
      grid: '#22222e',
      draw(context, x, y, colorIndex, size, alpha) {
        defaultDrawBlock(context, x, y, colorIndex, size, alpha);
      },
    },

    neon: {
      name: 'Neon',
      colors: [null, '#00f0ff', '#ffe600', '#ff00e6', '#39ff14', '#ff073a', '#4d4dff', '#ff9f00'],
      grid: '#141428',
      draw(context, x, y, colorIndex, size, alpha) {
        if (!colorIndex) return;
        const color = this.colors[colorIndex];
        const px = x * size, py = y * size;
        context.globalAlpha = alpha ?? 1;
        context.shadowBlur = 12;
        context.shadowColor = color;
        context.fillStyle = color;
        context.fillRect(px + 5, py + 5, size - 10, size - 10);
        context.lineWidth = 1;
        context.strokeStyle = color;
        context.strokeRect(px + 2.5, py + 2.5, size - 5, size - 5);
        resetShadow(context);
        context.globalAlpha = 1;
      },
    },

    pastel: {
      name: 'Pastel',
      colors: [null, '#a8e6ef', '#fff3b0', '#dcc6e0', '#c7e9c0', '#f4b6b6', '#c5cae9', '#ffd8b1'],
      grid: '#3d3556',
      draw(context, x, y, colorIndex, size, alpha) {
        if (!colorIndex) return;
        const color = this.colors[colorIndex];
        const px = x * size + 2, py = y * size + 2, w = size - 4;
        context.globalAlpha = alpha ?? 1;
        context.fillStyle = color;
        roundedRectPath(context, px, py, w, w, 6);
        context.fill();
        // brillo suave en la parte superior
        context.fillStyle = 'rgba(255,255,255,0.35)';
        roundedRectPath(context, px + 3, py + 3, w - 6, Math.max(2, w * 0.3), 3);
        context.fill();
        context.globalAlpha = 1;
      },
    },

    pixel: {
      name: 'Pixel art',
      colors: [null, '#3cbcfc', '#f8b800', '#9878f8', '#00a800', '#f83800', '#0058f8', '#fc7460'],
      grid: '#2a2a2a',
      draw(context, x, y, colorIndex, size, alpha) {
        if (!colorIndex) return;
        const color = this.colors[colorIndex];
        const a = alpha ?? 1;
        const px = x * size, py = y * size;
        context.globalAlpha = a;
        // base
        context.fillStyle = color;
        context.fillRect(px, py, size, size);
        // borde oscuro de 2px
        context.fillStyle = darken(color, 70);
        context.fillRect(px, py, size, 2);
        context.fillRect(px, py + size - 2, size, 2);
        context.fillRect(px, py, 2, size);
        context.fillRect(px + size - 2, py, 2, size);
        // pixel de luz 4x4 arriba a la izquierda
        context.fillStyle = 'rgba(255,255,255,0.85)';
        context.fillRect(px + 4, py + 4, 4, 4);
        // textura punteada en rejilla de 6px
        context.globalAlpha = a * 0.15;
        context.fillStyle = '#000';
        for (let dy = 8; dy < size - 2; dy += 6)
          for (let dx = 8; dx < size - 2; dx += 6)
            context.fillRect(px + dx, py + dy, 2, 2);
        context.globalAlpha = 1;
      },
    },
  };

  let activeKey = DEFAULT_SKIN;

  function readSaved() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return isSkin(v) ? v : DEFAULT_SKIN;
    } catch (_) {
      return DEFAULT_SKIN;
    }
  }

  function save(key) {
    try { localStorage.setItem(STORAGE_KEY, key); } catch (_) { /* sin almacenamiento */ }
  }

  // Nombre distinto de `current` (la pieza activa de game.js) para no ocultarla.
  function activeSkin() {
    return SKINS[activeKey];
  }

  function list() {
    return Object.keys(SKINS).map(key => ({ key, name: SKINS[key].name }));
  }

  function set(key) {
    if (!isSkin(key)) return false;
    activeKey = key;
    document.body.dataset.skin = key;
    save(key);
    const select = document.getElementById('skin-select');
    if (select && select.value !== key) select.value = key;
    // Redibujar de inmediato (también en pausa o game over).
    if (hasCurrentPiece()) {
      draw();
      drawNext();
    }
    return true;
  }

  function hasCurrentPiece() {
    // `current` es el `let` global de game.js (pieza activa); existe tras init().
    return typeof current !== 'undefined' && !!current;
  }

  function drawBlock(context, x, y, colorIndex, size, alpha) {
    if (!colorIndex) return;
    activeSkin().draw(context, x, y, colorIndex, size, alpha);
  }

  function buildSelector() {
    const panel = document.querySelector('.panel');
    if (!panel || document.getElementById('skin-select')) return;
    const section = document.createElement('div');
    section.className = 'panel-section';
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = 'SKIN';
    const select = document.createElement('select');
    select.id = 'skin-select';
    select.setAttribute('aria-label', 'Tema visual');
    for (const { key, name } of list()) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = name;
      select.appendChild(opt);
    }
    select.value = activeKey;
    select.addEventListener('change', () => {
      set(select.value);
      select.blur(); // evita que las flechas cambien el skin durante la partida
    });
    // Mientras el select tiene el foco, las teclas no deben llegar al juego
    // (el listener de game.js está en document). Escape devuelve el foco al juego.
    select.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.code === 'Escape') select.blur();
    });
    section.appendChild(label);
    section.appendChild(select);
    panel.appendChild(section);
  }

  window.Skins = { current: activeSkin, set, drawBlock, list };

  buildSelector();
  set(readSaved());
})();
