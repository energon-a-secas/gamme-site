// ── 2048 board rendering ─────────────────────────────────────
// One renderer, used by the play view, the drills and the pattern
// diagrams. Values are written as text nodes, never as markup.

import { el } from '../../utils.js';
import { DIR_LABEL } from './game.js';

/** One cell. `mods` is a space separated list of extra classes. */
export function tileNode(value, mods = '') {
  const cls = ['gcell', 'twenty48-tile', mods].filter(Boolean).join(' ');
  return el('div', { class: cls, 'data-val': String(value || 0) },
    value ? String(value) : null);
}

/**
 * Draw `grid` into `node`.
 * opts.mark    indices to flag with .is-target (the cell the question is about)
 * opts.spawn   index of the tile that just appeared
 * opts.merged  indices that just merged
 */
export function paintBoard(node, grid, opts = {}) {
  const mark = opts.mark || [];
  const merged = opts.merged || [];
  node.replaceChildren(...grid.map((v, i) => {
    const mods = [];
    if (mark.includes(i)) mods.push('is-target');
    if (opts.spawn === i) mods.push('twenty48-pop');
    if (merged.includes(i)) mods.push('twenty48-merge');
    return tileNode(v, mods.join(' '));
  }));
  return node;
}

export function boardNode(grid, opts = {}) {
  const size = opts.size ? ` twenty48-board--${opts.size}` : '';
  const node = el('div', {
    class: `gboard twenty48-board${size}`,
    role: 'group',
    'aria-label': opts.label || '2048 board',
  });
  return paintBoard(node, grid, opts);
}

/** A board plus its caption, shaped the way .diagram expects. */
export function diagramNode(grid, caption, mark = []) {
  return el('figure', { class: 'diagram twenty48-diagram' },
    boardNode(grid, { size: 'sm', mark, label: 'Example position' }),
    el('figcaption', { text: caption }),
  );
}

/**
 * The four answer buttons. `onPick` fires with a direction id.
 * `multi` keeps them togglable instead of committing on the first click.
 */
export function choiceRow(onPick, opts = {}) {
  const order = opts.order || ['up', 'down', 'left', 'right'];
  const buttons = new Map();
  const wrap = el('div', { class: 'choicegrid twenty48-choices', role: 'group', 'aria-label': 'Pick a move' });
  for (const dir of order) {
    const btn = el('button', {
      class: 'choice',
      type: 'button',
      'data-dir': dir,
      onclick: () => onPick(dir, btn),
    }, DIR_LABEL[dir]);
    buttons.set(dir, btn);
    wrap.append(btn);
  }
  return { wrap, buttons };
}

/** Mark the answer buttons after grading. */
export function paintChoices(buttons, right, picked) {
  const rights = Array.isArray(right) ? right : [right];
  const picks = Array.isArray(picked) ? picked : [picked];
  for (const [dir, btn] of buttons) {
    btn.disabled = true;
    if (rights.includes(dir)) btn.classList.add('is-right');
    else if (picks.includes(dir)) btn.classList.add('is-wrong');
    if (picks.includes(dir)) btn.classList.add('is-picked');
  }
}

/** A key/value readout of one computed number per direction. */
export function dirReadout(title, rows) {
  return el('div', { class: 'twenty48-readout' },
    el('h3', { class: 'twenty48-readout__title', text: title }),
    el('div', { class: 'kv' }, rows.flatMap(({ dir, text }) => [
      el('span', { class: 'kv__k', text: DIR_LABEL[dir] || dir }),
      el('span', { class: 'kv__v', text }),
    ])),
  );
}

export { DIR_LABEL };
