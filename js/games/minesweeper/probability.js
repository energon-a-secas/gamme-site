// ── Mine probability ─────────────────────────────────────────
// When logic runs out you have to guess, and the guesses are not equal.
// The naive answer (count solutions, divide) is wrong: it ignores that a
// layout using fewer frontier mines leaves more ways to arrange the rest.
// Weighting by C(unknownCellsAwayFromNumbers, minesLeft) fixes it, and the
// difference is large enough to change which cell you click.

import { REVEALED } from './engine.js';
import { UNKNOWN, MINE, knownFrom, deduce, partition, components, enumerate } from './solver.js';

// ── log factorials, so the binomials do not overflow ─────────
let LOG_FACT = [0];
function logFact(n) {
  for (let i = LOG_FACT.length; i <= n; i++) LOG_FACT[i] = LOG_FACT[i - 1] + Math.log(i);
  return LOG_FACT[n];
}
/** Floating point can carry a certainty just past 1. It is still a certainty. */
function clamp01(p) {
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

function logChoose(n, k) {
  if (k < 0 || k > n || n < 0) return -Infinity;
  return logFact(n) - logFact(k) - logFact(n - k);
}

/** Polynomial convolution of two mine-count distributions. */
function convolve(a, b) {
  const out = new Float64Array(a.length + b.length - 1);
  for (let i = 0; i < a.length; i++) {
    if (!a[i]) continue;
    for (let j = 0; j < b.length; j++) {
      if (!b[j]) continue;
      out[i + j] += a[i] * b[j];
    }
  }
  return out;
}

function distOf(en) {
  let maxK = 0;
  for (const k of en.byCount.keys()) maxK = Math.max(maxK, k);
  const dist = new Float64Array(maxK + 1);
  for (const [k, entry] of en.byCount) dist[k] = entry.ways;
  return dist;
}

/**
 * Mine probability for every still-unknown cell.
 * Returns null when a component is too large to enumerate, because a wrong
 * number here is worse than no number.
 */
export function mineProbabilities(b) {
  const known = knownFrom(b);
  // Fold in everything logic already settles. Those cells are not guesses, so
  // they are not part of the weighting, but they belong in the output: a cell
  // proven safe is 0 percent and a proven mine is 100, and showing that is how
  // the display teaches the difference between "settled" and "cheap".
  const settled = deduce(b, known);

  let knownMines = 0;
  for (let i = 0; i < known.length; i++) if (known[i] === MINE) knownMines++;
  const minesLeft = b.mines - knownMines;

  const { frontier, outer } = partition(b, known);
  const probs = new Map();
  for (const i of settled.safe) probs.set(i, 0);
  for (const i of settled.mines) probs.set(i, 1);

  if (!frontier.length) {
    if (!outer.length) return { probs, minesLeft, frontierSize: 0, outerSize: 0, uniform: true };
    // A board whose counter disagrees with the cells left is inconsistent, and
    // saying nothing beats reporting a probability above 1.
    if (minesLeft < 0 || minesLeft > outer.length) return null;
    const p = minesLeft / outer.length;
    for (const i of outer) probs.set(i, p);
    return { probs, minesLeft, frontierSize: 0, outerSize: outer.length, uniform: true };
  }

  const comps = components(b, known);
  const ens = [];
  for (const comp of comps) {
    const en = enumerate(comp);
    if (!en) return null;             // refuse rather than guess badly
    ens.push({ comp, en, dist: distOf(en, comp.cells.length) });
  }

  // Distribution of total frontier mines, and the same leaving each component out.
  const all = ens.reduce((acc, e) => convolve(acc, e.dist), Float64Array.of(1));
  const others = ens.map((_, skip) =>
    ens.reduce((acc, e, i) => (i === skip ? acc : convolve(acc, e.dist)), Float64Array.of(1)));

  const outerSize = outer.length;
  // Scale every weight against the largest, so exp() stays in range.
  let logMax = -Infinity;
  for (let T = 0; T < all.length; T++) {
    if (!all[T]) continue;
    const lc = logChoose(outerSize, minesLeft - T);
    if (lc > logMax) logMax = lc;
  }
  if (logMax === -Infinity) return null;   // no consistent layout, board is broken
  const weight = (T) => {
    const lc = logChoose(outerSize, minesLeft - T);
    return lc === -Infinity ? 0 : Math.exp(lc - logMax);
  };

  let total = 0;
  for (let T = 0; T < all.length; T++) total += all[T] * weight(T);
  if (!(total > 0)) return null;

  ens.forEach(({ comp, en }, ci) => {
    const rest = others[ci];
    const cellTotals = new Float64Array(comp.cells.length);
    for (const [k, entry] of en.byCount) {
      for (let t = 0; t < rest.length; t++) {
        if (!rest[t]) continue;
        const w = weight(k + t) * rest[t];
        if (!w) continue;
        for (let j = 0; j < comp.cells.length; j++) cellTotals[j] += entry.cellWays[j] * w;
      }
    }
    comp.cells.forEach((cell, j) => probs.set(cell, clamp01(cellTotals[j] / total)));
  });

  if (outerSize > 0) {
    let acc = 0;
    for (let T = 0; T < all.length; T++) {
      if (!all[T]) continue;
      acc += all[T] * weight(T) * ((minesLeft - T) / outerSize);
    }
    const p = clamp01(acc / total);
    for (const i of outer) probs.set(i, p);
  }

  return { probs, minesLeft, frontierSize: frontier.length, outerSize, uniform: false };
}

/**
 * The cell to click when logic is done. Lowest mine probability wins;
 * ties are reported honestly rather than broken by folklore.
 */
export function bestGuess(b) {
  const result = mineProbabilities(b);
  if (!result || !result.probs.size) return null;
  // A cell logic already settles is not a guess. Including it made Explain
  // print "nothing is forced, the cheapest click is 0 percent", which is two
  // sentences contradicting each other.
  const open = [...result.probs.entries()].filter(([, p]) => p > 1e-12 && p < 1 - 1e-12);
  if (!open.length) return null;
  let best = Infinity;
  for (const [, p] of open) best = Math.min(best, p);
  const tied = open.filter(([, p]) => p <= best + 1e-12).map(([i]) => i);
  return { cells: tied, probability: best, ...result };
}

/**
 * Is this position a genuine coin flip? Two or more cells at exactly 50%
 * that no amount of thinking can separate is the thing people blame
 * themselves for, and it is not their fault.
 */
export function isForcedFiftyFifty(b) {
  const g = bestGuess(b);
  if (!g) return false;
  return Math.abs(g.probability - 0.5) < 1e-9 && g.cells.length >= 2;
}

/**
 * Cells the mine counter settles, which the frontier-only enumeration cannot see.
 *
 * A number tells you about its own neighbourhood. The counter tells you about
 * the whole board, and late in a game it is often the only equation left that
 * says anything. Leaving it out does not make the solver cautious, it makes it
 * wrong in the one direction that matters: it calls forced positions guesses.
 *
 * This is exact integer reasoning, not a probability threshold. A layout counts
 * only if the mines it leaves over can actually fit in the cells no number
 * touches, which is what rules out the totals the frontier alone would allow.
 */
export function determinedByCount(b, known = null) {
  const state = known || knownFrom(b);
  if (!known) deduce(b, state);

  let knownMines = 0;
  for (let i = 0; i < state.length; i++) if (state[i] === MINE) knownMines++;
  const minesLeft = b.mines - knownMines;

  const { frontier, outer } = partition(b, state);
  const safe = new Set();
  const mines = new Set();

  if (!frontier.length) {
    if (outer.length && minesLeft === 0) for (const i of outer) safe.add(i);
    else if (outer.length && minesLeft === outer.length) for (const i of outer) mines.add(i);
    return { safe, mines, capped: false };
  }

  const comps = components(b, state);
  const ens = [];
  for (const comp of comps) {
    const en = enumerate(comp);
    if (!en) return { safe, mines, capped: true };   // too big to count; say nothing
    ens.push({ comp, en, dist: distOf(en) });
  }

  const all = ens.reduce((acc, e) => convolve(acc, e.dist), Float64Array.of(1));
  const others = ens.map((_, skip) =>
    ens.reduce((acc, e, i) => (i === skip ? acc : convolve(acc, e.dist)), Float64Array.of(1)));

  /** A frontier total is reachable only if the leftover mines fit outside it. */
  const fits = (T) => minesLeft - T >= 0 && minesLeft - T <= outer.length;
  const reachable = [];
  for (let T = 0; T < all.length; T++) if (all[T] > 0 && fits(T)) reachable.push(T);
  if (!reachable.length) return { safe, mines, capped: false, inconsistent: true };

  ens.forEach(({ comp, en }, ci) => {
    const rest = others[ci];
    const ways = new Float64Array(comp.cells.length);
    let total = 0;
    for (const [k, entry] of en.byCount) {
      // Keep this component's count k only where some arrangement of everything
      // else lands on a total the outer cells can absorb.
      let feasible = 0;
      for (let t = 0; t < rest.length; t++) {
        if (rest[t] > 0 && fits(k + t)) feasible += rest[t];
      }
      if (!feasible) continue;
      total += entry.ways * feasible;
      for (let j = 0; j < comp.cells.length; j++) ways[j] += entry.cellWays[j] * feasible;
    }
    if (!total) return;
    comp.cells.forEach((cell, j) => {
      if (ways[j] === 0) safe.add(cell);
      else if (ways[j] === total) mines.add(cell);
    });
  });

  if (outer.length) {
    const leftovers = reachable.map((T) => minesLeft - T);
    if (leftovers.every((n) => n === 0)) for (const i of outer) safe.add(i);
    else if (leftovers.every((n) => n === outer.length)) for (const i of outer) mines.add(i);
  }

  return { safe, mines, capped: false };
}
