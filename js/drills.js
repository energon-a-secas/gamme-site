// ── Drill runner ─────────────────────────────────────────────
// Game-agnostic. It owns the level picker, the clock, the streak and the
// scoring; the game module owns the position and the grading. The point of
// the split is that a drill for chess and a drill for Minesweeper are the
// same object with different insides.

import { el, fmtMs } from './utils.js';
import { recordAnswer, accuracy } from './state.js';
import { TIER_LABEL } from './registry.js';

const RUN_LENGTH = 8;

export function mountDrills(container, game, ctx) {
  const session = {
    level: ctx.settings.drillLevel || game.drills.levels[0].id,
    running: false,
    index: 0,
    right: 0,
    times: [],
    startedAt: 0,
    current: null,
    answered: false,
  };

  container.replaceChildren(renderPicker());

  function renderPicker() {
    const levels = el('div', { class: 'levelgrid' },
      game.drills.levels.map((lv) => el('button', {
        class: `levelcard${lv.id === session.level ? ' is-active' : ''}`,
        type: 'button',
        'aria-pressed': lv.id === session.level ? 'true' : 'false',
        onclick: () => { session.level = lv.id; ctx.settings.drillLevel = lv.id; ctx.save(); container.replaceChildren(renderPicker()); },
      },
        el('span', { class: 'levelcard__n', text: `L${lv.id}` }),
        el('span', { class: 'levelcard__name', text: lv.name }),
        el('span', { class: 'levelcard__blurb', text: lv.blurb }),
      )),
    );

    return el('div', { class: 'stack' },
      el('section', { class: 'section' },
        el('div', { class: 'section__titles' },
          el('h2', { class: 'section__title', text: 'Drill' }),
          el('p', { class: 'section__lead', text: `${RUN_LENGTH} positions, scored on accuracy first and time second. Getting one wrong shows you the rule that decided it, not just the answer.` }),
        ),
        levels,
        el('div', { class: 'toolbar' },
          el('button', { class: 'btn btn--primary', type: 'button', onclick: start }, 'Start run'),
          el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => startEndless() }, 'Endless'),
        ),
      ),
      renderScoreboard(game),
    );
  }

  function start(endless = false) {
    session.running = true;
    session.endless = endless === true;
    session.index = 0;
    session.right = 0;
    session.times = [];
    nextPosition();
  }
  function startEndless() { start(true); }

  function nextPosition() {
    if (!session.endless && session.index >= RUN_LENGTH) return finish();
    let drill = null;
    for (let tries = 0; tries < 30 && !drill; tries++) {
      try { drill = game.drills.make(session.level); } catch { drill = null; }
    }
    if (!drill) {
      container.replaceChildren(el('div', { class: 'card' },
        el('p', { text: 'This level could not build a position. Try another level.' })));
      return;
    }
    session.current = drill;
    session.answered = false;
    session.startedAt = performance.now();
    paint();
  }

  function paint() {
    const drill = session.current;
    const total = session.endless ? session.index + 1 : RUN_LENGTH;
    const bar = el('div', { class: 'drillbar' },
      el('span', { class: 'drillbar__pos', text: `${session.index + 1} / ${session.endless ? '∞' : total}` }),
      el('span', { class: 'drillbar__score', text: `${session.right} right` }),
      el('span', { class: 'drillbar__clock', id: 'drillClock', text: '0.0s' }),
      el('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: finish }, 'End run'),
    );

    const stage = el('div', { class: 'drillstage' });
    const feedback = el('div', { class: 'feedback', hidden: true });

    const wrap = el('div', { class: 'stack' },
      bar,
      el('p', { class: 'drillprompt', text: drill.prompt }),
      stage,
      feedback,
    );
    container.replaceChildren(wrap);
    drill.mount(stage, (answer) => commit(answer, stage, feedback));
    tick();
  }

  let clockTimer = null;
  function tick() {
    clearInterval(clockTimer);
    clockTimer = setInterval(() => {
      const node = document.getElementById('drillClock');
      if (!node || session.answered) { clearInterval(clockTimer); return; }
      node.textContent = `${((performance.now() - session.startedAt) / 1000).toFixed(1)}s`;
    }, 100);
  }

  function commit(answer, stage, feedback) {
    if (session.answered) return;
    session.answered = true;
    clearInterval(clockTimer);
    const ms = performance.now() - session.startedAt;
    const drill = session.current;
    const result = drill.grade(answer);
    if (result.correct) { session.right += 1; session.times.push(ms); }
    recordAnswer(drill.patternId, result.correct, ms);

    if (result.reveal) result.reveal(stage);

    feedback.hidden = false;
    feedback.className = `feedback ${result.correct ? 'is-right' : 'is-wrong'}`;
    feedback.replaceChildren(
      el('div', { class: 'feedback__head' },
        el('strong', { text: result.correct ? 'Right' : 'Wrong' }),
        el('span', { class: 'feedback__time', text: fmtMs(ms) }),
      ),
      el('p', { class: 'feedback__detail', text: result.detail }),
      el('div', { class: 'toolbar' },
        el('button', { class: 'btn btn--primary', type: 'button', id: 'drillNext', onclick: () => { session.index += 1; nextPosition(); } }, 'Next'),
      ),
    );
    document.getElementById('drillNext')?.focus();
  }

  function finish() {
    clearInterval(clockTimer);
    session.running = false;
    const done = session.index + (session.answered ? 1 : 0);
    const pct = done ? Math.round((session.right / done) * 100) : 0;
    const avg = session.times.length
      ? session.times.reduce((a, b) => a + b, 0) / session.times.length : null;
    container.replaceChildren(el('div', { class: 'stack' },
      el('section', { class: 'section' },
        el('div', { class: 'section__titles' },
          el('h2', { class: 'section__title', text: 'Run over' }),
          el('p', { class: 'section__lead', text: `${session.right} of ${done} right (${pct}%). Average time on the ones you got: ${fmtMs(avg)}.` }),
        ),
        el('div', { class: 'toolbar' },
          el('button', { class: 'btn btn--primary', type: 'button', onclick: () => start(false) }, 'Run again'),
          el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => container.replaceChildren(renderPicker()) }, 'Pick a level'),
        ),
      ),
      renderScoreboard(game),
    ));
  }

  return () => clearInterval(clockTimer);
}

/** Per-pattern accuracy for one game. Weak patterns first: that is the useful order. */
export function renderScoreboard(game) {
  const rows = game.patterns
    .map((p) => ({ p, acc: accuracy(p.id) }))
    .sort((a, b) => {
      if (a.acc === null && b.acc === null) return a.p.tier - b.p.tier;
      if (a.acc === null) return 1;
      if (b.acc === null) return -1;
      return a.acc - b.acc;
    });

  return el('section', { class: 'section' },
    el('div', { class: 'section__titles' },
      el('h2', { class: 'section__title', text: 'Where you stand' }),
      el('p', { class: 'section__lead', text: 'Weakest pattern first. An empty bar means you have not been tested on it yet.' }),
    ),
    el('div', { class: 'scoretable' },
      rows.map(({ p, acc }) => el('div', { class: 'scorerow' },
        el('span', { class: 'scorerow__tier', text: TIER_LABEL[p.tier] || '' }),
        el('span', { class: 'scorerow__name', text: p.name }),
        el('span', { class: 'meter', 'aria-hidden': 'true' },
          el('span', { class: `meter__fill${acc === null ? ' is-empty' : acc >= 0.8 ? ' is-good' : acc >= 0.5 ? ' is-mid' : ' is-bad'}`,
            style: `width:${acc === null ? 0 : Math.round(acc * 100)}%` }),
        ),
        el('span', { class: 'scorerow__pct', text: acc === null ? 'untested' : `${Math.round(acc * 100)}%` }),
      )),
    ),
  );
}
