// ── Play: the model game against a bot ───────────────────────
// The bot's policy is written out in the Rules tab rather than hidden, because
// a teaching game whose opponent is a mystery teaches the wrong lesson. It is
// deliberately beatable: it never plays around anything.

import { el, showToast } from '../../utils.js';
import { state, t } from '../../state.js';
import * as M from './model.js';
import { findLethal, incomingDamage } from './tactics.js';

const STARTER = ['scout', 'runner', 'guard', 'knight', 'bolt', 'strike', 'captain', 'study',
                 'volley', 'knight', 'runner', 'giant', 'bolt', 'guard', 'sweep', 'scout'];

function shuffled(xs) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newGame(rules) {
  M.resetUids();
  const deck = () => shuffled(STARTER);
  const s = M.makeState({
    rules,
    you: { hand: [], deck: deck(), mana: 1, maxMana: 1, lands: 1 },
    foe: { hand: [], deck: deck(), mana: 0, maxMana: 0, lands: 0 },
  });
  for (let i = 0; i < 3; i++) {
    s.players[0].hand.push(s.players[0].deck.shift());
    s.players[1].hand.push(s.players[1].deck.shift());
  }
  return s;
}

export function playView(host, ctx) {
  const rules = {
    ...M.DEFAULT_RULES,
    resourceModel: ctx.settings.resourceModel || 'auto',
    startLife: ctx.settings.startLife || 20,
  };
  let s = newGame(rules);
  let selected = null;
  let over = null;

  const root = el('div', { class: 'stack' });
  host.appendChild(root);

  function botTurn() {
    let guard = 0;
    while (s.active === 1 && guard++ < 40) {
      const kill = findLethal(s);
      if (kill.lethal) { for (const a of kill.line) s = M.applyAction(s, a); break; }

      const acts = M.legalActions(s).filter((a) => a.kind !== 'end');
      if (!acts.length) break;
      // Stated policy: biggest affordable creature, then removal on the biggest
      // threat, then attack face. No blocking logic, no playing around anything.
      const plays = acts.filter((a) => a.kind === 'play');
      const creature = plays
        .filter((a) => M.CARD_BY_ID[a.cardId].type === M.CREATURE)
        .sort((a, b) => M.CARD_BY_ID[b.cardId].cost - M.CARD_BY_ID[a.cardId].cost)[0];
      const removal = plays.find((a) => M.CARD_BY_ID[a.cardId].type === M.REMOVAL && a.target !== 'face');
      const attack = acts.find((a) => a.kind === 'attack' && a.target === 'face');
      const chosen = creature || removal || attack || acts[0];
      s = M.applyAction(s, chosen);
      if (M.winner(s) !== null) break;
    }
    if (M.winner(s) === null) s = M.endTurn(s);
    finish();
  }

  function finish() {
    const w = M.winner(s);
    if (w !== null) over = w === 0 ? 'you' : 'foe';
    draw();
  }

  function act(a) {
    if (over) return;
    s = M.applyAction(s, a);
    selected = null;
    const w = M.winner(s);
    if (w !== null) { finish(); return; }
    if (s.active === 1) { draw(); setTimeout(botTurn, 350); return; }
    draw();
  }

  function draw() {
    const you = s.players[0];
    const foe = s.players[1];
    const kill = s.active === 0 && !over ? findLethal(s) : { lethal: false };
    const incoming = !over ? incomingDamage({ ...s, active: 1 }) : null;

    root.replaceChildren(
      el('div', { class: 'toolbar' },
        el('button', { class: 'btn btn--ghost btn--sm', type: 'button',
          onclick: () => { s = newGame(rules); over = null; selected = null; draw(); } },
          t({ en: 'New game', es: 'Partida nueva' })),
        el('span', { class: 'playnote', text: t({
          en: `Resource model: ${rules.resourceModel}. Change it in Rules.`,
          es: `Modelo de recursos: ${rules.resourceModel}. Cámbialo en Reglas.` }) }),
      ),

      over ? el('div', { class: `verdict verdict--${over === 'you' ? 'win' : 'loss'}` },
        el('strong', { text: over === 'you' ? t({ en: 'You win', es: 'Ganaste' }) : t({ en: 'You lose', es: 'Perdiste' }) }),
      ) : null,

      // The teaching hook: the site says count lethal first, so the board says
      // whether lethal is there. It is the pattern made visible.
      !over && s.active === 0 ? el('div', { class: `lethalbar${kill.lethal ? ' is-on' : ''}` },
        el('span', { text: kill.lethal
          ? t({ en: 'Lethal is available this turn.', es: 'Hay lethal disponible este turno.' })
          : t({ en: 'No lethal this turn.', es: 'No hay lethal este turno.' }) }),
        incoming && incoming.lethalOnYou ? el('span', { class: 'lethalbar__warn', text: t({
          en: `They can deal ${incoming.damage} next turn and you are at ${you.life}.`,
          es: `Pueden hacer ${incoming.damage} el próximo turno y estás en ${you.life}.` }) }) : null,
      ) : null,

      side(t({ en: 'Opponent', es: 'Rival' }), foe, true),
      side(t({ en: 'You', es: 'Tú' }), you, false),

      el('div', { class: 'mrow mrow--hand' }, you.hand.map((id, i) => {
        const c = M.CARD_BY_ID[id];
        const afford = M.canAfford(s, c, you) && s.active === 0 && !over;
        return el('button', {
          class: `mhandcard${afford ? ' is-playable' : ''}`,
          type: 'button', disabled: !afford,
          onclick: () => {
            if (c.type === M.REMOVAL || (c.type === M.BURN && foe.board.length)) {
              selected = { kind: 'targeting', index: i, cardId: id };
              draw();
            } else {
              act({ kind: 'play', index: i, cardId: id, target: c.type === M.BURN ? 'face' : undefined });
            }
          },
        },
          el('span', { class: 'handcard__cost', text: String(c.cost) }),
          el('span', { text: `${c.name} · ${cardLine(c)}` }),
        );
      })),

      el('div', { class: 'toolbar' },
        el('button', { class: 'btn btn--primary', type: 'button', disabled: over || s.active !== 0,
          onclick: () => act({ kind: 'end' }) },
          t({ en: 'End turn', es: 'Terminar turno' })),
        selected ? el('span', { class: 'playnote', text: t({ en: 'Pick a target.', es: 'Elige un objetivo.' }) }) : null,
      ),
    );
  }

  function side(label, p, isFoe) {
    return el('div', { class: 'mside' },
      el('div', { class: 'mside__label' },
        el('span', { text: label }),
        el('strong', { class: 'mlife', text: `${p.life} ${t({ en: 'life', es: 'vida' })}` }),
        !isFoe ? el('strong', { class: 'mmana', text: `${p.mana} ${t({ en: 'mana', es: 'maná' })}` }) : null,
      ),
      el('div', { class: 'mrow' }, p.board.length
        ? p.board.map((c) => el('button', {
            class: `mcreature${c.sick ? ' is-sick' : ''}${c.attacked ? ' is-spent' : ''}`
              + (selected && selected.uid === c.uid ? ' is-selected' : ''),
            type: 'button',
            onclick: () => onCreature(c, isFoe),
          },
            el('span', { class: 'mcreature__name', text: c.name }),
            el('span', { class: 'mcreature__stats', text: `${c.atk}/${c.hp}` }),
          ))
        : el('span', { class: 'mempty', text: t({ en: 'empty board', es: 'tablero vacío' }) })),
      isFoe ? el('button', {
        class: 'facebtn', type: 'button',
        onclick: () => { if (selected && selected.kind !== 'targeting') act({ kind: 'attack', uid: selected.uid, target: 'face' }); },
      }, t({ en: 'attack face', es: 'atacar a la cara' })) : null,
    );
  }

  function onCreature(c, isFoe) {
    if (over || s.active !== 0) return;
    if (selected && selected.kind === 'targeting' && isFoe) {
      act({ kind: 'play', index: selected.index, cardId: selected.cardId, target: c.uid });
      return;
    }
    if (isFoe) {
      if (selected && selected.uid) act({ kind: 'attack', uid: selected.uid, target: c.uid });
      return;
    }
    if (c.sick || c.attacked) { showToast(t({ en: 'That creature cannot attack yet.', es: 'Esa criatura no puede atacar todavía.' })); return; }
    selected = selected && selected.uid === c.uid ? null : { uid: c.uid };
    draw();
  }

  draw();
  return () => {};
}

function cardLine(c) {
  if (c.type === M.CREATURE) return `${c.atk}/${c.hp}`;
  if (c.type === M.REMOVAL) return c.dmg >= 99 ? 'destroy' : `${c.dmg} dmg`;
  if (c.type === M.BURN) return `${c.dmg} dmg`;
  if (c.type === M.SWEEP) return `${c.dmg} to all`;
  return `draw ${c.draws}`;
}
