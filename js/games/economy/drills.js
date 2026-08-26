// ── Tollworks drills ─────────────────────────────────────────
// Five levels, all graded against the same measured landing table the
// Rules view draws. Every grade line shows the arithmetic, because the
// answer on its own teaches nothing.

import { el, pick, shuffle, randInt } from '../../utils.js';
import {
  BOARD, SITES, SETS, YARD, landingTable, shareError, exactDice, gap,
  rentAt, worksCost, setSites, worstReachable, advance, thousands,
} from './game.js';
import { boardEl } from './board.js';

export const levels = [
  { id: 1, name: 'Landing rate', blurb: 'Two spaces. Which one takes more traffic.' },
  { id: 2, name: 'Return', blurb: 'Two sites, two prices, two rents. Which one earns.' },
  { id: 3, name: 'Buy or pass', blurb: 'Your cash, the board, and a set on the line.' },
  { id: 4, name: 'What survives', blurb: 'Build, and find out what the next roll can do.' },
  { id: 5, name: 'The whole position', blurb: 'The greedy move is on offer. It is not the move.' },
];

/** Multiple choice grid. `opts` are { key, title, body }. */
function choices(host, opts, commit) {
  const grid = el('div', { class: 'choicegrid' },
    opts.map((o) => el('button', {
      class: 'choice', type: 'button', 'data-key': o.key,
      onclick: () => {
        grid.querySelectorAll('.choice').forEach((b) => { b.disabled = true; });
        commit(o.key);
      },
    },
      el('strong', { text: o.title }),
      el('span', { text: o.body }))));
  host.append(grid);
  return grid;
}

function markChoice(host, rightKey, pickedKey) {
  host.querySelectorAll('.choice').forEach((b) => {
    const k = b.dataset.key;
    if (k === rightKey) b.classList.add('is-right');
    else if (k === pickedKey) b.classList.add('is-wrong');
    if (k === pickedKey) b.classList.add('is-picked');
  });
}

function num(n, digits = 2) { return Number(n).toFixed(digits); }

// ── L1: landing rate ─────────────────────────────────────────

function l1(sim) {
  const err = shareError(sim) * 100;
  let a, b, tries = 0;
  do {
    [a, b] = shuffle(BOARD.slice()).slice(0, 2);
    tries++;
  } while (tries < 200 && Math.abs(sim.share[a.i] - sim.share[b.i]) * 100 < Math.max(0.45, err * 8));

  const hotter = sim.share[a.i] > sim.share[b.i] ? a : b;
  const colder = hotter === a ? b : a;
  const near = new Set([a.i, b.i]);
  const usesYard = [a, b].some((sp) => { const g = gap(YARD, sp.i); return g >= 4 && g <= 9; });

  return {
    patternId: usesYard ? 'economy-hot-band' : 'economy-triangle',
    prompt: 'Over a long match, which of these two spaces do tokens stop on more often?',
    hint: 'The Yard takes the most landings. But you leave it on doubles, and doubles are even, so the exit curve is not 2d6: six and eight beat seven. Count forward from the Yard using that curve, not the one on the triangle card.',
    mount(host, commit) {
      host.append(boardEl({ mark: near }));
      choices(host, [
        { key: 'a', title: `${a.i}. ${a.name}`, body: `${gap(YARD, a.i)} spaces past the Yard` },
        { key: 'b', title: `${b.i}. ${b.name}`, body: `${gap(YARD, b.i)} spaces past the Yard` },
      ], commit);
    },
    grade(answer) {
      const correct = (answer === 'a' ? a : b) === hotter;
      return {
        correct,
        detail: `${hotter.name} takes ${num(sim.share[hotter.i] * 100)}% of landings against ${num(sim.share[colder.i] * 100)}% for ${colder.name}, measured over ${thousands(sim.turns)} turns. ${reasonFor(hotter, colder)}`,
      };
    },
  };
}

function reasonFor(hot, cold) {
  if (hot.i === YARD) return 'The Yard is fed by the Dispatch space, a Summons card and three doubles in a row, and only dice take you out of it.';
  if (cold.i === YARD) return 'Even the Yard loses this one, which takes a space that a card names by hand.';
  if (hot.i === 12) return 'Copper Mile sits seven past the Yard, which is only the third most likely exit sum once the doubles rule is accounted for. The Inspection card naming it is what actually puts it on top.';
  const gh = gap(YARD, hot.i), gc = gap(YARD, cold.i);
  const reach = (g) => g >= 2 && g <= 12;
  if (reach(gh) && reach(gc) && Math.abs(gh - 7) < Math.abs(gc - 7)) {
    return `${hot.name} sits ${gh} past the Yard against ${gc} for ${cold.name}, and one roll of ${gh} comes up ${num(exactDice(gh) * 100, 1)}% of the time against ${num(exactDice(gc) * 100, 1)}% for ${gc}.`;
  }
  if (reach(gh) && !reach(gc)) {
    return `${hot.name} is ${gh} past the Yard, inside one roll of it at ${num(exactDice(gh) * 100, 1)}%. ${cold.name} is ${gc} away, which no single roll reaches, so it only collects traffic that has already been somewhere else.`;
  }
  return 'Distance from the Yard is not the whole story here: the traffic out of the Depot and off the cards falls differently on the two.';
}

// ── L2: return ───────────────────────────────────────────────

function l2(sim) {
  let a, b, tries = 0;
  do {
    [a, b] = shuffle(SITES.slice()).slice(0, 2);
    tries++;
  } while (tries < 200 && Math.abs(payback(a) - payback(b)) < 6);

  function payback(site) { return site.cost / (sim.perTurn[site.i] * rentAt(site, 1)); }
  const better = payback(a) < payback(b) ? a : b;
  const worse = better === a ? b : a;

  return {
    patternId: 'economy-return',
    prompt: 'Both are for sale and you can afford either. Assume you finish the set in both cases. Which one returns its cost faster?',
    hint: 'Rent over cost is half the answer. Multiply by how often the space is hit and you have the other half.',
    mount(host, commit) {
      choices(host, [a, b].map((site, k) => ({
        key: k === 0 ? 'a' : 'b',
        title: site.name,
        body: `${SETS[site.set].name}. Cost ${site.cost}, rent with the set ${rentAt(site, 1)}, landing share ${num(sim.share[site.i] * 100)}%`,
      })), commit);
    },
    grade(answer) {
      const chosen = answer === 'a' ? a : b;
      const line = (s) => `${s.name}: ${rentAt(s, 1)} rent times ${num(sim.perTurn[s.i], 3)} landings a turn is ${num(sim.perTurn[s.i] * rentAt(s, 1))} a turn, so ${s.cost} comes back in ${Math.round(payback(s))} turns`;
      const roiNote = (better.rent / better.cost) < (worse.rent / worse.cost)
        ? ` Note that ${worse.name} has the better rent per dollar on paper (${num(100 * worse.rent / worse.cost, 1)}% against ${num(100 * better.rent / better.cost, 1)}%) and still loses, because it is hit less often.`
        : '';
      return {
        correct: chosen === better,
        detail: `${line(better)}. ${line(worse)}.${roiNote}`,
      };
    },
  };
}

// ── L3: buy or pass ──────────────────────────────────────────

function l3(sim) {
  let mode = pick(['complete', 'deny', 'broke']);
  let setId, ss, offered, rest, owner, works, cash, foeSet = null;
  let worst = { owed: 0, to: null, chance: 0 };

  // 'broke' needs a real threat within one roll, so it is built by rejection.
  for (let tries = 0; ; tries++) {
    setId = pick(Object.keys(SETS));
    ss = setSites(setId);
    offered = pick(ss);
    rest = ss.filter((s) => s !== offered);
    owner = new Array(BOARD.length).fill(-1);
    works = new Array(BOARD.length).fill(0);

    if (mode === 'complete') {
      for (const s of rest) owner[s.i] = 0;
      cash = offered.cost + 60 + randInt(5) * 40;
      break;
    }
    if (mode === 'deny') {
      for (const s of rest) owner[s.i] = 1;
      cash = offered.cost + 60 + randInt(5) * 40;
      break;
    }
    owner[rest[0].i] = 1;
    foeSet = pick(Object.keys(SETS).filter((k) => k !== setId));
    for (const s of setSites(foeSet)) owner[s.i] = 1;
    works[pick(setSites(foeSet)).i] = 1;
    const rentOf = (space) => (owner[space] === 1 && BOARD[space].set ? rentAt(BOARD[space], 1 + works[space]) : 0);
    worst = worstReachable(offered.i, rentOf);
    if (worst.owed > offered.cost / 2 && worst.owed <= 300) {
      cash = offered.cost + Math.max(20, worst.owed - 40 - randInt(3) * 30);
      break;
    }
    if (tries > 40) { mode = 'complete'; }
  }

  const bareEv = sim.perTurn[offered.i] * offered.rent;
  const setEv = ss.reduce((t, s) => t + sim.perTurn[s.i] * rentAt(s, 1), 0);
  const oldEv = rest.reduce((t, s) => t + sim.perTurn[s.i] * rentAt(s, 0), 0);
  const shouldBuy = mode !== 'broke';

  return {
    patternId: mode === 'deny' ? 'economy-denial' : mode === 'complete' ? 'economy-set-step' : 'economy-buffer',
    prompt: `You stopped on ${offered.name} and it is unowned. You hold ${cash}. Buy it or pass?`,
    hint: mode === 'broke'
      ? 'Before you count the rent, count what one roll can take off you.'
      : 'A set is one card from finishing. Work out what that card is worth to whoever gets it, not what it costs.',
    mount(host, commit) {
      host.append(boardEl({ owner, works, tokens: [offered.i, null], mark: new Set([offered.i]) }));
      host.append(el('p', { class: 'section__lead', text: ownershipLine(mode, setId, rest, foeSet) }));
      choices(host, [
        { key: 'buy', title: `Buy for ${offered.cost}`, body: `leaves you ${cash - offered.cost}` },
        { key: 'pass', title: 'Pass', body: `keeps ${cash} in hand` },
      ], commit);
    },
    grade(answer) {
      const correct = (answer === 'buy') === shouldBuy;
      let detail;
      if (mode === 'complete') {
        const gain = setEv - oldEv;
        detail = `Buy. The two ${SETS[setId].name} cards you hold earn ${num(oldEv)} a turn between them at bare rent. ${offered.name} costs ${offered.cost} and takes the whole set to ${num(setEv)} a turn, a gain of ${num(gain)} for ${offered.cost}, back inside ${Math.round(offered.cost / gain)} turns. Bought on its own the same card returns ${num(bareEv)} a turn and would take ${Math.round(offered.cost / bareEv)}. Same card, same price, ${num(gain / bareEv, 1)} times the value.`;
      } else if (mode === 'deny') {
        detail = `Buy, and never build on it. Tollbot holds the other two ${SETS[setId].name} cards. Let this one go and that set charges you ${num(setEv)} a turn for the rest of the match. ${offered.cost} ends that permanently, which is ${Math.round(offered.cost / setEv)} turns of rent you now keep. Its own rent of ${num(bareEv)} a turn never entered into it.`;
      } else {
        detail = `Pass. The set is split, so bare rent of ${num(bareEv)} a turn is all this card can ever pay and ${offered.cost} would take ${Math.round(offered.cost / bareEv)} turns to come back. Meanwhile the worst rent you can land on next roll is ${worst.owed} on ${BOARD[worst.to].name} at ${num(worst.chance * 100, 1)}%, and buying leaves you ${cash - offered.cost}. You would be one roll from selling the thing you just bought at half price.`;
      }
      return { correct, detail };
    },
  };
}

function ownershipLine(mode, setId, rest, foeSet) {
  const names = rest.map((s) => s.name).join(' and ');
  if (mode === 'complete') return `You already hold ${names}. This is the last ${SETS[setId].name} card.`;
  if (mode === 'deny') return `Tollbot holds ${names}. This is the last ${SETS[setId].name} card it needs.`;
  return `Tollbot holds ${rest[0].name}, so the ${SETS[setId].name} set is split and nobody can finish it. Tollbot also owns the ${SETS[foeSet].name} set with works up.`;
}

// ── L4: what survives ────────────────────────────────────────

function l4(sim) {
  const setId = pick(Object.keys(SETS));
  const ss = setSites(setId);
  const foeSet = pick(Object.keys(SETS).filter((k) => k !== setId));
  const fs = setSites(foeSet);

  const owner = new Array(BOARD.length).fill(-1);
  const works = new Array(BOARD.length).fill(0);
  for (const s of ss) owner[s.i] = 0;
  for (const s of fs) owner[s.i] = 1;
  const built = pick(fs);
  works[built.i] = 1 + randInt(3);

  const rentOf = (space) => (owner[space] === 1 && BOARD[space].set ? rentAt(BOARD[space], 1 + works[space]) : 0);

  // Stand somewhere that can actually be charged, or the question is empty.
  const spots = BOARD.filter((sp) => owner[sp.i] !== 1)
    .map((sp) => ({ sp, worst: worstReachable(sp.i, rentOf) }))
    .filter((x) => x.worst.owed > 0);
  const spot = spots.length ? pick(spots) : { sp: BOARD[0], worst: worstReachable(0, rentOf) };
  const pos = spot.sp.i;
  const worst = spot.worst;

  const cost = worksCost(ss[0]);
  const target = pick(['none', 'one', 'two']);
  const jitter = randInt(Math.max(2, Math.floor(cost / 2)));
  const cash = target === 'two' ? worst.owed + 2 * cost + jitter
    : target === 'one' ? worst.owed + cost + jitter
      : worst.owed + jitter;

  const options = [
    { key: 'two', title: `Two works, ${cost * 2}`, spend: cost * 2 },
    { key: 'one', title: `One works, ${cost}`, spend: cost },
    { key: 'none', title: 'Build nothing', spend: 0 },
  ];
  const safe = options.find((o) => cash - o.spend >= worst.owed) || options[2];

  return {
    patternId: target === 'none' ? 'economy-death-spiral' : 'economy-buffer',
    prompt: `You hold ${cash} and you own the ${SETS[setId].name} set. Build as much as you can while still covering the worst rent your next roll can put you on.`,
    hint: 'List every space two to twelve ahead, take the largest rent among them, and never let your cash drop under it.',
    mount(host, commit) {
      host.append(boardEl({ owner, works, tokens: [pos, null], mark: new Set([worst.to]) }));
      host.append(el('p', { class: 'section__lead', text: `You are on ${BOARD[pos].name}. Tollbot owns the ${SETS[foeSet].name} set with ${works[built.i]} works on ${built.name}. Each works on your set costs ${cost}.` }));
      choices(host, options.map((o) => ({ key: o.key, title: o.title, body: `leaves ${cash - o.spend}` })), commit);
    },
    grade(answer) {
      const list = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        .map((g) => ({ g, space: advance(pos, g), owed: rentOf(advance(pos, g)) }))
        .filter((x) => x.owed > 0)
        .sort((x, y) => y.owed - x.owed)
        .slice(0, 3)
        .map((x) => `${BOARD[x.space].name} ${x.owed} at ${num(exactDice(x.g) * 100, 1)}%`)
        .join(', ');
      const over = options.filter((o) => cash - o.spend < worst.owed).map((o) => `${o.title.toLowerCase()} leaves ${cash - o.spend}`);
      return {
        correct: answer === safe.key,
        detail: `Worst landing from ${BOARD[pos].name}: ${worst.owed} on ${BOARD[worst.to].name}, up on ${num(worst.chance * 100, 1)}% of rolls. Reachable rents: ${list}. ${safe.title} leaves ${cash - safe.spend}, which still covers ${worst.owed}. ${over.length ? `Anything more does not: ${over.join(', ')}.` : 'Nothing on offer breaks the floor.'} A works you cannot afford to be landed on is a works you sell back at half price.`,
      };
    },
  };
}

// ── L5: the whole position ───────────────────────────────────

function l5(sim) {
  let mySet, ms, theirSet, ts, theirGap, greedy, cost, denyEv, buildEv, cash;
  let tries = 0;
  do {
    mySet = pick(Object.keys(SETS));
    ms = setSites(mySet);
    theirSet = pick(Object.keys(SETS).filter((k) => k !== mySet));
    ts = setSites(theirSet);
    theirGap = pick(ts);
    cost = worksCost(ms[0]);
    greedy = ms.reduce((best, s) => {
      const g = sim.perTurn[s.i] * (rentAt(s, 2) - rentAt(s, 1));
      const bg = sim.perTurn[best.i] * (rentAt(best, 2) - rentAt(best, 1));
      return g > bg ? s : best;
    }, ms[0]);
    denyEv = ts.reduce((t, s) => t + sim.perTurn[s.i] * rentAt(s, 1), 0);
    buildEv = sim.perTurn[greedy.i] * (rentAt(greedy, 2) - rentAt(greedy, 1));
    cash = Math.max(theirGap.cost, cost) + 10 + randInt(4) * 10;
    tries++;
  } while (tries < 200 && !(denyEv > buildEv * 1.25 && cash < theirGap.cost + cost));

  const owner = new Array(BOARD.length).fill(-1);
  const works = new Array(BOARD.length).fill(0);
  for (const s of ms) owner[s.i] = 0;
  for (const s of ts) if (s !== theirGap) owner[s.i] = 1;

  const H = 12;
  const options = shuffle([
    { key: 'build', title: `Build works at ${greedy.short} for ${cost}`, body: `your rent there goes ${rentAt(greedy, 1)} to ${rentAt(greedy, 2)}` },
    { key: 'deny', title: `Buy ${theirGap.name} for ${theirGap.cost}`, body: 'a card you would never build on' },
    { key: 'hold', title: 'Spend nothing', body: `keep all ${cash}` },
  ]);

  return {
    patternId: 'economy-trade-price',
    prompt: `You own the ${SETS[mySet].name} set outright and you hold ${cash}, enough for one of these and not two. You are standing on ${theirGap.name} and it is unowned.`,
    hint: 'Price the card by what it does to the other side of the table, not by what it does for you.',
    mount(host, commit) {
      host.append(boardEl({ owner, works, tokens: [theirGap.i, null], mark: new Set([theirGap.i]) }));
      host.append(el('p', { class: 'section__lead', text: `Tollbot holds two ${SETS[theirSet].name} cards and needs only this one. It has the cash and it will take it on its next pass.` }));
      choices(host, options, commit);
    },
    grade(answer) {
      return {
        correct: answer === 'deny',
        detail: `Buy ${theirGap.name}. Works at ${greedy.short} adds ${num(buildEv)} a turn to what you collect, so over the ${H} turns left that is ${Math.round(buildEv * H)}. Letting Tollbot finish ${SETS[theirSet].name} costs you ${num(denyEv)} a turn, so ${Math.round(denyEv * H)} out of your hand, and buying the card ends that for good. Neither purchase leaves your net worth: both sit in it at cost. What you are choosing between is ${num(denyEv)} a turn removed from the other side against ${num(buildEv)} a turn added to yours, and the first is ${num(denyEv / buildEv, 1)} times the second. The sticker price of ${theirGap.cost} is not what the card is worth. What Tollbot needs it for is.`,
      };
    },
  };
}

export function make(levelId) {
  const sim = landingTable();
  const fn = { 1: l1, 2: l2, 3: l3, 4: l4, 5: l5 }[levelId] || l1;
  return fn(sim);
}
