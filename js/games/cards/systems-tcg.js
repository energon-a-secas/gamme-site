// ── Collectible card games ───────────────────────────────────
// Here for contrast, not aspiration. A TCG answers the four casual axes badly
// on purpose: it is long to teach, has no catch-up, and charges to enter. It
// buys that back with a metagame that changes, which a kitchen table does not
// need and cannot sustain.
//
// The resource row is the one to read. Every other difference follows from it.

export const TCG = [
  {
    id: 'magic',
    name: 'Magic: The Gathering',
    year: 1993,
    origin: { en: 'Richard Garfield, Wizards of the Coast', es: 'Richard Garfield, Wizards of the Coast' },
    family: { en: 'The original TCG', es: 'El TCG original' },
    casual: 2,
    teach: 45,
    catchup: 'none',
    downtime: 'high',
    elimination: 'yes',
    resource: {
      en: 'Lands, which occupy a card slot in your own deck. Roughly four in every ten cards you own do nothing but pay for the rest.',
      es: 'Tierras, que ocupan un espacio de carta en tu propio mazo. Cerca de cuatro de cada diez cartas que tienes no hacen nada más que pagar por las otras.',
    },
    information: { en: 'Hidden hand, public board', es: 'Mano oculta, mesa pública' },
    interaction: 'direct',
    entry: { en: 'Boosters, indefinitely', es: 'Sobres, indefinidamente' },
    works: {
      en: `Putting the resource in the deck makes deckbuilding a genuine cost:
every land is a spell you chose not to play. It also produces screw and flood,
where a game is decided by draw order before either player makes a decision.
Thirty years of design has been spent softening that without removing it,
because the cost is also what makes the choice mean anything.`,
      es: `Poner el recurso dentro del mazo convierte la construcción en un costo
real: cada tierra es un hechizo que elegiste no jugar. También produce sequía e
inundación, donde una partida se decide por el orden del robo antes de que
cualquiera decida algo. Treinta años de diseño se han gastado en suavizar eso sin
eliminarlo, porque el costo es también lo que le da sentido a la elección.`,
    },
    failure: {
      en: 'Complexity creep. Rosewater introduced New World Order in 2011 to cap complexity at common, because commons are what a new player actually sees.',
      es: 'La complejidad que se acumula. Rosewater introdujo New World Order en 2011 para limitar la complejidad en las comunes, porque las comunes son lo que un jugador nuevo realmente ve.',
    },
    lesson: {
      en: 'Cap complexity where beginners look, not on average. The average card in a set is not the card a new player is holding.',
      es: 'Limita la complejidad donde miran los principiantes, no en promedio. La carta promedio de una colección no es la carta que tiene en la mano alguien que recién llega.',
    },
  },
  {
    id: 'yugioh',
    name: 'Yu-Gi-Oh!',
    year: 1999,
    origin: { en: 'Kazuki Takahashi, Konami', es: 'Kazuki Takahashi, Konami' },
    family: { en: 'Costless TCG', es: 'TCG sin costo' },
    casual: 1,
    teach: 60,
    catchup: 'none',
    downtime: 'high',
    elimination: 'yes',
    resource: {
      en: 'Nothing. One normal summon per turn is the only structural brake; everything else pays with card text or not at all.',
      es: 'Nada. Una invocación normal por turno es el único freno estructural; todo lo demás se paga con el texto de la carta, o no se paga.',
    },
    information: { en: 'Hidden hand, face-down cards, public board', es: 'Mano oculta, cartas boca abajo, mesa pública' },
    interaction: 'direct',
    entry: { en: 'Boosters, indefinitely', es: 'Sobres, indefinidamente' },
    works: {
      en: `Removing the resource curve removes the ramp, so a game can be decided
on turn one. That is not a bug the designers failed to catch, it is the identity:
the fantasy is the long combo that ends the game, and the format's brake is hand
traps, cards that interrupt from your hand for free.`,
      es: `Quitar la curva de recursos quita la rampa, así que una partida puede
decidirse en el primer turno. Eso no es un error que los diseñadores no vieron,
es la identidad: la fantasía es el combo largo que termina la partida, y el freno
del formato son las hand traps, cartas que interrumpen desde la mano sin costo.`,
    },
    failure: {
      en: 'With no cost curve, power has to live in card text, so every new card is balanced against every old one individually. The banlist does the work a resource system would have done.',
      es: 'Sin curva de costo, el poder tiene que vivir en el texto, así que cada carta nueva se balancea individualmente contra todas las viejas. La lista de prohibidas hace el trabajo que habría hecho un sistema de recursos.',
    },
    lesson: {
      en: 'If you skip the resource system, you have not removed the cost. You have moved it into every card and onto a banlist.',
      es: 'Si te saltas el sistema de recursos, no eliminaste el costo. Lo moviste a cada carta y a una lista de prohibidas.',
    },
  },
  {
    id: 'mitosyleyendas',
    name: 'Mitos y Leyendas',
    year: 2000,
    origin: { en: 'Salo, Santiago, Chile', es: 'Salo, Santiago, Chile' },
    family: { en: 'Latin American TCG', es: 'TCG latinoamericano' },
    casual: 2,
    teach: 40,
    catchup: 'none',
    downtime: 'high',
    elimination: 'yes',
    resource: {
      en: 'Gold cards, played at a fixed rate each round. Magic’s shape without Magic’s screw: you always have the ramp, so the deck stops arguing with you.',
      es: 'Cartas de oro, jugadas a un ritmo fijo cada ronda. La forma de Magic sin la sequía de Magic: la rampa siempre está, así que el mazo deja de discutir contigo.',
    },
    information: { en: 'Hidden hand, public board', es: 'Mano oculta, mesa pública' },
    interaction: 'direct',
    entry: { en: 'Boosters, while the company lasted', es: 'Sobres, mientras la empresa duró' },
    works: {
      en: `The one collectible card game fully developed and produced in Latin
America. It borrowed Magic's skeleton and then differentiated on the only axis a
smaller publisher can win: it printed mythology and folklore that nobody else was
printing, drawn by Chilean illustrators including Genzoman and Mauricio Herrera.
For several years it was the best-selling card game to come out of Chile.`,
      es: `El único juego de cartas coleccionable desarrollado y producido
íntegramente en América Latina. Tomó prestado el esqueleto de Magic y se
diferenció en el único eje donde una editorial más chica puede ganar: imprimió
mitología y folclore que nadie más estaba imprimiendo, dibujado por ilustradores
chilenos como Genzoman y Mauricio Herrera. Por varios años fue el juego de cartas
más vendido salido de Chile.`,
    },
    failure: {
      en: 'It was built for the Spanish-speaking market rather than a global one. The publisher went bankrupt in 2009 and the game went on indefinite hiatus. The thing that made it distinctive is the same thing that capped its market.',
      es: 'Fue construido para el mercado hispanohablante y no para uno global. La editorial quebró en 2009 y el juego quedó en pausa indefinida. Lo que lo hacía distintivo es lo mismo que le puso techo a su mercado.',
    },
    lesson: {
      en: 'Local identity is a real competitive advantage and a real ceiling at the same time. Decide which one you are buying before you print.',
      es: 'La identidad local es una ventaja competitiva real y un techo real al mismo tiempo. Decide cuál de las dos estás comprando antes de imprimir.',
    },
  },
  {
    id: 'hearthstone',
    name: 'Hearthstone',
    year: 2014,
    origin: { en: 'Blizzard', es: 'Blizzard' },
    family: { en: 'Digital TCG', es: 'TCG digital' },
    casual: 3,
    teach: 15,
    catchup: 'weak',
    downtime: 'low',
    elimination: 'yes',
    resource: {
      en: 'A mana crystal per turn, automatic, capped at ten. Nothing is drawn for it and nothing is spent to get it.',
      es: 'Un cristal de maná por turno, automático, con tope en diez. No se roba nada para conseguirlo ni se gasta nada en él.',
    },
    information: { en: 'Hidden hand, public board', es: 'Mano oculta, mesa pública' },
    interaction: 'direct',
    entry: { en: 'Free to start, packs to compete', es: 'Gratis para empezar, sobres para competir' },
    works: {
      en: `Automatic mana deletes screw and flood outright, which is the single
biggest reason it onboarded players Magic could not. Being digital also let it
enforce its own rules, so nothing has to be simple enough for a human to track
by hand.`,
      es: `El maná automático elimina de raíz la sequía y la inundación, y esa es
la razón más grande de que haya captado jugadores que Magic no pudo. Ser digital
además le permite hacer cumplir sus propias reglas, así que nada tiene que ser lo
bastante simple para que un humano lo lleve a mano.`,
    },
    failure: {
      en: 'The resource carries no decision. You never choose how much mana to have, so a whole layer of skill that Magic charges for simply is not there.',
      es: 'El recurso no lleva ninguna decisión. Nunca eliges cuánto maná tener, así que toda una capa de habilidad por la que Magic cobra simplemente no existe.',
    },
    lesson: {
      en: 'Removing variance removes agency along with it. Automatic resources make a game fairer and shallower in the same move.',
      es: 'Quitar la varianza se lleva también la agencia. Los recursos automáticos hacen un juego más justo y más plano en el mismo movimiento.',
    },
  },
];
