// ── The model card game ──────────────────────────────────────
// A deliberately small 1v1 game, built so the drills can be graded by search
// rather than by opinion. It is not a real card game and does not try to be:
// it is the smallest board on which card advantage, tempo and lethal are all
// real, so a question about them has one provable answer.
//
// The resource model is a switch, because that is the teardown's whole point.
// Play the same board under lands and under automatic mana and the correct
// line changes, which is the argument made playable.

export const CREATURE = 'creature';
export const REMOVAL = 'removal';
export const BURN = 'burn';
export const DRAW = 'draw';
export const SWEEP = 'sweep';

/** The card pool. Small on purpose: every card teaches one thing. */
export const POOL = [
  { id: 'scout',    name: 'Scout',      type: CREATURE, cost: 1, atk: 1, hp: 2 },
  { id: 'runner',   name: 'Runner',     type: CREATURE, cost: 2, atk: 3, hp: 1 },
  { id: 'guard',    name: 'Guard',      type: CREATURE, cost: 2, atk: 1, hp: 4 },
  { id: 'knight',   name: 'Knight',     type: CREATURE, cost: 3, atk: 3, hp: 3 },
  { id: 'captain',  name: 'Captain',    type: CREATURE, cost: 4, atk: 4, hp: 4 },
  { id: 'giant',    name: 'Giant',      type: CREATURE, cost: 6, atk: 6, hp: 6 },
  { id: 'strike',   name: 'Strike',     type: REMOVAL,  cost: 2, dmg: 3 },
  { id: 'banish',   name: 'Banish',     type: REMOVAL,  cost: 4, dmg: 99 },
  { id: 'bolt',     name: 'Bolt',       type: BURN,     cost: 1, dmg: 2 },
  { id: 'volley',   name: 'Volley',     type: BURN,     cost: 3, dmg: 4 },
  { id: 'study',    name: 'Study',      type: DRAW,     cost: 2, draws: 2 },
  // The canonical two-for-one. Without a card that answers several at once,
  // card advantage is a lesson the drills can describe but never show.
  { id: 'sweep',    name: 'Sweep',      type: SWEEP,    cost: 5, dmg: 3 },
];

export const CARD_BY_ID = Object.fromEntries(POOL.map((c) => [c.id, c]));

export const DEFAULT_RULES = {
  /** 'auto' +1 per turn · 'land' a card in hand pays · 'none' no cost at all */
  resourceModel: 'auto',
  startLife: 20,
  maxMana: 10,
  boardLimit: 6,
};

let nextUid = 1;
export function resetUids() { nextUid = 1; }

export function makeCreature(cardId, opts = {}) {
  const c = CARD_BY_ID[cardId];
  return {
    uid: opts.uid || nextUid++,
    cardId, name: c.name,
    atk: opts.atk ?? c.atk,
    hp: opts.hp ?? c.hp,
    maxHp: opts.maxHp ?? c.hp,
    /** A creature cannot attack the turn it arrives. This is what tempo means. */
    sick: opts.sick ?? true,
    attacked: opts.attacked ?? false,
  };
}

export function makeState(spec = {}) {
  const rules = { ...DEFAULT_RULES, ...(spec.rules || {}) };
  const player = (p = {}) => ({
    life: p.life ?? rules.startLife,
    mana: p.mana ?? 0,
    maxMana: p.maxMana ?? 0,
    lands: p.lands ?? 0,
    playedLand: false,
    hand: [...(p.hand || [])],
    board: (p.board || []).map((c) => (typeof c === 'string' ? makeCreature(c, { sick: false }) : makeCreature(c.cardId || c.id, c))),
    deck: [...(p.deck || [])],
  });
  return {
    rules,
    active: spec.active ?? 0,
    turn: spec.turn ?? 1,
    players: [player(spec.you), player(spec.foe)],
    log: [],
  };
}

export function clone(s) {
  return {
    rules: s.rules,
    active: s.active,
    turn: s.turn,
    players: s.players.map((p) => ({
      ...p,
      hand: [...p.hand],
      deck: [...p.deck],
      board: p.board.map((c) => ({ ...c })),
    })),
    log: [...s.log],
  };
}

export const me = (s) => s.players[s.active];
export const them = (s) => s.players[1 - s.active];

/** Mana available to spend right now, under whichever resource model is on. */
export function availableMana(s, p = me(s)) {
  if (s.rules.resourceModel === 'none') return Infinity;
  if (s.rules.resourceModel === 'land') return p.lands - p.spent || 0;
  return p.mana;
}

function spend(p, s, cost) {
  if (s.rules.resourceModel === 'none') return;
  p.mana -= cost;
}

export function canAfford(s, card, p = me(s)) {
  if (s.rules.resourceModel === 'none') return true;
  return p.mana >= card.cost;
}

/**
 * Every action legal right now, as plain data so a search can enumerate them.
 * Ordered so that cheaper, simpler actions come first, which keeps a
 * depth-first lethal search from wandering.
 */
export function legalActions(s) {
  const p = me(s);
  const foe = them(s);
  const out = [];

  p.hand.forEach((cardId, i) => {
    const card = CARD_BY_ID[cardId];
    if (!card || !canAfford(s, card, p)) return;
    if (card.type === CREATURE) {
      if (p.board.length < s.rules.boardLimit) out.push({ kind: 'play', index: i, cardId });
    } else if (card.type === REMOVAL) {
      foe.board.forEach((c) => out.push({ kind: 'play', index: i, cardId, target: c.uid }));
    } else if (card.type === BURN) {
      out.push({ kind: 'play', index: i, cardId, target: 'face' });
      foe.board.forEach((c) => out.push({ kind: 'play', index: i, cardId, target: c.uid }));
    } else if (card.type === DRAW || card.type === SWEEP) {
      out.push({ kind: 'play', index: i, cardId });
    }
  });

  for (const c of p.board) {
    if (c.sick || c.attacked) continue;
    out.push({ kind: 'attack', uid: c.uid, target: 'face' });
    for (const t of foe.board) out.push({ kind: 'attack', uid: c.uid, target: t.uid });
  }

  out.push({ kind: 'end' });
  return out;
}

export function applyAction(s0, action) {
  const s = clone(s0);
  const p = me(s);
  const foe = them(s);

  if (action.kind === 'play') {
    const cardId = p.hand[action.index];
    const card = CARD_BY_ID[cardId];
    if (!card) return s;
    p.hand.splice(action.index, 1);
    spend(p, s, card.cost);

    if (card.type === CREATURE) {
      p.board.push(makeCreature(cardId, { sick: true }));
    } else if (card.type === REMOVAL || card.type === BURN) {
      if (action.target === 'face') foe.life -= card.dmg;
      else damageCreature(foe, action.target, card.dmg);
    } else if (card.type === DRAW) {
      for (let i = 0; i < card.draws; i++) {
        if (p.deck.length) p.hand.push(p.deck.shift());
      }
    } else if (card.type === SWEEP) {
      for (const c of [...foe.board]) damageCreature(foe, c.uid, card.dmg);
    }
    s.log.push({ ...action, card: card.name });
    return s;
  }

  if (action.kind === 'attack') {
    const att = p.board.find((c) => c.uid === action.uid);
    if (!att || att.sick || att.attacked) return s;
    att.attacked = true;
    if (action.target === 'face') {
      foe.life -= att.atk;
    } else {
      const def = foe.board.find((c) => c.uid === action.target);
      if (def) {
        def.hp -= att.atk;
        att.hp -= def.atk;
        if (def.hp <= 0) foe.board = foe.board.filter((c) => c.uid !== def.uid);
        if (att.hp <= 0) p.board = p.board.filter((c) => c.uid !== att.uid);
      }
    }
    s.log.push(action);
    return s;
  }

  if (action.kind === 'end') return endTurn(s);
  return s;
}

function damageCreature(side, uid, dmg) {
  const c = side.board.find((x) => x.uid === uid);
  if (!c) return;
  c.hp -= dmg;
  if (c.hp <= 0) side.board = side.board.filter((x) => x.uid !== uid);
}

export function endTurn(s0) {
  const s = clone(s0);
  s.active = 1 - s.active;
  s.turn += 1;
  const p = me(s);
  if (s.rules.resourceModel === 'auto') {
    p.maxMana = Math.min(s.rules.maxMana, p.maxMana + 1);
    p.mana = p.maxMana;
  } else if (s.rules.resourceModel === 'land') {
    p.mana = p.lands;
    p.playedLand = false;
  }
  for (const c of p.board) { c.sick = false; c.attacked = false; }
  if (p.deck.length) p.hand.push(p.deck.shift());
  return s;
}

export function winner(s) {
  if (s.players[1].life <= 0) return 0;
  if (s.players[0].life <= 0) return 1;
  return null;
}

/** A stable key for memoising a search over one turn. */
export function stateKey(s) {
  const side = (p) => `${p.life}|${p.mana}|${[...p.hand].sort().join(',')}|`
    + p.board.map((c) => `${c.cardId}:${c.atk}/${c.hp}${c.sick ? 's' : ''}${c.attacked ? 'a' : ''}`).sort().join(';');
  return `${s.active}#${side(s.players[0])}#${side(s.players[1])}`;
}
