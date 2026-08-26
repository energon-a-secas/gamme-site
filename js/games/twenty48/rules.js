// ── 2048 rules view ──────────────────────────────────────────
// The switches that are live on this board, then the honest answer to
// "is the 2048 I am playing the same game as this one". Where the answer
// depends on a specific clone, this says "many clones" and stops.

import { el } from '../../utils.js';

const SPAWN_RATES = [
  { value: 0, label: 'never (0%)' },
  { value: 0.1, label: 'the original (10%)' },
  { value: 0.25, label: 'harsh (25%)' },
];

const TARGETS = [
  { value: 1024, label: '1024' },
  { value: 2048, label: '2048, the original' },
  { value: 4096, label: '4096' },
];

const DIFFERENCES = [{
  name: 'The 4 spawn',
  body: 'The original spawns a 2 nine times out of ten and a 4 the rest of the time. Many clones change that: some never '
    + 'spawn a 4 at all, some spawn them more often. It matters because a 4 cannot merge with a 2. Wherever one lands it '
    + 'needs another 4 before it can move at all, so a higher rate means more spawns arriving as weight you cannot clear quickly.',
}, {
  name: 'Where the spawn lands',
  body: 'In the original the cell is drawn uniformly from every empty cell, with no memory of the move you just played. It is '
    + 'not adversarial and it is not aimed at the corner you are protecting, whatever it feels like at eight hundred points. '
    + 'Deliberately hostile variants do exist and are usually sold as such. For an unlabelled clone you cannot tell from one '
    + 'session: you would need a long log and a count before saying anything.',
}, {
  name: 'Board size',
  body: '4x4 is the original. 5x5 and 6x6 are much easier, because every extra cell is another move before the board fills and '
    + 'more room to keep the chain sorted. 3x3 puts 2048 out of reach in practice: nine cells cannot hold the top of the chain '
    + 'and still leave you space to build the bottom of it. This board is 4x4 only. The ordering argument survives any size '
    + 'because it comes from the merge rule, but every count in the patterns is a 4x4 count.',
}, {
  name: 'Undo',
  body: 'An undo button changes the genre. A move that changes the board spawns a random tile, so undo and replay does not only '
    + 'take back your decision, it re-rolls the tile you were dealt. With unlimited undo the game stops being a one life '
    + 'optimisation and becomes a search, and most losses can simply be re-rolled away. Nothing wrong with that, but a score set '
    + 'with undo is not the same measurement as one set without, and the two get compared as though they were.',
}, {
  name: 'Winning, and continuing',
  body: 'The original declares a win at 2048 and offers to keep going. Some clones stop there, some pick another target, some say '
    + 'nothing. The target changes nothing about the board: it only decides when the game claims you are finished. Continuing is '
    + 'the harder game, because a 2048 in the corner is one more cell that can never merge with anything until you have built a second one.',
}, {
  name: 'Where 2048 came from',
  body: '2048 was put together in a weekend in March 2014 by Gabriele Cirulli, who credited it openly as a clone of 1024, which had '
    + 'itself followed Threes. Threes does not merge equal tiles: a 1 and a 2 make 3, and after that equal multiples of 3 combine. '
    + 'It also slides tiles one cell per swipe instead of all the way across. It sets a different sorting problem, and 2048 habits '
    + 'transfer to it badly.',
}];

export function rulesView(host, ctx) {
  const cfg = ctx.settings;

  const set = (key, value) => { cfg[key] = value; ctx.save(); };

  const select = (key, options) => el('select', {
    class: 'select',
    onchange: (e) => set(key, Number(e.target.value)),
  }, options.map((o) => el('option', {
    value: String(o.value),
    selected: Number(cfg[key]) === Number(o.value),
  }, o.label)));

  const check = (key) => el('input', {
    type: 'checkbox',
    checked: cfg[key] === true,
    onchange: (e) => set(key, e.target.checked),
  });

  const row = (name, note, control) => el('label', { class: 'ruleswitch twenty48-switchrow' },
    el('span', { class: 'twenty48-switch' },
      el('strong', { text: name }),
      el('small', { text: note }),
    ),
    control,
  );

  host.replaceChildren(el('div', { class: 'stack stack--loose' },
    el('section', { class: 'section' },
      el('div', { class: 'section__titles' },
        el('h2', { class: 'section__title', text: 'The switches on this board' }),
        el('p', { class: 'section__lead', text: 'These are live. Change one and the Play tab plays a different game, which is the fastest way to feel how much each rule is doing.' }),
      ),
      el('div', { class: 'stack stack--tight' },
        row('Spawn a 4', 'How often a new tile arrives as a 4 instead of a 2.', select('fourChance', SPAWN_RATES)),
        row('Win target', 'When the game says you are done. It changes nothing else.', select('winAt', TARGETS)),
        row('Undo button', 'Adds Undo to the Play tab. Read the row below before you leave it on.', check('allowUndo')),
        row('Live read panel', 'The anchor, anchor row and order numbers under the board.', check('showDiagnostics')),
      ),
    ),

    el('section', { class: 'section' },
      el('div', { class: 'section__titles' },
        el('h2', { class: 'section__title', text: 'Not the same game everywhere' }),
        el('p', { class: 'section__lead', text: 'There is no standard 2048, only the original and a large family of clones that each changed something. If a board feels harder than you remember, one of these is usually why.' }),
      ),
      el('div', { class: 'ruletable' },
        DIFFERENCES.map((d) => el('div', { class: 'rulerow' },
          el('div', { class: 'rulerow__name', text: d.name }),
          el('div', { class: 'rulerow__body', text: d.body }),
        )),
      ),
    ),

    el('section', { class: 'section' },
      el('div', { class: 'section__titles' },
        el('h2', { class: 'section__title', text: 'What the patterns assume' }),
      ),
      el('div', { class: 'callout' },
        el('p', { text: 'A 4x4 board. Equal powers of two combine, and each tile combines at most once per move. One tile spawns on a uniformly chosen empty cell after any move that changed the board, and no tile spawns after a move that changed nothing.' }),
        el('p', { text: 'Change the spawn rate or the board size and every pattern here still holds, because they all come from the merge rule rather than from the numbers. Change the merge rule, as Threes does, and you are learning a different game with a different answer.' }),
      ),
    ),
  ));
}
