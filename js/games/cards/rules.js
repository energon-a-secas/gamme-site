// ── Rules view: the switches a card game designer actually sets ──
// Not toggles that change a running game (there is no board here yet), but the
// decisions themselves, phrased as the choice and its consequence. Picking one
// filters the teardown to the games that made that choice.

import { el } from '../../utils.js';
import { state, t } from '../../state.js';
import { SYSTEMS } from './systems.js';

const DECISIONS = [
  {
    id: 'resource',
    q: { en: 'Where does cost come from?', es: '¿De dónde sale el costo?' },
    options: [
      { label: { en: 'A card slot in the deck', es: 'Un espacio de carta en el mazo' },
        who: ['magic', 'mitosyleyendas'],
        so: { en: 'Deckbuilding becomes a real cost, and you inherit screw and flood.',
              es: 'Construir el mazo pasa a ser un costo real, y heredas sequía e inundación.' } },
      { label: { en: 'Automatic each turn', es: 'Automático cada turno' },
        who: ['hearthstone'],
        so: { en: 'Variance drops and so does agency. Fairer and flatter in one move.',
              es: 'Baja la varianza y también la agencia. Más justo y más plano de una sola vez.' } },
      { label: { en: 'Nothing at all', es: 'Nada' },
        who: ['yugioh'],
        so: { en: 'Power moves into card text, and a banlist does the balancing.',
              es: 'El poder se va al texto de las cartas, y una lista de prohibidas hace el balance.' } },
      { label: { en: 'Your hand, or your turn', es: 'Tu mano, o tu turno' },
        who: ['uno', 'carioca', 'loveletter', 'sushigo', 'dominion'],
        so: { en: 'No economy to teach. This is what almost every casual hit picks.',
              es: 'No hay economía que enseñar. Esto es lo que elige casi todo éxito casual.' } },
      { label: { en: 'Chips, or a bet', es: 'Fichas, o una apuesta' },
        who: ['holdem', 'truco'],
        so: { en: 'The resource is also the score, which is why bluffing means something.',
              es: 'El recurso es también el puntaje, y por eso el engaño significa algo.' } },
    ],
  },
  {
    id: 'elimination',
    q: { en: 'Can a player be knocked out?', es: '¿Se puede eliminar a un jugador?' },
    options: [
      { label: { en: 'No', es: 'No' }, who: ['uno', 'carioca', 'truco', 'dominion', 'sushigo', 'thecrew'],
        so: { en: 'Everyone is still playing at the end. The safest choice for a table that plays once.',
              es: 'Todos siguen jugando al final. La opción más segura para una mesa que juega una vez.' } },
      { label: { en: 'Yes, but the round is short', es: 'Sí, pero la ronda es corta' }, who: ['loveletter'],
        so: { en: 'Elimination stops costing anything once the next round is two minutes away.',
              es: 'La eliminación deja de costar cuando la ronda siguiente está a dos minutos.' } },
      { label: { en: 'Yes, early, in a long game', es: 'Sí, temprano, en una partida larga' },
        who: ['holdem', 'explodingkittens', 'magic', 'yugioh', 'hearthstone', 'mitosyleyendas'],
        so: { en: 'Someone sits and watches. Fine for a tournament, expensive at a kitchen table.',
              es: 'Alguien se queda mirando. Aceptable en un torneo, caro en la mesa de la cocina.' } },
    ],
  },
  {
    id: 'downtime',
    q: { en: 'What happens between your turns?', es: '¿Qué pasa entre tus turnos?' },
    options: [
      { label: { en: 'Everyone plays at once', es: 'Todos juegan a la vez' }, who: ['sushigo'],
        so: { en: 'Downtime is zero, and the game scales to more players for free.',
              es: 'La espera es cero, y el juego escala a más jugadores gratis.' } },
      { label: { en: 'You wait your turn', es: 'Esperas tu turno' },
        who: ['uno', 'truco', 'loveletter', 'explodingkittens', 'thecrew', 'holdem', 'hearthstone'],
        so: { en: 'Workable while turns stay short. It is turn length, not turn order, that hurts.',
              es: 'Funciona mientras los turnos sean cortos. Lo que molesta es la duración del turno, no el orden.' } },
      { label: { en: 'You watch a long turn', es: 'Miras un turno largo' },
        who: ['carioca', 'dominion', 'magic', 'yugioh', 'mitosyleyendas'],
        so: { en: 'The cost scales with player count, and it is what caps most engine games at four.',
              es: 'El costo crece con la cantidad de jugadores, y es lo que limita a cuatro a casi todo juego de motor.' } },
    ],
  },
];

export function rulesView(host, ctx) {
  const lang = state.lang;
  let picked = null;

  const root = el('div', { class: 'stack stack--loose' });
  host.appendChild(root);

  function draw() {
    root.replaceChildren(
      el('section', { class: 'section' },
        el('div', { class: 'section__titles' },
          el('h2', { class: 'section__title', text: lang === 'es' ? 'Las decisiones' : 'The decisions' }),
          el('p', { class: 'section__lead', text: lang === 'es'
            ? 'Estas son las elecciones que definen un juego de cartas antes de diseñar una sola carta. Elige una y mira quién la tomó.'
            : 'These are the choices that define a card game before a single card is designed. Pick one and see who made it.' }),
        ),
      ),
      ...DECISIONS.map(decisionBlock),
    );
  }

  function decisionBlock(d) {
    return el('section', { class: 'section' },
      el('h3', { class: 'decision__q', text: t(d.q) }),
      el('div', { class: 'decision__opts' },
        ...d.options.map((o) => {
          const key = `${d.id}:${t(o.label, 'en')}`;
          const open = picked === key;
          return el('button', {
            class: `decision__opt${open ? ' is-open' : ''}`,
            type: 'button',
            onclick: () => { picked = open ? null : key; draw(); },
          },
            el('span', { class: 'decision__label', text: t(o.label) }),
            el('span', { class: 'decision__count', text: String(o.who.length) }),
            open ? el('span', { class: 'decision__so', text: t(o.so) }) : null,
            open ? el('span', { class: 'decision__who', text: o.who
              .map((id) => (SYSTEMS.find((s) => s.id === id) || {}).name)
              .filter(Boolean).join(' · ') }) : null,
          );
        }),
      ),
    );
  }

  draw();
  return () => {};
}
