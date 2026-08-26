// ── Minesweeper solver ───────────────────────────────────────
// Everything a player can legitimately deduce, in the order a player
// would deduce it, with a trace of which rule fired and why. That trace
// is the teaching surface: Play mode's "Explain" button reads it.
//
// The three local rules are all the same rule. Each revealed number n
// with k known mines around it and a set U of unknown neighbours says
//     sum(U) = n - k
// Rule 1 is that equation with a right side of 0. Rule 2 is it with a
// right side equal to |U|. Rule 3 subtracts one such equation from
// another. Rule 4 stops reasoning and starts counting.

import { HIDDEN, REVEALED, neighbors } from './engine.js';

export const UNKNOWN = -1;
export const SAFE = 0;
export const MINE = 1;

/** Known state per cell, derived from what is revealed. Player flags are not trusted. */
export function knownFrom(b) {
  const known = new Int8Array(b.st.length).fill(UNKNOWN);
  for (let i = 0; i < b.st.length; i++) {
    if (b.st[i] === REVEALED) known[i] = SAFE;
  }
  return known;
}

/** One equation: the unknown cells around a revealed number, and how many are mines. */
function constraintsFrom(b, known) {
  const out = [];
  for (let i = 0; i < b.st.length; i++) {
    if (b.st[i] !== REVEALED || b.mine[i]) continue;
    const cells = [];
    let mines = b.num[i];
    for (const n of neighbors(b, i)) {
      if (known[n] === MINE) mines -= 1;
      else if (known[n] === UNKNOWN) cells.push(n);
    }
    if (cells.length) out.push({ source: i, cells, mines });
  }
  return out;
}

/**
 * Run the local rules to fixpoint.
 * Returns determined cells plus a trace of the deductions in order.
 */
export function deduce(b, known = knownFrom(b)) {
  const safe = new Set();
  const mines = new Set();
  const steps = [];
  let changed = true;

  while (changed) {
    changed = false;
    const cons = constraintsFrom(b, known);

    // Rules 1 and 2: a single equation resolves itself.
    for (const c of cons) {
      if (c.mines === 0) {
        for (const cell of c.cells) { known[cell] = SAFE; safe.add(cell); }
        steps.push({ rule: 'satisfied', kind: 'safe', source: [c.source], cells: [...c.cells],
          text: `The ${b.num[c.source]} already touches all ${b.num[c.source]} of its mines, so every other neighbour is safe.` });
        changed = true;
      } else if (c.mines === c.cells.length) {
        for (const cell of c.cells) { known[cell] = MINE; mines.add(cell); }
        steps.push({ rule: 'full-count', kind: 'mine', source: [c.source], cells: [...c.cells],
          text: `The ${b.num[c.source]} has exactly ${c.cells.length} unknown neighbour${c.cells.length > 1 ? 's' : ''} left and needs ${c.mines} more mine${c.mines > 1 ? 's' : ''}, so all of them are mines.` });
        changed = true;
      }
    }
    if (changed) continue;

    // Rule 3: subtract one equation from another it is contained in.
    for (const a of cons) {
      for (const c of cons) {
        if (a === c || a.cells.length >= c.cells.length) continue;
        const setC = new Set(c.cells);
        if (!a.cells.every((x) => setC.has(x))) continue;
        const diff = c.cells.filter((x) => !a.cells.includes(x));
        const dMines = c.mines - a.mines;
        if (dMines === 0) {
          for (const cell of diff) { known[cell] = SAFE; safe.add(cell); }
          steps.push({ rule: 'subset', kind: 'safe', source: [a.source, c.source], cells: diff,
            text: `Both numbers see the same ${a.cells.length} cell${a.cells.length > 1 ? 's' : ''}, and they need the same ${a.mines} mine${a.mines > 1 ? 's' : ''} there. Subtract, and the cells only the larger one sees hold 0 mines.` });
          changed = true;
        } else if (dMines === diff.length && diff.length > 0) {
          for (const cell of diff) { known[cell] = MINE; mines.add(cell); }
          steps.push({ rule: 'subset', kind: 'mine', source: [a.source, c.source], cells: diff,
            text: `Subtracting the smaller number's ${a.mines} mine${a.mines > 1 ? 's' : ''} leaves ${dMines} mine${dMines > 1 ? 's' : ''} for exactly ${diff.length} cell${diff.length > 1 ? 's' : ''}, so all of them are mines.` });
          changed = true;
        }
        if (changed) break;
      }
      if (changed) break;
    }
  }

  return { safe, mines, steps, known };
}

// ── Frontier enumeration ─────────────────────────────────────

/** Hidden cells touching at least one revealed number, and the rest. */
export function partition(b, known) {
  const frontier = [];
  const outer = [];
  for (let i = 0; i < b.st.length; i++) {
    if (known[i] !== UNKNOWN) continue;
    const touching = neighbors(b, i).some((n) => b.st[n] === REVEALED && !b.mine[n]);
    (touching ? frontier : outer).push(i);
  }
  return { frontier, outer };
}

/** Split the frontier into groups that share no equation with each other. */
export function components(b, known) {
  const cons = constraintsFrom(b, known);
  const cellCons = new Map();
  for (let ci = 0; ci < cons.length; ci++) {
    for (const cell of cons[ci].cells) {
      if (!cellCons.has(cell)) cellCons.set(cell, []);
      cellCons.get(cell).push(ci);
    }
  }
  const seenCon = new Set();
  const out = [];
  for (let ci = 0; ci < cons.length; ci++) {
    if (seenCon.has(ci)) continue;
    const stack = [ci];
    const groupCons = [];
    const cells = new Set();
    while (stack.length) {
      const cur = stack.pop();
      if (seenCon.has(cur)) continue;
      seenCon.add(cur);
      groupCons.push(cons[cur]);
      for (const cell of cons[cur].cells) {
        cells.add(cell);
        for (const other of cellCons.get(cell)) if (!seenCon.has(other)) stack.push(other);
      }
    }
    out.push({ cells: [...cells], constraints: groupCons });
  }
  return out;
}

const CELL_CAP = 24;        // per component, before enumeration is refused
const SOLUTION_CAP = 300000;

/**
 * Every consistent mine assignment for one component, tallied by how many
 * mines it uses. Returns null when the component is too large to enumerate.
 */
export function enumerate(component) {
  const cells = component.cells;
  if (cells.length > CELL_CAP) return null;
  const pos = new Map(cells.map((c, i) => [c, i]));
  const cons = component.constraints.map((c) => ({
    mines: c.mines,
    idx: c.cells.map((cell) => pos.get(cell)),
  }));
  // Constraints touching each slot, so a partial assignment can be checked early.
  const touching = cells.map(() => []);
  for (let ci = 0; ci < cons.length; ci++) {
    for (const slot of cons[ci].idx) touching[slot].push(ci);
  }

  const assign = new Int8Array(cells.length).fill(-1);
  const byCount = new Map();   // k -> { ways, cellWays: Float64Array }
  let solutions = 0;
  let overflow = false;

  const feasible = (ci) => {
    const c = cons[ci];
    let sum = 0, unset = 0;
    for (const slot of c.idx) {
      if (assign[slot] === -1) unset++;
      else sum += assign[slot];
    }
    return sum <= c.mines && sum + unset >= c.mines;
  };

  const walk = (slot, used) => {
    if (overflow) return;
    if (slot === cells.length) {
      solutions += 1;
      if (solutions > SOLUTION_CAP) { overflow = true; return; }
      let entry = byCount.get(used);
      if (!entry) byCount.set(used, entry = { ways: 0, cellWays: new Float64Array(cells.length) });
      entry.ways += 1;
      for (let i = 0; i < cells.length; i++) if (assign[i] === 1) entry.cellWays[i] += 1;
      return;
    }
    for (const value of [0, 1]) {
      assign[slot] = value;
      if (touching[slot].every(feasible)) walk(slot + 1, used + value);
      assign[slot] = -1;
    }
  };

  walk(0, 0);
  if (overflow) return null;
  return { cells, byCount, solutions };
}

/**
 * Cells that every consistent assignment of the FRONTIER agrees on.
 *
 * Frontier only: this function never reads b.mines, so it cannot make the
 * deduction the mine counter allows. analysis.js is what combines the two.
 * Calling this directly and treating an empty result as "the position is a
 * guess" is wrong, and was wrong here for a while.
 */
export function enumerateDetermined(b, known) {
  const safe = new Set();
  const mines = new Set();
  let capped = false;
  for (const comp of components(b, known)) {
    const en = enumerate(comp);
    if (!en) { capped = true; continue; }
    let total = 0;
    const mineWays = new Float64Array(comp.cells.length);
    for (const entry of en.byCount.values()) {
      total += entry.ways;
      for (let i = 0; i < comp.cells.length; i++) mineWays[i] += entry.cellWays[i];
    }
    if (!total) continue;
    for (let i = 0; i < comp.cells.length; i++) {
      if (mineWays[i] === 0) safe.add(comp.cells[i]);
      else if (mineWays[i] === total) mines.add(comp.cells[i]);
    }
  }
  return { safe, mines, capped };
}
