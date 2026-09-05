'use strict';

// Tabla de records local (localStorage). Se carga después de game.js como
// script clásico y expone window.Records. game.js la usa con optional
// chaining, así que el juego funciona aunque este archivo no esté.
(function () {
  const STORAGE_KEY = 'tetris.records';
  const MAX_TOP = 5;
  const NAME_MAX = 12;
  const DEFAULT_NAME = 'Jugador';

  const overlayBox = document.querySelector('.overlay-box');
  const restartBtn = document.getElementById('restart-btn');

  // ---- Persistencia ----
  function emptyData() {
    return { top: [], bestCombo: 0, maxLines: 0 };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyData();
      const parsed = JSON.parse(raw);
      const data = emptyData();
      if (Array.isArray(parsed.top)) {
        data.top = parsed.top
          .filter(r => r && typeof r.score === 'number')
          .map(r => ({
            name: String(r.name ?? DEFAULT_NAME).slice(0, NAME_MAX),
            score: r.score,
            lines: Number(r.lines) || 0,
            date: r.date || '',
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_TOP);
      }
      data.bestCombo = Number(parsed.bestCombo) || 0;
      data.maxLines = Number(parsed.maxLines) || 0;
      return data;
    } catch {
      return emptyData();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* almacenamiento no disponible: se ignora */
    }
  }

  function reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignorar */
    }
  }

  // ¿Entra esta puntuación en el top 5?
  function qualifies(data, score) {
    if (score <= 0) return false;
    return data.top.length < MAX_TOP || score > data.top[data.top.length - 1].score;
  }

  // Inserta y devuelve el índice de la nueva fila (o -1 si no entró).
  function insert(data, entry) {
    data.top.push(entry);
    data.top.sort((a, b) => b.score - a.score);
    if (data.top.length > MAX_TOP) data.top.length = MAX_TOP;
    return data.top.indexOf(entry);
  }

  // ---- UI ----
  function box() {
    let el = document.getElementById('records-box');
    if (!el) {
      el = document.createElement('div');
      el.id = 'records-box';
      overlayBox.insertBefore(el, restartBtn);
    }
    el.innerHTML = '';
    return el;
  }

  function clear() {
    const el = document.getElementById('records-box');
    if (el) el.remove();
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  function buildTable(data, highlightIndex = -1) {
    const table = document.createElement('table');
    table.className = 'records-table';
    table.innerHTML = '<thead><tr><th>#</th><th>Nombre</th><th>Puntos</th><th>Líneas</th><th>Fecha</th></tr></thead>';
    const tbody = document.createElement('tbody');
    if (!data.top.length) {
      const tr = document.createElement('tr');
      tr.className = 'records-empty';
      tr.innerHTML = '<td colspan="5">Aún no hay records. ¡Juega una partida!</td>';
      tbody.appendChild(tr);
    }
    data.top.forEach((r, i) => {
      const tr = document.createElement('tr');
      if (i === highlightIndex) tr.className = 'is-new';
      const cells = [String(i + 1), r.name, r.score.toLocaleString(), String(r.lines), formatDate(r.date)];
      cells.forEach(text => {
        const td = document.createElement('td');
        td.textContent = text;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return table;
  }

  function buildStats(data) {
    const p = document.createElement('p');
    p.className = 'records-stats';
    p.textContent = `Mejor combo: ${data.bestCombo} · Máx. líneas: ${data.maxLines}`;
    return p;
  }

  function buildResetButton(onDone) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'records-reset';
    btn.textContent = 'Borrar records';
    btn.addEventListener('click', () => {
      btn.blur();
      if (!confirm('¿Borrar todos los records?')) return;
      reset();
      onDone();
    });
    return btn;
  }

  function renderInto(el, data = load(), highlightIndex = -1) {
    el.appendChild(buildTable(data, highlightIndex));
    el.appendChild(buildStats(data));
    if (data.top.length || data.bestCombo || data.maxLines) {
      el.appendChild(buildResetButton(() => {
        el.innerHTML = '';
        renderInto(el);
      }));
    }
  }

  // Pantalla de inicio: solo la tabla.
  function renderStart() {
    renderInto(box());
  }

  // Game over: actualiza combo/líneas y pide nombre si entra en el top.
  function onGameOver(stats) {
    const data = load();
    const score = Number(stats?.score) || 0;
    const lines = Number(stats?.lines) || 0;
    const maxCombo = Number(stats?.maxCombo) || 0;

    let statsChanged = false;
    if (maxCombo > data.bestCombo) { data.bestCombo = maxCombo; statsChanged = true; }
    if (lines > data.maxLines) { data.maxLines = lines; statsChanged = true; }
    if (statsChanged) save(data);

    const el = box();

    if (!qualifies(data, score)) {
      renderInto(el, data);
      return;
    }

    // Formulario de nombre
    const form = document.createElement('div');
    form.className = 'records-form';

    const msg = document.createElement('p');
    msg.className = 'records-msg';
    msg.textContent = '¡Nuevo record! Escribe tu nombre:';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'player-name';
    input.maxLength = NAME_MAX;
    input.placeholder = DEFAULT_NAME;
    input.autocomplete = 'off';
    // Que las teclas del juego (flechas, espacio, P) no lleguen a game.js
    input.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') saveBtn.click();
    });
    input.addEventListener('keyup', e => e.stopPropagation());

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'records-save';
    saveBtn.textContent = 'Guardar';
    saveBtn.addEventListener('click', () => {
      const name = input.value.trim().slice(0, NAME_MAX) || DEFAULT_NAME;
      const idx = insert(data, { name, score, lines, date: new Date().toISOString() });
      save(data);
      el.innerHTML = '';
      renderInto(el, data, idx);
      restartBtn.focus();
    });

    form.appendChild(msg);
    form.appendChild(input);
    form.appendChild(saveBtn);
    el.appendChild(form);

    // Vista previa: la tabla actual con la posición que ocuparía resaltada
    const preview = { ...data, top: [...data.top] };
    const idx = insert(preview, { name: '…', score, lines, date: '' });
    el.appendChild(buildTable(preview, idx));
    el.appendChild(buildStats(data));

    setTimeout(() => input.focus(), 0);
  }

  window.Records = { onGameOver, renderStart, renderInto, clear, load, reset };

  // game.js ya mostró la pantalla de inicio antes de que este script cargara:
  // pintamos la tabla ahora (current es null solo en la pantalla de inicio).
  if (typeof current !== 'undefined' && current === null) renderStart();
})();
