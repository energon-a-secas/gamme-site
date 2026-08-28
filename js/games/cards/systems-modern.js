// ── Modern casual ────────────────────────────────────────────
// Designed games, mostly post-2008, that reached players who do not think of
// themselves as gamers. Each one solved a specific casual axis so well that it
// spawned a genre.

export const MODERN = [
  {
    id: 'dominion',
    name: 'Dominion',
    year: 2008,
    origin: { en: 'Donald X. Vaccarino', es: 'Donald X. Vaccarino' },
    family: { en: 'Deckbuilding', es: 'Construcción de mazo' },
    casual: 4,
    teach: 15,
    catchup: 'none',
    downtime: 'high',
    elimination: 'no',
    resource: {
      en: 'Actions, buys and coins, all reset every turn. Nothing carries over, so a turn is a closed puzzle.',
      es: 'Acciones, compras y monedas, todo se reinicia cada turno. Nada se arrastra, así que un turno es un puzzle cerrado.',
    },
    information: { en: 'The market is public; your deck order is not', es: 'El mercado es público; el orden de tu mazo no' },
    interaction: 'none',
    entry: { en: 'One box, no boosters, ever', es: 'Una caja, sin sobres, nunca' },
    works: {
      en: `It moved deckbuilding from something you do at home for money into
something you do at the table in forty minutes. That single move is why the genre
exists. The ten-kingdom setup also means the game is different every session
without anyone buying anything, which is the collectible model's appeal without
the collectible model's cost.`,
      es: `Movió la construcción de mazo desde algo que haces en tu casa y con
plata a algo que haces en la mesa en cuarenta minutos. Ese solo movimiento es la
razón de que exista el género. Además, el montaje de diez reinos hace que la
partida sea distinta cada sesión sin que nadie compre nada, que es el atractivo
del modelo coleccionable sin su costo.`,
    },
    failure: {
      en: 'Parallel solitaire. With almost no interaction, a player who falls behind has nothing to do about it and no one to blame, which is a quiet way to lose a table.',
      es: 'Solitario paralelo. Casi sin interacción, quien se queda atrás no puede hacer nada al respecto ni a quién culpar, y esa es una forma silenciosa de perder la mesa.',
    },
    lesson: {
      en: 'Variable setup beats sold expansions. Ten piles out of twenty-five gave it replayability that a booster pack charges for.',
      es: 'El montaje variable le gana a las expansiones vendidas. Diez pilas de veinticinco le dieron una rejugabilidad que un sobre cobra.',
    },
  },
  {
    id: 'loveletter',
    name: 'Love Letter',
    year: 2012,
    origin: { en: 'Seiji Kanai', es: 'Seiji Kanai' },
    family: { en: 'Micro deduction', es: 'Deducción mínima' },
    casual: 5,
    teach: 2,
    catchup: 'strong',
    downtime: 'low',
    elimination: 'late',
    resource: {
      en: 'One card in hand, one drawn. You always choose between exactly two things.',
      es: 'Una carta en mano, una robada. Siempre eliges entre exactamente dos cosas.',
    },
    information: { en: 'One hidden card each, and every discard is a public clue', es: 'Una carta oculta por jugador, y cada descarte es una pista pública' },
    interaction: 'direct',
    entry: { en: 'Sixteen cards', es: 'Dieciséis cartas' },
    works: {
      en: `Sixteen cards and a two-minute round. Elimination exists but costs you
almost nothing, because the next round starts before you have finished being
annoyed. It is the clearest proof on this list that depth is not the same as
component count.`,
      es: `Dieciséis cartas y una ronda de dos minutos. La eliminación existe pero
casi no te cuesta, porque la ronda siguiente empieza antes de que termines de
molestarte. Es la prueba más clara de esta lista de que la profundidad no es lo
mismo que la cantidad de componentes.`,
    },
    failure: {
      en: 'At two players it thins into a coin flip; the deduction needs a table to have anything to deduce from.',
      es: 'Con dos jugadores se adelgaza hasta ser cara o sello; la deducción necesita una mesa para tener de dónde deducir.',
    },
    lesson: {
      en: 'Make the round short enough that elimination stops mattering. It is cheaper than designing elimination out.',
      es: 'Haz la ronda tan corta que la eliminación deje de importar. Sale más barato que diseñar sin eliminación.',
    },
  },
  {
    id: 'sushigo',
    name: 'Sushi Go!',
    year: 2013,
    origin: { en: 'Phil Walker-Harding', es: 'Phil Walker-Harding' },
    family: { en: 'Card drafting', es: 'Draft de cartas' },
    casual: 5,
    teach: 5,
    catchup: 'weak',
    downtime: 'none',
    elimination: 'no',
    resource: {
      en: 'The hand you pass. Taking a card is free; what it costs is handing the rest to your neighbour.',
      es: 'La mano que pasas. Tomar una carta es gratis; lo que cuesta es entregarle el resto a tu vecino.',
    },
    information: { en: 'You see your current hand and every played card', es: 'Ves tu mano actual y cada carta jugada' },
    interaction: 'indirect',
    entry: { en: 'One small box', es: 'Una caja chica' },
    works: {
      en: `Everyone chooses at once, so downtime is zero and the game plays the
same at two players or six. Drafting also makes denial a normal move rather than
an attack: taking the card someone needs is just playing, so the interaction
never turns personal.`,
      es: `Todos eligen a la vez, así que la espera es cero y el juego funciona
igual con dos jugadores que con seis. El draft además convierte la negación en
una jugada normal y no en un ataque: quitarle la carta que alguien necesita es
simplemente jugar, así que la interacción nunca se vuelve personal.`,
    },
    failure: {
      en: 'The scoring is thin enough that experienced players converge on the same picks, and the game stops surprising them.',
      es: 'El puntaje es lo bastante simple como para que jugadores con experiencia converjan en las mismas elecciones, y el juego deja de sorprenderlos.',
    },
    lesson: {
      en: 'Simultaneous choice is the cheapest fix for downtime, and it is the reason a drafting game scales where a turn-based one cannot.',
      es: 'La elección simultánea es el arreglo más barato para la espera, y es la razón de que un juego de draft escale donde uno por turnos no puede.',
    },
  },
  {
    id: 'explodingkittens',
    name: 'Exploding Kittens',
    year: 2015,
    origin: { en: 'Elan Lee, Matthew Inman, Shane Small', es: 'Elan Lee, Matthew Inman, Shane Small' },
    family: { en: 'Press your luck', es: 'Tienta tu suerte' },
    casual: 5,
    teach: 3,
    catchup: 'weak',
    downtime: 'low',
    elimination: 'yes',
    resource: {
      en: 'The deck itself. Every draw is the cost, and the danger grows as it shrinks.',
      es: 'El mazo mismo. Cada robo es el costo, y el peligro crece a medida que se achica.',
    },
    information: { en: 'Hidden hands, and a deck whose composition everyone can count', es: 'Manos ocultas, y un mazo cuya composición todos pueden contar' },
    interaction: 'direct',
    entry: { en: 'One box', es: 'Una caja' },
    works: {
      en: `It is on this list for the part designers skip: it sold on art, voice
and a name you repeat at a party, not on mechanics. Mechanically it is a light
press-your-luck game with elimination. Commercially it was one of the most-backed
crowdfunding projects ever run. Both facts are true at once and the second one
did not come from the first.`,
      es: `Está en esta lista por la parte que los diseñadores se saltan: se vendió
por el arte, el tono y un nombre que repites en una fiesta, no por sus mecánicas.
Mecánicamente es un juego liviano de tentar la suerte con eliminación.
Comercialmente fue uno de los proyectos de financiamiento colectivo más apoyados
de la historia. Las dos cosas son ciertas a la vez, y la segunda no salió de la
primera.`,
    },
    failure: {
      en: 'Early elimination in a game that runs long enough for it to hurt, which is the exact combination Love Letter avoids.',
      es: 'Eliminación temprana en un juego que dura lo suficiente para que duela, justo la combinación que Love Letter evita.',
    },
    lesson: {
      en: 'Theme and voice can carry a mechanically thin game to a mass audience. Worth knowing honestly, in both directions.',
      es: 'El tema y el tono pueden llevar un juego mecánicamente flaco a un público masivo. Conviene saberlo con honestidad, en los dos sentidos.',
    },
  },
  {
    id: 'thecrew',
    name: 'The Crew',
    year: 2019,
    origin: { en: 'Thomas Sing', es: 'Thomas Sing' },
    family: { en: 'Cooperative trick taking', es: 'Bazas cooperativo' },
    casual: 4,
    teach: 10,
    catchup: 'strong',
    downtime: 'low',
    elimination: 'no',
    resource: {
      en: 'Communication. You get almost none, and spending it is the whole decision.',
      es: 'La comunicación. Recibes casi nada, y gastarla es toda la decisión.',
    },
    information: { en: 'Hidden hands you are trying to describe without being allowed to speak', es: 'Manos ocultas que intentas describir sin permiso para hablar' },
    interaction: 'direct',
    entry: { en: 'One small box', es: 'Una caja chica' },
    works: {
      en: `It took the oldest card structure there is and made the opponent the
puzzle instead of the other players. Restricting communication to a single token
turns a solved genre back into a hard problem, and losing together removes the
sting that stops casual players from returning to a game they lost.`,
      es: `Tomó la estructura de cartas más antigua que existe y convirtió el
rival en el puzzle, en vez de los otros jugadores. Restringir la comunicación a
una sola ficha vuelve difícil un género resuelto, y perder juntos saca el aguijón
que impide que un jugador casual vuelva a un juego que perdió.`,
    },
    failure: {
      en: 'One confident player can quietly take over and play everyone else’s hand for them, which is the standard cooperative failure.',
      es: 'Un jugador seguro de sí mismo puede tomarse la partida y jugar la mano de todos, que es la falla clásica de los cooperativos.',
    },
    lesson: {
      en: 'Restricting communication generates difficulty for free. It is the cheapest source of tension in cooperative design.',
      es: 'Restringir la comunicación genera dificultad gratis. Es la fuente de tensión más barata del diseño cooperativo.',
    },
  },
];
