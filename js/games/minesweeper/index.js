// ── Minesweeper module ───────────────────────────────────────
// Glue only. The engine, solver, probability model, generator, patterns
// and drills are each their own file, because each of them is testable
// on its own and two of them are the reason this site exists.

import { registerGame } from '../../registry.js';
import { CORE_RULE, PATTERNS } from './patterns.js';
import { LEVELS, makeDrill } from './drill-levels.js';
import { mountPlay } from './play.js';
import { mountRules } from './rules.js';

export default registerGame({
  id: 'minesweeper',
  name: 'Minesweeper',
  accent: '#a855f7',
  tagline: 'One equation, thirteen faces, and four rulesets pretending to be one game',
  coreRule: CORE_RULE,
  patterns: PATTERNS,
  defaults: {
    difficulty: 'beginner',
    firstClick: 'zero',
    noGuess: false,
    noGuessDepth: 'full',
    chording: true,
    flagsRequired: false,
    showMineCount: true,
    drillLevel: 1,
  },
  views: {
    play: mountPlay,
    rules: mountRules,
  },
  drills: {
    levels: LEVELS,
    make: makeDrill,
  },
});
