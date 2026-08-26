// ── Minesweeper engine ───────────────────────────────────────
// Board mechanics only. Mine placement lives in generate.js (it needs
// the solver for no-guess boards); deduction lives in solver.js.
//
// A board is a flat grid of w*h cells. Every rule that differs between
// implementations is a field on `ruleset`, never a hard-coded assumption
// in here — that is the whole point of the Rules tab.

export const HIDDEN = 0;
export const REVEALED = 1;
export const FLAGGED = 2;

/** The switches real implementations actually disagree about. */
export const DEFAULT_RULESET = {
  /** 'anywhere' can kill you on move one; 'safe' cannot; 'zero' also opens a region. */
  firstClick: 'zero',
  /** Regenerate until the board is solvable by logic alone. */
  noGuess: false,
  /** Middle-click a satisfied number to open its remaining neighbours. */
  chording: true,
  /** Win requires every mine flagged, not just every safe cell opened. */
  flagsRequired: false,
  /** Show mines-remaining. Hiding it removes the global counting pattern. */
  showMineCount: true,
};

export const DIFFICULTIES = {
  beginner: { w: 9, h: 9, mines: 10, label: 'Beginner' },
  intermediate: { w: 16, h: 16, mines: 40, label: 'Intermediate' },
  expert: { w: 30, h: 16, mines: 99, label: 'Expert' },
};

export function createBoard(w, h, mines, ruleset = {}) {
  const size = w * h;
  return {
    w, h,
    mines: Math.min(mines, size - 1),
    mine: new Uint8Array(size),
    num: new Int8Array(size),
    st: new Uint8Array(size),
    placed: false,
    dead: false,
    won: false,
    hitIndex: -1,
    ruleset: { ...DEFAULT_RULESET, ...ruleset },
    /** Set by the generator when a no-guess board could not be found in budget. */
    guessWarning: null,
  };
}

export function idx(b, x, y) { return y * b.w + x; }
export function xOf(b, i) { return i % b.w; }
export function yOf(b, i) { return Math.floor(i / b.w); }

/** Indices of the up-to-8 neighbours of i. */
export function neighbors(b, i) {
  const x = i % b.w, y = (i - (i % b.w)) / b.w;
  const out = [];
  for (let dy = -1; dy <= 1; dy++) {
    const ny = y + dy;
    if (ny < 0 || ny >= b.h) continue;
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      if (nx < 0 || nx >= b.w) continue;
      out.push(ny * b.w + nx);
    }
  }
  return out;
}

/** Recompute every adjacency number from the mine array. */
export function computeNumbers(b) {
  b.num.fill(0);
  for (let i = 0; i < b.mine.length; i++) {
    if (!b.mine[i]) continue;
    for (const n of neighbors(b, i)) b.num[n] += 1;
  }
}

export function flagCount(b) {
  let n = 0;
  for (let i = 0; i < b.st.length; i++) if (b.st[i] === FLAGGED) n++;
  return n;
}

export function minesRemaining(b) {
  return b.mines - flagCount(b);
}

export function hiddenCount(b) {
  let n = 0;
  for (let i = 0; i < b.st.length; i++) if (b.st[i] !== REVEALED) n++;
  return n;
}

/**
 * Reveal i, flood-filling through zeros. Returns the indices opened.
 * Does not place mines and does not check the win condition — callers
 * that handle user input should use `playMove` instead.
 */
export function reveal(b, i) {
  if (b.st[i] !== HIDDEN) return [];
  const opened = [];
  const stack = [i];
  while (stack.length) {
    const cur = stack.pop();
    if (b.st[cur] !== HIDDEN) continue;
    b.st[cur] = REVEALED;
    opened.push(cur);
    if (b.mine[cur]) continue;
    if (b.num[cur] === 0) {
      for (const n of neighbors(b, cur)) {
        if (b.st[n] === HIDDEN) stack.push(n);
      }
    }
  }
  return opened;
}

export function toggleFlag(b, i) {
  if (b.st[i] === REVEALED || b.dead || b.won) return false;
  b.st[i] = b.st[i] === FLAGGED ? HIDDEN : FLAGGED;
  return true;
}

/**
 * Chord: on a revealed number whose flags already equal its value, open
 * every remaining hidden neighbour. This is the switch that changes how
 * the game *feels* more than any other, and not every implementation has it.
 */
export function chord(b, i) {
  if (!b.ruleset.chording) return { opened: [], blocked: 'chording is off in this ruleset' };
  if (b.st[i] !== REVEALED || b.num[i] <= 0) return { opened: [], blocked: null };
  const ns = neighbors(b, i);
  const flags = ns.filter((n) => b.st[n] === FLAGGED).length;
  if (flags !== b.num[i]) return { opened: [], blocked: null };
  const opened = [];
  for (const n of ns) {
    if (b.st[n] === HIDDEN) opened.push(...reveal(b, n));
  }
  return { opened, blocked: null };
}

/** True when the board satisfies its ruleset's win condition. */
export function checkWin(b) {
  for (let i = 0; i < b.st.length; i++) {
    if (!b.mine[i] && b.st[i] !== REVEALED) return false;
    if (b.ruleset.flagsRequired && b.mine[i] && b.st[i] !== FLAGGED) return false;
  }
  return true;
}

/** Reveal every mine, marking wrong flags. Called on loss. */
export function revealAll(b) {
  for (let i = 0; i < b.st.length; i++) {
    if (b.mine[i] && b.st[i] !== FLAGGED) b.st[i] = REVEALED;
  }
}

/**
 * Apply one player action. `kind` is 'open' | 'flag' | 'chord'.
 * Mine placement is the caller's job (generate.js) because a no-guess
 * board is generated asynchronously; pass `onFirstClick` to supply it.
 */
export function playMove(b, i, kind) {
  if (b.dead || b.won) return { changed: false };
  if (kind === 'flag') {
    const changed = toggleFlag(b, i);
    // Under flagsRequired the last action of a won game is a flag, not an open,
    // so checking the win condition only after opening left the game unwinnable.
    if (changed && checkWin(b)) b.won = true;
    return { changed };
  }

  if (kind === 'chord') {
    const { opened, blocked } = chord(b, i);
    if (blocked) return { changed: false, message: blocked };
    finishTurn(b, opened);
    return { changed: opened.length > 0, opened };
  }

  if (b.st[i] !== HIDDEN) return { changed: false };
  const opened = reveal(b, i);
  finishTurn(b, opened);
  return { changed: true, opened };
}

function finishTurn(b, opened) {
  for (const o of opened) {
    if (b.mine[o]) {
      b.dead = true;
      b.hitIndex = o;
      revealAll(b);
      return;
    }
  }
  if (checkWin(b)) b.won = true;
}
