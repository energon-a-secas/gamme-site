// ── 2048 ─────────────────────────────────────────────────────
// Module entry point. The engine is game.js, the patterns are patterns.js,
// the drill positions come from generate.js and are graded in drills.js.
// Learn is the shell's default pattern card view, which is what we want.

import { registerGame } from '../../registry.js';
import { coreRule, patterns } from './patterns.js';
import { playView } from './view.js';
import { rulesView } from './rules.js';
import { levels, make } from './drills.js';

export default registerGame({
  id: 'twenty48',
  name: '2048',
  tagline: 'One corner, one order, three directions',
  accent: '#22d3ee',
  coreRule,
  patterns,
  defaults: {
    /** Chance a spawn is a 4 rather than a 2. The original is 0.1. */
    fourChance: 0.1,
    winAt: 2048,
    allowUndo: false,
    showDiagnostics: true,
    best: 0,
    drillLevel: 1,
  },
  views: {
    play: playView,
    rules: rulesView,
  },
  drills: { levels, make },
});
