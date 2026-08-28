// ── Player-side patterns ─────────────────────────────────────
// What to do at the table, as opposed to the teardown's what to build. Every
// pattern here reduces to the core rule, and the ones the drills grade are the
// ones a search can settle.

export const coreRule = {
  title: {
    en: 'Every play trades cards for tempo, or tempo for cards',
    es: 'Cada jugada cambia cartas por tempo, o tempo por cartas',
  },
  body: {
    en: `Cards are how many options you still have. Tempo is how much of the
board you control right now. Almost nothing gives you both, and the loser is
whoever runs out of the one their plan needed. That is the whole frame: before
any play, ask which of the two it buys and which it spends. A removal spell
buys tempo and spends a card. A cheap creature left unanswered buys both, which
is why it is the strongest thing in most card games and the hardest to price.`,
    es: `Las cartas son cuántas opciones te quedan. El tempo es cuánto del
tablero controlas ahora. Casi nada te da las dos, y pierde quien se queda sin la
que su plan necesitaba. Ese es todo el marco: antes de cualquier jugada,
pregunta cuál de las dos compra y cuál gasta. Una carta de remoción compra tempo
y gasta una carta. Una criatura barata que nadie responde compra las dos, y por
eso es lo más fuerte en casi todo juego de cartas y lo más difícil de valorar.`,
  },
  formula: 'cards ↔ tempo',
};

export const patterns = [
  {
    id: 'cards-lethal',
    tier: 1,
    name: { en: 'Count lethal first', es: 'Cuenta el lethal primero' },
    trigger: {
      en: 'Every single turn, before you consider anything else.',
      es: 'En cada turno, antes de considerar cualquier otra cosa.',
    },
    action: {
      en: 'Add up every point of damage available this turn. If it reaches their life total, nothing else about the position matters.',
      es: 'Suma cada punto de daño disponible este turno. Si llega a su total de vida, nada más de la posición importa.',
    },
    why: {
      en: `The most common loss in a card game is a turn where lethal was on the
board and the player was busy making a good long-term play. Lethal is the one
question with a provable yes or no, so it is the one you answer first and never
by feel.`,
      es: `La derrota más común en un juego de cartas es un turno donde el lethal
estaba en la mesa y el jugador estaba ocupado haciendo una buena jugada a largo
plazo. El lethal es la única pregunta con un sí o un no demostrable, así que es
la primera que respondes y nunca por intuición.`,
    },
    tags: ['damage', 'checklist'],
  },
  {
    id: 'cards-curve',
    tier: 1,
    name: { en: 'Spend your whole turn', es: 'Gasta el turno completo' },
    trigger: {
      en: 'You have mana left over at the end of your turn.',
      es: 'Te sobra maná al terminar tu turno.',
    },
    action: {
      en: 'Find the combination of cards that spends all of it. Unspent mana is a turn you partly skipped.',
      es: 'Encuentra la combinación de cartas que lo gaste todo. El maná sin gastar es un turno que te saltaste a medias.',
    },
    why: {
      en: `Mana does not carry over. A point unspent is gone, and across ten
turns that is several free cards handed to the opponent. This is the single
cheapest improvement available to a new player, and it is pure arithmetic:
which subset of your hand adds up to what you have.`,
      es: `El maná no se acumula. Un punto sin gastar se pierde, y a lo largo de
diez turnos eso son varias cartas gratis regaladas al rival. Es la mejora más
barata que tiene disponible alguien que recién empieza, y es pura aritmética:
qué subconjunto de tu mano suma lo que tienes.`,
    },
    tags: ['tempo', 'arithmetic'],
  },
  {
    id: 'cards-two-for-one',
    tier: 2,
    name: { en: 'The two for one', es: 'El dos por uno' },
    trigger: {
      en: 'One of your cards can answer two of theirs, or theirs answered two of yours.',
      es: 'Una de tus cartas puede responder dos de las suyas, o una suya respondió dos tuyas.',
    },
    action: {
      en: 'Count the exchange. Spending one to remove two puts you a card ahead, and card advantage is what decides a game that goes long.',
      es: 'Cuenta el intercambio. Gastar una para eliminar dos te deja una carta arriba, y la ventaja de cartas decide las partidas largas.',
    },
    why: {
      en: `Both players draw one card a turn, so the only way to end up with
more options than your opponent is an exchange that was not one for one. Every
long game is decided by the running total of these, and the total is countable
rather than felt.`,
      es: `Los dos jugadores roban una carta por turno, así que la única forma de
terminar con más opciones que tu rival es un intercambio que no fue uno a uno.
Toda partida larga se decide por la suma de estos, y esa suma se cuenta en vez
de sentirse.`,
    },
    tags: ['card advantage'],
  },
  {
    id: 'cards-trade-up',
    tier: 2,
    name: { en: 'Trade up, never down', es: 'Cambia hacia arriba, nunca hacia abajo' },
    trigger: {
      en: 'Your creature can attack into theirs.',
      es: 'Tu criatura puede atacar a la suya.',
    },
    action: {
      en: 'Take the trade only when yours survives and theirs does not, or when theirs cost more. Attacking into a bigger creature spends a card to accomplish nothing.',
      es: 'Toma el cambio solo si la tuya sobrevive y la suya no, o si la suya costó más. Atacar a una criatura más grande gasta una carta sin lograr nada.',
    },
    why: {
      en: `A trade is an exchange of mana as well as cards. Killing a four-cost
creature with a two-cost one wins twice: you are up a card in the exchange and
up two mana across the game. The board is the ledger where both are visible.`,
      es: `Un cambio es un intercambio de maná además de cartas. Matar una
criatura de costo cuatro con una de costo dos gana dos veces: quedas arriba en
cartas y arriba dos de maná en la partida. El tablero es el libro donde ambas
cosas se ven.`,
    },
    tags: ['combat', 'tempo'],
  },
  {
    id: 'cards-beatdown',
    tier: 3,
    name: { en: 'Decide who is the beatdown', es: 'Decide quién es el agresor' },
    trigger: {
      en: 'Both players have a working plan and neither is obviously ahead.',
      es: 'Los dos jugadores tienen un plan que funciona y ninguno va claramente arriba.',
    },
    action: {
      en: 'Work out whose position improves if the game goes long. That player defends. The other one has to attack, even from behind.',
      es: 'Determina a quién le mejora la posición si la partida se alarga. Ese jugador defiende. El otro tiene que atacar, incluso desde atrás.',
    },
    why: {
      en: `The classic mistake is both players defending, which hands the game
to whoever scales better. Whether you are the aggressor is not a matter of
temperament or of who is winning right now: it is decided by which deck is
favoured on turn fifteen. Guess wrong and every individually reasonable play
loses.`,
      es: `El error clásico es que los dos jugadores defiendan, lo que le entrega
la partida a quien escala mejor. Ser el agresor no es cosa de carácter ni de
quién va ganando ahora: lo decide qué mazo está favorecido en el turno quince.
Si te equivocas, cada jugada razonable por separado igual pierde.`,
    },
    tags: ['plan', 'matchup'],
  },
  {
    id: 'cards-play-around',
    tier: 3,
    name: { en: 'Play around the card that beats you', es: 'Juega alrededor de la carta que te gana' },
    trigger: {
      en: 'You are about to commit everything, and they have cards in hand.',
      es: 'Estás por comprometer todo, y ellos tienen cartas en mano.',
    },
    action: {
      en: 'Ask which single card would punish this line hardest, then take the line that survives it if the cost of doing so is small.',
      es: 'Pregunta qué carta única castigaría más esta línea, y toma la línea que la sobreviva si el costo de hacerlo es bajo.',
    },
    why: {
      en: `You cannot play around everything, and trying to is its own mistake.
The question is narrower: is there a cheap rearrangement of the same turn that
loses to fewer cards? Usually there is, and it costs a point of damage rather
than the game.`,
      es: `No puedes jugar alrededor de todo, e intentarlo es un error en sí
mismo. La pregunta es más estrecha: ¿hay una reorganización barata del mismo
turno que pierda contra menos cartas? Casi siempre la hay, y cuesta un punto de
daño en vez de la partida.`,
    },
    tags: ['risk', 'reading'],
  },
];
