// ── State ────────────────────────────────────────────────────
// One mutable object every module imports. Only the small, durable
// slice is persisted: which game and view you were on, per-game
// settings, and the drill record. Live boards are never saved.

// Keeps the pre-rename key: the site was live as Gambit, and renaming this
// would silently discard every existing visitor's saved progress.
const STORAGE_KEY = 'gambit-state-v1';

export const state = {
  game: 'minesweeper',
  view: 'learn',
  /** Per-game settings, owned by each game module. */
  settings: {},
  /** patternId -> { seen, correct, attempts, bestMs } */
  record: {},
  /** Live objects, never persisted. */
  live: {},
};

const PERSISTED = ['game', 'view', 'settings', 'record'];

export function loadSaved(s) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    for (const key of PERSISTED) {
      if (saved[key] !== undefined) s[key] = saved[key];
    }
  } catch { /* corrupted or unavailable, start fresh */ }
}

export function save(s) {
  try {
    const slice = {};
    for (const key of PERSISTED) slice[key] = s[key];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slice));
  } catch { /* quota exceeded or private browsing */ }
}

/**
 * Settings for one game, merged over its defaults. Mutating the returned
 * object and calling save() persists it.
 */
export function settingsFor(gameId, defaults) {
  if (!state.settings[gameId]) state.settings[gameId] = {};
  const s = state.settings[gameId];
  for (const [k, v] of Object.entries(defaults)) {
    if (s[k] === undefined) s[k] = v;
  }
  return s;
}

/** Record one drill answer against the pattern it tested. */
export function recordAnswer(patternId, correct, ms) {
  const r = state.record[patternId] || (state.record[patternId] = {
    attempts: 0, correct: 0, bestMs: null,
  });
  r.attempts += 1;
  if (correct) {
    r.correct += 1;
    if (ms != null && (r.bestMs === null || ms < r.bestMs)) r.bestMs = ms;
  }
  save(state);
  return r;
}

/** Accuracy 0..1 for one pattern, or null when never attempted. */
export function accuracy(patternId) {
  const r = state.record[patternId];
  if (!r || !r.attempts) return null;
  return r.correct / r.attempts;
}

export function clearRecord() {
  state.record = {};
  save(state);
}
