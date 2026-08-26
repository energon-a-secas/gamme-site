// ── 2048 engine ──────────────────────────────────────────────
// Pure grid mechanics, plus the diagnostics the drills grade against.
// Nothing here touches the DOM, and nothing here calls Math.random except
// spawnTile, which is a separate export on purpose: applyMove is the
// ground truth every drill is graded with, so it has to be deterministic.
//
// A grid is a flat array of 16 numbers, row major. 0 is an empty cell.

export const SIZE = 4;
export const CELLS = SIZE * SIZE;
export const DIRS = ['up', 'down', 'left', 'right'];
export const DIR_LABEL = { up: 'Up', down: 'Down', left: 'Left', right: 'Right' };
export const CORNERS = [0, SIZE - 1, CELLS - SIZE, CELLS - 1];
export const CORNER_NAME = {
  0: 'the top left',
  3: 'the top right',
  12: 'the bottom left',
  15: 'the bottom right',
};
/** The only two values a spawn can take here. The rate is a ruleset switch. */
export const SPAWN_VALUES = [2, 4];

/**
 * The values a spawn can actually take at `fourChance`. At 0 a 4 never
 * arrives, at 1 a 2 never does, and every survival test below has to read
 * this rather than assume both. A ruleset that never spawns a 4 turns some
 * moves from survivable into certain death.
 */
export function spawnValues(fourChance) {
  const p = Number(fourChance);
  if (!Number.isFinite(p)) return SPAWN_VALUES.slice();
  if (p <= 0) return [2];
  if (p >= 1) return [4];
  return [2, 4];
}

export function emptyGrid() { return new Array(CELLS).fill(0); }
export function gridFrom(rows) { return rows.flat(); }
export function cloneGrid(grid) { return grid.slice(); }

export function emptyCells(grid) {
  const out = [];
  for (let i = 0; i < grid.length; i++) if (!grid[i]) out.push(i);
  return out;
}

export function sameGrid(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function maxTile(grid) {
  let m = 0;
  for (const v of grid) if (v > m) m = v;
  return m;
}

export function rowOf(i) { return Math.floor(i / SIZE); }
export function colOf(i) { return i % SIZE; }

// ── Movement ─────────────────────────────────────────────────

/** Cell indices of line k, ordered the way tiles travel for `dir`. */
export function lineIndices(dir, k) {
  const out = [];
  for (let n = 0; n < SIZE; n++) {
    if (dir === 'left') out.push(k * SIZE + n);
    else if (dir === 'right') out.push(k * SIZE + (SIZE - 1 - n));
    else if (dir === 'up') out.push(n * SIZE + k);
    else out.push((SIZE - 1 - n) * SIZE + k);
  }
  return out;
}

/**
 * Slide one line toward index 0 and merge equal pairs, each tile at most
 * once per move. The trap worth stating: [2,2,2,2] gives [4,4,0,0] and
 * never [8,0,0,0], because the 4 the first pair made is not offered to
 * the second pair in the same move.
 */
export function slideLine(line) {
  const vals = line.filter((v) => v !== 0);
  const out = [];
  const mergedAt = [];
  let gained = 0;
  for (let i = 0; i < vals.length; i++) {
    if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
      const made = vals[i] * 2;
      mergedAt.push(out.length);
      out.push(made);
      gained += made;
      i += 1;
    } else {
      out.push(vals[i]);
    }
  }
  while (out.length < line.length) out.push(0);
  return { line: out, gained, mergedAt };
}

/**
 * One move, with no spawning. Returns a new grid and leaves the input alone.
 * `moved` is false when the board is identical, which is what "illegal" means
 * in 2048: a move that changes nothing is not a move.
 */
export function applyMove(grid, dir) {
  const next = grid.slice();
  if (!DIRS.includes(dir)) return { grid: next, moved: false, gained: 0, merged: [] };
  let moved = false;
  let gained = 0;
  const merged = [];
  for (let k = 0; k < SIZE; k++) {
    const idx = lineIndices(dir, k);
    const res = slideLine(idx.map((i) => grid[i]));
    for (let n = 0; n < SIZE; n++) {
      if (next[idx[n]] !== res.line[n]) moved = true;
      next[idx[n]] = res.line[n];
    }
    for (const n of res.mergedAt) merged.push(idx[n]);
    gained += res.gained;
  }
  return { grid: next, moved, gained, merged };
}

/** Drop one tile on a random empty cell. Kept out of applyMove deliberately. */
export function spawnTile(grid, opts = {}) {
  const fourChance = opts.fourChance === undefined ? 0.1 : opts.fourChance;
  const rng = opts.rng || Math.random;
  const free = emptyCells(grid);
  const next = grid.slice();
  if (!free.length) return { grid: next, index: -1, value: 0 };
  const index = free[Math.floor(rng() * free.length)];
  const value = rng() < fourChance ? 4 : 2;
  next[index] = value;
  return { grid: next, index, value };
}

export function legalMoves(grid) {
  return DIRS.filter((d) => applyMove(grid, d).moved);
}

/** Are two orthogonal neighbours equal? That is the only merge a full board has. */
export function hasPair(grid) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const i = r * SIZE + c;
      if (!grid[i]) continue;
      if (c < SIZE - 1 && grid[i] === grid[i + 1]) return true;
      if (r < SIZE - 1 && grid[i] === grid[i + SIZE]) return true;
    }
  }
  return false;
}

export function isDead(grid) {
  return legalMoves(grid).length === 0;
}

export function hasReached(grid, target) {
  return grid.some((v) => v >= target);
}

// ── Diagnostics ──────────────────────────────────────────────
// Everything below is computable from the grid alone. The drills grade
// against these functions, never against an opinion about the position.

/** The corner holding the board maximum, or null when the max is loose. */
export function anchorCorner(grid) {
  const m = maxTile(grid);
  if (!m) return null;
  for (const c of CORNERS) if (grid[c] === m) return c;
  return null;
}

/** The four cells of the row that holds `corner`. */
export function anchorRowIndices(corner) {
  const r = rowOf(corner);
  return [0, 1, 2, 3].map((c) => r * SIZE + c);
}

export function anchorRowFull(grid, corner) {
  if (corner === null || corner === undefined) return false;
  return anchorRowIndices(corner).every((i) => grid[i] !== 0);
}

/**
 * The boustrophedon path from `corner`: along the corner's row, back along
 * the next one, and so on. This is the path the snake pattern sorts along.
 */
export function snakePath(corner) {
  const startRow = rowOf(corner);
  const startCol = colOf(corner);
  const rows = startRow === 0 ? [0, 1, 2, 3] : [3, 2, 1, 0];
  const path = [];
  rows.forEach((r, n) => {
    const forward = (startCol === 0) === (n % 2 === 0);
    const cols = forward ? [0, 1, 2, 3] : [3, 2, 1, 0];
    for (const c of cols) path.push(r * SIZE + c);
  });
  return path;
}

/**
 * How sorted the board is along the snake from `corner`. Reads the non-empty
 * cells in path order and counts every step where the next one is larger than
 * the one before it. Each of those is a break: a place where a merge made
 * below cannot travel up the chain. score is the share of steps with no break.
 *
 * Returns null when there is no corner to read from. A break count measured
 * from a corner the board has no claim to is a number about nothing, so this
 * refuses to invent one rather than quietly falling back to the top left.
 */
export function order(grid, corner) {
  const c = corner;
  if (c === null || c === undefined) return null;
  const vals = snakePath(c).map((i) => grid[i]).filter((v) => v !== 0);
  let breaks = 0;
  for (let i = 0; i + 1 < vals.length; i++) if (vals[i + 1] > vals[i]) breaks += 1;
  const steps = Math.max(1, vals.length - 1);
  return { corner: c, breaks, steps, score: Math.round(((steps - breaks) / steps) * 100) };
}

/**
 * True when the tile that was on the anchor corner never left it. The test is
 * against its own old value, not against the new board maximum: a move that
 * merges two copies of the maximum somewhere else raises the maximum without
 * touching the corner, and that is not the corner slipping. The corner cell
 * can only come back larger by merging in place, which keeps the anchor too.
 */
export function keepsAnchor(grid, dir) {
  const corner = anchorCorner(grid);
  if (corner === null) return false;
  const res = applyMove(grid, dir);
  if (!res.moved) return true;
  return res.grid[corner] >= grid[corner];
}

/** True when `dir` slides the anchor tile off the corner it was sitting on. */
export function dislodges(grid, dir) {
  if (anchorCorner(grid) === null) return false;
  return !keepsAnchor(grid, dir);
}

/**
 * Is the board dead after `dir`, whatever `values` puts in the last hole?
 * Pass the set this ruleset can actually spawn: with a 4 impossible, a hole
 * only a 4 could have matched is a certain loss rather than a survivable one.
 * Returns null when the move is illegal. A move never removes empty cells, so this can only be true
 * when the board had exactly one hole and the move slid without merging: then
 * the spawn fills the last cell, and a full board is dead unless two
 * neighbours are equal.
 */
export function deadAfterMove(grid, dir, values = SPAWN_VALUES) {
  const res = applyMove(grid, dir);
  if (!res.moved) return null;
  const free = emptyCells(res.grid);
  if (free.length !== 1) return false;
  return values.every((v) => {
    const g = res.grid.slice();
    g[free[0]] = v;
    return isDead(g);
  });
}

/**
 * Which of `values` leaves a board with a move in it, spawned after `dir`.
 * The whole set when the move leaves more than one hole, because then the
 * spawn cannot fill the board and a board with a hole always has a move.
 */
export function survivingSpawnValues(grid, dir, values = SPAWN_VALUES) {
  const res = applyMove(grid, dir);
  if (!res.moved) return [];
  const free = emptyCells(res.grid);
  if (free.length !== 1) return values.slice();
  return values.filter((v) => {
    const g = res.grid.slice();
    g[free[0]] = v;
    return !isDead(g);
  });
}

/** Moves that leave a board still playable whatever `values` spawns next. */
export function survivingMoves(grid, values = SPAWN_VALUES) {
  return legalMoves(grid).filter((d) => deadAfterMove(grid, d, values) === false);
}

/** Everything the live panel and the drill readouts show, in one call. */
export function readBoard(grid) {
  const corner = anchorCorner(grid);
  const legal = legalMoves(grid);
  return {
    corner,
    max: maxTile(grid),
    inCorner: corner !== null,
    rowFull: anchorRowFull(grid, corner),
    order: order(grid, corner),  // null when the max is loose
    free: emptyCells(grid).length,
    legal,
    dead: legal.length === 0,
  };
}
