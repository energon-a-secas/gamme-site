// ── Position generation for drills ───────────────────────────
// No answer in this file is written by hand. Every position is built,
// then handed to the solver, and whatever the solver determines IS the
// answer. A drill whose answer was typed in by a person is a drill that
// can be wrong; this one can only be wrong if the solver is, and the
// solver is tested against brute force.

import { createBoard, computeNumbers, reveal, toggleFlag, HIDDEN, REVEALED, FLAGGED } from './engine.js';
import { knownFrom, deduce } from './solver.js';
import { analyze, forcedCells } from './analysis.js';
import { determinedByCount, isForcedFiftyFifty, bestGuess } from './probability.js';
import { placeMines, pickOpeningCell } from './generate.js';
import { pick, randInt } from '../../utils.js';

/**
 * Named-pattern templates. `mines` is the true layout, `revealRows` says which
 * rows start open. The determined cells are computed, never declared.
 */
const TEMPLATES = [
  { patternId: 'ms-1-2-1',      mines: ['...', '*.*'],   revealRows: [0] },
  { patternId: 'ms-1-2-2-1',    mines: ['....', '.**.'], revealRows: [0] },
  { patternId: 'ms-1-1',        mines: ['...', '.*.'],   revealRows: [0] },
  { patternId: 'ms-1-2',        mines: ['...', '.**'],   revealRows: [0] },
  { patternId: 'ms-full-count', mines: ['..', '**'],     revealRows: [0] },
];

export const TEMPLATE_PATTERNS = [...new Set(TEMPLATES.map((t) => t.patternId))];

function boardFromTemplate(t) {
  const h = t.mines.length, w = t.mines[0].length;
  const b = createBoard(w, h, 0);
  let count = 0;
  t.mines.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '*') { b.mine[y * w + x] = 1; count++; }
  }));
  b.mines = count;
  b.placed = true;
  computeNumbers(b);
  for (const y of t.revealRows) {
    for (let x = 0; x < w; x++) b.st[y * w + x] = REVEALED;
  }
  return b;
}

/** The eight ways to look at the same position. */
function transform(b, mode) {
  const { w, h } = b;
  const flip = mode & 1, rot = mode >> 1;
  const nw = rot % 2 === 0 ? w : h;
  const nh = rot % 2 === 0 ? h : w;
  const out = createBoard(nw, nh, b.mines, b.ruleset);
  out.placed = b.placed;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sx = flip ? w - 1 - x : x, sy = y;
      let tx, ty;
      if (rot === 0) { tx = sx; ty = sy; }
      else if (rot === 1) { tx = h - 1 - sy; ty = sx; }
      else if (rot === 2) { tx = w - 1 - sx; ty = h - 1 - sy; }
      else { tx = sy; ty = w - 1 - sx; }
      out.mine[ty * nw + tx] = b.mine[y * w + x];
      out.st[ty * nw + tx] = b.st[y * w + x];
    }
  }
  computeNumbers(out);
  return out;
}

/** A named-pattern position, in a random orientation, with the answer solved for. */
export function templatePosition(patternId) {
  const pool = patternId ? TEMPLATES.filter((t) => t.patternId === patternId) : TEMPLATES;
  const t = pick(pool);
  const b = transform(boardFromTemplate(t), randInt(8));
  const r = analyze(b);
  return {
    board: b,
    patternId: t.patternId,
    safe: [...r.safe],
    mines: [...r.mines],
  };
}

// ── Real mid-game positions ──────────────────────────────────

/** Cells still hidden and unflagged, so an answer never asks for a settled cell. */
function openTargets(b, set) {
  return [...set].filter((i) => b.st[i] === HIDDEN);
}

/**
 * Deal a board, play it forward with the solver, and stop at the first
 * position whose next deduction is of the requested kind.
 *
 * kind: 'local'     the satisfied or full-count rules fire
 *       'subset'    only subtraction fires
 *       'enumerate' only listing every layout fires
 *       'stuck'     nothing is determined, the next move is a guess
 */
export function findPosition(kind, opts = {}) {
  const w = opts.w || 9, h = opts.h || 9, mines = opts.mines || 10;
  // Positions where the local rules stall but something is still forced are
  // genuinely rarer than the others, so they get a bigger search budget rather
  // than a lower standard.
  const tries = opts.tries || (kind === 'enumerate' ? 400 : 120);

  for (let attempt = 0; attempt < tries; attempt++) {
    const b = createBoard(w, h, mines, { firstClick: 'zero', chording: true });
    const first = randInt(w * h);
    placeMines(b, first);
    if (b.num[first] !== 0) continue;
    reveal(b, first);

    for (let step = 0; step < 400; step++) {
      // Two different questions, and conflating them is what broke this before.
      // `local` says WHICH RULE the position is a lesson in, and picks the level.
      // `forced` says WHAT IS PROVABLE, and is the only thing grading may use:
      // a player who reaches a cell by counting is right even when the level is
      // named after subtraction.
      const known = knownFrom(b);
      const local = deduce(b, known);
      const firstRule = local.steps.length ? local.steps[0].rule : null;
      const forced = forcedCells(b);
      const allSafe = openTargets(b, forced.safe);
      const allMines = openTargets(b, forced.mines);
      const anythingForced = allSafe.length > 0 || allMines.length > 0;

      if (kind === 'stuck') {
        if (!anythingForced) {
          let hiddenSafeLeft = 0;
          for (let i = 0; i < b.st.length; i++) {
            if (!b.mine[i] && b.st[i] !== REVEALED) hiddenSafeLeft++;
          }
          if (hiddenSafeLeft > 0) {
            return { board: b, safe: [], mines: [], rule: 'stuck', steps: [],
              fiftyFifty: isForcedFiftyFifty(b), guess: bestGuess(b) };
          }
          break;
        }
      } else if (anythingForced) {
        const localFired = local.safe.size > 0 || local.mines.size > 0;
        const isLocal = firstRule === 'satisfied' || firstRule === 'full-count';
        const matches =
          (kind === 'local' && localFired && isLocal) ||
          (kind === 'subset' && localFired && firstRule === 'subset') ||
          (kind === 'enumerate' && !localFired);
        if (matches) {
          return { board: b, safe: allSafe, mines: allMines, rule: kind === 'enumerate' ? 'enumerate' : firstRule, steps: local.steps };
        }
      }

      if (!anythingForced) break;   // finished, or a guess when we wanted a lesson

      // Advance one deduction class at a time, the way a player works. Opening
      // the whole closure at once skips straight from the opening to the end,
      // and the positions worth drilling are the ones in between.
      const stepSafe = local.safe.size ? openTargets(b, local.safe) : allSafe;
      const stepMines = local.mines.size ? openTargets(b, local.mines) : allMines;
      for (const i of stepSafe) reveal(b, i);
      for (const i of stepMines) if (b.st[i] === HIDDEN) toggleFlag(b, i);
      if (!stepSafe.length && !stepMines.length) break;
    }
  }
  return null;
}

/**
 * A position that is a genuine coin flip, for the level that teaches you to
 * stop looking. Rarer than the others, so it gets its own budget.
 */
export function findFiftyFifty(opts = {}) {
  for (let i = 0; i < (opts.tries || 40); i++) {
    const p = findPosition('stuck', { ...opts, tries: 30 });
    if (p && p.fiftyFifty) return p;
  }
  return null;
}

/** Cells the player may still touch, used to size the marking task. */
export function frontierOf(b) {
  const out = [];
  for (let i = 0; i < b.st.length; i++) {
    if (b.st[i] !== HIDDEN) continue;
    const x = i % b.w, y = Math.floor(i / b.w);
    let touches = false;
    for (let dy = -1; dy <= 1 && !touches; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= b.w || ny >= b.h) continue;
        const n = ny * b.w + nx;
        if (b.st[n] === REVEALED && !b.mine[n]) { touches = true; break; }
      }
    }
    if (touches) out.push(i);
  }
  return out;
}
