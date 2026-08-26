// ── Minesweeper drills ───────────────────────────────────────
// The ladder is the solver's own rule tiers, so difficulty means something
// specific: L3 needs one number, L4 needs two, L5 needs all of them or
// admits that none of them work.

import { el, pick, shuffle } from '../../utils.js';

/** Pattern names already start with "The" sometimes. Do not say it twice. */
const bare = (name) => name.replace(/^The\s+/i, '');
import { renderBoard, paintOverlay, MARK_NONE, MARK_SAFE, MARK_MINE } from './view.js';
import { HIDDEN } from './engine.js';
import { PATTERN_BY_ID } from './patterns.js';
import { templatePosition, findPosition, findFiftyFifty, TEMPLATE_PATTERNS } from './drill-gen.js';

export const LEVELS = [
  { id: 1, name: 'Name it', blurb: 'The position is a named pattern. Say which one.' },
  { id: 2, name: 'Mark it', blurb: 'Pattern named for you. Mark every cell it forces.' },
  { id: 3, name: 'One number', blurb: 'A real board. One number settles a cell. Find it.' },
  { id: 4, name: 'Two numbers', blurb: 'No single number is enough. Subtract.' },
  { id: 5, name: 'Or is it a guess', blurb: 'Sometimes nothing is forced. Know the difference.' },
];

export function makeDrill(levelId) {
  switch (levelId) {
    case 1: return nameIt();
    case 2: return markIt();
    case 3: return findOne('local');
    case 4: return findOne('subset');
    case 5: return guessOrNot();
    default: return nameIt();
  }
}

// ── L1: name the pattern ─────────────────────────────────────
function nameIt() {
  const pos = templatePosition();
  const wrong = shuffle(TEMPLATE_PATTERNS.filter((id) => id !== pos.patternId)).slice(0, 3);
  const options = shuffle([pos.patternId, ...wrong]);

  return {
    patternId: pos.patternId,
    prompt: 'Which pattern is on the board?',
    mount(host, commit) {
      const board = el('div');
      renderBoard(board, pos.board, {});
      host.replaceChildren(
        board,
        el('div', { class: 'choicegrid' }, options.map((id) => el('button', {
          class: 'choice', type: 'button', onclick: () => commit(id),
        }, PATTERN_BY_ID.get(id)?.name || id))),
      );
    },
    grade(answer) {
      const right = PATTERN_BY_ID.get(pos.patternId);
      return {
        correct: answer === pos.patternId,
        detail: answer === pos.patternId
          ? `${right.name}. ${right.action}`
          : `That was the ${bare(right.name)}. ${right.trigger} ${right.action}`,
        reveal: (host) => {
          const grid = host.querySelector('.msboard');
          if (grid) paintOverlay(grid, [
            ...pos.safe.map((i) => [i, 'safe']),
            ...pos.mines.map((i) => [i, 'mine']),
          ]);
        },
      };
    },
  };
}

// ── L2: mark every forced cell ───────────────────────────────
function markIt() {
  const pos = templatePosition();
  const pattern = PATTERN_BY_ID.get(pos.patternId);
  const marks = new Map();
  const expectSafe = new Set(pos.safe);
  const expectMine = new Set(pos.mines);

  return {
    patternId: pos.patternId,
    prompt: `${pattern.name}. Mark every cell it forces: click once for safe, twice for mine.`,
    mount(host, commit) {
      const board = el('div');
      const draw = () => renderBoard(board, pos.board, {
        mode: 'mark', marks,
        onCell: (i, action) => {
          if (pos.board.st[i] !== HIDDEN) return;
          const cur = marks.get(i) || MARK_NONE;
          const next = action === 'mark-back'
            ? (cur === MARK_NONE ? MARK_MINE : cur - 1)
            : (cur + 1) % 3;
          if (next === MARK_NONE) marks.delete(i); else marks.set(i, next);
          draw();
        },
      });
      draw();
      host.replaceChildren(board, el('div', { class: 'toolbar' },
        el('button', { class: 'btn btn--primary', type: 'button', onclick: () => commit(new Map(marks)) }, 'Submit'),
      ));
    },
    grade(answer) {
      const gotSafe = new Set([...answer].filter(([, m]) => m === MARK_SAFE).map(([i]) => i));
      const gotMine = new Set([...answer].filter(([, m]) => m === MARK_MINE).map(([i]) => i));
      const same = (a, b) => a.size === b.size && [...a].every((v) => b.has(v));
      const correct = same(gotSafe, expectSafe) && same(gotMine, expectMine);
      return {
        correct,
        detail: correct
          ? `${pattern.action} ${pattern.why.split('. ')[0]}.`
          : `${pattern.name} forces ${expectMine.size} mine${expectMine.size === 1 ? '' : 's'} and ${expectSafe.size} safe cell${expectSafe.size === 1 ? '' : 's'}. ${pattern.action}`,
        reveal: (host) => {
          const grid = host.querySelector('.msboard');
          if (grid) paintOverlay(grid, [
            ...[...expectSafe].map((i) => [i, 'safe']),
            ...[...expectMine].map((i) => [i, 'mine']),
          ]);
        },
      };
    },
  };
}

// ── L3 and L4: find one forced cell on a real board ──────────
function findOne(kind) {
  const pos = findPosition(kind) || findPosition('local');
  if (!pos) throw new Error('no position');
  const wantMine = pos.mines.length > 0 && (pos.safe.length === 0 || Math.random() < 0.5);
  const target = new Set(wantMine ? pos.mines : pos.safe);
  // 'satisfied' can never be the FIRST rule on a fresh position: it needs a
  // number whose mines are already known, and nothing is known yet. Filing
  // level-3 answers under it reported accuracy on a pattern never shown.
  const patternId = kind === 'subset' ? 'ms-subset' : 'ms-full-count';
  const pattern = PATTERN_BY_ID.get(patternId);

  return {
    patternId,
    prompt: wantMine
      ? 'Click one cell you can prove is a mine.'
      : 'Click one cell you can prove is safe.',
    mount(host, commit) {
      const board = el('div');
      renderBoard(board, pos.board, {
        mode: 'mark',
        onCell: (i) => { if (pos.board.st[i] === HIDDEN) commit(i); },
      });
      host.replaceChildren(board);
    },
    grade(answer) {
      const correct = target.has(answer);
      const other = wantMine ? pos.safe : pos.mines;
      return {
        correct,
        detail: correct
          ? `${pattern.name}. ${pattern.action}`
          : `Not provable. ${target.size} cell${target.size === 1 ? ' is' : 's are'} forced here, by the ${bare(pattern.name).toLowerCase()}: ${pattern.trigger}${other.length ? ` There ${other.length === 1 ? 'is' : 'are'} also ${other.length} forced cell${other.length === 1 ? '' : 's'} of the other kind.` : ''}`,
        reveal: (host) => {
          const grid = host.querySelector('.msboard');
          if (grid) paintOverlay(grid, [
            ...pos.safe.map((i) => [i, 'safe']),
            ...pos.mines.map((i) => [i, 'mine']),
            ...(correct ? [] : [[answer, 'wrong']]),
          ]);
        },
      };
    },
  };
}

// ── L5: forced, or a guess? ──────────────────────────────────
function guessOrNot() {
  const wantStuck = Math.random() < 0.45;
  const pos = wantStuck
    ? (findFiftyFifty() || findPosition('stuck') || findPosition('enumerate'))
    : (findPosition('enumerate') || findPosition('subset'));
  if (!pos) throw new Error('no position');

  const isStuck = pos.rule === 'stuck';
  const target = new Set([...pos.safe, ...pos.mines]);
  const patternId = isStuck
    ? (pos.fiftyFifty ? 'ms-fifty-fifty' : 'ms-probability')
    : 'ms-enumerate';

  return {
    patternId,
    prompt: 'Click a cell that is forced, or say the position needs a guess.',
    mount(host, commit) {
      const board = el('div');
      renderBoard(board, pos.board, {
        mode: 'mark',
        onCell: (i) => { if (pos.board.st[i] === HIDDEN) commit(i); },
      });
      host.replaceChildren(board, el('div', { class: 'toolbar' },
        el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => commit('guess') }, 'This needs a guess'),
      ));
    },
    grade(answer) {
      if (isStuck) {
        const correct = answer === 'guess';
        const p = pos.guess ? Math.round(pos.guess.probability * 100) : null;
        return {
          correct,
          detail: correct
            ? (pos.fiftyFifty
              ? 'Right, and it is a true coin flip: two cells at exactly 50 percent that no amount of thinking separates. On a classic board this is common and it is not your mistake.'
              : `Right. Nothing is forced. The safest cell sits at ${p} percent, so that is where you click.`)
            : `Nothing on this board is forced. Every consistent mine layout disagrees about that cell.${p !== null ? ` The best available click is ${p} percent to be a mine.` : ''} Recognising this is the skill, because looking harder does not help.`,
          reveal: (host) => {
            const grid = host.querySelector('.msboard');
            if (grid && pos.guess) paintOverlay(grid, pos.guess.cells.map((i) => [i, 'hint']));
          },
        };
      }
      const correct = answer !== 'guess' && target.has(answer);
      return {
        correct,
        detail: correct
          ? 'Right. No single number settled that, and no pair did either. Listing the consistent layouts did.'
          : answer === 'guess'
            ? `This one is forced, not a guess. ${target.size} cell${target.size === 1 ? ' is' : 's are'} settled once you list every mine layout the numbers allow.`
            : 'Not that cell. Listing every consistent layout settles a different one.',
        reveal: (host) => {
          const grid = host.querySelector('.msboard');
          if (grid) paintOverlay(grid, [
            ...pos.safe.map((i) => [i, 'safe']),
            ...pos.mines.map((i) => [i, 'mine']),
          ]);
        },
      };
    },
  };
}
