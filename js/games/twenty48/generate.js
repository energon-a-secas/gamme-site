// ── 2048 drill positions ─────────────────────────────────────
// Every position here is produced by playing, then tested against a
// property computed from the board. A position that fails its own test is
// thrown away, so no drill ever ships an answer that was guessed.
//
// Two sources. Playouts give boards that look like real games. Dense
// boards are built along a snake and then punched full of holes, which is
// the only reliable way to reach the near-full endgames level 5 needs.

import { pick, shuffle } from '../../utils.js';
import { settingsFor } from '../../state.js';
import {
  DIRS, CORNERS,
  emptyGrid, emptyCells, applyMove, spawnTile, legalMoves, maxTile,
  anchorCorner, anchorRowFull, snakePath, order, dislodges, keepsAnchor,
  deadAfterMove, spawnValues,
} from './game.js';

/**
 * The spawn values this board is actually playing with, read from the same
 * key the Rules tab writes. The drill runner calls make(levelId) with no
 * context, so there is nowhere else to get it. It matters: at "never (0%)"
 * a move only a 4 could have survived is a certain loss, and grading it
 * correct would be marking a guaranteed defeat right.
 */
export function liveSpawn() {
  const cfg = settingsFor('twenty48', { fourChance: 0.1 });
  const fourChance = Number(cfg.fourChance);
  return { values: spawnValues(fourChance), fourChance: Number.isFinite(fourChance) ? fourChance : 0.1 };
}

// ── Sources ──────────────────────────────────────────────────

/** Every position a single game passes through, spawns included. */
function playout(policy, maxMoves) {
  let grid = spawnTile(spawnTile(emptyGrid()).grid).grid;
  const seen = [];
  for (let n = 0; n < maxMoves; n++) {
    seen.push(grid);
    const legal = legalMoves(grid);
    if (!legal.length) break;
    const res = applyMove(grid, policy(grid, legal));
    grid = spawnTile(res.grid).grid;
  }
  return seen;
}

/** Plays roughly the way the patterns say to, so the boards look sane. */
function tidyPolicy(grid, legal) {
  if (Math.random() < 0.12) return pick(legal);
  let best = legal[0];
  let bestScore = -Infinity;
  for (const dir of shuffle(legal.slice())) {
    const next = applyMove(grid, dir).grid;
    const corner = anchorCorner(next);
    const o = order(next, corner === null ? 0 : corner);
    const score = (corner === null ? 0 : 30) + emptyCells(next).length * 2.5 + o.score * 0.4;
    if (score > bestScore) { bestScore = score; best = dir; }
  }
  return best;
}

/** Plays badly on purpose. Scrambled boards are where dead ends live. */
function looselyPolicy(grid, legal) { return pick(legal); }

/** A chain down a snake with the odd step back up, then holes punched in it. */
function densePosition(holes) {
  const corner = pick(CORNERS);
  const path = snakePath(corner);
  const top = pick([64, 128, 256, 512]);
  const grid = emptyGrid();
  let v = top;
  for (const i of path) {
    grid[i] = v;
    const roll = Math.random();
    if (roll < 0.62 && v > 2) v /= 2;
    else if (roll > 0.9 && v < top) v *= 2;
  }
  for (const i of shuffle(path.slice()).slice(0, holes)) grid[i] = 0;
  return grid;
}

/** Row major becomes column major. Maps Up to Left, Down to Right. */
function transpose(grid) {
  const out = emptyGrid();
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) out[c * 4 + r] = grid[r * 4 + c];
  return out;
}

/**
 * Values stepping down along `path`, with no two orthogonal neighbours equal,
 * so the filled board has no merge anywhere in it.
 */
function packedGrid(path) {
  const topExp = pick([7, 8, 9, 10]);
  const step = (topExp - 1) / (path.length - 1);
  const grid = emptyGrid();
  for (let n = 0; n < path.length; n++) {
    const i = path[n];
    const target = Math.max(1, Math.round(topExp - n * step));
    const near = [];
    if (i % 4 > 0) near.push(grid[i - 1]);
    if (i % 4 < 3) near.push(grid[i + 1]);
    if (i > 3) near.push(grid[i - 4]);
    if (i < 12) near.push(grid[i + 4]);
    let placed = 0;
    for (const d of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
      const e = target + d;
      if (e < 1 || e > 11) continue;
      if (!near.includes(2 ** e)) { placed = 2 ** e; break; }
    }
    grid[i] = placed || 2 ** target;
  }
  return grid;
}

/**
 * A crowded endgame: a packed grid with one cell blanked. This is the only
 * shape that produces the level 5 question, because a move can only leave a
 * guaranteed dead board when it slides into the last hole without merging.
 */
function endgamePosition() {
  const path = snakePath(pick(CORNERS));
  const grid = packedGrid(path);
  grid[pick(path)] = 0;
  return Math.random() < 0.5 ? transpose(grid) : grid;
}

/**
 * Three packed lines with no equal pair anywhere and the fourth line empty:
 * exactly one direction changes the board. That is the emergency level 2 is
 * filed under, and no other source here produces it, because a board built
 * from a snake nearly always has three directions that still do something.
 */
function frozenPosition() {
  const path = snakePath(pick(CORNERS));
  const grid = packedGrid(path);
  for (const i of path.slice(12)) grid[i] = 0;
  return Math.random() < 0.5 ? transpose(grid) : grid;
}

const PLAY_TIDY = { kind: 'play', policy: tidyPolicy, runs: 5, moves: 240 };
const PLAY_LOOSE = { kind: 'play', policy: looselyPolicy, runs: 5, moves: 240 };
const dense = (holes, tries) => ({ kind: 'dense', holes, tries });
const endgame = (tries) => ({ kind: 'endgame', tries });
const frozen = (tries) => ({ kind: 'frozen', tries });
const BUILDERS = { endgame: endgamePosition, frozen: frozenPosition };

/** Run the sources until `want` positions pass `test`, then pick one. */
function collect(test, sources, want) {
  const found = [];
  for (const src of sources) {
    if (found.length >= want) break;
    if (src.kind === 'play') {
      for (let r = 0; r < src.runs && found.length < want; r++) {
        for (const grid of playout(src.policy, src.moves)) {
          const hit = test(grid);
          if (hit) { found.push(hit); if (found.length >= want) break; }
        }
      }
    } else {
      const build = BUILDERS[src.kind] || (() => densePosition(src.holes));
      for (let t = 0; t < src.tries && found.length < want; t++) {
        const hit = test(build());
        if (hit) found.push(hit);
      }
    }
  }
  return found.length ? pick(found) : null;
}

// ── Tests ────────────────────────────────────────────────────
// Each returns null, or the position plus the answer set it computed.
// `unique` is the strict form used first; the relaxed form only drops the
// requirement that exactly one move qualifies. Grading is by membership in
// the answer set either way, so a relaxed position is still graded right.

function anchorTest(unique) {
  return (grid) => {
    const corner = anchorCorner(grid);
    if (corner === null) return null;
    if (maxTile(grid) < (unique ? 64 : 16)) return null;
    if (emptyCells(grid).length > (unique ? 9 : 12)) return null;
    const legal = legalMoves(grid);
    if (legal.length < 3) return null;
    const answers = DIRS.filter((d) => dislodges(grid, d));
    if (!answers.length || (unique && answers.length !== 1)) return null;
    return { grid, corner, answers, legal };
  };
}

function legalTest(unique) {
  return (grid) => {
    const legal = legalMoves(grid);
    if (!legal.length || legal.length === 4) return null;
    // The strict form asks for the position the pattern names: one direction
    // left, the other three coming back with the board unchanged. The relaxed
    // form takes two or three, which is the board a move or two before that.
    if (unique && legal.length !== 1) return null;
    if (emptyCells(grid).length > (unique ? 5 : 8)) return null;
    return { grid, corner: anchorCorner(grid), answers: legal, legal };
  };
}

function rowTest(unique) {
  return (grid) => {
    const corner = anchorCorner(grid);
    if (corner === null || !anchorRowFull(grid, corner)) return null;
    if (maxTile(grid) < (unique ? 64 : 16)) return null;
    if (emptyCells(grid).length > (unique ? 9 : 12)) return null;
    const legal = legalMoves(grid);
    if (legal.length < 3) return null;
    const answers = legal.filter((d) => anchorRowFull(applyMove(grid, d).grid, corner));
    if (!answers.length || answers.length === legal.length) return null;
    if (unique && answers.length !== 1) return null;
    return { grid, corner, answers, legal };
  };
}

function snakeTest(unique) {
  return (grid) => {
    const corner = anchorCorner(grid);
    if (corner === null) return null;
    if (maxTile(grid) < (unique ? 64 : 16)) return null;
    const legal = legalMoves(grid);
    if (legal.length < 3) return null;
    if (emptyCells(grid).length > (unique ? 8 : 10)) return null;
    // Only moves that keep the anchor can be answers. A move that takes the
    // maximum off its corner is the one the corner-anchor card forbids
    // outright, so scoring it lowest would grade against the cards.
    const scored = legal.map((dir) => ({
      dir,
      breaks: order(applyMove(grid, dir).grid, corner).breaks,
      keeps: keepsAnchor(grid, dir),
    }));
    const held = scored.filter((s) => s.keeps);
    if (held.length < 2) return null;
    const low = Math.min(...held.map((s) => s.breaks));
    const answers = held.filter((s) => s.breaks === low).map((s) => s.dir);
    if (answers.length === held.length) return null;
    if (unique && answers.length !== 1) return null;
    const before = order(grid, corner).breaks;
    if (low > before) return null;
    return { grid, corner, answers, legal, scored, before };
  };
}

function surviveTest(unique, spawn) {
  return (grid) => {
    if (emptyCells(grid).length !== 1) return null;
    const legal = legalMoves(grid);
    if (legal.length < 2) return null;
    const answers = legal.filter((d) => deadAfterMove(grid, d, spawn.values) === false);
    const killers = legal.filter((d) => deadAfterMove(grid, d, spawn.values) === true);
    if (!answers.length || !killers.length) return null;
    if (answers.length > (unique ? 1 : 2)) return null;
    return {
      grid, corner: anchorCorner(grid), answers, legal, killers,
      spawnValues: spawn.values, fourChance: spawn.fourChance,
    };
  };
}

const PLANS = {
  1: { test: anchorTest, sources: [PLAY_TIDY, PLAY_LOOSE, dense(5, 600)] },
  // Mixed on purpose. frozen() reliably fills a strict quota, so listing it
  // first made every level-2 board a one-legal-move board, and the answer was
  // then guessable without reading the grid. Play positions come first so the
  // emergency is the minority case it is meant to be.
  2: { test: legalTest, sources: [PLAY_TIDY, PLAY_LOOSE, dense(2, 600), frozen(150)], mix: 0.6 },
  3: { test: rowTest, sources: [PLAY_TIDY, PLAY_LOOSE, dense(4, 900)] },
  4: { test: snakeTest, sources: [PLAY_TIDY, PLAY_LOOSE, dense(4, 900)] },
  5: { test: surviveTest, sources: [endgame(2400), PLAY_TIDY, PLAY_LOOSE] },
};

/**
 * A verified position for one level, or null when the budget ran out.
 * Strict first, then the relaxed test. Nothing is returned that has not
 * just been recomputed from the board it is attached to.
 */
export function findPosition(levelId) {
  const plan = PLANS[levelId] || PLANS[1];
  const spawn = liveSpawn();
  // Strict first is right for most levels: it is the cleanest instance of the
  // pattern. Level 2 is different, because its strict form (exactly one legal
  // move) is both easy to find and trivially guessable, so trying it first made
  // every board that case and the answer stopped depending on the grid.
  const relaxedFirst = plan.mix ? Math.random() < plan.mix : false;
  const order = relaxedFirst ? [false, true] : [true, false];
  for (const strict of order) {
    const found = collect(plan.test(strict, spawn), plan.sources, strict ? 4 : 2);
    if (found) return found;
  }
  return null;
}
