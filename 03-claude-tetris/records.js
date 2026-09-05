'use strict';

// Tabla de records local (localStorage). Expone window.Records.
(function () {
  const KEY = 'tetris.records';
  const MAX_TOP = 5;
  const DEFAULT_NAME = 'Jugador';

  function emptyData() {
    return { top: [], bestCombo: 0, maxLines: 0 };
  }

  function toInt(v) {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  function sanitize(raw) {
    const data = emptyData();
    if (!raw || typeof raw !== 'object') return data;
    if (Array.isArray(raw.top)) {
      data.top = raw.top
        .filter(e => e && typeof e === 'object')
        .map(e => ({
          name: String(e.name ?? DEFAULT_NAME).slice(0, 12) || DEFAULT_NAME,
          score: toInt(e.score),
          lines: toInt(e.lines),
          date: typeof e.date === 'string' ? e.date : '',
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_TOP);
    }
    data.bestCombo = toInt(raw.bestCombo);
    data.maxLines = toInt(raw.maxLines);
    return data;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? sanitize(JSON.parse(raw)) : emptyData();
    } catch {
      return emptyData();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* almacenamiento no disponible: se ignora */
    }
  }

  function reset() {
    save(emptyData());
  }

  function qualifies(data, score) {
    if (score <= 0) return false;
    if (data.top.length < MAX_TOP) return true;
    return score > data.top[data.top.length - 1].score;
  }

  // Inserta una entrada y devuelve su índice en el top (o -1 si no entró).
  function addEntry(data, entry) {
    data.top.push(entry);
    data.top.sort((a, b) => b.score - a.score);
    const idx = data.top.indexOf(entry);
    data.top = data.top.slice(0, MAX_TOP);
    return idx < MAX_TOP ? idx : -1;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Construye la tabla + estadísticas + botón de borrar dentro de `container`.
  // `highlightIdx` marca la fila recién añadida con .is-new.
  function buildTable(container, data, highlightIdx, onReset) {
    container.textContent = '';
    container.appendChild(el('p', 'records-title', 'RECORDS'));

    if (data.top.length === 0) {
      container.appendChild(el('p', 'records-empty', 'Sin records todavía'));
    } else {
      const table = el('table', 'records-table');
      const thead = el('thead');
      const hr = el('tr');
      ['#', 'Nombre', 'Puntos', 'Líneas', 'Fecha'].forEach(h => hr.appendChild(el('th', null, h)));
      thead.appendChild(hr);
      table.appendChild(thead);
      const tbody = el('tbody');
      data.top.forEach((entry, i) => {
        const tr = el('tr', i === highlightIdx ? 'is-new' : null);
        tr.appendChild(el('td', null, String(i + 1)));
        tr.appendChild(el('td', 'records-name', entry.name));
        tr.appendChild(el('td', null, entry.score.toLocaleString()));
        tr.appendChild(el('td', null, String(entry.lines)));
        tr.appendChild(el('td', 'records-date', formatDate(entry.date)));
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      container.appendChild(table);
    }

    container.appendChild(
      el('p', 'records-stats', `Mejor combo: ${data.bestCombo} · Máx. líneas: ${data.maxLines}`)
    );

    const resetBtn = el('button', 'records-btn records-btn-danger', 'Borrar records');
    resetBtn.type = 'button';
    resetBtn.addEventListener('click', () => {
      if (!confirm('¿Borrar todos los records?')) return;
      reset();
      resetBtn.blur();
      if (onReset) onReset();
    });
    container.appendChild(resetBtn);
  }

  function renderInto(container, highlightIdx = -1) {
    if (!container) return;
    buildTable(container, load(), highlightIdx, () => renderInto(container, -1));
  }

  function getBox() {
    const parent = document.querySelector('.overlay-box');
    if (!parent) return null;
    let box = document.getElementById('records-box');
    if (!box) {
      box = el('div');
      box.id = 'records-box';
      parent.appendChild(box);
    }
    box.textContent = '';
    return box;
  }

  function onGameOver(stats) {
    const score = toInt(stats && stats.score);
    const linesDone = toInt(stats && stats.lines);
    const maxCombo = toInt(stats && stats.maxCombo);

    const data = load();
    data.bestCombo = Math.max(data.bestCombo, maxCombo);
    data.maxLines = Math.max(data.maxLines, linesDone);
    save(data);

    const box = getBox();
    if (!box) return;

    if (!qualifies(data, score)) {
      renderInto(box);
      return;
    }

    // Si el jugador ya dio su nombre en la pantalla de inicio, guardar directo.
    const knownName = String(window.PauseMenu?.playerName?.() ?? '').trim().slice(0, 12);
    if (knownName) {
      const idx = addEntry(data, { name: knownName, score, lines: linesDone, date: new Date().toISOString() });
      save(data);
      renderInto(box, idx);
      return;
    }

    const form = el('div', 'records-form');
    form.appendChild(el('p', 'records-msg', '¡Nuevo record! Escribe tu nombre:'));
    const row = el('div', 'records-form-row');
    const input = el('input', 'records-input');
    input.type = 'text';
    input.maxLength = 12;
    input.placeholder = 'Tu nombre';
    input.autocomplete = 'off';
    const saveBtn = el('button', 'records-btn', 'Guardar');
    saveBtn.type = 'button';
    row.appendChild(input);
    row.appendChild(saveBtn);
    form.appendChild(row);
    box.appendChild(form);

    let saved = false;
    const doSave = () => {
      if (saved) return;
      saved = true;
      const name = input.value.trim().slice(0, 12) || DEFAULT_NAME;
      const fresh = load();
      const idx = addEntry(fresh, { name, score, lines: linesDone, date: new Date().toISOString() });
      save(fresh);
      saveBtn.blur();
      renderInto(box, idx);
    };

    input.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); doSave(); }
    });
    input.addEventListener('keyup', e => e.stopPropagation());
    saveBtn.addEventListener('click', doSave);

    setTimeout(() => input.focus(), 0);
  }

  // Al reiniciar, quitar el bloque para que no aparezca bajo el overlay de PAUSA.
  document.getElementById('restart-btn')?.addEventListener('click', () => {
    document.getElementById('records-box')?.remove();
  });

  window.Records = { onGameOver, renderInto, load, reset };
})();
