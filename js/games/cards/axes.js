// ── The axes a card game is actually judged on ───────────────
// Every claim in this module is an answer to one of these, and every system
// in systems-*.js fills all of them, so the comparison is a table rather than
// a set of opinions about games I happen to like.

export const coreRule = {
  title: {
    en: 'Casual card games are judged on four things balance has nothing to do with',
    es: 'Los juegos de cartas casuales se juzgan por cuatro cosas que no dependen del balance',
  },
  body: {
    en: `Competitive design argues about balance, because a tournament is decided
by it. A game played once at a kitchen table is decided by something else
entirely: how long it takes to teach, whether the person losing can still come
back, how long you sit doing nothing between turns, and whether you can be
knocked out early and left watching. Every casual card game that worked is a
specific set of answers to those four. Every one that died at the table got one
of them wrong, and usually it was not the maths.`,
    es: `El diseño competitivo discute sobre balance, porque un torneo se decide
por eso. Una partida jugada una vez en la mesa de la cocina se decide por otra
cosa: cuánto demora enseñarla, si quien va perdiendo todavía puede remontar,
cuánto rato estás sin hacer nada entre turnos, y si te pueden eliminar temprano
y dejarte mirando. Cada juego de cartas casual que funcionó es un conjunto
concreto de respuestas a esas cuatro. Cada uno que murió en la mesa falló en
alguna, y casi nunca fue en las matemáticas.`,
  },
  formula: 'teach + catch-up + downtime + elimination',
};

/**
 * The four casual axes, then the four structural ones. Order matters: the
 * teardown sorts and colours by these, and the first four are the ones a
 * designer building for a kitchen table should read first.
 */
export const AXES = [
  {
    id: 'teach',
    group: 'casual',
    label: { en: 'Time to teach', es: 'Tiempo para enseñar' },
    hint: {
      en: 'Minutes from opening the box to the first real turn. The single best predictor of whether a game gets played twice.',
      es: 'Minutos desde abrir la caja hasta el primer turno real. El mejor predictor de si un juego se juega una segunda vez.',
    },
    kind: 'minutes',
  },
  {
    id: 'catchup',
    group: 'casual',
    label: { en: 'Can you come back?', es: '¿Se puede remontar?' },
    hint: {
      en: 'What the game does for the player who is behind. With nothing here, a decided game still takes its full length to finish.',
      es: 'Qué hace el juego por quien va perdiendo. Sin nada acá, una partida ya decidida igual dura hasta el final.',
    },
    kind: 'scale',
    scale: {
      none:   { en: 'Nothing',        es: 'Nada' },
      weak:   { en: 'A little',       es: 'Poco' },
      strong: { en: 'Built in',       es: 'Incorporado' },
    },
  },
  {
    id: 'downtime',
    group: 'casual',
    label: { en: 'Waiting between turns', es: 'Espera entre turnos' },
    hint: {
      en: 'How long you do nothing. Simultaneous play removes it entirely, which is why drafting games scale to six players and turn-based ones do not.',
      es: 'Cuánto rato no haces nada. El juego simultáneo la elimina, y por eso los juegos de draft escalan a seis jugadores y los por turnos no.',
    },
    kind: 'scale',
    scale: {
      none: { en: 'None, simultaneous', es: 'Ninguna, simultáneo' },
      low:  { en: 'Short',              es: 'Corta' },
      high: { en: 'Long',               es: 'Larga' },
    },
  },
  {
    id: 'elimination',
    group: 'casual',
    label: { en: 'Can you be knocked out?', es: '¿Te pueden eliminar?' },
    hint: {
      en: 'Being eliminated early is the worst outcome a casual game can produce: the person is still at the table, and no longer playing.',
      es: 'Ser eliminado temprano es lo peor que puede producir un juego casual: la persona sigue en la mesa y ya no está jugando.',
    },
    kind: 'scale',
    scale: {
      no:   { en: 'No',              es: 'No' },
      late: { en: 'Only near the end', es: 'Solo cerca del final' },
      yes:  { en: 'Yes, early',      es: 'Sí, temprano' },
    },
  },
  {
    id: 'resource',
    group: 'structure',
    label: { en: 'Where cost comes from', es: 'De dónde sale el costo' },
    hint: {
      en: 'The backbone. Pick this before designing a single card, because speed, variance and how combo-prone the game is all fall out of it.',
      es: 'La columna vertebral. Elígelo antes de diseñar una sola carta: la velocidad, la varianza y cuánto se presta para combos salen de acá.',
    },
    kind: 'text',
  },
  {
    id: 'information',
    group: 'structure',
    label: { en: 'What is hidden', es: 'Qué está oculto' },
    hint: {
      en: 'Hidden information is what makes bluffing possible and solvers impossible.',
      es: 'La información oculta es lo que hace posible el engaño e imposible un solver.',
    },
    kind: 'text',
  },
  {
    id: 'interaction',
    group: 'structure',
    label: { en: 'How players touch each other', es: 'Cómo se afectan los jugadores' },
    hint: {
      en: 'Direct attacks create stories and grudges. No interaction creates parallel solitaire, which is calmer and more forgettable.',
      es: 'Los ataques directos generan historias y rencores. Sin interacción queda un solitario paralelo, más tranquilo y más olvidable.',
    },
    kind: 'scale',
    scale: {
      none:     { en: 'Barely any',   es: 'Casi ninguna' },
      indirect: { en: 'Indirect',     es: 'Indirecta' },
      direct:   { en: 'Direct',       es: 'Directa' },
    },
  },
  {
    id: 'entry',
    group: 'structure',
    label: { en: 'Cost to start', es: 'Costo de entrada' },
    hint: {
      en: 'What a new player buys to play a real game. This decides who ever becomes a player at all.',
      es: 'Qué compra alguien nuevo para jugar una partida de verdad. Esto decide quién llega a ser jugador.',
    },
    kind: 'text',
  },
];

export const AXIS_BY_ID = Object.fromEntries(AXES.map((a) => [a.id, a]));
