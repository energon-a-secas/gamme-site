// ── Game module registry ─────────────────────────────────────
// The contract every game satisfies. The shell, the pattern cards and the
// drill runner are written once against this and know nothing about any
// particular game.
//
// A game module:
//
//   id        string, stable, used in storage keys
//   name      display name
//   tagline   one line under the game switcher
//   accent    hex, tints this game's surfaces
//   coreRule  { title, body } — the single rule its patterns reduce to
//   patterns  Pattern[]
//   views     { learn?, play, rules } — (el, ctx) => void
//   drills    { levels: Level[], make(levelId) => Drill }
//
// Pattern:
//   id       stable, keys the drill record
//   name     what players call it
//   tier     1 read it, 2 derive it, 3 count it
//   trigger  the condition that fires the pattern, one line
//   action   what it forces, one line
//   why      the derivation from coreRule, one short paragraph
//   diagram  () => HTMLElement, optional
//   tags     string[]
//
// Level:  { id, name, blurb }
// Drill:  { patternId, prompt, mount(el, commit), grade(answer), hint? }
//         grade returns { correct, detail, reveal?(el) }
//
// ctx given to views: { settings, save, rerender, accent }

const modules = new Map();

export function registerGame(mod) {
  const required = ['id', 'name', 'patterns', 'views', 'drills'];
  for (const key of required) {
    if (!mod[key]) throw new Error(`game module "${mod.id || '?'}" is missing ${key}`);
  }
  // A module used to need play + rules. The cards teardown is a study surface
  // with no playable board yet, so the real requirement is that it can render
  // something: the shell derives its tabs from what the module actually has.
  const renderable = ['learn', 'teardown', 'play', 'rules'].some((v) => mod.views[v])
    || (mod.patterns && mod.patterns.length);
  if (!renderable) {
    throw new Error(`game module "${mod.id}" has no renderable view`);
  }
  modules.set(mod.id, mod);
  return mod;
}

export function getGame(id) {
  return modules.get(id) || modules.values().next().value;
}

export function allGames() {
  return [...modules.values()];
}

export function findPattern(gameId, patternId) {
  const game = modules.get(gameId);
  return game ? game.patterns.find((p) => p.id === patternId) : null;
}

/** Every pattern across every game, for the progress table. */
export function allPatterns() {
  return allGames().flatMap((g) => g.patterns.map((p) => ({ ...p, gameId: g.id, gameName: g.name })));
}

export const TIER_LABEL = {
  1: 'Read it',
  2: 'Derive it',
  3: 'Count it',
};

export const TIER_BLURB = {
  1: 'Recognised on sight, no arithmetic.',
  2: 'One subtraction away from the rule above.',
  3: 'Needs the whole position, or the global count.',
};
