// ── Chess: what actually differs between places you play ─────
// Chess has one rulebook, which makes this tab a different job from the
// Minesweeper one: the disagreements are not about the rules, they are
// about the container the rules sit in. Where a genuine rule is commonly
// misremembered, it is marked as a rule rather than a variant.

import { el } from '../../utils.js';

const OFFICIAL = [
  ['En passant is not optional to know',
   'A pawn moving two squares can be captured by an enemy pawn as if it had moved one, but only on the very next move. Lose the chance and it is gone for good. This is a FIDE rule, not a house rule, and it is the rule most often played wrong in casual games.'],
  ['Castling has three separate conditions',
   'The king and that rook must both be unmoved, the squares between them empty, and the king must not be in check, pass through an attacked square, or land on one. Note what is absent: the ROOK may pass through an attacked square, and the rook may be attacked. A FIDE rule, and the exception is the part people get wrong.'],
  ['Stalemate is a draw',
   'No legal move and not in check ends the game level, however much material you are ahead. Some regional and historical variants scored it as a win, which is where the confusion comes from, but under FIDE rules it is half a point.'],
  ['Threefold repetition and fifty moves are claims',
   'Neither one ends the game automatically in over-the-board play: a player has to claim it. Online they are usually enforced by the server, which is a real difference in behaviour even though the rule is identical.'],
  ['Insufficient material is narrower than it looks',
   'King and bishop, or king and knight, against a lone king is an immediate draw. King and two knights against a lone king is NOT, because mate is possible, only not forceable. Engines and servers differ in how they present this.'],
];

const CONTAINERS = [
  ['Time control changes which tactics are worth having',
   'At long time controls you can calculate a five-move combination. At three minutes you cannot, and the patterns that pay are the ones you recognise without calculating: back rank, loose piece, knight fork geometry. The same position is a different problem at a different clock, which is why blitz and classical players disagree about what is basic.'],
  ['Increment changes the endgame, not the opening',
   'With no increment a winning position can be lost on time, so material advantages stop converting and cheap tricks become correct. With increment the endgame is a real endgame. A site that defaults to no increment is teaching you a different game from one that defaults to two seconds.'],
  ['Puzzle ratings are not comparable between sites',
   'Each site rates its puzzles against its own population with its own formula, so a 1500 on one is not a 1500 on another, and the same puzzle can carry ratings hundreds of points apart. Treat a rating as a within-site ordering, not a measurement.'],
  ['Puzzle sets teach you that a tactic always exists',
   'Every position in a puzzle set has an answer, so the habit you actually build is assuming there is one. In a real game most positions contain nothing. That is why level 5 here includes positions with no tactic, and why saying "nothing here" is a correct answer.'],
  ['Chess960 removes the opening, not the tactics',
   'Starting pieces are shuffled, so memorised opening lines are worth nothing, but every motif on the Learn tab still applies unchanged. It is the cleanest demonstration that opening theory and tactical skill are separate things.'],
];

export function mountRules(host) {
  host.replaceChildren(el('div', { class: 'stack stack--loose' },

    el('section', { class: 'section' },
      el('div', { class: 'section__titles' },
        el('h2', { class: 'section__title', text: 'Rules people misremember' }),
        el('p', { class: 'section__lead', text: 'Chess is unusual here: there is one rulebook and everyone follows it. These are not variants, they are the official rules that get played wrong most often.' }),
      ),
      el('div', { class: 'ruletable' }, OFFICIAL.map(row)),
    ),

    el('section', { class: 'section' },
      el('div', { class: 'section__titles' },
        el('h2', { class: 'section__title', text: 'What actually differs between places you play' }),
        el('p', { class: 'section__lead', text: 'Not the rules. The clock, the rating system and the shape of the practice, all of which change which patterns are worth owning.' }),
      ),
      el('div', { class: 'ruletable' }, CONTAINERS.map(row)),
    ),

    el('div', { class: 'callout' },
      'Scope, stated plainly: this module has no move generator and no engine. Positions are hand built and each one was checked with a real chess library before it shipped, so the answers are trustworthy and the board will happily let you play an illegal move. Judging legality is not what these drills are testing.'),
  ));
}

function row([name, body]) {
  return el('div', { class: 'rulerow' },
    el('div', { class: 'rulerow__name' }, el('strong', { text: name })),
    el('p', { class: 'rulerow__body', text: body }),
  );
}
