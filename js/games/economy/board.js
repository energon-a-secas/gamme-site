// ── The Tollworks board, drawn ───────────────────────────────
// One renderer, used by the Play view and by the drills, so a position in
// a drill looks exactly like a position in a game.
//
// 20 spaces map to the perimeter of a 6x6 grid. Corners land on 0, 5, 10
// and 15 by construction, which is why the loop is 20 long.

import { el } from '../../utils.js';
import { BOARD, SITES, SETS, rentAt, levelOf } from './game.js';

/** Grid cell for ring index i, 1-based row and column. */
export function cellPos(i) {
  if (i <= 5) return { r: 1, c: i + 1 };
  if (i <= 10) return { r: i - 4, c: 6 };
  if (i <= 15) return { r: 6, c: 16 - i };
  return { r: 21 - i, c: 1 };
}

const KIND_LABEL = {
  depot: 'collect pay',
  yard: 'the pen',
  dispatch: 'go to Yard',
  layby: 'rest',
  signal: 'draw a card',
  levy: null,
};

/**
 * opts:
 *   owner    array of -1 | 0 | 1 per space
 *   works    array of 0..3 per space
 *   tokens   [posYou, posBot], either may be null
 *   mark     Set of indices to flag as targets
 *   right    Set of indices to flag as correct
 *   wrong    Set of indices to flag as wrong
 *   centre   element placed in the middle of the ring
 *   onCell   (i) => void, makes cells clickable
 *   sub      (i) => string, overrides the second line
 */
export function boardEl(opts = {}) {
  const { owner = [], works = [], tokens = [null, null], centre = null, onCell = null, sub = null } = opts;
  const mark = opts.mark || new Set();
  const right = opts.right || new Set();
  const wrong = opts.wrong || new Set();

  const board = el('div', { class: 'economy-board', role: 'group', 'aria-label': 'Tollworks board' });

  for (const sp of BOARD) {
    const { r, c } = cellPos(sp.i);
    const own = owner[sp.i] === undefined ? -1 : owner[sp.i];
    const classes = ['economy-cell', `is-${sp.kind}`];
    if (sp.i % 5 === 0) classes.push('is-corner');
    if (own === 0) classes.push('is-you');
    if (own === 1) classes.push('is-bot');
    if (mark.has(sp.i)) classes.push('is-mark');
    if (right.has(sp.i)) classes.push('is-right');
    if (wrong.has(sp.i)) classes.push('is-wrong');

    const wholeSet = sp.set && own >= 0 && SITES.every((s) => s.set !== sp.set || owner[s.i] === own);
    const line2 = sub ? sub(sp.i) : defaultSub(sp, own, works[sp.i] || 0, wholeSet);
    const owned = sp.kind === 'site' && own >= 0;

    const kids = [
      sp.set ? el('span', { class: 'economy-stripe', style: `background:${SETS[sp.set].color}` }) : null,
      el('span', { class: 'economy-name', text: sp.short }),
      line2 ? el('span', { class: `economy-sub${owned ? ' is-rent' : ''}`, text: line2 }) : null,
      (works[sp.i] || 0) > 0
        ? el('span', { class: 'economy-pips', 'aria-label': `${works[sp.i]} works` },
          Array.from({ length: works[sp.i] }, () => el('i', { class: 'economy-pip' })))
        : null,
      el('span', { class: 'economy-toks' },
        tokens[0] === sp.i ? el('i', { class: 'economy-tok is-you', title: 'You' }) : null,
        tokens[1] === sp.i ? el('i', { class: 'economy-tok is-bot', title: 'Tollbot' }) : null),
    ];

    const attrs = {
      class: classes.join(' '),
      style: `grid-row:${r};grid-column:${c}`,
      'data-space': sp.i,
      title: cellTitle(sp, own, works[sp.i] || 0, wholeSet),
    };
    let cell;
    if (onCell) {
      cell = el('button', { ...attrs, type: 'button', onclick: () => onCell(sp.i) }, kids);
    } else {
      cell = el('div', attrs, kids);
    }
    board.append(cell);
  }

  if (centre) {
    centre.classList.add('economy-mid');
    centre.style.gridRow = '2 / 6';
    centre.style.gridColumn = '2 / 6';
    board.append(centre);
  }
  return board;
}

/** Unowned shows what it costs. Owned shows what it charges, right now. */
function defaultSub(sp, own, works, wholeSet) {
  if (sp.kind === 'site') {
    if (own < 0) return String(sp.cost);
    return String(rentAt(sp, levelOf(sp, wholeSet, works)));
  }
  if (sp.kind === 'levy') return String(sp.fee);
  return KIND_LABEL[sp.kind] || '';
}

function cellTitle(sp, own, works, wholeSet) {
  const head = `${sp.i}. ${sp.name}`;
  if (sp.kind !== 'site') return head;
  if (own < 0) return `${head}: unowned, ${sp.cost} to buy, bare rent ${sp.rent}`;
  const who = own === 0 ? 'yours' : 'Tollbot';
  return `${head}: ${who}, rent ${rentAt(sp, levelOf(sp, wholeSet, works))}${works ? `, ${works} works` : ''}${wholeSet ? ', full set' : ''}`;
}

/** A legend row for the four sets, used in Learn diagrams and the Rules view. */
export function setLegend() {
  return el('div', { class: 'economy-legend' },
    Object.values(SETS).map((s) => el('span', { class: 'economy-legend__item' },
      el('i', { class: 'economy-swatch', style: `background:${s.color}` }),
      el('span', { text: s.name }))));
}

// ── small diagrams for the pattern cards ─────────────────────

/** The ring squashed into a wrapping strip, for a pattern card. */
export function stripEl(mark = new Set(), hot = new Set()) {
  return el('div', { class: 'economy-strip' }, BOARD.map((sp) => el('span', {
    class: `economy-chip is-${sp.kind}${mark.has(sp.i) ? ' is-mark' : ''}${hot.has(sp.i) ? ' is-hot' : ''}`,
    title: `${sp.i}. ${sp.name}`,
    style: sp.set ? `--chip:${SETS[sp.set].color}` : '',
    text: String(sp.i),
  })));
}

/** Horizontal bars, shared by every diagram that shows a distribution. */
export function barsEl(rows) {
  const max = Math.max(...rows.map((r) => r.value));
  return el('div', { class: 'economy-bars is-mini' }, rows.map((r) => el('div', { class: 'economy-bar' },
    el('span', { class: 'economy-bar__label', text: r.label }),
    el('span', { class: 'economy-bar__track' },
      el('span', { class: 'economy-bar__fill', style: `width:${(r.value / max) * 100}%${r.color ? `;background:${r.color}` : ''}` })),
    el('span', { class: 'economy-bar__val', text: r.text }))));
}
