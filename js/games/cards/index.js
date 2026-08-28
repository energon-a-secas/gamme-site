// ── Cards ────────────────────────────────────────────────────
// A study module, not a playable game yet. It ships the teardown (how card
// game systems compare) and the decisions view. The player-side patterns and
// their drills come next, and the shell already handles a module that has
// some views and not others.

import { registerGame } from '../../registry.js';
import { teardownView } from './teardown.js';
import { rulesView } from './rules.js';

export default registerGame({
  id: 'cards',
  name: 'Cards',
  tagline: 'What makes a card game work, and what kills it',
  accent: '#e8b979',
  viewOrder: ['teardown', 'rules'],
  patterns: [],
  defaults: {},
  views: {
    teardown: teardownView,
    rules: rulesView,
  },
  drills: { levels: [], make: () => null },
});
