// ── Cards drills ─────────────────────────────────────────────
// Three levels, and every one of them is graded by search, never by taste.
// "Which play is best" is deliberately absent: it needs an evaluation function
// and would be an opinion wearing a score. What is here instead:
//
//   1  is there lethal            exhaustive, provable
//   2  does this spend the turn   subset sum, provable
//   3  what did the trade net     arithmetic, provable

import { el } from '../../utils.js';
import { state, t } from '../../state.js';
import * as M from './model.js';
import { findLethal, exactCurveFits, cardDelta } from './tactics.js';

export const levels = [
  { id: 1, name: { en: 'Lethal', es: 'Lethal' },
    blurb: { en: 'Is the game over this turn? Yes or no, and the search knows.',
             es: '¿Se acaba la partida este turno? Sí o no, y la búsqueda lo sabe.' } },
  { id: 2, name: { en: 'Curve', es: 'Curva' },
    blurb: { en: 'Which cards spend every point of mana you have?',
             es: '¿Qué cartas gastan cada punto de maná que tienes?' } },
  { id: 3, name: { en: 'The exchange', es: 'El intercambio' },
    blurb: { en: 'Count what a trade actually netted you.',
             es: 'Cuenta lo que un intercambio realmente te dejó.' } },
];

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (xs) => xs[rnd(xs.length)];

/** Build positions until one is genuinely decidable, so a drill is never a guess. */
function buildLethalPosition() {
  for (let attempt = 0; attempt < 200; attempt++) {
    M.resetUids();
    const board = [pick(['scout', 'runner', 'knight', 'captain'])];
    if (Math.random() < 0.5) board.push(pick(['scout', 'runner', 'knight']));
    const hand = [];
    if (Math.random() < 0.7) hand.push(pick(['bolt', 'volley']));
    if (Math.random() < 0.3) hand.push('bolt');
    const s = M.makeState({
      you: { mana: 1 + rnd(5), hand, board: board.map((c) => ({ cardId: c, sick: false })) },
      foe: { life: 2 + rnd(10), board: Math.random() < 0.35 ? [{ cardId: pick(['guard', 'scout']), sick: false }] : [] },
    });
    const r = findLethal(s);
    if (r.capped) continue;                    // never ask about a position we cannot settle
    return { state: s, lethal: r.lethal, line: r.line };
  }
  return null;
}

function makeLethal() {
  const pos = buildLethalPosition();
  if (!pos) return null;
  let answer = null;

  return {
    patternId: 'cards-lethal',
    prompt: t({
      en: 'Can you win this turn from here?',
      es: '¿Puedes ganar este turno desde aquí?',
    }),
    mount(host, commit) {
      host.appendChild(boardView(pos.state));
      host.appendChild(el('div', { class: 'toolbar' },
        ...[['yes', { en: 'Yes, there is lethal', es: 'Sí, hay lethal' }],
            ['no',  { en: 'No', es: 'No' }]].map(([v, label]) =>
          el('button', {
            class: 'btn btn--secondary', type: 'button',
            onclick: () => { answer = v; commit(v); },
          }, t(label))),
      ));
    },
    grade(given) {
      const correct = (given === 'yes') === pos.lethal;
      const detail = pos.lethal
        ? t({ en: `Lethal, in ${pos.line.length} actions: `, es: `Hay lethal, en ${pos.line.length} acciones: ` }) + describeLine(pos.state, pos.line)
        : t({ en: 'No line reaches their life total this turn. The search checked every ordering of every play and attack.',
              es: 'Ninguna línea llega a su total de vida este turno. La búsqueda revisó cada orden de cada jugada y cada ataque.' });
      return { correct, detail };
    },
  };
}

function makeCurve() {
  for (let attempt = 0; attempt < 200; attempt++) {
    M.resetUids();
    const hand = Array.from({ length: 3 + rnd(2) }, () => pick(['scout', 'runner', 'guard', 'knight', 'captain', 'bolt', 'strike', 'volley', 'study']));
    const mana = 3 + rnd(5);
    const s = M.makeState({ you: { mana, hand }, foe: { life: 20 } });
    const fits = exactCurveFits(s);
    if (!fits.best) continue;                  // only ask when a perfect spend exists
    let chosen = [];

    return {
      patternId: 'cards-curve',
      prompt: t({
        en: `You have ${mana} mana. Pick the cards that spend all of it.`,
        es: `Tienes ${mana} de maná. Elige las cartas que lo gasten todo.`,
      }),
      mount(host, commit) {
        const row = el('div', { class: 'handrow' });
        s.players[0].hand.forEach((id, i) => {
          const c = M.CARD_BY_ID[id];
          const btn = el('button', {
            class: 'handcard', type: 'button',
            onclick: () => {
              const at = chosen.indexOf(i);
              if (at >= 0) chosen.splice(at, 1); else chosen.push(i);
              btn.classList.toggle('is-picked', chosen.includes(i));
              total.textContent = `${chosen.reduce((a, j) => a + M.CARD_BY_ID[s.players[0].hand[j]].cost, 0)} / ${mana}`;
            },
          },
            el('span', { class: 'handcard__cost', text: String(c.cost) }),
            el('span', { class: 'handcard__name', text: c.name }),
            el('span', { class: 'handcard__body', text: cardLine(c) }),
          );
          row.appendChild(btn);
        });
        const total = el('span', { class: 'curvetotal', text: `0 / ${mana}` });
        host.appendChild(row);
        host.appendChild(el('div', { class: 'toolbar' }, total,
          el('button', { class: 'btn btn--secondary', type: 'button',
            onclick: () => commit([...chosen]) }, t({ en: 'Submit', es: 'Enviar' })),
        ));
      },
      grade(given) {
        const spent = (given || []).reduce((a, i) => a + M.CARD_BY_ID[s.players[0].hand[i]].cost, 0);
        const correct = spent === mana;
        const names = fits.fits.slice(0, 3)
          .map((f) => f.cards.map((id) => M.CARD_BY_ID[id].name).join(' + '));
        return {
          correct,
          detail: correct
            ? t({ en: `That is exactly ${mana}. `, es: `Eso es exactamente ${mana}. ` })
              + t({ en: 'Other exact spends here: ', es: 'Otros gastos exactos acá: ' }) + (names.join(' · ') || '-')
            : t({ en: `You spent ${spent} of ${mana}. An exact spend was available: `, es: `Gastaste ${spent} de ${mana}. Había un gasto exacto disponible: ` }) + names[0],
        };
      },
    };
  }
  return null;
}

function makeExchange() {
  M.resetUids();
  // Two shapes, so all three answers are reachable. A drill whose wrong
  // options are never right is answerable without understanding it.
  const sweeper = Math.random() < 0.5;

  let s, line, prompt;
  if (sweeper) {
    // Their board is small creatures; one Sweep answers several.
    const theirs = [pick(['scout', 'runner']), pick(['scout', 'runner', 'knight'])];
    if (Math.random() < 0.4) theirs.push(pick(['scout', 'runner']));
    s = M.makeState({
      you: { mana: 5, hand: ['sweep'], board: [] },
      foe: { life: 20, board: theirs.map((c) => ({ cardId: c, sick: false })) },
    });
    line = [{ kind: 'play', index: 0, cardId: 'sweep' }];
    prompt = { en: 'You cast Sweep, 3 damage to every enemy creature. What is the card exchange?',
               es: 'Lanzas Sweep, 3 de daño a cada criatura rival. ¿Cuál es el intercambio de cartas?' };
  } else {
    const theirs = pick(['knight', 'captain', 'runner', 'guard']);
    const answer = pick(['strike', 'banish']);
    s = M.makeState({
      you: { mana: 4, hand: [answer], board: [] },
      foe: { life: 20, board: [{ cardId: theirs, sick: false }] },
    });
    line = [{ kind: 'play', index: 0, cardId: answer, target: M.them(s).board[0].uid }];
    prompt = { en: 'You cast this removal on their creature. What is the card exchange?',
               es: 'Lanzas esta remoción sobre su criatura. ¿Cuál es el intercambio de cartas?' };
  }

  const truth = cardDelta(s, line);

  return {
    patternId: 'cards-two-for-one',
    prompt: t(prompt),
    mount(host, commit) {
      host.appendChild(boardView(s));
      host.appendChild(el('div', { class: 'toolbar' },
        ...[['-1', { en: 'A card behind', es: 'Una carta abajo' }],
            ['0',  { en: 'Even, one for one', es: 'Parejo, uno a uno' }],
            ['1',  { en: 'A card ahead', es: 'Una carta arriba' }],
            ['2',  { en: 'Two cards ahead', es: 'Dos cartas arriba' }]]
          .map(([v, label]) => el('button', {
            class: 'btn btn--secondary', type: 'button',
            onclick: () => commit(Number(v)),
          }, t(label))),
      ));
    },
    grade(given) {
      const word = truth.delta === 0
        ? t({ en: 'even', es: 'parejo' })
        : (truth.delta > 0 ? `+${truth.delta}` : String(truth.delta));
      return {
        correct: given === truth.delta,
        detail: t({
          en: `You spent ${truth.spent} card and removed ${truth.killed}, so the exchange is ${word}. `,
          es: `Gastaste ${truth.spent} carta y eliminaste ${truth.killed}, así que el intercambio es ${word}. `,
        }) + t(truth.delta > 0
          ? { en: 'Answering several cards with one is the whole of card advantage.',
              es: 'Responder varias cartas con una es toda la ventaja de cartas.' }
          : truth.delta < 0
            ? { en: 'Removal that fails to kill is a card spent for nothing. Check the damage against their health before you cast it.',
                es: 'Una remoción que no mata es una carta gastada en nada. Revisa el daño contra su vida antes de lanzarla.' }
            : { en: 'Removal is one for one by default. It only gets ahead when it answers two things, or kills something far more expensive.',
                es: 'La remoción es uno a uno por defecto. Solo queda arriba cuando responde dos cosas, o mata algo mucho más caro.' }),
      };
    },
  };
}

export function make(levelId) {
  if (levelId === 1) return makeLethal();
  if (levelId === 2) return makeCurve();
  return makeExchange();
}

// ── Small renderers ──────────────────────────────────────────

function cardLine(c) {
  if (c.type === M.CREATURE) return `${c.atk}/${c.hp}`;
  if (c.type === M.REMOVAL) return c.dmg >= 99 ? 'destroy' : `${c.dmg} dmg`;
  if (c.type === M.BURN) return `${c.dmg} dmg`;
  return `draw ${c.draws}`;
}

function creatureChip(c) {
  return el('div', { class: `mcreature${c.sick ? ' is-sick' : ''}` },
    el('span', { class: 'mcreature__name', text: c.name }),
    el('span', { class: 'mcreature__stats', text: `${c.atk}/${c.hp}` }),
  );
}

function boardView(s) {
  const you = s.players[0];
  const foe = s.players[1];
  return el('div', { class: 'mboard' },
    el('div', { class: 'mside' },
      el('div', { class: 'mside__label' },
        el('span', { text: t({ en: 'Opponent', es: 'Rival' }) }),
        el('strong', { class: 'mlife', text: `${foe.life} ${t({ en: 'life', es: 'vida' })}` }),
      ),
      el('div', { class: 'mrow' }, foe.board.length
        ? foe.board.map(creatureChip)
        : el('span', { class: 'mempty', text: t({ en: 'empty board', es: 'tablero vacío' }) })),
    ),
    el('div', { class: 'mside' },
      el('div', { class: 'mside__label' },
        el('span', { text: t({ en: 'You', es: 'Tú' }) }),
        el('strong', { class: 'mmana', text: `${you.mana} ${t({ en: 'mana', es: 'maná' })}` }),
      ),
      el('div', { class: 'mrow' }, you.board.length
        ? you.board.map(creatureChip)
        : el('span', { class: 'mempty', text: t({ en: 'empty board', es: 'tablero vacío' }) })),
      el('div', { class: 'mrow mrow--hand' }, you.hand.map((id) => {
        const c = M.CARD_BY_ID[id];
        return el('div', { class: 'mhandcard' },
          el('span', { class: 'handcard__cost', text: String(c.cost) }),
          el('span', { text: `${c.name} · ${cardLine(c)}` }),
        );
      })),
    ),
  );
}

function describeLine(s, line) {
  return line.map((a) => {
    if (a.kind === 'play') return `${M.CARD_BY_ID[a.cardId].name}${a.target === 'face' ? ' → face' : ''}`;
    const c = s.players[0].board.find((x) => x.uid === a.uid);
    return `${c ? c.name : 'creature'} ${t({ en: 'attacks', es: 'ataca' })}${a.target === 'face' ? '' : ' →'}`;
  }).join(', ');
}
