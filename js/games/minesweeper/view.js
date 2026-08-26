// ── Board rendering ──────────────────────────────────────────
// One renderer for both Play and Drill. Drill mode swaps the click
// behaviour for marking instead of opening, and adds an overlay layer
// the grader paints answers onto.

import { HIDDEN, REVEALED, FLAGGED, neighbors } from './engine.js';
import { el } from '../../utils.js';

export const MARK_NONE = 0;
export const MARK_SAFE = 1;
export const MARK_MINE = 2;

/**
 * Draw a board into `host`.
 * opts:
 *   mode       'play' | 'mark'
 *   marks      Map<idx, MARK_*>   (mark mode)
 *   overlay    Map<idx, 'right'|'wrong'|'missed'|'safe'|'mine'|'source'>
 *   onCell     (idx, action) => void   action: 'open' | 'flag' | 'chord' | 'mark'
 *   scale      'auto' | number (px)
 */
export function renderBoard(host, b, opts = {}) {
  const mode = opts.mode || 'play';
  const marks = opts.marks || new Map();
  const overlay = opts.overlay || new Map();

  const grid = el('div', {
    class: `msboard${mode === 'mark' ? ' is-marking' : ''}`,
    role: 'grid',
    'aria-label': `${b.w} by ${b.h} board`,
    style: `--cols:${b.w};--rows:${b.h}`,
  });

  for (let i = 0; i < b.st.length; i++) {
    grid.append(cellNode(b, i, { mode, marks, overlay }));
  }

  if (opts.onCell) wireCells(grid, b, opts);
  host.replaceChildren(grid);
  return grid;
}

function cellNode(b, i, { mode, marks, overlay }) {
  const st = b.st[i];
  const classes = ['mscell'];
  let label = 'hidden';
  let text = '';

  if (st === REVEALED) {
    classes.push('is-open');
    if (b.mine[i]) {
      classes.push(i === b.hitIndex ? 'is-boom' : 'is-mine');
      text = '✳';
      label = 'mine';
    } else if (b.num[i] > 0) {
      classes.push(`n${b.num[i]}`);
      text = String(b.num[i]);
      label = `${b.num[i]}`;
    } else {
      label = 'empty';
    }
  } else if (st === FLAGGED) {
    classes.push('is-flag');
    text = '⚑';
    label = 'flagged';
    if (b.dead && !b.mine[i]) classes.push('is-wrongflag');
  }

  const mark = marks.get(i);
  if (mark === MARK_SAFE) { classes.push('mark-safe'); text = '✓'; label += ', marked safe'; }
  if (mark === MARK_MINE) { classes.push('mark-mine'); text = '✳'; label += ', marked mine'; }

  const ov = overlay.get(i);
  if (ov) { classes.push(`ov-${ov}`); label += `, ${ov}`; }

  return el('button', {
    type: 'button',
    class: classes.join(' '),
    'data-i': i,
    role: 'gridcell',
    'aria-label': `row ${Math.floor(i / b.w) + 1} column ${(i % b.w) + 1}, ${label}`,
    tabindex: i === 0 ? '0' : '-1',
  }, text);
}

function wireCells(grid, b, opts) {
  const mode = opts.mode || 'play';
  const fire = (i, action) => opts.onCell(i, action);

  grid.addEventListener('contextmenu', (e) => {
    const cell = e.target.closest('[data-i]');
    if (!cell) return;
    e.preventDefault();
    fire(Number(cell.dataset.i), mode === 'mark' ? 'mark-back' : 'flag');
  });

  grid.addEventListener('mousedown', (e) => {
    const cell = e.target.closest('[data-i]');
    if (!cell) return;
    if (e.button === 1) { e.preventDefault(); fire(Number(cell.dataset.i), 'chord'); }
  });

  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('[data-i]');
    if (!cell) return;
    const i = Number(cell.dataset.i);
    if (mode === 'mark') return fire(i, 'mark');
    if (e.shiftKey) return fire(i, 'flag');
    if (b.st[i] === REVEALED) return fire(i, 'chord');
    fire(i, 'open');
  });

  // Touch: a long press flags, matching what every mobile port does.
  let pressTimer = null, pressed = null, moved = false;
  grid.addEventListener('touchstart', (e) => {
    const cell = e.target.closest('[data-i]');
    if (!cell) return;
    pressed = Number(cell.dataset.i);
    moved = false;
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      if (!moved && pressed !== null) {
        fire(pressed, mode === 'mark' ? 'mark-back' : 'flag');
        pressed = null;
        if (navigator.vibrate) navigator.vibrate(15);
      }
    }, 380);
  }, { passive: true });
  grid.addEventListener('touchmove', () => { moved = true; clearTimeout(pressTimer); }, { passive: true });
  grid.addEventListener('touchend', () => { clearTimeout(pressTimer); pressed = null; }, { passive: true });

  // Keyboard: arrows move, Enter opens, F flags, Space chords.
  grid.addEventListener('keydown', (e) => {
    const cell = e.target.closest('[data-i]');
    if (!cell) return;
    const i = Number(cell.dataset.i);
    const x = i % b.w, y = Math.floor(i / b.w);
    const go = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= b.w || ny >= b.h) return;
      const next = grid.querySelector(`[data-i="${ny * b.w + nx}"]`);
      if (!next) return;
      cell.tabIndex = -1;
      next.tabIndex = 0;
      next.focus();
    };
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); return go(x - 1, y);
      case 'ArrowRight': e.preventDefault(); return go(x + 1, y);
      case 'ArrowUp': e.preventDefault(); return go(x, y - 1);
      case 'ArrowDown': e.preventDefault(); return go(x, y + 1);
      case 'f': case 'F': e.preventDefault(); return fire(i, mode === 'mark' ? 'mark-back' : 'flag');
      case ' ': e.preventDefault(); return fire(i, mode === 'mark' ? 'mark' : 'chord');
      case 'Enter': e.preventDefault(); return fire(i, mode === 'mark' ? 'mark' : 'open');
      default: break;
    }
  });
}

/** Paint a hint onto an existing grid without rebuilding it. */
export function paintOverlay(grid, entries) {
  for (const node of grid.querySelectorAll('[class*="ov-"]')) {
    node.className = node.className.replace(/\bov-\w+\b/g, '').trim();
  }
  for (const [i, kind] of entries) {
    const node = grid.querySelector(`[data-i="${i}"]`);
    if (node) node.classList.add(`ov-${kind}`);
  }
}

/**
 * Small static diagram for a pattern card.
 * spec rows use: digits = revealed number, '.' = revealed blank,
 * '#' = hidden, 'S' = hidden and provably safe, 'M' = hidden and provably a mine.
 */
export function miniGrid(rows, caption) {
  const w = rows[0].length;
  const grid = el('div', { class: 'msmini', style: `--cols:${w}`, 'aria-hidden': 'true' });
  for (const row of rows) {
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') grid.append(el('span', { class: `msmini__c is-open n${ch}`, text: ch }));
      else if (ch === '.') grid.append(el('span', { class: 'msmini__c is-open' }));
      else if (ch === 'S') grid.append(el('span', { class: 'msmini__c is-safe', text: '✓' }));
      else if (ch === 'M') grid.append(el('span', { class: 'msmini__c is-minemark', text: '✳' }));
      else if (ch === ' ') grid.append(el('span', { class: 'msmini__c is-void' }));
      else grid.append(el('span', { class: 'msmini__c' }));
    }
  }
  return el('figure', { class: 'diagram' }, grid,
    caption ? el('figcaption', { text: caption }) : null);
}

/** Cells a number still needs, for the Play-mode explainer. */
export function unknownAround(b, i) {
  return neighbors(b, i).filter((n) => b.st[n] === HIDDEN);
}
