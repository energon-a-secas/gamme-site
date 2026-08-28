// ── Tactics: the provable questions ──────────────────────────
// Only questions with one right answer live here, and each is answered by
// exhaustive search over this turn rather than by a heuristic. That is the
// line this module will not cross: "which play is best" depends on an
// evaluation function and is therefore an opinion, so it is never graded.
// "Is there lethal" does not, so it is.

import { legalActions, applyAction, clone, me, them, stateKey, CARD_BY_ID, CREATURE } from './model.js';

const NODE_CAP = 40000;

/**
 * Is there a sequence of plays and attacks that wins this turn?
 * Returns the shortest winning line, or null. Exhaustive within the cap; if
 * the cap is hit the result reports it rather than claiming no lethal exists,
 * because a false "no" here would grade a correct answer wrong.
 */
export function findLethal(state) {
  const seen = new Set();
  let nodes = 0;
  let capped = false;
  let best = null;

  function walk(s, line) {
    if (nodes++ > NODE_CAP) { capped = true; return; }
    if (them(s).life <= 0) {
      if (!best || line.length < best.length) best = [...line];
      return;
    }
    if (best && line.length >= best.length) return;
    const key = stateKey(s);
    if (seen.has(key)) return;
    seen.add(key);

    for (const a of legalActions(s)) {
      if (a.kind === 'end') continue;          // lethal must happen this turn
      line.push(a);
      walk(applyAction(s, a), line);
      line.pop();
    }
  }

  walk(clone(state), []);
  return { lethal: Boolean(best), line: best, capped, nodes };
}

/**
 * Total damage the opponent can deal on their next turn, assuming they draw
 * nothing useful and play only what is already visible. It is a lower bound,
 * and the drill copy says so: a hidden card can always beat it.
 */
export function incomingDamage(state, { assumeAllAttack = true } = {}) {
  const foe = them(state);
  const you = me(state);
  let dmg = 0;
  if (assumeAllAttack) {
    // Their creatures lose summoning sickness before their turn.
    for (const c of foe.board) dmg += c.atk;
  }
  // Burn they could cast with the mana they will have.
  const mana = Math.min(state.rules.maxMana, foe.maxMana + 1);
  const burns = foe.hand
    .map((id) => CARD_BY_ID[id])
    .filter((c) => c && c.type === 'burn' && c.cost <= mana)
    .sort((a, b) => b.dmg - a.dmg);
  let left = mana;
  for (const b of burns) {
    if (b.cost > left) continue;
    left -= b.cost;
    dmg += b.dmg;
  }
  return { damage: dmg, lethalOnYou: dmg >= you.life, yourLife: you.life };
}

/**
 * Net cards from a line: how many cards you spent versus how many of theirs
 * you removed. This is arithmetic, not judgement, which is why it can be
 * graded. A 2-for-1 is +1.
 */
export function cardDelta(before, line) {
  let s = clone(before);
  const foeBoardBefore = them(s).board.length;
  const handBefore = me(s).hand.length;
  for (const a of line) s = applyAction(s, a);
  const spent = handBefore - me(s).hand.length;
  const killed = foeBoardBefore - them(s).board.length;
  const lostOwn = before.players[before.active].board.length - me(s).board.length;
  return { spent, killed, lostOwn, delta: killed - spent - lostOwn };
}

/**
 * Every subset of the hand that exactly spends the mana available. Subset sum,
 * so "which play uses all your mana" has a provable answer set.
 */
export function exactCurveFits(state) {
  const p = me(state);
  const mana = p.mana;
  const cards = p.hand.map((id, i) => ({ i, ...CARD_BY_ID[id] })).filter((c) => c.cost !== undefined);
  const fits = [];
  const n = cards.length;
  for (let mask = 1; mask < (1 << n); mask++) {
    let cost = 0;
    const picked = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) { cost += cards[i].cost; picked.push(cards[i]); }
    }
    if (cost === mana) fits.push({ cards: picked.map((c) => c.id), cost });
  }
  // Fewest cards first: spending your whole turn on one card is the common line.
  fits.sort((a, b) => a.cards.length - b.cards.length);
  return { mana, fits, best: fits[0] || null };
}

/** Does playing this creature trade up, down, or evenly against a target? */
export function tradeQuality(attacker, defender) {
  const attackerDies = defender.atk >= attacker.hp;
  const defenderDies = attacker.atk >= defender.hp;
  if (defenderDies && !attackerDies) return 'up';
  if (!defenderDies && attackerDies) return 'down';
  if (defenderDies && attackerDies) return 'even';
  return 'none';
}
