// ── The Ruleset Lab ──────────────────────────────────────────
// Two sites, the same rules, and one of them feels unfair. This tab is
// why. Every switch here changes the Play tab, and the numbers on it are
// measured in your browser when you press the button, not typed in by me.

import { el } from '../../utils.js';
import { DIFFICULTIES } from './engine.js';
import { sampleNoGuessRate } from './generate.js';

const SWITCHES = [
  {
    key: 'firstClick',
    name: 'First click',
    type: 'choice',
    options: [
      ['anywhere', 'Can be a mine'],
      ['safe', 'Never a mine'],
      ['zero', 'Always opens a region'],
    ],
    body: 'Three different games. If the first click can be a mine, roughly one Expert game in five ends on move one through no fault of yours, because 99 mines in 480 cells is a density of about 21 percent. If it is merely safe, you often start on a bare number with nothing to work from. If it always opens a region, every game starts with real information, though where you click still shapes how big that opening is: a corner has three neighbours to clear, the middle has eight.',
  },
  {
    key: 'noGuess',
    name: 'Guaranteed solvable',
    type: 'toggle',
    body: 'When this is on, the board is dealt over and over until logic alone can finish it. Nothing else about the game changes. This single switch is the largest difference between two Minesweeper sites, and most of them do not tell you which way it is set.',
  },
  {
    key: 'noGuessDepth',
    name: 'How much logic counts as solvable',
    type: 'choice',
    options: [
      ['full', 'Including listing every layout'],
      ['local', 'Only the number rules'],
    ],
    body: 'Even among no-guess implementations there is a choice here. If only the number rules count, boards are dealt until they fall to subtraction alone, which makes them noticeably easier. If listing every consistent layout counts, you never have to guess but you may have to do real work.',
  },
  {
    key: 'chording',
    name: 'Chording',
    type: 'toggle',
    body: 'Middle click a number whose flags already match its value and every remaining neighbour opens at once. It changes nothing about what is deducible and everything about how fast a board goes. A version without it is not slower to think about, only slower to play.',
  },
  {
    key: 'flagsRequired',
    name: 'Flags required to win',
    type: 'toggle',
    body: 'Some versions end the game when the last safe cell opens. Others want every mine flagged first. The second kind rules out the flagless style that fast players use, so a technique that is optimal on one site is impossible on another.',
  },
  {
    key: 'showMineCount',
    name: 'Show mines remaining',
    type: 'toggle',
    body: 'The counter is an equation covering the whole board, and late in a game it is often the only one left that settles anything. Turning it off removes a deduction rather than merely removing a display.',
  },
];

const PRESETS = [
  { name: 'First click can kill', settings: { firstClick: 'anywhere', noGuess: false, chording: true, flagsRequired: false, showMineCount: true },
    body: 'The earliest behaviour: mines are placed before you touch anything.' },
  { name: 'Classic', settings: { firstClick: 'zero', noGuess: false, chording: true, flagsRequired: false, showMineCount: true },
    body: 'What most desktop Minesweeper feels like. A safe opening, and boards that can still force a guess.' },
  { name: 'No guessing', settings: { firstClick: 'zero', noGuess: true, noGuessDepth: 'full', chording: true, flagsRequired: false, showMineCount: true },
    body: 'Every board is solvable. Losing is always a mistake, which is either reassuring or unforgiving.' },
  { name: 'Stripped port', settings: { firstClick: 'safe', noGuess: false, chording: false, flagsRequired: true, showMineCount: true },
    body: 'The shape a quick reimplementation often takes: safe first click, no chording, flags required.' },
];

export function mountRules(host, ctx) {
  const shell = el('div', { class: 'stack stack--loose' });

  shell.append(el('section', { class: 'section' },
    el('div', { class: 'section__titles' },
      el('h2', { class: 'section__title', text: 'Why it is not the same game' }),
      el('p', { class: 'section__lead', text: 'The rules of Minesweeper fit in a sentence, and every implementation agrees on them. What they disagree about is when the mines are placed and which boards the generator is willing to deal. Those are invisible from the board, and they change the game more than the difficulty setting does.' }),
    ),
    el('div', { class: 'presetrow' }, PRESETS.map((p) => el('button', {
      class: 'preset', type: 'button',
      onclick: () => { Object.assign(ctx.settings, p.settings); ctx.save(); ctx.rerender(); },
    },
      el('strong', { text: p.name }),
      el('small', { text: p.body }),
    ))),
  ));

  shell.append(el('section', { class: 'section' },
    el('div', { class: 'section__titles' },
      el('h2', { class: 'section__title', text: 'The switches' }),
      el('p', { class: 'section__lead', text: 'Change one, then go to Play. These apply to the next board you deal.' }),
    ),
    el('div', { class: 'ruletable' }, SWITCHES.map((sw) => switchRow(sw, ctx))),
  ));

  shell.append(measureSection(ctx));
  shell.append(testYourSiteSection());

  host.replaceChildren(shell);
}

function switchRow(sw, ctx) {
  const control = sw.type === 'toggle'
    ? el('label', { class: 'ruleswitch' },
      el('input', {
        type: 'checkbox', checked: !!ctx.settings[sw.key],
        onchange: (e) => { ctx.settings[sw.key] = e.target.checked; ctx.save(); },
      }),
      el('span', { text: ctx.settings[sw.key] ? 'On' : 'Off' }),
    )
    : el('select', {
      class: 'select', 'aria-label': sw.name,
      onchange: (e) => { ctx.settings[sw.key] = e.target.value; ctx.save(); },
    }, sw.options.map(([value, label]) => el('option', {
      value, selected: ctx.settings[sw.key] === value,
    }, label)));

  if (sw.type === 'toggle') {
    control.querySelector('input').addEventListener('change', (e) => {
      control.querySelector('span').textContent = e.target.checked ? 'On' : 'Off';
    });
  }

  return el('div', { class: 'rulerow' },
    el('div', { class: 'rulerow__name' }, el('strong', { text: sw.name }), control),
    el('p', { class: 'rulerow__body', text: sw.body }),
  );
}

/** The measurement that settles the argument. Run here, in this browser, now. */
function measureSection(ctx) {
  const out = el('div', { class: 'measure' });
  const button = el('button', { class: 'btn btn--primary', type: 'button' }, 'Measure it');

  const run = async () => {
    button.disabled = true;
    const rows = [];
    for (const [key, d] of Object.entries(DIFFICULTIES)) {
      const samples = key === 'expert' ? 250 : 400;
      out.replaceChildren(el('p', { text: `Dealing ${d.label} boards and solving each one…` }));
      const r = await sampleNoGuessRate(d.w, d.h, d.mines, { firstClick: 'zero' }, samples,
        ({ done }) => out.replaceChildren(el('p', { text: `${d.label}: ${done} of ${samples} boards solved so far…` })));
      rows.push({ d, r });
      out.replaceChildren(table(rows));
    }
    out.append(el('p', { class: 'measure__note', text: 'Each board is dealt at random with a guaranteed opening, then handed to the solver, and it counts as solvable only if logic alone finishes it with no guess anywhere. The plus-or-minus is a 95 percent interval for this sample size, so treat the shape as solid and the last digit as noise. Press again for a fresh sample.' }));
    button.disabled = false;
  };
  button.addEventListener('click', run);

  /** 95 percent interval, so a small sample cannot be read as a hard number. */
  const margin = (rate, n) => 1.96 * Math.sqrt((rate * (1 - rate)) / n) * 100;

  const table = (rows) => el('table', { class: 'progtable' },
    el('thead', {}, el('tr', {},
      el('th', { text: 'Difficulty' }), el('th', { text: 'Boards dealt' }),
      el('th', { text: 'Solvable without guessing' }), el('th', { text: 'Forced a guess' }))),
    el('tbody', {}, rows.map(({ d, r }) => el('tr', {},
      el('td', { text: `${d.label} ${d.w}x${d.h}, ${d.mines}` }),
      el('td', { text: String(r.samples) }),
      el('td', { text: `${(r.rate * 100).toFixed(1)}% ± ${margin(r.rate, r.samples).toFixed(1)}` }),
      el('td', { class: r.rate < 0.25 ? 'is-bad' : '', text: `${((1 - r.rate) * 100).toFixed(1)}%` }),
    ))),
  );

  return el('section', { class: 'section' },
    el('div', { class: 'section__titles' },
      el('h2', { class: 'section__title', text: 'How often a classic board is unwinnable' }),
      el('p', { class: 'section__lead', text: 'This is the number that explains the feeling. On a site that deals boards at random, a share of your Expert games were lost before you clicked. On a no-guess site that share is zero. Press the button and watch your own browser work it out.' }),
    ),
    el('div', { class: 'toolbar' }, button),
    out,
  );
}

function testYourSiteSection() {
  const tests = [
    ['Which first-click policy?', 'Start twenty new games and immediately click the same corner. Died at least once: mines are placed before your click. Always got a large opening: the generator protects the whole neighbourhood. Often got a bare number instead: only the clicked cell is protected.'],
    ['Does it guarantee solvable boards?', 'Play Expert until you meet a position with two cells that no reasoning separates. If you never do across ten or so games, the site is filtering boards. If you meet one in the first few, it is not.'],
    ['Does it chord?', 'Flag a number fully, then middle click it. If nothing happens, try left and right mouse buttons together. No chording means your speed ceiling is much lower there, and nothing else changes.'],
    ['Does it need flags to win?', 'Clear every safe cell without placing a single flag. If the game does not end, flags are part of the win condition.'],
    ['Is the mine counter honest?', 'Flag a cell you know is wrong. A counter that goes down is counting flags, not mines, which is the usual behaviour and is worth knowing before you trust it late in a game.'],
  ];
  return el('section', { class: 'section' },
    el('div', { class: 'section__titles' },
      el('h2', { class: 'section__title', text: 'Work out what the site in your other tab is doing' }),
      el('p', { class: 'section__lead', text: 'None of this is usually documented, and all of it is testable in a couple of minutes.' }),
    ),
    el('div', { class: 'ruletable' }, tests.map(([name, body]) => el('div', { class: 'rulerow' },
      el('div', { class: 'rulerow__name' }, el('strong', { text: name })),
      el('p', { class: 'rulerow__body', text: body }),
    ))),
  );
}
