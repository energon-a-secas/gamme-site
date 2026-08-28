// ── Entry point ──────────────────────────────────────────────
// Register the games, restore state, draw, wire. Nothing else.

import { state, loadSaved } from './state.js';
import { render } from './render.js';
import { bindEvents } from './events.js';

import './games/minesweeper/index.js';
import './games/chess/index.js';
import './games/economy/index.js';
import './games/twenty48/index.js';
import './games/cards/index.js';

function init() {
  loadSaved(state);
  render(state);
  bindEvents(state);
}

init();
