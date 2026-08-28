// ── Cards ────────────────────────────────────────────────────
// Two halves that answer to each other. The teardown is designer-side: what
// makes a card game work. The patterns, drills and play are player-side: how
// to play one well. The resource switch in Rules is the hinge, because
// changing it changes the correct line on the same board.

import { registerGame } from '../../registry.js';
import { teardownView } from './teardown.js';
import { rulesView } from './rules.js';
import { playView } from './play.js';
import { coreRule, patterns } from './patterns.js';
import { levels, make } from './drills.js';

export default registerGame({
  id: 'cards',
  name: 'Cards',
  tagline: 'Cards against tempo, and what makes a card game work',
  accent: '#e8b979',
  viewOrder: ['learn', 'teardown', 'drill', 'play', 'rules'],
  coreRule,
  patterns,
  defaults: {
    resourceModel: 'auto',
    startLife: 20,
    drillLevel: 1,
  },
  views: {
    teardown: teardownView,
    play: playView,
    rules: rulesView,
  },
  drills: { levels, make },
});
