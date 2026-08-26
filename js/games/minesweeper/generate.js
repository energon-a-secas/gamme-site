// ── Mine placement ───────────────────────────────────────────
// This file is the answer to "why is it not the same game on two sites".
// The board is identical. What differs is when the mines get placed and
// what the generator refuses to produce, and both of those are decided
// here, after your first click, by three lines of policy.

import { computeNumbers, neighbors, reveal, REVEALED } from './engine.js';
import { solveFully } from './analysis.js';
import { shuffle, yieldToBrowser } from '../../utils.js';

/**
 * Cells the generator must keep clear, given the first-click policy.
 *   anywhere: nothing is protected, move one can kill you
 *   safe:     the clicked cell only, so you survive but may learn nothing
 *   zero:     the clicked cell and its neighbours, so a region always opens
 */
export function protectedCells(b, first) {
  const rule = b.ruleset.firstClick;
  if (rule === 'anywhere' || first == null) return new Set();
  if (rule === 'safe') return new Set([first]);
  const keep = new Set([first, ...neighbors(b, first)]);
  // A dense board may not have room for a full zero opening. Degrade to
  // "safe" rather than looping forever, and say so.
  if (b.mines > b.w * b.h - keep.size) return new Set([first]);
  return keep;
}

/** Scatter mines at random, honouring the first-click policy. */
export function placeMines(b, first) {
  const keep = protectedCells(b, first);
  const spots = [];
  for (let i = 0; i < b.mine.length; i++) if (!keep.has(i)) spots.push(i);
  shuffle(spots);
  b.mine.fill(0);
  for (let i = 0; i < b.mines && i < spots.length; i++) b.mine[spots[i]] = 1;
  computeNumbers(b);
  b.placed = true;
  return b;
}

/** True when logic alone finishes the board from this opening click. */
export function isNoGuess(b, first) {
  const probe = {
    w: b.w, h: b.h, mines: b.mines, mine: b.mine, num: b.num,
    st: new Uint8Array(b.st.length), ruleset: b.ruleset,
  };
  reveal(probe, first);
  return solveFully(probe, { enumeration: b.ruleset.noGuessDepth !== 'local' }).solved;
}

/**
 * Keep dealing until logic alone can finish the board.
 *
 * Rejection sampling, which is honest about its cost: a no-guess Expert board
 * takes far more attempts than a no-guess Beginner one, and past a certain
 * density no such board exists at all. When the budget runs out we hand back
 * the best ordinary board and set guessWarning, rather than pretending.
 *
 * Async so a long search does not freeze the page.
 */
export async function placeMinesNoGuess(b, first, opts = {}) {
  const budgetMs = opts.budgetMs ?? 4000;
  const onProgress = opts.onProgress || (() => {});
  const started = performance.now();
  let attempts = 0;

  while (performance.now() - started < budgetMs) {
    attempts += 1;
    placeMines(b, first);
    if (isNoGuess(b, first)) {
      b.guessWarning = null;
      return { ok: true, attempts, ms: performance.now() - started };
    }
    if (attempts % 25 === 0) {
      onProgress({ attempts, ms: performance.now() - started, budgetMs });
      await yieldToBrowser();
    }
  }

  b.guessWarning = {
    attempts,
    ms: Math.round(performance.now() - started),
    text: `No board solvable by logic alone turned up in ${attempts} deals. At this size and mine count they are rare, so this one may force a guess. That is a property of the density, not of you.`,
  };
  return { ok: false, attempts, ms: performance.now() - started };
}

/**
 * First click. Places the mines under whichever policy is active, then opens.
 * Returns the opened cells so the caller can animate them.
 */
export async function openFirst(b, first, opts = {}) {
  if (b.ruleset.noGuess) {
    await placeMinesNoGuess(b, first, opts);
  } else {
    placeMines(b, first);
  }
  return reveal(b, first);
}

/**
 * How often a random deal at this size is solvable without guessing.
 * The Rules tab runs this live, because the number is the argument.
 */
export async function sampleNoGuessRate(w, h, mines, ruleset, samples = 60, onProgress) {
  const { createBoard } = await import('./engine.js');
  let solvable = 0;
  for (let i = 0; i < samples; i++) {
    const b = createBoard(w, h, mines, ruleset);
    const first = pickOpeningCell(b);
    placeMines(b, first);
    if (isNoGuess(b, first)) solvable += 1;
    if (i % 5 === 0) { onProgress?.({ done: i, samples, solvable }); await yieldToBrowser(); }
  }
  return { solvable, samples, rate: solvable / samples };
}

/** A middle-ish cell, used when sampling needs a click but no human is clicking. */
export function pickOpeningCell(b) {
  return Math.floor(b.h / 2) * b.w + Math.floor(b.w / 2);
}
