// ── Tollworks match engine ───────────────────────────────────
// Pure state machine, no DOM. The view drives it and so does the
// headless house-rule lab in bot.js, which is the point: both players
// go through the same code, so a rule change is measured, not guessed.
//
// Phases: roll -> (buy) -> build -> roll ...

import {
  BOARD, N, YARD, SITES, DEFAULT_RULES, SIGNAL_CARDS,
  d6, advance, rentAt, levelOf, worksCost,
} from './game.js';

export function createMatch(rules = {}) {
  const r = { ...DEFAULT_RULES, ...rules };
  return {
    rules: r,
    turn: 1,
    active: 0,
    phase: 'roll',
    pending: null,
    dice: null,
    pot: 0,
    owner: new Array(N).fill(-1),
    works: new Array(N).fill(0),
    deck: shuffleDeck(),
    dp: 0,
    log: [],
    over: false,
    winner: null,
    reason: '',
    players: [
      { id: 0, name: 'You', cash: r.startCash, pos: 0, held: false, tries: 0, bankrupt: false },
      { id: 1, name: 'Tollbot', cash: r.startCash, pos: 0, held: false, tries: 0, bankrupt: false },
    ],
    extraRoll: false,
    doubles: 0,
    opening: null,
  };
}

/**
 * The opening deal. Two sites of one set to each player, from two sets that
 * are neighbours on price, and the cheaper pair is topped up in cash so both
 * sides start on the same net worth.
 *
 * Without this the game spends its first ten turns buying at sticker price
 * and neither side ever finishes a set, which is exactly the position that
 * makes the category need trading. Dealing round it puts the set decision
 * on the table from turn one.
 */
export function dealOpening(m) {
  const ladders = [['rust', 'tide'], ['tide', 'meridian'], ['meridian', 'highgate']];
  const pair = ladders[Math.floor(Math.random() * ladders.length)];
  const order = Math.random() < 0.5 ? [0, 1] : [1, 0];
  const dealt = [[], []];
  const spend = [0, 0];
  pair.forEach((setId, k) => {
    const pid = order[k];
    const ss = SITES.filter((s) => s.set === setId).slice();
    const drop = Math.floor(Math.random() * ss.length);
    ss.splice(drop, 1);
    for (const s of ss) { m.owner[s.i] = pid; dealt[pid].push(s.i); spend[pid] += s.cost; }
  });
  const top = Math.max(spend[0], spend[1]);
  m.players[0].cash += top - spend[0];
  m.players[1].cash += top - spend[1];
  m.opening = { dealt, spend, sets: pair, order };
  note(m, `Opening deal: you hold ${dealt[0].map((i) => BOARD[i].name).join(' and ')}. Tollbot holds ${dealt[1].map((i) => BOARD[i].name).join(' and ')}. The cheaper pair was topped up in cash, so both sides start level.`);
  return m;
}

function shuffleDeck() {
  const d = SIGNAL_CARDS.map((c) => c.id);
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function note(m, text, kind = 'plain') {
  m.log.unshift({ text, kind, turn: m.turn, who: m.active });
  if (m.log.length > 60) m.log.pop();
}

export function me(m) { return m.players[m.active]; }
export function foe(m) { return m.players[1 - m.active]; }

export function ownsSet(m, playerId, setId) {
  return SITES.filter((s) => s.set === setId).every((s) => m.owner[s.i] === playerId);
}

export function ownedBy(m, playerId) {
  return SITES.filter((s) => m.owner[s.i] === playerId);
}

/** Rent a player would owe for stopping on `space` right now. */
export function rentOwed(m, space, payerId) {
  const o = m.owner[space];
  if (o < 0 || o === payerId) return 0;
  if (!m.rules.rentInPen && m.players[o].held) return 0;
  const site = BOARD[space];
  return rentAt(site, levelOf(site, ownsSet(m, o, site.set), m.works[space]));
}

/** Current rent level of a space, for display. */
export function levelOfSpace(m, space) {
  const site = BOARD[space];
  if (!site.set || m.owner[space] < 0) return 0;
  return levelOf(site, ownsSet(m, m.owner[space], site.set), m.works[space]);
}

export function netWorth(m, p) {
  let total = p.cash;
  for (const s of ownedBy(m, p.id)) total += s.cost + m.works[s.i] * worksCost(s);
  return total;
}

// ── money ────────────────────────────────────────────────────

/** Pay, liquidating at half price if short. Bankrupt ends the match. */
function pay(m, payer, amount, creditor) {
  if (amount <= 0) return true;
  if (payer.cash < amount) liquidate(m, payer, amount);
  if (payer.cash < amount) {
    payer.bankrupt = true;
    if (creditor) creditor.cash += payer.cash;
    payer.cash = 0;
    finish(m, 1 - payer.id, `${payer.name} could not pay ${amount} and went under.`);
    return false;
  }
  payer.cash -= amount;
  if (creditor) creditor.cash += amount;
  else if (m.rules.potOnLayby) m.pot += amount;
  return true;
}

/** Sell works at half, then sites at half, cheapest first, until solvent. */
function liquidate(m, p, need) {
  const mine = ownedBy(m, p.id);
  const withWorks = mine.filter((s) => m.works[s.i] > 0).sort((a, b) => m.works[b.i] - m.works[a.i]);
  for (const s of withWorks) {
    while (m.works[s.i] > 0 && p.cash < need) {
      m.works[s.i] -= 1;
      p.cash += Math.floor(worksCost(s) / 2);
      note(m, `${p.name} sold a works at ${s.name} for ${Math.floor(worksCost(s) / 2)}.`, 'warn');
    }
  }
  const byCost = mine.slice().sort((a, b) => a.cost - b.cost);
  for (const s of byCost) {
    if (p.cash >= need) break;
    m.owner[s.i] = -1;
    p.cash += Math.floor(s.cost / 2);
    note(m, `${p.name} sold ${s.name} back for ${Math.floor(s.cost / 2)}.`, 'warn');
  }
}

function finish(m, winnerId, reason) {
  m.over = true;
  m.phase = 'over';
  m.winner = winnerId;
  m.reason = reason;
  note(m, reason, 'end');
}

// ── the turn ─────────────────────────────────────────────────

/** Roll, move, resolve. Sets phase to buy, build, or over. */
export function doRoll(m) {
  if (m.over || m.phase !== 'roll') return;
  const p = me(m);
  const a = d6(), b = d6(), sum = a + b, double = a === b;
  m.dice = { a, b, sum, double };
  m.extraRoll = false;

  if (p.held) {
    if (double) {
      p.held = false; p.tries = 0;
      note(m, `${p.name} rolled ${a} and ${b}, doubles, and left the Yard.`);
      move(m, p, sum);
    } else if (++p.tries >= m.rules.penMaxTries) {
      p.held = false; p.tries = 0;
      note(m, `${p.name} paid the ${m.rules.penFee} release fee after three tries.`, 'warn');
      if (!pay(m, p, m.rules.penFee, null)) return;
      move(m, p, sum);
    } else {
      note(m, `${p.name} rolled ${a} and ${b} and stayed in the Yard (try ${p.tries} of ${m.rules.penMaxTries}).`);
      m.phase = 'build';
      return;
    }
    if (!m.over) m.phase = m.pending ? 'buy' : 'build';
    return;
  }

  if (m.rules.doublesChain && double) {
    m.doubles += 1;
    if (m.doubles >= 3) {
      m.doubles = 0;
      sendToYard(m, p, 'three doubles in a row');
      m.phase = 'build';
      return;
    }
    m.extraRoll = true;
  } else {
    m.doubles = 0;
  }

  note(m, `${p.name} rolled ${a} and ${b} for ${sum}.`);
  move(m, p, sum);
  if (!m.over) m.phase = m.pending ? 'buy' : 'build';
}

function move(m, p, steps) {
  const from = p.pos;
  p.pos = advance(from, steps);
  if (from + steps >= N) {
    p.cash += m.rules.salary;
    note(m, `${p.name} passed the Depot and collected ${m.rules.salary}.`, 'good');
  }
  resolve(m, p);
}

function sendToYard(m, p, why) {
  p.pos = YARD;
  p.held = true;
  p.tries = 0;
  m.extraRoll = false;
  note(m, `${p.name} was sent to the Yard (${why}).`, 'warn');
}

function drawCard(m) {
  if (m.dp >= m.deck.length) { m.deck = shuffleDeck(); m.dp = 0; }
  const id = m.deck[m.dp++];
  return SIGNAL_CARDS.find((c) => c.id === id);
}

function resolve(m, p) {
  const sp = BOARD[p.pos];

  if (sp.kind === 'dispatch') { sendToYard(m, p, 'the Dispatch space'); return; }

  if (sp.kind === 'levy') {
    note(m, `${sp.name}: ${p.name} pays ${sp.fee}.`, 'warn');
    pay(m, p, sp.fee, null);
    return;
  }

  if (sp.kind === 'layby') {
    if (m.rules.potOnLayby && m.pot > 0) {
      note(m, `${p.name} landed on the Lay-by and took the ${m.pot} pot.`, 'good');
      p.cash += m.pot;
      m.pot = 0;
    }
    return;
  }

  if (sp.kind === 'signal') {
    const card = drawCard(m);
    note(m, `Signal Box: ${card.text}`);
    if (card.cash) { if (card.cash > 0) p.cash += card.cash; else if (!pay(m, p, -card.cash, null)) return; return; }
    if (card.perWorks) {
      const owed = ownedBy(m, p.id).reduce((t, s) => t + m.works[s.i], 0) * -card.perWorks;
      if (owed) { note(m, `${p.name} owes ${owed}.`, 'warn'); if (!pay(m, p, owed, null)) return; }
      return;
    }
    if (card.go === 'yard') { sendToYard(m, p, 'a Summons'); return; }
    if (typeof card.go === 'number') {
      if (card.go === 0) p.cash += m.rules.salary;
      p.pos = card.go;
      resolve(m, p);
      return;
    }
    if (card.back) { p.pos = ((p.pos - card.back) % N + N) % N; resolve(m, p); }
    return;
  }

  if (sp.kind !== 'site') return;

  const owed = rentOwed(m, p.pos, p.id);
  if (owed > 0) {
    const owner = m.players[m.owner[p.pos]];
    note(m, `${p.name} stopped on ${sp.name} and paid ${owner.name} ${owed}.`, 'warn');
    pay(m, p, owed, owner);
    return;
  }
  if (m.owner[p.pos] < 0) m.pending = { kind: 'buy', space: p.pos };
}

/** 'buy' or 'pass'. Passing may hand the site to the other player. */
export function choose(m, what) {
  if (m.phase !== 'buy' || !m.pending) return null;
  const space = m.pending.space;
  const site = BOARD[space];
  const p = me(m);
  m.pending = null;
  let result = { space, bought: false, byFoe: false };

  if (what === 'buy' && p.cash >= site.cost) {
    p.cash -= site.cost;
    m.owner[space] = p.id;
    note(m, `${p.name} bought ${site.name} for ${site.cost}.`, 'good');
    result.bought = true;
  } else if (m.rules.auctionOnPass) {
    result.offered = true;
  }
  m.phase = 'build';
  return result;
}

/** The other player takes a passed site at sticker price. */
export function takeOffer(m, playerId, space) {
  const site = BOARD[space];
  const p = m.players[playerId];
  if (m.owner[space] >= 0 || p.cash < site.cost) return false;
  p.cash -= site.cost;
  m.owner[space] = playerId;
  note(m, `${p.name} took ${site.name} at sticker price after the pass.`, 'good');
  return true;
}

export function canBuild(m, playerId, space) {
  const site = BOARD[space];
  if (!site.set || m.owner[space] !== playerId) return false;
  if (m.works[space] >= 3) return false;
  if (!ownsSet(m, playerId, site.set)) return false;
  return m.players[playerId].cash >= worksCost(site);
}

export function build(m, space) {
  const p = me(m);
  if (!canBuild(m, p.id, space)) return false;
  const site = BOARD[space];
  p.cash -= worksCost(site);
  m.works[space] += 1;
  note(m, `${p.name} built works ${m.works[space]} at ${site.name} for ${worksCost(site)}. Rent is now ${rentOwed(m, space, 1 - p.id)}.`, 'good');
  return true;
}

export function endTurn(m) {
  if (m.over) return;
  if (m.extraRoll) { m.extraRoll = false; m.phase = 'roll'; return; }
  m.doubles = 0;
  if (m.active === 1) {
    m.turn += 1;
    if (m.rules.turnCap && m.turn > m.rules.turnCap) {
      const a = netWorth(m, m.players[0]), b = netWorth(m, m.players[1]);
      if (a === b) finish(m, -1, `Turn ${m.rules.turnCap} reached with both on ${a}. Dead heat.`);
      else finish(m, a > b ? 0 : 1, `Turn cap reached. Net worth ${a} against ${b}.`);
      return;
    }
  }
  m.active = 1 - m.active;
  m.phase = 'roll';
}
