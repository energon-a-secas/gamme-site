// ── Analysis ─────────────────────────────────────────────────
// The layer that decides what a player can actually prove, and therefore
// what every drill answer key, the Explain button, the post-mortem verdict
// and the Rules tab measurement all inherit.
//
// It exists as its own file because it needs both the deduction rules and
// the counting machinery, and importing them into each other would be a
// cycle. The ordering below is the order a player works in:
//
//   1. the three local rules            (one number, then two)
//   2. list the consistent layouts      (the whole frontier at once)
//   3. bring in the mine counter        (the equation covering the board)
//
// Step 3 used to be missing. Leaving it out does not make the solver
// cautious, it makes it call forced positions guesses, which is the one
// direction of error this site cannot afford: it is the exact claim the
// Rules tab measures and the exact reassurance the loss screen offers.

import { REVEALED, HIDDEN, neighbors } from './engine.js';
import { knownFrom, deduce, enumerateDetermined, SAFE, MINE } from './solver.js';
import { determinedByCount } from './probability.js';

/** Does this ruleset let the player see the mine counter? */
function counterVisible(b) {
  return b.ruleset ? b.ruleset.showMineCount !== false : true;
}

/**
 * Everything provable from the current position, with a trace of which rule
 * fired. `exhausted` true means the next move is genuinely a guess.
 */
export function analyze(b) {
  const known = knownFrom(b);
  const local = deduce(b, known);
  if (local.safe.size || local.mines.size) {
    return { ...local, viaEnumeration: false, viaCount: false, exhausted: false };
  }

  const useCount = counterVisible(b);
  const det = useCount ? determinedByCount(b, known) : enumerateDetermined(b, known);
  const steps = [...local.steps];

  if (det.safe.size || det.mines.size) {
    const cells = [...(det.safe.size ? det.safe : det.mines)];
    steps.push({
      rule: useCount ? 'count' : 'enumerate',
      kind: det.safe.size ? 'safe' : 'mine',
      source: [],
      cells,
      text: useCount
        ? 'No number settles this on its own. Take the mines still unaccounted for, list every layout that spends exactly that many, and these cells come out the same way in all of them.'
        : 'No single number settles this. List every mine layout the visible numbers allow: these cells come out the same way in all of them.',
    });
  }

  return {
    safe: det.safe,
    mines: det.mines,
    steps,
    known,
    viaEnumeration: true,
    viaCount: useCount,
    exhausted: det.safe.size === 0 && det.mines.size === 0,
    capped: det.capped,
  };
}

/**
 * Play the board out with logic alone from an already-opened start.
 * True here is what "this board never forces a guess" means, and it is the
 * number the Rules tab reports.
 */
export function solveFully(b, opts = {}) {
  const useEnumeration = opts.enumeration !== false;
  const useCount = opts.count !== undefined ? opts.count : counterVisible(b);
  const work = {
    w: b.w, h: b.h, mines: b.mines, mine: b.mine, num: b.num,
    st: Uint8Array.from(b.st), ruleset: b.ruleset,
  };
  // Deduced mines must survive between rounds: rebuilding what is known from
  // the revealed cells alone forgets them, and a round that finds mines but no
  // safe cell would then repeat itself forever.
  const knownMines = new Set();

  for (let round = 0; round < 5000; round++) {
    const known = knownFrom(work);
    for (const i of knownMines) known[i] = MINE;

    const local = deduce(work, known);
    let grew = false;
    for (const i of local.mines) if (!knownMines.has(i)) { knownMines.add(i); grew = true; }
    let safe = local.safe;

    if (!safe.size && useEnumeration) {
      const det = useCount ? determinedByCount(work, known) : enumerateDetermined(work, known);
      for (const i of det.mines) if (!knownMines.has(i)) { knownMines.add(i); grew = true; }
      safe = det.safe;
    }

    if (!safe.size) {
      if (grew) continue;
      let remaining = 0;
      for (let i = 0; i < work.st.length; i++) {
        if (!work.mine[i] && work.st[i] !== REVEALED) remaining++;
      }
      return { solved: remaining === 0, stuckAt: remaining, rounds: round };
    }

    for (const i of safe) openFlood(work, i);
  }
  return { solved: false, stuckAt: -1, rounds: 5000 };
}

function openFlood(work, i) {
  if (work.st[i] !== HIDDEN) return;
  const stack = [i];
  while (stack.length) {
    const cur = stack.pop();
    if (work.st[cur] !== HIDDEN) continue;
    work.st[cur] = REVEALED;
    if (work.mine[cur]) continue;
    if (work.num[cur] === 0) {
      for (const n of neighbors(work, cur)) if (work.st[n] === HIDDEN) stack.push(n);
    }
  }
}

/**
 * Everything provable, as one set, for grading a drill answer.
 *
 * Not the same job as analyze(). analyze() hands back the NEXT deduction,
 * because that is what a hint should be. Grading needs the closure: a player
 * who spots a cell three deductions deep is right, and must not be told
 * "not provable" because the hint engine stops at step one.
 */
export function forcedCells(b) {
  const known = knownFrom(b);
  const useCount = counterVisible(b);
  const safe = new Set();
  const mines = new Set();
  let capped = false;

  for (let round = 0; round < 200; round++) {
    let grew = false;
    const local = deduce(b, known);
    for (const i of local.safe) if (!safe.has(i)) { safe.add(i); grew = true; }
    for (const i of local.mines) if (!mines.has(i)) { mines.add(i); grew = true; }

    const det = useCount ? determinedByCount(b, known) : enumerateDetermined(b, known);
    if (det.capped) capped = true;
    for (const i of det.safe) if (!safe.has(i)) { safe.add(i); known[i] = SAFE; grew = true; }
    for (const i of det.mines) if (!mines.has(i)) { mines.add(i); known[i] = MINE; grew = true; }

    if (!grew) break;
  }

  return { safe, mines, exhausted: safe.size === 0 && mines.size === 0, capped };
}
