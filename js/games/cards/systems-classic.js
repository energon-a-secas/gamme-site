// ── Classics ─────────────────────────────────────────────────
// Traditional and mass-market games. None of them were designed by a studio
// with a balance team, and several are older than the hobby that studies them,
// which is exactly why they are worth reading: they survived on the four
// casual axes alone.

export const CLASSIC = [
  {
    id: 'uno',
    name: 'UNO',
    year: 1971,
    origin: { en: 'United States', es: 'Estados Unidos' },
    family: { en: 'Hand shedding', es: 'Descarte de mano' },
    casual: 5,
    teach: 3,
    catchup: 'strong',
    downtime: 'low',
    elimination: 'no',
    resource: {
      en: 'Your hand is the resource. Playing a card is free; the cost is that you wanted it later.',
      es: 'Tu mano es el recurso. Jugar una carta es gratis; el costo es que la querías después.',
    },
    information: { en: 'Everyone hides their hand, and its size is public', es: 'Todos ocultan la mano, y su tamaño es público' },
    interaction: 'direct',
    entry: { en: 'One deck', es: 'Un mazo' },
    works: {
      en: `Draw Two and Wild Draw Four are catch-up disguised as aggression: they
are almost always aimed at whoever is about to win, so the leader is punished by
the table rather than by a rule. That is the whole design. It needs no balance
pass because the players do the balancing.`,
      es: `El +2 y el +4 son mecánicas de remontada disfrazadas de agresión: casi
siempre se apuntan a quien está por ganar, así que al líder lo castiga la mesa y
no una regla. Ese es todo el diseño. No necesita ajuste de balance porque los
jugadores balancean solos.`,
    },
    failure: {
      en: 'Stacking penalties, which almost every table house-rules in, can push a round past the point where anyone is making a decision.',
      es: 'Acumular penalizaciones, que casi toda mesa agrega como regla de la casa, puede estirar la ronda hasta que nadie decide nada.',
    },
    lesson: {
      en: 'Let the table aim the catch-up mechanism. A rule that punishes the leader feels unfair; a card that lets a player do it feels like justice.',
      es: 'Deja que la mesa apunte la remontada. Una regla que castiga al líder se siente injusta; una carta que permite hacerlo se siente justicia.',
    },
  },
  {
    id: 'carioca',
    name: 'Carioca',
    year: null,
    origin: { en: 'Chile and the Southern Cone', es: 'Chile y el Cono Sur' },
    family: { en: 'Progressive rummy', es: 'Rummy progresivo' },
    casual: 4,
    teach: 10,
    catchup: 'weak',
    downtime: 'high',
    elimination: 'no',
    resource: {
      en: 'One draw and one discard per turn. The scarce thing is turns, not cards.',
      es: 'Un robo y un descarte por turno. Lo escaso son los turnos, no las cartas.',
    },
    information: { en: 'Hidden hands, and the discard pile is a public record of what everyone wanted', es: 'Manos ocultas, y el pozo de descarte es un registro público de lo que cada uno quiso' },
    interaction: 'indirect',
    entry: { en: 'Two decks with jokers', es: 'Dos mazos con comodines' },
    works: {
      en: `The contract changes every hand: two trios, then a trio and a run, and
so on for the whole ladder. A player who is losing badly gets a fresh problem in
a few minutes rather than a lost position to sit inside. The score carries over,
but the hand does not, and that split is why a long game keeps its table.`,
      es: `El contrato cambia en cada mano: dos tríos, después trío y escala, y así
por toda la escalera. Quien va perdiendo feo recibe un problema nuevo en pocos
minutos, en vez de una posición perdida donde quedarse sentado. El puntaje se
arrastra, la mano no, y esa separación es la razón de que una partida larga
conserve a su mesa.`,
    },
    failure: {
      en: 'The full ladder runs long, and downtime grows with the player count. Six players means watching five people think.',
      es: 'La escalera completa se hace larga, y la espera crece con la cantidad de jugadores. Seis jugadores es mirar pensar a cinco.',
    },
    lesson: {
      en: 'Reset the problem without resetting the score. It keeps a long session alive without throwing away what people already earned.',
      es: 'Reinicia el problema sin reiniciar el puntaje. Mantiene viva una sesión larga sin botar lo que la gente ya ganó.',
    },
  },
  {
    id: 'truco',
    name: 'Truco',
    year: null,
    origin: { en: 'Argentina, Uruguay, Chile, Brazil', es: 'Argentina, Uruguay, Chile, Brasil' },
    family: { en: 'Trick taking with betting', es: 'Bazas con apuesta' },
    casual: 4,
    teach: 20,
    catchup: 'strong',
    downtime: 'low',
    elimination: 'no',
    resource: {
      en: 'Three cards, and your willingness to raise. The bet is the resource, not the cards.',
      es: 'Tres cartas, y tu disposición a subir. La apuesta es el recurso, no las cartas.',
    },
    information: { en: 'Hidden hands, plus signals across the table that opponents may see', es: 'Manos ocultas, más señas entre compañeros que los rivales pueden ver' },
    interaction: 'direct',
    entry: { en: 'One Spanish deck', es: 'Una baraja española' },
    works: {
      en: `Raising with a bad hand is the game, not an exploit of it. Because a
hand is only three cards, everyone knows the odds are thin, so the bet is read as
a claim about you rather than about your cards. That is the rare thing here: the
skill being tested is social, and it does not decay as players learn.`,
      es: `Subir con mala mano es el juego, no un abuso del juego. Como la mano es
de solo tres cartas, todos saben que las probabilidades son flacas, así que la
apuesta se lee como una afirmación sobre ti y no sobre tus cartas. Eso es lo raro
acá: la habilidad que se pone a prueba es social, y no se gasta a medida que los
jugadores aprenden.`,
    },
    failure: {
      en: 'Twenty minutes to teach, and the regional variants disagree on the card ranking. Two tables can both be playing Truco and not the same game.',
      es: 'Veinte minutos para enseñar, y las variantes regionales no coinciden en el orden de las cartas. Dos mesas pueden jugar Truco y no jugar lo mismo.',
    },
    lesson: {
      en: 'A tiny hand makes bluffing legible. With three cards nobody can claim a strong hand was likely, so the read is on the person.',
      es: 'Una mano diminuta hace legible el engaño. Con tres cartas nadie puede alegar que una mano fuerte era probable, así que la lectura es sobre la persona.',
    },
  },
  {
    id: 'holdem',
    name: "Texas Hold'em",
    year: null,
    origin: { en: 'United States', es: 'Estados Unidos' },
    family: { en: 'Betting with community cards', es: 'Apuesta con cartas comunitarias' },
    casual: 3,
    teach: 15,
    catchup: 'none',
    downtime: 'low',
    elimination: 'yes',
    resource: {
      en: 'Chips. The only true resource system on this list where the resource is also the score.',
      es: 'Fichas. El único sistema de esta lista donde el recurso es también el puntaje.',
    },
    information: { en: 'Two hidden cards each, five shared. Almost everything is public.', es: 'Dos cartas ocultas por jugador, cinco compartidas. Casi todo es público.' },
    interaction: 'direct',
    entry: { en: 'A deck and something to bet with', es: 'Un mazo y algo con que apostar' },
    works: {
      en: `Five shared cards mean players are mostly reasoning about the same
information, so the difference between them is judgement rather than luck of the
deal. It is the cleanest hidden-information design ever built, and it is public
domain, which is why every studio reaches for it.`,
      es: `Cinco cartas compartidas hacen que los jugadores razonen casi sobre la
misma información, así que la diferencia entre ellos es criterio y no suerte del
reparto. Es el diseño de información oculta más limpio que existe, y es de
dominio público, por eso todo estudio lo toma prestado.`,
    },
    failure: {
      en: 'Elimination, and no catch-up at all. The first player out watches the rest of the night, which is why it fails as a party game and thrives as a tournament.',
      es: 'Eliminación, y ninguna remontada. El primero en salir mira el resto de la noche, por eso fracasa como juego de fiesta y prospera como torneo.',
    },
    lesson: {
      en: 'Shared information makes a bluff readable. If nobody can estimate what you might have, betting is noise rather than a claim.',
      es: 'La información compartida hace legible un engaño. Si nadie puede estimar lo que podrías tener, apostar es ruido y no una afirmación.',
    },
  },
];
