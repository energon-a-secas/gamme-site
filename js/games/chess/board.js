// ── Chess board ──────────────────────────────────────────────
// Renders a FEN and takes a from-square then a to-square. There is no move
// generator here on purpose: the module ships hand-verified positions with
// stored answers, so legality is a property of the puzzle rather than
// something the page has to work out. That keeps the whole game under a few
// hundred lines instead of a few thousand.

import { el } from '../../utils.js';

const FILES = 'abcdefgh';
/** Solid glyphs for both colours, coloured by CSS, so contrast survives any theme. */
const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const NAME = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };

/** Board index 0 is a8, 63 is h1, matching how a FEN is written. */
export function squareName(i) {
  return FILES[i % 8] + (8 - Math.floor(i / 8));
}
export function squareIndex(name) {
  return (8 - Number(name[1])) * 8 + FILES.indexOf(name[0]);
}

/** FEN placement field to a 64-cell array of { type, white } or null. */
export function parseFen(fen) {
  const board = new Array(64).fill(null);
  const [placement, turn] = fen.split(' ');
  let i = 0;
  for (const ch of placement) {
    if (ch === '/') continue;
    if (ch >= '1' && ch <= '8') { i += Number(ch); continue; }
    board[i] = { type: ch.toLowerCase(), white: ch === ch.toUpperCase() };
    i += 1;
  }
  return { board, whiteToMove: turn === 'w' };
}

/**
 * Draw a position.
 * opts: { onMove(uci), selected, highlight: Map<index, 'is-right'|'is-wrong'|'is-hint'>,
 *         interactive, flipped }
 */
export function renderBoard(host, fen, opts = {}) {
  const { board } = parseFen(fen);
  const highlight = opts.highlight || new Map();
  const order = [...board.keys()];
  if (opts.flipped) order.reverse();

  const grid = el('div', { class: 'gboard chess-board', role: 'grid', 'aria-label': 'Chess position', style: '--cols:8' });

  for (const i of order) {
    const piece = board[i];
    const dark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
    const classes = ['gcell', dark ? 'is-dark' : 'is-light'];
    if (piece) classes.push(piece.white ? 'chess-white' : 'chess-black');
    if (opts.selected === i) classes.push('is-target');
    const mark = highlight.get(i);
    if (mark) classes.push(mark);

    const label = piece
      ? `${squareName(i)}, ${piece.white ? 'white' : 'black'} ${NAME[piece.type]}`
      : `${squareName(i)}, empty`;

    grid.append(el('button', {
      type: 'button',
      class: classes.join(' '),
      'data-sq': i,
      role: 'gridcell',
      'aria-label': label,
      disabled: opts.interactive === false,
    }, piece ? GLYPH[piece.type] : ''));
  }

  if (opts.onMove && opts.interactive !== false) wire(grid, opts);
  host.replaceChildren(
    el('div', { class: 'chess-frame' },
      el('div', { class: 'chess-ranks' }, [8, 7, 6, 5, 4, 3, 2, 1].map((r) =>
        el('span', { text: String(opts.flipped ? 9 - r : r) }))),
      el('div', { class: 'chess-mid' },
        grid,
        el('div', { class: 'chess-files' }, [...FILES].map((f) =>
          el('span', { text: opts.flipped ? FILES[7 - FILES.indexOf(f)] : f }))),
      ),
    ),
  );
  return grid;
}

function wire(grid, opts) {
  let from = null;
  const paint = () => {
    for (const node of grid.querySelectorAll('.gcell')) {
      node.classList.toggle('is-target', from !== null && Number(node.dataset.sq) === from);
    }
  };
  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('[data-sq]');
    if (!cell) return;
    const i = Number(cell.dataset.sq);
    if (from === null) {
      // Only a square with a piece on it can start a move.
      if (!cell.textContent.trim()) return;
      from = i;
      paint();
      return;
    }
    if (i === from) { from = null; paint(); return; }
    const uci = squareName(from) + squareName(i);
    from = null;
    paint();
    opts.onMove(uci);
  });
}

/** Turn a uci move into squares the caller can highlight. */
export function moveSquares(uci) {
  return [squareIndex(uci.slice(0, 2)), squareIndex(uci.slice(2, 4))];
}

/** A small static diagram for a pattern card. */
export function miniPosition(fen, caption) {
  const host = el('div');
  renderBoard(host, fen, { interactive: false });
  host.firstChild.classList.add('chess-frame--mini');
  return el('figure', { class: 'diagram' }, host,
    caption ? el('figcaption', { text: caption }) : null);
}
