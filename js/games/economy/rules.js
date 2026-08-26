// ── Rules view ───────────────────────────────────────────────
// The rules of Tollworks, the measured landing table drawn as bars, the
// 2d6 check, and a lab that runs bot against bot under each house rule so
// the claims about them are measured rather than repeated.

import { el } from '../../utils.js';
import {
  BOARD, SETS, SITES, DEFAULT_RULES, RENT_MULT, SIGNAL_CARDS,
  simulate, landingTable, diceReport, shareError, exactDice, thousands,
  rentAt, worksCost,
} from './game.js';
import { lab } from './bot.js';
import { setLegend } from './board.js';

export function rulesView(host, ctx) {
  let sim = landingTable();
  const s = ctx.settings;

  function paint() {
    host.replaceChildren(el('div', { class: 'stack stack--loose' },
      howItWorks(),
      switches(),
      distributionPanel(),
      housePanel(),
    ));
  }

  // ── the rules themselves ─────────────────────────────────────
  function howItWorks() {
    const rows = [
      ['The loop', '20 spaces. You start on the Depot and move clockwise on 2d6. Passing or landing on the Depot pays you 40.'],
      ['The sites', '12 buyable sites in 4 sets of 3. Land on an unowned site and you may buy it at its printed cost or pass.'],
      ['Rent', 'Stop on a site somebody else owns and you pay its rent. Owning every site of a set doubles the rent on all three, before any works go up.'],
      ['Works', `Once you own a full set you may build up to 3 works on any site in it. Rent multiplies ${RENT_MULT.join(', then ')} times the printed rent.`],
      ['The Yard', 'Space 5. Landing on it normally does nothing. The Dispatch space, a Summons card, and three doubles in a row all send you there held. You leave by rolling doubles, or by paying 50 after three failed tries.'],
      ['Signal Box', `Spaces 3 and 13 draw from an eight card deck: ${SIGNAL_CARDS.map((c) => c.text).join(' ')}`],
      ['Levies', 'The Levy takes 75 and the Weighbridge takes 40. Both go to the bank unless the pot rule below is on.'],
      ['The opening deal', 'Each side is dealt two sites of one set, from two sets that are neighbours on price, and the cheaper pair is topped up in cash so both sides start level. Without it neither side ever finishes a set inside a short game.'],
      ['Bankruptcy', 'Owe more than you hold and works sell back at half, then sites sell back at half. Still short and you are out, which ends the match.'],
      ['The clock', `If nobody goes under, the match stops at turn ${DEFAULT_RULES.turnCap} and the higher net worth wins. Net worth is cash plus everything you own at its cost.`],
    ];
    return el('section', { class: 'section' },
      el('div', { class: 'section__titles' },
        el('h2', { class: 'section__title', text: 'Tollworks in ten lines' }),
        el('p', { class: 'section__lead', text: 'A dice and property game in the same family as the famous one, built small enough to finish in a couple of minutes. No name, space, card or character is taken from it.' })),
      setLegend(),
      el('div', { class: 'ruletable' }, rows.map(([k, v]) => el('div', { class: 'rulerow' },
        el('div', { class: 'rulerow__name', text: k }),
        el('div', { class: 'rulerow__body', text: v })))),
      priceTable(),
    );
  }

  function priceTable() {
    const rows = SITES.map((site) => {
      const ev = sim.perTurn[site.i] * rentAt(site, 1);
      return el('div', { class: 'rulerow' },
        el('div', { class: 'rulerow__name' },
          el('i', { class: 'economy-swatch', style: `background:${SETS[site.set].color}` }),
          el('span', { text: site.name })),
        el('div', { class: 'rulerow__body', text: `cost ${site.cost}, rent ${site.rent}, with the set ${rentAt(site, 1)}, with 3 works ${rentAt(site, 4)}. Works cost ${worksCost(site)} each. Landing share ${(sim.share[site.i] * 100).toFixed(2)}%, so the set rent alone returns ${ev.toFixed(2)} a turn and pays the ${site.cost} back in ${Math.round(site.cost / ev)} turns.` }));
    });
    return el('div', { class: 'ruletable' }, rows);
  }

  // ── the switches ─────────────────────────────────────────────
  function toggle(key, label, body, on = true) {
    const val = s[key] === undefined ? on : !!s[key];
    return el('label', { class: 'ruleswitch' },
      el('input', {
        type: 'checkbox', checked: val,
        onchange: (e) => { s[key] = e.target.checked; ctx.save(); paint(); },
      }),
      el('span', {},
        el('strong', { text: label }),
        el('span', { class: 'section__lead', text: body })));
  }

  function switches() {
    return el('section', { class: 'section' },
      el('div', { class: 'section__titles' },
        el('h2', { class: 'section__title', text: 'The switches' }),
        el('p', { class: 'section__lead', text: 'These take effect on the next match you start in the Play tab. The three below the line are house rules: common at kitchen tables, not part of the game as written.' })),
      toggle('doublesChain', 'Doubles roll again', 'Rolling a double gives you another roll, and three in a row sends you to the Yard. Turning it off flattens the landing table slightly and removes one route into the Yard.'),
      toggle('auctionOnPass', 'A pass offers the site to the other player', 'The game as written never leaves a site unsold. Turning this off is the single most common house rule in the category.'),
      toggle('rentInPen', 'Owners collect rent while held in the Yard', 'On is the rule as written.'),
      toggle('potOnLayby', 'Levies go into a pot, paid out on the Lay-by', 'Off is the rule as written. This is the money-on-the-free-space rule.', false),
    );
  }

  // ── the measured landing table ───────────────────────────────
  function distributionPanel() {
    const err = shareError(sim) * 100;
    const max = Math.max(...sim.share);
    const bars = BOARD.map((sp) => {
      const pct = sim.share[sp.i] * 100;
      return el('div', { class: `economy-bar${sp.kind === 'site' ? ' is-site' : ''}` },
        el('span', { class: 'economy-bar__label', text: `${sp.i} ${sp.short}` }),
        el('span', { class: 'economy-bar__track' },
          el('span', {
            class: 'economy-bar__fill',
            style: `width:${(sim.share[sp.i] / max) * 100}%;background:${sp.set ? SETS[sp.set].color : 'var(--game-accent, #f59e0b)'}`,
          })),
        el('span', { class: 'economy-bar__val', text: `${pct.toFixed(2)}%` }));
    });

    const dice = diceReport(sim).map((r) => el('div', { class: 'economy-bar' },
      el('span', { class: 'economy-bar__label', text: `sum ${r.sum}` }),
      el('span', { class: 'economy-bar__track' },
        el('span', { class: 'economy-bar__fill', style: `width:${(r.observed / exactDice(7)) * 100}%` })),
      el('span', { class: 'economy-bar__val', text: `${(r.observed * 100).toFixed(2)}% against ${(r.exact * 100).toFixed(2)}%` })));

    return el('section', { class: 'section' },
      el('div', { class: 'section__titles' },
        el('h2', { class: 'section__title', text: 'Where the token actually stops' }),
        el('p', { class: 'section__lead', text: `Rolled here, in your browser, right now: ${thousands(sim.turns)} turns of real dice on this board, with the Dispatch space, the Yard hold, the three doubles rule and the three cards that move you. Nothing on this chart is typed in by hand. Two bars closer than ${(err * 2).toFixed(2)} points apart are a tie.` })),
      el('div', { class: 'toolbar' },
        el('button', { class: 'btn btn--secondary btn--sm', type: 'button', onclick: () => { sim = simulate(sim.turns * 2); paint(); } }, 'Roll twice as many'),
        el('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => { sim = simulate(500000); paint(); } }, 'Reset to 500k')),
      el('div', { class: 'economy-bars' }, bars),
      el('div', { class: 'callout' },
        el('p', { text: `The Yard takes ${(sim.share[5] * 100).toFixed(1)}% of all landings, more than double any buyable site, because four things send you there and only dice take you out. Copper Mile is the busiest site at ${(sim.share[12] * 100).toFixed(2)}%: it sits seven past the Yard, and the Inspection card names it. Seven is not the peak of the exit curve though: you leave the Yard on doubles, which are even, so six and eight are more likely and seven comes third. The card is what actually puts Copper Mile on top.` }),
        el('p', { text: `Site landings run from ${(Math.min(...SITES.map((x) => sim.share[x.i])) * 100).toFixed(2)}% to ${(Math.max(...SITES.map((x) => sim.share[x.i])) * 100).toFixed(2)}%, against ${(100 / BOARD.length).toFixed(2)}% for a flat board. The spread is real but narrow, and the reason is the loop length: one roll of 2d6 covers eleven of twenty spaces, so the curve smears over half the board. On a forty space loop the same rule bites twice as hard.` })),
      el('div', { class: 'section__titles' },
        el('h3', { class: 'section__title', text: 'The dice themselves' }),
        el('p', { class: 'section__lead', text: `Observed against the exact triangular figures, over ${thousands(sim.rolls)} rolls. If the left number drifts from the right one, everything above is wrong.` })),
      el('div', { class: 'economy-bars' }, dice),
    );
  }

  // ── the house rule lab ───────────────────────────────────────
  function housePanel() {
    const out = el('div', { class: 'stack stack--tight' },
      el('p', { class: 'section__lead', text: 'Press the button. It plays six hundred matches, bot against bot, with the turn cap lifted so length is free to move. Median rather than mean: match length here has a long tail, and one runaway match drags an average anywhere.' }));

    const run = () => {
      out.replaceChildren(el('p', { class: 'section__lead', text: 'Rolling...' }));
      setTimeout(() => {
        const base = { ...DEFAULT_RULES, turnCap: 0 };
        const plain = lab(base, sim, 600);
        const rows = [
          ['Plain rules', plain],
          ['No auction on a pass', lab({ ...base, auctionOnPass: false }, sim, 600)],
          ['No rent while held', lab({ ...base, rentInPen: false }, sim, 600)],
          ['Levies pool into a pot', lab({ ...base, potOnLayby: true }, sim, 600)],
        ].map(([name, r], k) => {
          const delta = k === 0 ? '' : ` That is ${Math.abs(Math.round((r.medianTurns / plain.medianTurns - 1) * 100))}% ${r.medianTurns > plain.medianTurns ? 'longer' : 'shorter'} than the plain game.`;
          return el('div', { class: 'rulerow' },
            el('div', { class: 'rulerow__name', text: name }),
            el('div', { class: 'rulerow__body', text: `Median ${r.medianTurns} turns, nine matches in ten inside ${r.p90Turns}. ${(r.bustRate * 100).toFixed(0)}% end in bankruptcy and the winner finishes on about ${Math.round(r.avgGap)}.${delta}${
              (r.stalemateRate + r.truncatedRate) > 0
                ? ` ${((r.stalemateRate + r.truncatedRate) * 100).toFixed(1)}% never finished at all: once every colour set is split between the two players nothing can be completed, so the game is decided but has no ending. Those are excluded from the bankruptcy figure rather than counted as survivals.`
                : ''}` }));
        });
        out.replaceChildren(el('div', { class: 'ruletable' }, rows),
          el('p', { class: 'section__lead', text: `For comparison, the Play tab stops at turn ${DEFAULT_RULES.turnCap}, which is under the plain median of ${plain.medianTurns}, so more than half the matches you play there are decided on net worth rather than by somebody going under. That is a deliberate choice about your time, not a rule of the game.` }));
      }, 20);
    };

    return el('section', { class: 'section' },
      el('div', { class: 'section__titles' },
        el('h2', { class: 'section__title', text: 'What the house rules do' }),
        el('p', { class: 'section__lead', text: 'These are variants. None of them is the game as written, and each one is played somewhere as though it were.' })),
      el('div', { class: 'ruletable' },
        row('Money on the free space', 'Every levy pools and the pot goes to whoever lands on the Lay-by. It adds one large random payment to a game that already has plenty, so the swing between the two players grows and skill counts for less. It does not lengthen the game much, because the money comes back into play rather than leaving it.'),
        row('No auctions', 'A site nobody buys stays unowned all game. Fewer sites in play means fewer sets, fewer works, less rent, and a longer game that is decided by the opening deal rather than by decisions. It is the rule most likely to make people call the game boring, and the rule most often adopted for exactly that reason.'),
        row('No rent while the owner is held', 'The Yard takes the biggest share of landings, so an owner sits there often. Switching their rent off cuts total rent noticeably and lengthens the game. It also makes the Yard a safe place to sit, which is the opposite of what it is for.'),
        row('Longer loop, same dice', 'Not a house rule, a scale effect worth knowing: 2d6 spans eleven spaces, so on this twenty space loop the landing curve is nearly flat. Double the loop and the same dice produce twice the spread, which is why frequency matters more on a full size board than it does here.')),
      el('div', { class: 'toolbar' },
        el('button', { class: 'btn btn--primary', type: 'button', onclick: run }, 'Measure them')),
      out,
    );
  }

  function row(k, v) {
    return el('div', { class: 'rulerow' },
      el('div', { class: 'rulerow__name', text: k }),
      el('div', { class: 'rulerow__body', text: v }));
  }

  paint();
}
