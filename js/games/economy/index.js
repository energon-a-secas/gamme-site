// ── Tollworks ────────────────────────────────────────────────
// A dice and property game, built from scratch so the maths can be shown
// rather than asserted. It is the same family as the famous one, and no
// name, space, card or character is borrowed from any published game.
//
// Every figure quoted in a pattern card below is read out of the Monte
// Carlo in game.js at load time. If the board changes, the cards change
// with it, because there is no second copy of the numbers to go stale.

import { registerGame } from '../../registry.js';
import { el } from '../../utils.js';
import {
  SETS, SITES, YARD, exactDice, landingTable, rentAt, setCost, setSites, thousands,
} from './game.js';
import { stripEl, barsEl } from './board.js';
import { playView } from './view.js';
import { rulesView } from './rules.js';
import { levels, make } from './drills.js';

const sim = landingTable();
const n = (v, d = 2) => Number(v).toFixed(d);
const pct = (v, d = 2) => `${n(v * 100, d)}%`;

const setEv = (id, level) => setSites(id).reduce((t, s) => t + sim.perTurn[s.i] * rentAt(s, level), 0);
const setPay = (id) => Math.round(setCost(id) / setEv(id, 1));
const stickerRoi = (id) => setSites(id).reduce((t, s) => t + s.rent / s.cost, 0) / 3;

const hottest = SITES.reduce((a, b) => (sim.share[a.i] > sim.share[b.i] ? a : b));
const coldest = SITES.reduce((a, b) => (sim.share[a.i] < sim.share[b.i] ? a : b));
const bestSet = Object.keys(SETS).reduce((a, b) => (setPay(a) < setPay(b) ? a : b));
const worstSet = Object.keys(SETS).reduce((a, b) => (setPay(a) > setPay(b) ? a : b));
const roiKing = Object.keys(SETS).reduce((a, b) => (stickerRoi(a) > stickerRoi(b) ? a : b));

// Rust Row is the cheapest set, so it is the one that shows the step best.
const rust = setSites('rust');
const rustLast = rust[2];
const rustPairEv = rust.slice(0, 2).reduce((t, s) => t + sim.perTurn[s.i] * rentAt(s, 0), 0);
const rustSetEv = setEv('rust', 1);
const rustStep = rustSetEv - rustPairEv;

const coreRule = {
  title: 'Expected value per turn',
  body: 'Every space has a rate it gets landed on and every site has a rent. Multiply the two and you have what it earns per turn of the other player. Divide the cost by that and you have how many turns it takes to come back. That number decides everything on this board. The price printed on the site is not that number, and neither is the rent.',
  formula: 'landings per turn x rent = income per turn.   cost / income per turn = turns to break even.',
};

const patterns = [
  {
    id: 'economy-triangle',
    name: 'The dice are a triangle',
    tier: 1,
    trigger: 'You are counting spaces ahead of your token.',
    action: 'Weight the count by 2d6: on an ordinary roll seven comes up six times as often as two or twelve. Leaving the Yard is a different curve, see the hot band card.',
    why: `Thirty six ways to roll two dice. Six of them make seven. One makes two and one makes twelve. Landing rate is the first half of every number on this board, so a count that treats the eleven results as equal is wrong before you multiply it by a rent. The Rules tab rolls ${thousands(sim.rolls)} dice in your browser and prints the result against the exact figures, so this is a claim you can break rather than one you have to accept.`,
    tags: ['dice', 'landing rate'],
    diagram: () => el('div', { class: 'diagram' }, barsEl(
      [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((s) => ({
        label: String(s), value: exactDice(s), text: pct(exactDice(s), 1),
      })))),
  },
  {
    id: 'economy-hot-band',
    name: 'Six to eight past the pen',
    tier: 1,
    trigger: 'A space players get sent to rather than roll onto. Here that is the Yard.',
    action: 'Rate the buyable spaces six, seven and eight forward of it above their neighbours.',
    why: `The Yard takes ${pct(sim.share[YARD], 1)} of all landings, because the Dispatch space, a Summons card and three doubles in a row all feed it and only dice take you out. But you do not leave it on a plain 2d6 roll: you leave on doubles, and doubles are even, so the exit curve peaks on six and eight and puts seven third. ${hottest.name} is the busiest site at ${pct(sim.share[hottest.i], 1)} against ${pct(sim.share[coldest.i], 1)} for ${coldest.name}, and the honest reason is the Inspection card naming it, not its distance from the Yard. Remove that card and the gap between the sites all but disappears. And a twenty space loop is short: one roll spans eleven spaces, so the curve smears over half the board and the whole spread between sites is only about ${n((Math.max(...SITES.map((s) => sim.share[s.i])) - Math.min(...SITES.map((s) => sim.share[s.i]))) * 100, 1)} points. On a forty space board the same rule bites twice as hard.`,
    tags: ['geometry', 'landing rate'],
    diagram: () => el('div', { class: 'diagram' },
      stripEl(new Set([YARD]), new Set([11, 12, 13]))),
  },
  {
    id: 'economy-return',
    name: 'Return, not sticker price',
    tier: 2,
    trigger: 'Two sites are on offer and one of them costs more.',
    action: 'Compare rent times landing rate against cost. Never compare cost alone.',
    why: `Cost buys one thing: a stream of rent arriving at the rate that space is landed on. On this board ${SETS[roiKing].name} has the best rent per dollar at ${pct(stickerRoi(roiKing), 0)} and still pays back slower than ${SETS[bestSet].name} at ${pct(stickerRoi(bestSet), 0)}, because ${SETS[bestSet].name} is hit more often: ${setPay(bestSet)} turns against ${setPay(roiKing)}. ${SETS[worstSet].name} costs ${setCost(worstSet)}, more than three times ${SETS['rust'].name}, and is the slowest of the four at ${setPay(worstSet)} turns. Price ranks the sets in nearly the wrong order, and rent per dollar on its own still gets it wrong.`,
    tags: ['ROI', 'pricing'],
    diagram: () => el('div', { class: 'diagram' }, barsEl(Object.keys(SETS).map((id) => ({
      label: SETS[id].name,
      value: 1 / setPay(id),
      color: SETS[id].color,
      text: `${setCost(id)} in, back in ${setPay(id)} turns`,
    })))),
  },
  {
    id: 'economy-set-step',
    name: 'The last card of a set',
    tier: 2,
    trigger: 'You hold two of a set and the third is unowned in front of you.',
    action: 'Buy it at any price you can survive. It is not priced like the other two.',
    why: `Completing a set doubles the rent on all three at once, and works cannot go up until it is done. ${rustLast.name} costs ${rustLast.cost}. Bought into a broken set it returns ${n(sim.perTurn[rustLast.i] * rustLast.rent)} a turn and takes ${Math.round(rustLast.cost / (sim.perTurn[rustLast.i] * rustLast.rent))} turns to come back. Bought as the third ${SETS.rust.name} card it lifts the set from ${n(rustPairEv)} a turn to ${n(rustSetEv)}, a gain of ${n(rustStep)} for the same ${rustLast.cost}, back inside ${Math.round(rustLast.cost / rustStep)} turns. Same card, same price, ${n(rustStep / (sim.perTurn[rustLast.i] * rustLast.rent), 1)} times the value. A set is a step, not a slope.`,
    tags: ['sets', 'step function'],
    diagram: () => el('div', { class: 'diagram' }, barsEl([
      { label: 'Two of three', value: rustPairEv, text: `${n(rustPairEv)} a turn`, color: SETS.rust.color },
      { label: 'All three', value: rustSetEv, text: `${n(rustSetEv)} a turn`, color: SETS.rust.color },
      { label: 'All three, 1 works', value: setEv('rust', 2), text: `${n(setEv('rust', 2))} a turn`, color: SETS.rust.color },
    ])),
  },
  {
    id: 'economy-denial',
    name: 'The card you buy to bury',
    tier: 2,
    trigger: 'The other player holds two of a set and the third is unowned under your token.',
    action: 'Buy it, and never build on it.',
    why: `A site you do not want still has a price, and it is the rent you stop paying. Letting ${SETS[bestSet].name} finish opposite you costs ${n(setEv(bestSet, 1))} a turn before any works go up, and works then multiply it. The card that prevents that costs at most ${Math.max(...setSites(bestSet).map((s) => s.cost))} once, and the money is not gone: it sits in your net worth at cost. Compare the per turn swing, not the two rents. Your own rent from the card is beside the point, which is exactly why the buy feels wrong and is right.`,
    tags: ['denial', 'sets'],
  },
  {
    id: 'economy-buffer',
    name: 'Cash under the worst landing',
    tier: 3,
    trigger: 'You are about to spend down to a number smaller than a rent you can reach.',
    action: 'Hold at least the largest rent sitting two to twelve spaces ahead of you.',
    why: 'Your next roll can only put you somewhere between two and twelve forward. Take the biggest rent among those eleven spaces and treat it as a floor under your cash. It is not an expected value, it is a survival test: expected value tells you what to buy, the floor tells you when to stop. The floor moves every turn, because it depends on where you are standing and on what the other player has built since you last looked, which is why it is the pattern people skip.',
    tags: ['buffer', 'risk'],
  },
  {
    id: 'economy-trade-price',
    name: 'Priced by what it finishes',
    tier: 3,
    trigger: 'A card is worth more to the other player than it is to you.',
    action: 'Price it by their gain, not by your rent or by the number printed on it.',
    why: `Two players value the same card by two different numbers, and neither of them is the sticker price. A spare ${SETS.rust.name} card is worth ${n(sim.perTurn[rustLast.i] * rustLast.rent)} a turn to somebody who cannot finish the set, and ${n(rustStep)} a turn to somebody who can. That is the entire logic of trading in this family of games: the price is set by the buyer's step, so a card that finishes a set never trades at cost, and a player who needs one card and offers cost is telling you what they think you have not worked out. Tollbot cannot trade, so beating it on trades proves nothing. Beating a person on them is the whole game.`,
    tags: ['trading', 'valuation'],
  },
  {
    id: 'economy-death-spiral',
    name: 'The half price spiral',
    tier: 3,
    trigger: 'You cannot pay, and you own works.',
    action: 'Nothing, now. The move was one turn earlier, and it was building one fewer.',
    why: `Owe more than you hold and your works sell back at half what you paid, then your sites do. Every forced sale cuts the rent that would have refilled the cash, so the next bill is harder to pay than the last one was. A ${rentAt(rustLast, 4)} landing on a player holding ${rentAt(rustLast, 4) - 60} does not cost ${rentAt(rustLast, 4)}: it costs that, plus half of every works sold to raise it, plus the income those works were making. This is how most matches in this family are actually lost, and it always begins with one build that looked affordable at the time.`,
    tags: ['risk', 'bankruptcy'],
  },
];

registerGame({
  id: 'economy',
  name: 'Tollworks',
  tagline: 'Dice, property and the maths people skip',
  accent: '#f59e0b',
  coreRule,
  patterns,
  defaults: {
    drillLevel: 1,
    potOnLayby: false,
    rentInPen: true,
    auctionOnPass: true,
    doublesChain: true,
    turnCap: 22,
  },
  views: {
    play: playView,
    rules: rulesView,
  },
  drills: { levels, make },
});
