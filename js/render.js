// ── Shell rendering ──────────────────────────────────────────
// Game switcher, view tabs, and the default Learn view (pattern cards).
// Everything below the tabs is drawn by the active game module.

import { state, save, settingsFor, accuracy } from './state.js';
import { getGame, allGames, TIER_LABEL, TIER_BLURB } from './registry.js';
import { mountDrills } from './drills.js';
import { el, $ } from './utils.js';

const VIEWS = [
  { id: 'learn', label: 'Learn', hint: 'The pattern cards' },
  { id: 'drill', label: 'Drill', hint: 'Positions against a clock' },
  { id: 'play', label: 'Play', hint: 'The real game' },
  { id: 'rules', label: 'Rules', hint: 'The switches that change it' },
];

let teardown = null;

export function render(s = state) {
  const game = getGame(s.game);
  s.game = game.id;
  document.documentElement.style.setProperty('--game-accent', game.accent || 'var(--accent)');

  const label = $('gameSwitchLabel');
  if (label) label.textContent = game.name;

  renderGameMenu(game);
  renderViewTabs(s);
  renderView(s, game);
}

function renderGameMenu(active) {
  const menu = $('gameMenu');
  if (!menu) return;
  menu.replaceChildren(...allGames().map((g) => el('button', {
    class: `header-menu__item${g.id === active.id ? ' is-active' : ''}`,
    type: 'button',
    role: 'menuitem',
    'data-game': g.id,
  },
    el('span', { class: 'menudot', style: `background:${g.accent}` }),
    el('span', { class: 'menutext' },
      el('strong', { text: g.name }),
      el('small', { text: g.tagline || '' }),
    ),
  )));
}

function renderViewTabs(s) {
  const tabs = $('viewTabs');
  if (!tabs) return;
  tabs.replaceChildren(...VIEWS.map((v) => el('button', {
    class: `viewtab${v.id === s.view ? ' is-active' : ''}`,
    type: 'button',
    'data-view': v.id,
    'aria-current': v.id === s.view ? 'page' : null,
    title: v.hint,
  }, v.label)));
}

function renderView(s, game) {
  const host = $('view');
  if (!host) return;
  if (typeof teardown === 'function') { try { teardown(); } catch { /* module cleanup is best effort */ } }
  teardown = null;
  host.replaceChildren();

  const ctx = {
    settings: settingsFor(game.id, game.defaults || {}),
    save: () => save(state),
    rerender: () => render(state),
    accent: game.accent,
  };

  if (s.view === 'learn') {
    teardown = (game.views.learn || defaultLearn)(host, ctx, game);
  } else if (s.view === 'drill') {
    teardown = mountDrills(host, game, ctx);
  } else if (s.view === 'play') {
    teardown = game.views.play(host, ctx);
  } else if (s.view === 'rules') {
    teardown = game.views.rules(host, ctx);
  }
}

/** Default Learn view: the core rule, then pattern cards grouped by tier. */
export function defaultLearn(host, ctx, game) {
  const tiers = [1, 2, 3];
  const sections = tiers.map((tier) => {
    const inTier = game.patterns.filter((p) => p.tier === tier);
    if (!inTier.length) return null;
    return el('section', { class: 'section' },
      el('div', { class: 'section__titles' },
        el('h2', { class: 'section__title', text: TIER_LABEL[tier] }),
        el('p', { class: 'section__lead', text: TIER_BLURB[tier] }),
      ),
      el('div', { class: 'patterngrid' }, inTier.map(patternCard)),
    );
  }).filter(Boolean);

  host.replaceChildren(el('div', { class: 'stack stack--loose' },
    game.coreRule ? coreRuleCard(game.coreRule) : null,
    ...sections,
  ));
}

function coreRuleCard(rule) {
  return el('section', { class: 'corerule' },
    el('span', { class: 'corerule__kicker', text: 'The one rule' }),
    el('h2', { class: 'corerule__title', text: rule.title }),
    el('p', { class: 'corerule__body', text: rule.body }),
    rule.formula ? el('code', { class: 'corerule__formula', text: rule.formula }) : null,
  );
}

function patternCard(p) {
  const acc = accuracy(p.id);
  const card = el('article', { class: 'pcard', 'data-pattern': p.id },
    el('header', { class: 'pcard__head' },
      el('h3', { class: 'pcard__name', text: p.name }),
      acc === null
        ? el('span', { class: 'pcard__acc is-untested', text: 'untested' })
        : el('span', { class: `pcard__acc ${acc >= 0.8 ? 'is-good' : acc >= 0.5 ? 'is-mid' : 'is-bad'}`, text: `${Math.round(acc * 100)}%` }),
    ),
    p.diagram ? el('div', { class: 'pcard__diagram' }, p.diagram()) : null,
    el('dl', { class: 'pcard__rows' },
      el('dt', { text: 'When' }), el('dd', { text: p.trigger }),
      el('dt', { text: 'Then' }), el('dd', { text: p.action }),
    ),
    p.why ? el('details', { class: 'pcard__why' },
      el('summary', { text: 'Why it works' }),
      el('p', { text: p.why }),
    ) : null,
    p.tags && p.tags.length ? el('div', { class: 'pcard__tags' },
      p.tags.map((t) => el('span', { class: 'tag', text: t }))) : null,
  );
  return card;
}
