// ── Tollworks: board, money maths, and the Monte Carlo ────────
// No DOM in here. Everything a view or a drill needs to be honest about
// numbers is computed from this file, and the landing frequencies are
// measured by rolling dice rather than asserted.
//
// The board is a 20 space ring so it draws as the perimeter of a 6x6 grid:
// corners fall on 0, 5, 10 and 15 by construction.

export const SETS = {
  rust:     { id: 'rust',     name: 'Rust Row',  color: '#b45309', works: 50 },
  tide:     { id: 'tide',     name: 'Tidewater', color: '#0d9488', works: 90 },
  meridian: { id: 'meridian', name: 'Meridian',  color: '#7c3aed', works: 140 },
  highgate: { id: 'highgate', name: 'Highgate',  color: '#84cc16', works: 200 },
};

/** kind: depot | site | signal | yard | levy | layby | dispatch */
export const BOARD = [
  { i: 0,  kind: 'depot',    name: 'The Depot',      short: 'DEPOT' },
  { i: 1,  kind: 'site',     name: 'Sluice Lane',    short: 'Sluice',   set: 'rust',     cost: 70,  rent: 24 },
  { i: 2,  kind: 'site',     name: 'Coal Bend',      short: 'Coal',     set: 'rust',     cost: 70,  rent: 24 },
  { i: 3,  kind: 'signal',   name: 'Signal Box',     short: 'SIGNAL' },
  { i: 4,  kind: 'site',     name: 'Ash Wharf',      short: 'Ash',      set: 'rust',     cost: 90,  rent: 30 },
  { i: 5,  kind: 'yard',     name: 'The Yard',       short: 'YARD' },
  { i: 6,  kind: 'site',     name: 'Pier Nine',      short: 'Pier',     set: 'tide',     cost: 120, rent: 33 },
  { i: 7,  kind: 'site',     name: 'Salt Quay',      short: 'Salt',     set: 'tide',     cost: 130, rent: 36 },
  { i: 8,  kind: 'levy',     name: 'The Levy',       short: 'LEVY',     fee: 75 },
  { i: 9,  kind: 'site',     name: 'Fog Harbour',    short: 'Fog',      set: 'tide',     cost: 140, rent: 39 },
  { i: 10, kind: 'layby',    name: 'The Lay-by',     short: 'LAY-BY' },
  { i: 11, kind: 'site',     name: 'Vault Street',   short: 'Vault',    set: 'meridian', cost: 180, rent: 51 },
  { i: 12, kind: 'site',     name: 'Copper Mile',    short: 'Copper',   set: 'meridian', cost: 190, rent: 54 },
  { i: 13, kind: 'signal',   name: 'Signal Box',     short: 'SIGNAL' },
  { i: 14, kind: 'site',     name: 'Lantern Cross',  short: 'Lantern',  set: 'meridian', cost: 210, rent: 60 },
  { i: 15, kind: 'dispatch', name: 'Dispatch',       short: 'DISPATCH' },
  { i: 16, kind: 'site',     name: 'Ivory Terrace',  short: 'Ivory',    set: 'highgate', cost: 280, rent: 66 },
  { i: 17, kind: 'site',     name: 'Crown Reach',    short: 'Crown',    set: 'highgate', cost: 300, rent: 72 },
  { i: 18, kind: 'levy',     name: 'The Weighbridge', short: 'WEIGH',   fee: 40 },
  { i: 19, kind: 'site',     name: 'Beacon Hill',    short: 'Beacon',   set: 'highgate', cost: 340, rent: 78 },
];

export const N = BOARD.length;
export const YARD = 5;
export const DEPOT = 0;
export const SITES = BOARD.filter((s) => s.kind === 'site');

/** Bare, full set, then one two three works. The step at index 1 is the point. */
export const RENT_MULT = [1, 2, 5, 10, 18];

export const DEFAULT_RULES = {
  startCash: 400,
  salary: 40,
  penFee: 50,
  penMaxTries: 3,
  turnCap: 22,
  /** House rules. Off means the plain game. See the Rules view. */
  potOnLayby: false,
  rentInPen: true,
  doublesChain: true,
  auctionOnPass: true,
};

export const SIGNAL_CARDS = [
  { id: 'audit',      text: 'Audit. Pay 60.',                                     cash: -60 },
  { id: 'rebate',     text: 'Rebate. Collect 90.',                                cash: 90 },
  { id: 'summons',    text: 'Summons. Go to the Yard, held.',                     go: 'yard' },
  { id: 'shortcut',   text: 'Shortcut. Advance to the Depot, collect salary.',    go: 0 },
  { id: 'meter',      text: 'Meter reading. Pay 20 for every works you own.',     perWorks: -20 },
  { id: 'contract',   text: 'Contract settled. Collect 40.',                      cash: 40 },
  { id: 'inspection', text: 'Inspection. Advance to Copper Mile.',                go: 12 },
  { id: 'backhaul',   text: 'Backhaul. Go back 3 spaces.',                        back: 3 },
];

// ── dice ─────────────────────────────────────────────────────

export function d6() { return 1 + Math.floor(Math.random() * 6); }
export function roll2d6() {
  const a = d6(), b = d6();
  return { a, b, sum: a + b, double: a === b };
}

/**
 * Exact distribution of the sum you LEAVE THE YARD on, which is not 2d6.
 *
 * You need doubles to get out, and only after penMaxTries failures do you leave
 * on whatever you rolled. Doubles are even, so a third of exits carry no weight
 * on 7 at all: 6 and 8 beat it, and the 7-to-2 ratio collapses from 6 to about
 * 1.65. Any advice of the form "count six to eight forward from the pen" has to
 * be derived from this curve, not from the one on the pattern card.
 */
export function penExitDistribution(rules = DEFAULT_RULES) {
  const tries = rules.penMaxTries;
  const pDouble = 1 / 6;
  const out = new Float64Array(13);
  for (let t = 1; t < tries; t++) {
    const reach = Math.pow(1 - pDouble, t - 1);
    for (let v = 1; v <= 6; v++) out[2 * v] += reach * (1 / 36);
  }
  // The last try leaves on any sum at all, double or not.
  const reachLast = Math.pow(1 - pDouble, tries - 1);
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) out[a + b] += reachLast / 36;
  let total = 0;
  for (const v of out) total += v;
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** The sums you most often leave the Yard on, best first. */
export function penExitRanking(rules = DEFAULT_RULES) {
  const d = penExitDistribution(rules);
  return [...d.keys()].filter((s) => s >= 2).map((s) => ({ sum: s, p: d[s] }))
    .sort((a, b) => b.p - a.p);
}

/** Exact 2d6 probability for a sum. The thing the Monte Carlo has to match. */
export function exactDice(sum) {
  if (sum < 2 || sum > 12) return 0;
  return (6 - Math.abs(7 - sum)) / 36;
}

/** Thousands separators that do not depend on the reader's locale. */
export function thousands(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function advance(pos, steps) { return (pos + steps) % N; }
export function passedDepot(from, steps) { return from + steps >= N; }

/** Steps from `from` to `to` going forward around the ring. */
export function gap(from, to) { return ((to - from) % N + N) % N; }

/** Chance of landing on `to` from `from` with one roll of 2d6. */
export function oneRollChance(from, to) {
  const g = gap(from, to);
  return g >= 2 && g <= 12 ? exactDice(g) : 0;
}

// ── the Monte Carlo ──────────────────────────────────────────
// One token, real dice, the real movement rules: the Dispatch space, the
// Yard hold, the three-doubles rule, and the three cards that move you.
// Anything that changes where a token comes to rest is in here, because a
// landing table built without them is a lie.

function shuffledDeck() {
  const deck = SIGNAL_CARDS.map((c) => c.id);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Roll `turns` player turns and count where the token comes to rest.
 * A turn is one visit to the table: a doubles chain is still one turn.
 * Returns raw counts plus the two normalisations that mean different things.
 */
export function simulate(turns = 200000, rules = DEFAULT_RULES) {
  const arrivals = new Float64Array(N);
  const sums = new Float64Array(13);
  let deck = shuffledDeck(), dp = 0;
  const draw = () => {
    if (dp >= deck.length) { deck = shuffledDeck(); dp = 0; }
    return deck[dp++];
  };

  let pos = 0, held = false, tries = 0, rolls = 0;

  for (let t = 0; t < turns; t++) {
    let doubles = 0, again = true;
    while (again) {
      again = false;
      const a = d6(), b = d6(), sum = a + b, isDouble = a === b;
      rolls++; sums[sum]++;

      if (held) {
        if (isDouble || ++tries >= rules.penMaxTries) {
          held = false; tries = 0;
          pos = advance(pos, sum); arrivals[pos]++;
          resolve();
        }
        break; // leaving the Yard never buys you a second roll
      }

      doubles++;
      if (rules.doublesChain && doubles === 3) {
        pos = YARD; held = true; arrivals[pos]++;
        break;
      }

      pos = advance(pos, sum); arrivals[pos]++;
      resolve();
      if (isDouble && rules.doublesChain && !held) again = true;
    }
  }

  function resolve() {
    const sp = BOARD[pos];
    if (sp.kind === 'dispatch') {
      pos = YARD; held = true; tries = 0; arrivals[pos]++;
      return;
    }
    if (sp.kind !== 'signal') return;
    const id = draw();
    const card = SIGNAL_CARDS.find((c) => c.id === id);
    if (card.go === 'yard') { pos = YARD; held = true; tries = 0; arrivals[pos]++; return; }
    if (typeof card.go === 'number') { pos = card.go; arrivals[pos]++; return; }
    if (card.back) { pos = ((pos - card.back) % N + N) % N; arrivals[pos]++; }
  }

  const total = arrivals.reduce((x, y) => x + y, 0);
  return {
    turns, rolls, arrivals: Array.from(arrivals),
    /** Share of all landings. Sums to 1. This is the bar chart. */
    share: Array.from(arrivals, (v) => v / total),
    /** Landings per player turn. This is the number that goes into EV. */
    perTurn: Array.from(arrivals, (v) => v / turns),
    /** Observed 2d6 counts, index 2..12. Checked against exactDice. */
    diceCounts: Array.from(sums),
  };
}

/**
 * One landing table shared by every view and every drill, so the number a
 * pattern card quotes is the number the drill grades against. Built on
 * first use, which costs about 60ms.
 */
let _table = null;
export function landingTable(turns = 500000) {
  if (!_table || _table.turns < turns) _table = simulate(turns);
  return _table;
}

/** Standard error on a share of `p`, for calling two bars a tie. */
export function shareError(sim, p = 0.05) {
  const total = sim.arrivals.reduce((a, b) => a + b, 0);
  return Math.sqrt(p * (1 - p) / total);
}

/** Observed against exact, so the distribution claim can be disproved on screen. */
export function diceReport(sim) {
  const rows = [];
  for (let s = 2; s <= 12; s++) {
    const observed = sim.diceCounts[s] / sim.rolls;
    const exact = exactDice(s);
    rows.push({ sum: s, observed, exact, errPts: (observed - exact) * 100 });
  }
  return rows;
}

// ── money ────────────────────────────────────────────────────

/** Rent level 0 bare, 1 full set, 2..4 one to three works. */
export function rentAt(site, level) {
  return Math.round(site.rent * RENT_MULT[Math.max(0, Math.min(4, level))]);
}

export function levelOf(site, ownerHasSet, works) {
  if (works > 0) return 1 + works;
  return ownerHasSet ? 1 : 0;
}

export function worksCost(site) { return SETS[site.set].works; }

/** Sticker ROI. The number people quote, and the wrong one on its own. */
export function roi(site, level = 0) { return rentAt(site, level) / site.cost; }

/** Expected rent per opponent turn: the landing rate times what they pay. */
export function evPerTurn(site, sim, level = 0) {
  return sim.perTurn[site.i] * rentAt(site, level);
}

/** Turns of opponent play before the site has returned its own cost. */
export function payback(site, sim, level = 0) {
  const ev = evPerTurn(site, sim, level);
  return ev > 0 ? site.cost / ev : Infinity;
}

/** Cost of the next works, and what that works adds per turn. */
export function upgradeGain(site, sim, level) {
  const next = Math.min(4, level + 1);
  return {
    cost: worksCost(site),
    from: rentAt(site, level),
    to: rentAt(site, next),
    gainPerTurn: sim.perTurn[site.i] * (rentAt(site, next) - rentAt(site, level)),
  };
}

/** Sites of one set, in board order. */
export function setSites(setId) { return SITES.filter((s) => s.set === setId); }

/** Cost of buying a whole set outright, works excluded. */
export function setCost(setId) { return setSites(setId).reduce((t, s) => t + s.cost, 0); }

/**
 * Every rent you could be made to pay from `from` with one roll, with the
 * chance of each. The cash buffer pattern is a max over this list.
 */
export function reachableRents(from, rentOf) {
  const out = [];
  for (let g = 2; g <= 12; g++) {
    const to = advance(from, g);
    const owed = rentOf(to);
    if (owed > 0) out.push({ to, gap: g, owed, chance: exactDice(g) });
  }
  return out.sort((a, b) => b.owed - a.owed);
}

/** Worst single payment reachable in one roll, and the chance of meeting it. */
export function worstReachable(from, rentOf) {
  const list = reachableRents(from, rentOf);
  if (!list.length) return { owed: 0, chance: 0, to: null };
  const worst = list[0];
  const chance = list.filter((r) => r.owed >= worst.owed).reduce((t, r) => t + r.chance, 0);
  return { owed: worst.owed, chance, to: worst.to };
}

/** Expected payment on the next roll from `from`. */
export function expectedHit(from, rentOf) {
  return reachableRents(from, rentOf).reduce((t, r) => t + r.owed * r.chance, 0);
}
