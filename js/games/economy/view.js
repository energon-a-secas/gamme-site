// ── Play view: one match against Tollbot ─────────────────────
// Every number on this screen comes out of the measured landing table, and
// the bot's rules are printed next to the board. After each of your
// decisions the EV readout shows the arithmetic that decision was worth,
// which is the only way the maths sticks.

import { el } from '../../utils.js';
import { BOARD, SETS, DEFAULT_RULES, landingTable, worksCost, rentAt, levelOf, setSites } from './game.js';
import {
  createMatch, dealOpening, doRoll, choose, build, endTurn, takeOffer,
  canBuild, ownedBy, netWorth,
} from './match.js';
import { botBuy, botBuild, explainBuy, explainBuild, policyLines, worstNextRent, setProgress } from './bot.js';
import { boardEl } from './board.js';

const STEP_MS = 620;

export function playView(host, ctx) {
  const sim = landingTable();
  let m = null;
  let readout = null;
  let timer = null;
  const settings = ctx.settings;

  function rules() {
    return {
      ...DEFAULT_RULES,
      potOnLayby: !!settings.potOnLayby,
      rentInPen: settings.rentInPen !== false,
      auctionOnPass: settings.auctionOnPass !== false,
      doublesChain: settings.doublesChain !== false,
      turnCap: settings.turnCap ?? DEFAULT_RULES.turnCap,
    };
  }

  function newMatch() {
    clearTimeout(timer);
    m = dealOpening(createMatch(rules()));
    readout = null;
    paint();
  }

  function schedule(fn, ms = STEP_MS) { clearTimeout(timer); timer = setTimeout(fn, ms); }

  // ── bot turn ───────────────────────────────────────────────
  function botStep() {
    if (m.over || m.active !== 1) { paint(); return; }
    if (m.phase === 'roll') { doRoll(m); paint(); return schedule(botStep); }
    if (m.phase === 'buy') {
      const space = m.pending.space;
      const call = botBuy(m, sim, 1);
      m.log.unshift({ text: `${call.rule ? `Rule ${call.rule}: ` : ''}${call.why}.`, kind: 'bot', turn: m.turn, who: 1 });
      choose(m, call.buy ? 'buy' : 'pass');
      if (!call.buy && m.rules.auctionOnPass && m.owner[space] < 0) offerToYou(space);
      paint();
      return schedule(botStep);
    }
    if (m.phase === 'build') {
      const call = botBuild(m, sim, 1);
      if (call && call.space >= 0) {
        m.log.unshift({ text: `Rule 4: ${call.why}.`, kind: 'bot', turn: m.turn, who: 1 });
        build(m, call.space); paint(); return schedule(botStep);
      }
      if (call) m.log.unshift({ text: `Rule 4 held: ${call.why}.`, kind: 'bot', turn: m.turn, who: 1 });
      endTurn(m); paint();
      if (!m.over && m.active === 1) return schedule(botStep);
      return;
    }
  }

  /** The bot passed and the auction rule is on, so the site comes to you. */
  function offerToYou(space) {
    m.pending = { kind: 'offer', space };
    m.phase = 'offer';
  }

  function finishHumanTurn() {
    endTurn(m);
    paint();
    if (!m.over && m.active === 1) schedule(botStep);
  }

  // ── painting ───────────────────────────────────────────────
  function paint() {
    host.replaceChildren(el('div', { class: 'stack' },
      statbar(),
      boardEl({
        owner: m.owner, works: m.works,
        tokens: [m.players[0].pos, m.players[1].pos],
        mark: needSet(),
        centre: centrePanel(),
      }),
      decisionCard(),
      readout ? readoutCard() : null,
      policyCard(),
      logCard(),
    ));
  }

  /** Spaces that finish somebody's set. The whole game turns on these. */
  function needSet() {
    const out = new Set();
    for (const pid of [0, 1]) {
      for (const id of Object.keys(SETS)) {
        const p = setProgress(m, pid, id);
        if (!p.completes) continue;
        const gap = setSites(id).find((s) => m.owner[s.i] < 0);
        if (gap) out.add(gap.i);
      }
    }
    return out;
  }

  function statbar() {
    const [you, bot] = m.players;
    const cells = [
      ['Turn', `${Math.min(m.turn, m.rules.turnCap)} of ${m.rules.turnCap}`],
      ['Your cash', String(you.cash)],
      ['Tollbot cash', String(bot.cash)],
      ['Your worth', String(netWorth(m, you))],
      ['Bot worth', String(netWorth(m, bot))],
    ];
    if (m.rules.potOnLayby) cells.push(['Pot', String(m.pot)]);
    return el('div', { class: 'statbar' }, cells.map(([k, v]) => el('div', { class: 'stat' },
      el('span', { class: 'stat__label', text: k }),
      el('span', { class: 'stat__value', text: v }))));
  }

  function centrePanel() {
    const d = m.dice;
    const worst = worstNextRent(m, 0);
    const need = [];
    for (const id of Object.keys(SETS)) {
      if (setProgress(m, 0, id).completes) {
        const gap = setSites(id).find((s) => m.owner[s.i] < 0);
        if (gap) need.push(`${gap.name} finishes your ${SETS[id].name}`);
      }
      if (setProgress(m, 1, id).completes) {
        const gap = setSites(id).find((s) => m.owner[s.i] < 0);
        if (gap) need.push(`${gap.name} finishes Tollbot's ${SETS[id].name}`);
      }
    }
    return el('div', {},
      el('div', { class: 'economy-dice' },
        el('span', { class: `economy-die${d ? '' : ' is-idle'}`, text: d ? String(d.a) : '?' }),
        el('span', { class: `economy-die${d ? '' : ' is-idle'}`, text: d ? String(d.b) : '?' })),
      el('p', { class: 'economy-mid__turn', text: m.over ? 'Match over' : (m.active === 0 ? 'Your move' : 'Tollbot moves') }),
      m.players[0].held ? el('p', { class: 'economy-mid__note', text: `You are held in the Yard, try ${m.players[0].tries} of ${m.rules.penMaxTries}.` }) : null,
      need.length ? el('p', { class: 'economy-mid__note', text: need.join('. ') + '.' }) : null,
      worst.owed > 0
        ? el('p', { class: 'economy-mid__note', text: `Worst landing next roll: ${worst.owed} on ${BOARD[worst.to].name}, ${(worst.chance * 100).toFixed(1)}%.` })
        : null,
    );
  }

  // ── the decision ───────────────────────────────────────────
  function decisionCard() {
    if (m.over) {
      const who = m.winner === -1 ? 'Nobody' : m.players[m.winner].name;
      return el('div', { class: 'card' },
        el('h3', { class: 'section__title', text: m.winner === 0 ? 'You win' : m.winner === 1 ? 'Tollbot wins' : 'Dead heat' }),
        el('p', { class: 'section__lead', text: m.reason }),
        el('div', { class: 'toolbar' },
          el('button', { class: 'btn btn--primary', type: 'button', onclick: newMatch }, 'New match')));
    }
    if (m.phase === 'offer') return offerCard(m.pending.space);
    if (m.active === 1) {
      return el('div', { class: 'card card--flat' },
        el('p', { class: 'section__lead', text: 'Tollbot is moving. Every line it writes in the log names the rule it used.' }));
    }
    if (m.phase === 'roll') {
      return el('div', { class: 'card' },
        el('div', { class: 'toolbar' },
          el('button', { class: 'btn btn--primary', type: 'button', onclick: () => { doRoll(m); afterRoll(); } }, 'Roll 2d6')));
    }
    if (m.phase === 'buy') return buyCard(m.pending.space);
    return buildCard();
  }

  function afterRoll() {
    if (m.over) return paint();
    if (m.phase === 'build' && !buildable().length) return finishHumanTurn();
    paint();
  }

  function buyCard(space) {
    const site = BOARD[space];
    const you = m.players[0];
    const afford = you.cash >= site.cost;
    return el('div', { class: 'card' },
      el('h3', { class: 'section__title', text: `${site.name} is unowned` }),
      el('p', { class: 'section__lead', text: `${SETS[site.set].name}. Cost ${site.cost}, bare rent ${site.rent}, rent with the set ${rentAt(site, 1)}. You hold ${you.cash}.` }),
      el('div', { class: 'toolbar' },
        el('button', {
          class: 'btn btn--primary', type: 'button', disabled: !afford,
          onclick: () => humanChoose(space, 'buy'),
        }, `Buy for ${site.cost}`),
        el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => humanChoose(space, 'pass') }, 'Pass')));
  }

  function humanChoose(space, what) {
    const rows = explainBuy(m, sim, space, what === 'buy');
    const res = choose(m, what);
    readout = { title: what === 'buy' ? `You bought ${BOARD[space].name}` : `You passed on ${BOARD[space].name}`, rows };
    if (res && res.offered && m.rules.auctionOnPass) {
      const call = botBuy({ ...m, pending: { space } }, sim, 1);
      m.log.unshift({ text: `Auction rule: Tollbot ${call.buy ? 'took it' : 'passed too'}. ${call.rule ? `Rule ${call.rule}: ` : ''}${call.why}.`, kind: 'bot', turn: m.turn, who: 1 });
      if (call.buy) takeOffer(m, 1, space);
    }
    if (!buildable().length) return finishHumanTurn();
    paint();
  }

  function offerCard(space) {
    const site = BOARD[space];
    const you = m.players[0];
    return el('div', { class: 'card' },
      el('h3', { class: 'section__title', text: `Tollbot passed on ${site.name}` }),
      el('p', { class: 'section__lead', text: `The auction rule offers it to you at sticker price: ${site.cost}. You hold ${you.cash}.` }),
      el('div', { class: 'toolbar' },
        el('button', {
          class: 'btn btn--secondary', type: 'button', disabled: you.cash < site.cost,
          onclick: () => {
            const rows = explainBuy(m, sim, space, true);
            takeOffer(m, 0, space);
            readout = { title: `You took ${site.name} at auction`, rows };
            m.pending = null; m.phase = 'build';
            if (!m.over && m.active === 1) { paint(); schedule(botStep); } else paint();
          },
        }, `Take it for ${site.cost}`),
        el('button', {
          class: 'btn btn--ghost', type: 'button',
          onclick: () => { m.pending = null; m.phase = 'build'; paint(); schedule(botStep); },
        }, 'Leave it')));
  }

  function buildable() {
    return ownedBy(m, 0).filter((s) => canBuild(m, 0, s.i));
  }

  function buildCard() {
    const opts = buildable();
    const worst = worstNextRent(m, 0);
    return el('div', { class: 'card' },
      el('h3', { class: 'section__title', text: opts.length ? 'Build works, or end the turn' : 'Nothing to build' }),
      el('p', { class: 'section__lead', text: opts.length
        ? `You hold ${m.players[0].cash}. The worst rent you can land on next roll is ${worst.owed}.`
        : 'You need a full set before works go up.' }),
      el('div', { class: 'toolbar' }, [
        ...opts.map((s) => {
          const lvl = levelOf(s, true, m.works[s.i]);
          return el('button', {
            class: 'btn btn--secondary btn--sm', type: 'button',
            onclick: () => {
              build(m, s.i);
              readout = { title: `Works ${m.works[s.i]} at ${s.name}`, rows: explainBuild(m, sim, s.i) };
              paint();
            },
          }, `${s.short} works ${m.works[s.i] + 1} for ${worksCost(s)} (rent ${rentAt(s, lvl)} to ${rentAt(s, lvl + 1)})`);
        }),
        el('button', { class: 'btn btn--primary', type: 'button', onclick: finishHumanTurn }, 'End turn'),
      ]));
  }

  function readoutCard() {
    return el('div', { class: 'card' },
      el('h3', { class: 'section__title', text: `What that was worth: ${readout.title}` }),
      el('div', { class: 'kv' }, readout.rows.map(([k, v]) => [
        el('span', { class: 'kv__k', text: k }),
        el('span', { class: 'kv__v', text: v }),
      ]).flat()));
  }

  function policyCard() {
    return el('div', { class: 'card card--flat' },
      el('h3', { class: 'section__title', text: 'Tollbot plays these five rules and nothing else' }),
      el('ol', { class: 'economy-policy' }, policyLines().map((t) => el('li', { text: t }))));
  }

  function logCard() {
    return el('div', { class: 'card card--flat' },
      el('h3', { class: 'section__title', text: 'Log' }),
      el('div', { class: 'economy-log' }, m.log.slice(0, 14).map((L) => el('p', {
        class: `economy-log__line is-${L.kind}`, text: `${L.turn}. ${L.text}`,
      }))));
  }

  newMatch();
  return () => clearTimeout(timer);
}
