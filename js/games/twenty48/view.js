// ── 2048 play view ───────────────────────────────────────────
// The real game, with the three diagnostics from the pattern cards read
// off the live board every move. That panel is the point: it turns a game
// into practice, because you can see the anchor slip the moment it slips.

import { el } from '../../utils.js';
import {
  DIR_LABEL, CORNER_NAME,
  emptyGrid, applyMove, spawnTile, isDead, hasReached, readBoard,
} from './game.js';
import { boardNode, paintBoard } from './board.js';

const KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
};

export function playView(host, ctx) {
  const cfg = ctx.settings;
  const g = { grid: emptyGrid(), score: 0, moves: 0, won: false, keepGoing: false, dead: false, flash: {}, history: [] };
  let bumpTimer = null;

  // ── Built once, so the listeners on them survive every repaint ──
  const board = boardNode(g.grid, { label: 'Your board' });
  const stats = el('div', { class: 'statbar' });
  const panel = el('div', { class: 'kv twenty48-panel' });
  const warn = el('p', { class: 'callout callout--warn twenty48-warn', hidden: true });
  const message = el('p', { class: 'callout twenty48-message', role: 'status', 'aria-live': 'polite', hidden: true });

  const newBtn = el('button', { class: 'btn btn--primary', type: 'button', onclick: () => reset() }, 'New game');
  const keepBtn = el('button', { class: 'btn btn--secondary', type: 'button', hidden: true, onclick: () => { g.keepGoing = true; paint(); } }, 'Keep going');
  const undoBtn = cfg.allowUndo
    ? el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => undo() }, 'Undo')
    : null;

  function reset() {
    g.grid = spawnTile(spawnTile(emptyGrid(), { fourChance: cfg.fourChance }).grid, { fourChance: cfg.fourChance }).grid;
    g.score = 0; g.moves = 0; g.won = false; g.keepGoing = false; g.dead = false;
    g.flash = {}; g.history = [];
    paint();
  }

  function undo() {
    const last = g.history.pop();
    if (!last) return;
    g.grid = last.grid; g.score = last.score; g.dead = false; g.flash = {};
    // The win flags rewind with the board. Leave them set and move() returns
    // early on a board that has not reached the target, which reads as a
    // frozen game behind a banner for a win you just took back.
    g.won = last.won; g.keepGoing = last.keepGoing;
    if (cfg.best !== last.best) { cfg.best = last.best; ctx.save(); }
    if (g.moves > 0) g.moves -= 1;
    paint();
  }

  function bump() {
    board.classList.add('twenty48-bump');
    clearTimeout(bumpTimer);
    bumpTimer = setTimeout(() => board.classList.remove('twenty48-bump'), 220);
  }

  function move(dir) {
    if (g.dead || (g.won && !g.keepGoing)) return;
    const res = applyMove(g.grid, dir);
    if (!res.moved) { bump(); return; }
    if (cfg.allowUndo) {
      g.history.push({ grid: g.grid, score: g.score, won: g.won, keepGoing: g.keepGoing, best: cfg.best || 0 });
      if (g.history.length > 40) g.history.shift();
    }
    const spawned = spawnTile(res.grid, { fourChance: cfg.fourChance });
    g.grid = spawned.grid;
    g.score += res.gained;
    g.moves += 1;
    g.flash = { spawn: spawned.index, merged: res.merged };
    if (g.score > (cfg.best || 0)) { cfg.best = g.score; ctx.save(); }
    if (!g.won && hasReached(g.grid, cfg.winAt)) g.won = true;
    if (isDead(g.grid)) g.dead = true;
    paint();
  }

  // ── Painting ─────────────────────────────────────────────────
  function paint() {
    const read = readBoard(g.grid);
    paintBoard(board, g.grid, { spawn: g.flash.spawn, merged: g.flash.merged });

    stats.replaceChildren(
      stat('Score', String(g.score)),
      stat('Best', String(cfg.best || 0)),
      stat('Max tile', String(read.max)),
      stat('Moves', String(g.moves)),
    );

    panel.hidden = !cfg.showDiagnostics;
    if (cfg.showDiagnostics) {
      panel.replaceChildren(
        ...row('Max tile in a corner', read.inCorner ? `yes, ${CORNER_NAME[read.corner]}` : 'no, it is loose'),
        ...row('Anchor row full', read.inCorner ? (read.rowFull ? 'yes, all four cells' : 'no, it has a hole') : 'no anchor to hold'),
        ...row('Order along the snake', read.order
          ? `${read.order.score}%, ${read.order.breaks} break${read.order.breaks === 1 ? '' : 's'} in ${read.order.steps} step${read.order.steps === 1 ? '' : 's'}`
          : 'nothing to measure, the snake starts at the anchor'),
        ...row('Empty cells', String(read.free)),
        ...row('Moves that change the board', read.legal.length ? `${read.legal.length} of 4: ${read.legal.map((d) => DIR_LABEL[d]).join(', ')}` : 'none'),
      );
    }

    const loose = cfg.showDiagnostics && !read.inCorner && read.max >= 32;
    warn.hidden = !loose;
    if (loose) warn.textContent = `The ${read.max} is not in a corner. Nothing on the board can merge with it, so wherever it stands it is a wall. Get it to a corner and keep it there.`;

    if (g.dead) {
      message.hidden = false;
      message.textContent = `No move changes the board. ${g.score} points, ${g.moves} moves, best tile ${read.max}. Look at the last position: the order went before the space did.`;
    } else if (g.won && !g.keepGoing) {
      message.hidden = false;
      message.textContent = `${cfg.winAt} reached in ${g.moves} moves. Stop here, or keep going, which is the harder game: that tile can never merge with anything until you have built a second one.`;
    } else {
      message.hidden = true;
    }

    keepBtn.hidden = !(g.won && !g.keepGoing);
    if (undoBtn) undoBtn.disabled = g.history.length === 0;
  }

  const stat = (label, value) => el('div', { class: 'stat' },
    el('span', { class: 'stat__label', text: label }),
    el('span', { class: 'stat__value', text: value }));

  const row = (k, v) => [el('span', { class: 'kv__k', text: k }), el('span', { class: 'kv__v', text: v })];

  // ── Input ────────────────────────────────────────────────────
  function onKey(e) {
    const dir = KEYS[e.key];
    if (!dir) return;
    const tag = (e.target && e.target.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (e.target && e.target.isContentEditable)) return;
    if (document.body.classList.contains('modal-open')) return;
    e.preventDefault();
    move(dir);
  }

  let touch = null;
  board.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    touch = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  board.addEventListener('touchmove', (e) => { if (touch) e.preventDefault(); }, { passive: false });
  board.addEventListener('touchend', (e) => {
    if (!touch) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.x;
    const dy = t.clientY - touch.y;
    touch = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }, { passive: true });

  window.addEventListener('keydown', onKey);

  host.replaceChildren(el('div', { class: 'stack' },
    el('section', { class: 'section' },
      el('div', { class: 'section__titles' },
        el('h2', { class: 'section__title', text: 'Play' }),
        el('p', { class: 'section__lead', text: 'Arrow keys or WASD, or swipe on the board. The panel below reads the three things the patterns tell you to watch, every move.' }),
      ),
      stats,
      message,
      board,
      el('div', { class: 'toolbar' }, newBtn, keepBtn, undoBtn),
    ),
    el('section', { class: 'section' },
      el('div', { class: 'section__titles' },
        el('h2', { class: 'section__title', text: 'Live read' }),
        el('p', { class: 'section__lead', text: 'Anchor, anchor row, order. A break is a step along the snake where the next non-empty cell is bigger than the one before it.' }),
      ),
      warn,
      panel,
      cfg.showDiagnostics ? null : el('p', { class: 'callout', text: 'The live read is switched off in the Rules tab. Turn it back on when you want the numbers instead of the feeling.' }),
    ),
  ));

  reset();

  return () => {
    window.removeEventListener('keydown', onKey);
    clearTimeout(bumpTimer);
  };
}
