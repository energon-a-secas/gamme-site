// ── Tollbot ──────────────────────────────────────────────────
// The policy is five numbered rules and nothing else. It is printed on
// screen word for word next to the board, because a bot you can read is a
// bot you can learn from, and because a hidden policy cannot be argued with.
//
// Every threshold below is measured against the same landing table the
// player sees in the Rules view. Nothing here is hard-coded frequency.

import {
  BOARD, SETS, rentAt, levelOf, worksCost, worstReachable, setSites,
} from './game.js';
import {
  createMatch, dealOpening, doRoll, choose, build, endTurn, takeOffer, canBuild,
  ownedBy, rentOwed, netWorth,
} from './match.js';

export const POLICY = {
  reserve: 120,
  paybackLimit: 40,
};

/** The policy in plain words. Kept in step with the code by hand, on purpose. */
export function policyLines() {
  return [
    'It buys any site that completes one of its own sets, at any price it can pay.',
    `It buys a site that would complete your set if it can do that and still hold ${POLICY.reserve}.`,
    `Otherwise it buys only when rent at set level pays the cost back inside ${POLICY.paybackLimit} opponent turns, and it keeps ${POLICY.reserve} in reserve.`,
    'It builds works while the cash left over still covers the worst rent it could land on next turn.',
    'It never trades. Trading is the one thing it cannot do, so beating it on trades proves nothing.',
  ];
}

/** Expected rent per opponent turn at a given rent level. */
function ev(site, sim, level) { return sim.perTurn[site.i] * rentAt(site, level); }

function paybackAt(site, sim, level) {
  const e = ev(site, sim, level);
  return e > 0 ? site.cost / e : Infinity;
}

/** How many of a set a player holds, and whether one buy finishes it. */
export function setProgress(m, playerId, setId) {
  const ss = setSites(setId);
  const held = ss.filter((s) => m.owner[s.i] === playerId).length;
  return { held, total: ss.length, completes: held === ss.length - 1 };
}

/** Tollbot's buy decision, with the rule number that fired. */
export function botBuy(m, sim, playerId = 1) {
  const space = m.pending ? m.pending.space : -1;
  if (space < 0) return { buy: false, rule: 0, why: 'no rule fires, nothing is on offer' };
  const site = BOARD[space];
  const p = m.players[playerId];
  if (p.cash < site.cost) return { buy: false, rule: 0, why: `no rule fires, it cannot afford ${site.cost}` };

  const mine = setProgress(m, playerId, site.set);
  if (mine.completes) {
    return { buy: true, rule: 1, why: `${site.name} completes ${SETS[site.set].name}, so price does not enter into it` };
  }

  const theirs = setProgress(m, 1 - playerId, site.set);
  if (theirs.completes && p.cash - site.cost >= POLICY.reserve) {
    return { buy: true, rule: 2, why: `this is the last ${SETS[site.set].name} card you need, and blocking it costs less than paying the set rent` };
  }

  const pay = paybackAt(site, sim, 1);
  if (pay <= POLICY.paybackLimit && p.cash - site.cost >= POLICY.reserve) {
    return { buy: true, rule: 3, why: `set rent ${rentAt(site, 1)} at ${(sim.perTurn[space]).toFixed(3)} landings a turn pays ${site.cost} back in ${Math.round(pay)} turns` };
  }
  if (pay > POLICY.paybackLimit) {
    return { buy: false, rule: 3, why: `payback ${Math.round(pay)} turns is past the ${POLICY.paybackLimit} limit` };
  }
  // The reserve belongs to rule 3, which is the rule that states it. Labelling
  // this 5 pointed the player at "It never trades", which is a different rule.
  return { buy: false, rule: 3, why: `buying would leave ${p.cash - site.cost}, under the ${POLICY.reserve} reserve` };
}

/** Worst rent this player could be made to pay on their next roll. */
export function worstNextRent(m, playerId) {
  const p = m.players[playerId];
  return worstReachable(p.pos, (space) => rentOwed(m, space, playerId));
}

/** Tollbot's build decision: one space at a time, or null to stop. */
export function botBuild(m, sim, playerId = 1) {
  const p = m.players[playerId];
  const options = ownedBy(m, playerId)
    .filter((s) => canBuild(m, playerId, s.i))
    .map((s) => {
      const level = levelOf(s, true, m.works[s.i]);
      const gain = sim.perTurn[s.i] * (rentAt(s, level + 1) - rentAt(s, level));
      return { site: s, cost: worksCost(s), gain, ratio: gain / worksCost(s) };
    })
    .sort((a, b) => b.ratio - a.ratio);
  if (!options.length) return null;
  const best = options[0];
  const worst = worstNextRent(m, playerId);
  const left = p.cash - best.cost;
  if (left < worst.owed) {
    return { space: -1, why: `building would leave ${left}, under the ${worst.owed} it could land on` };
  }
  return {
    space: best.site.i,
    why: `works at ${best.site.name} adds ${best.gain.toFixed(2)} a turn for ${best.cost}, and leaves ${left} against a worst landing of ${worst.owed}`,
  };
}

// ── the EV readout shown after a human decision ───────────────

/** Structured rows explaining what a buy was worth. The view renders them. */
export function explainBuy(m, sim, space, bought) {
  const site = BOARD[space];
  const p = m.players[0];
  const turnsLeft = Math.max(0, (m.rules.turnCap || 20) - m.turn + 1);
  const prog = setProgress(m, 0, site.set);
  const rows = [];
  const share = (sim.share[space] * 100).toFixed(2);
  rows.push(['Landing rate', `${share}% of all landings, ${sim.perTurn[space].toFixed(3)} per opponent turn`]);
  for (const [label, level] of [['Bare', 0], ['With the set', 1], ['Set plus 3 works', 4]]) {
    const rent = rentAt(site, level);
    const e = sim.perTurn[space] * rent;
    const spend = level >= 2 ? site.cost + 3 * worksCost(site) : site.cost;
    rows.push([label, `rent ${rent}, ${e.toFixed(2)} a turn, pays back ${spend} in ${Math.round(spend / e)} turns`]);
  }
  rows.push(['Turns left', `${turnsLeft} of ${m.rules.turnCap}`]);
  if (prog.completes) {
    const before = setSites(site.set).filter((s) => m.owner[s.i] === 0)
      .reduce((t, s) => t + sim.perTurn[s.i] * rentAt(s, 0), 0);
    const after = setSites(site.set)
      .reduce((t, s) => t + sim.perTurn[s.i] * rentAt(s, 1), 0);
    rows.push(['Set step', `it doubles the rent on every ${SETS[site.set].name} card: ${before.toFixed(2)} a turn becomes ${after.toFixed(2)} for ${site.cost}`]);
  }
  const bare = sim.perTurn[space] * site.rent;
  const worthIt = prog.completes || site.cost / (sim.perTurn[space] * rentAt(site, 1)) <= turnsLeft * 4;
  rows.push(['Verdict', bought
    ? (worthIt ? 'the numbers back the buy' : `bare rent returns ${bare.toFixed(2)} a turn, so this only pays if you finish the set`)
    : (prog.completes ? 'passing gave up the step, which is the expensive kind of pass' : 'the pass costs you little at bare rent')]);
  return rows;
}

/** Rows explaining a works build. */
export function explainBuild(m, sim, space) {
  const site = BOARD[space];
  const level = m.works[space];
  const before = rentAt(site, levelOf(site, true, level - 1));
  const after = rentAt(site, levelOf(site, true, level));
  const gain = sim.perTurn[space] * (after - before);
  const worst = worstNextRent(m, 0);
  return [
    ['Rent step', `${before} becomes ${after} for ${worksCost(site)}`],
    ['Per turn', `${gain.toFixed(2)} more a turn, so the works pays for itself in ${Math.round(worksCost(site) / gain)} turns`],
    ['Cash left', `${m.players[0].cash}`],
    ['Worst landing', worst.owed > 0
      ? `${worst.owed} on ${BOARD[worst.to].name}, ${(worst.chance * 100).toFixed(1)}% next roll`
      : 'nothing on the board can charge you yet'],
    ['Survives it', m.players[0].cash >= worst.owed ? 'yes' : 'no, one roll can bankrupt you'],
  ];
}

// ── the house rule lab ───────────────────────────────────────
// Bot against bot, many games, so a claim about a house rule is measured
// on this board rather than repeated from a forum post.

/**
 * Can either player still complete a colour set?
 *
 * When every set is split between the two of them, nothing can ever be
 * completed, no works can be built, rent stays at the bare rate, and salary
 * outruns it. The match is then decided but never ends. The old guard hid
 * that behind a step cap and folded the truncated games into the bankruptcy
 * rate, which made the house-rule panel quietly wrong.
 */
function setsStillReachable(m) {
  for (const id of Object.keys(SETS)) {
    const members = setSites(id).map((x) => x.i);
    let a = 0, b = 0, free = 0;
    for (const i of members) {
      if (m.owner[i] === 0) a++;
      else if (m.owner[i] === 1) b++;
      else free++;
    }
    if (a + free === members.length || b + free === members.length) return true;
  }
  return false;
}

export function playOut(rules, sim) {
  const m = dealOpening(createMatch(rules));
  let guard = 0;
  let stalled = 0;
  while (!m.over && guard++ < 20000) {
    // Check once per completed turn, not per phase.
    if (m.phase === 'roll' && !setsStillReachable(m)) {
      if (++stalled > 2) {
        return {
          turns: m.turn,
          bankrupt: false,
          stalemate: true,
          gap: Math.abs(netWorth(m, m.players[0]) - netWorth(m, m.players[1])),
        };
      }
    } else if (m.phase === 'roll') {
      stalled = 0;
    }
    if (m.phase === 'roll') { doRoll(m); continue; }
    if (m.phase === 'buy') {
      const id = m.active;
      const space = m.pending.space;
      const call = botBuy(m, sim, id);
      choose(m, call.buy ? 'buy' : 'pass');
      if (!call.buy && rules.auctionOnPass && m.owner[space] < 0) {
        const other = 1 - id;
        m.pending = { kind: 'buy', space };
        const theirs = botBuy(m, sim, other);
        m.pending = null;
        if (theirs.buy) takeOffer(m, other, space);
      }
      continue;
    }
    if (m.phase === 'build') {
      const call = botBuild(m, sim, m.active);
      if (call && call.space >= 0) { build(m, call.space); continue; }
      endTurn(m);
      continue;
    }
    break;
  }
  return {
    turns: m.turn,
    bankrupt: m.players.some((p) => p.bankrupt),
    // A match that hit the guard did not finish. Saying so beats scoring it as
    // "nobody went bankrupt", which is how the old code inflated the survival rate.
    truncated: !m.over && guard >= 20000,
    stalemate: false,
    gap: Math.abs(netWorth(m, m.players[0]) - netWorth(m, m.players[1])),
  };
}

/**
 * Median rather than mean, because match length here is heavily tailed: a
 * few matches run ten times the typical one and drag an average anywhere.
 * The median is the game you will actually sit through.
 */
export function lab(rules, sim, games = 200) {
  const lens = [];
  let bust = 0, gap = 0, stalemate = 0, truncated = 0;
  for (let i = 0; i < games; i++) {
    const r = playOut(rules, sim);
    lens.push(r.turns);
    gap += r.gap;
    if (r.bankrupt) bust++;
    if (r.stalemate) stalemate++;
    if (r.truncated) truncated++;
  }
  lens.sort((a, b) => a - b);
  return {
    games,
    medianTurns: lens[Math.floor(games / 2)],
    p90Turns: lens[Math.floor(games * 0.9)],
    bustRate: bust / games,
    // Reported, not folded into bustRate. A match that stalled or hit the step
    // cap did not "survive"; counting it as one is how a truncated tail turns
    // into a confident-looking number.
    stalemateRate: stalemate / games,
    truncatedRate: truncated / games,
    avgGap: gap / games,
  };
}
