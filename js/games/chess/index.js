// ── Chess module ─────────────────────────────────────────────
// Tactics only, by design. No move generator, no engine, no opening book:
// the positions are hand-built, verified, and stored with their answers.

import { registerGame } from '../../registry.js';
import { el, pick, shuffle, randInt } from '../../utils.js';
import { PUZZLES, QUIET } from './puzzles.js';
import { renderBoard, moveSquares, miniPosition, parseFen } from './board.js';
import { mountRules } from './rules.js';

const CORE_RULE = {
  title: 'One move, two threats',
  body: 'A tactic exists when a single move creates two threats that a single move cannot answer. That is the whole family. What the named motifs differ in is only how the second threat gets manufactured: from one square (a fork), along one line (a pin or a skewer), by moving out of the way (a discovery), or by taking away the piece that was holding everything together.',
  formula: 'two threats > one defence',
};

const PATTERNS = [
  {
    id: 'chess-fork', name: 'Fork', tier: 1,
    trigger: 'One piece can reach a square from which it attacks two undefended targets, one of them usually the king.',
    action: 'Play it. Check first if you can, so the second target has no time to run.',
    why: 'A knight is the classic forking piece because its move is the one no other piece can copy, so a defender guarding one target rarely guards the other. The check is what converts the double attack into material: the opponent must answer it, which spends the move they needed to save the second piece.',
    tags: ['double attack', 'check first'],
    diagram: () => miniPosition('3r3k/6pp/8/4N3/8/8/P7/6K1 w - - 0 1', 'The knight is one move from hitting both.'),
  },
  {
    id: 'chess-pin', name: 'Pin', tier: 1,
    trigger: 'A piece stands on a line between an attacker and something more valuable behind it.',
    action: 'It cannot move. Attack it again with your cheapest piece.',
    why: 'A pin does not win anything by itself, it only freezes. The material comes from piling on: the pinned piece cannot run, so a second attacker beats however many defenders it has, and the cheapest attacker wins the most. Against the king the pin is absolute and moving is illegal; against a queen it is merely expensive.',
    tags: ['freeze then hit', 'cheapest attacker'],
    diagram: () => miniPosition('3k4/2p5/3n4/8/2P5/8/8/3RK3 w - - 0 1', 'Pinned to the king, so a pawn is enough.'),
  },
  {
    id: 'chess-skewer', name: 'Skewer', tier: 1,
    trigger: 'Two pieces on one line with the valuable one in front.',
    action: 'Attack the front one. It moves, and you take what was behind it.',
    why: 'A pin with the order reversed. Because the front piece is the more valuable, it has to move rather than being frozen, and moving is exactly what exposes the piece behind. Checks make the best skewers for the same reason they make the best forks: the answer is forced.',
    tags: ['pin, reversed'],
    diagram: () => miniPosition('7R/6pp/8/1k6/8/8/1r4P1/6K1 w - - 0 1', 'Check the king and the rook behind it falls.'),
  },
  {
    id: 'chess-back-rank', name: 'Back rank mate', tier: 1,
    trigger: 'A king on its first rank with its own unmoved pawns in front of it.',
    action: 'Get a rook or queen to that rank with nothing able to block.',
    why: 'The pawns that were protecting the king are the reason it cannot move. This is the most common mate in real games and the reason experienced players spend a move on an escape square long before it looks necessary. When you are checking a position for tactics, count the escape squares first.',
    tags: ['count escape squares'],
    diagram: () => miniPosition('6k1/1r3ppp/8/8/8/8/8/4R1K1 w - - 0 1', 'The pawns are the cage.'),
  },
  {
    id: 'chess-discovered', name: 'Discovered attack', tier: 2,
    trigger: 'One of your pieces stands on a line between another of your pieces and an enemy target.',
    action: 'Move the front piece anywhere useful. Two pieces attack at once.',
    why: 'The rarest thing in chess is a move that does two things, and this is the cheapest way to buy one. The piece that moves is free to make any threat it likes, because the threat behind it arrives regardless. When the uncovered line gives check, the moving piece can go somewhere it would normally be captured.',
    tags: ['free tempo', 'strongest with check'],
    diagram: () => miniPosition('4k3/1r6/8/8/4B3/8/8/4R1K1 w - - 0 1', 'The bishop can go anywhere and the check still arrives.'),
  },
  {
    id: 'chess-remove-defender', name: 'Remove the defender', tier: 2,
    trigger: 'A square you want is defended exactly once.',
    action: 'Take or drive away the defender, then take the square.',
    why: 'Most positions are held together by very few pieces doing defensive work. Counting the defenders of the square you want is faster than calculating variations, and once the count reaches one the tactic is usually a capture followed by the thing you actually wanted.',
    tags: ['count defenders first'],
    diagram: () => miniPosition('3r2k1/1n3ppp/8/8/8/8/8/3RR1K1 w - - 0 1', 'One knight is holding the whole back rank.'),
  },
  {
    id: 'chess-overload', name: 'The overloaded piece', tier: 2,
    trigger: 'One piece is the only defender of two different things.',
    action: 'Take one of them. It cannot answer both.',
    why: 'The same arithmetic as removing the defender, seen from the other side: instead of taking the defender off, you make it choose. A piece that is guarding two squares is guarding neither, and spotting it is mostly a matter of asking what each enemy piece is actually doing.',
    tags: ['make it choose'],
    diagram: () => miniPosition('3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', 'The rook cannot both sit here and guard the rank.'),
  },
  {
    id: 'chess-smothered', name: 'Smothered mate', tier: 3,
    trigger: 'A king boxed in entirely by its own pieces, with a knight able to reach it.',
    action: 'Deliver the check. Nothing can block a knight and nothing can move.',
    why: 'Worth knowing as a shape rather than a calculation, because it is the one mate where the opponent s own material does all the work. The knight matters because it is the only piece whose check cannot be blocked, so a king with no free squares and a knight in range is finished.',
    tags: ['a knight check cannot be blocked'],
    diagram: () => miniPosition('6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', 'Its own rook and pawns are the mating net.'),
  },
  {
    id: 'chess-none', name: 'No tactic here', tier: 3,
    trigger: 'You have looked for a double attack, a loose piece and an overworked defender, and found none.',
    action: 'Stop looking and improve your worst piece.',
    why: 'The most expensive habit in tactics training is learning that a position always contains something, because a drill only ever shows you positions that do. Most positions in a real game contain nothing at all, and the skill being tested is knowing when to stop calculating, not how long you can keep going.',
    tags: ['the drill lies about this'],
    diagram: () => miniPosition('4k3/5ppp/8/3b4/3B4/8/5PPP/4K3 w - - 0 1', 'Nothing. Neither bishop can take and survive.'),
  },
];

const PATTERN_BY_ID = new Map(PATTERNS.map((p) => [p.id, p]));
const TACTIC_IDS = PATTERNS.filter((p) => p.id !== 'chess-none').map((p) => p.id);

// ── Drills ───────────────────────────────────────────────────

const LEVELS = [
  { id: 1, name: 'Name it', blurb: 'The move is shown. Say which motif it is.' },
  { id: 2, name: 'Find it, named', blurb: 'You are told the motif. Play the move.' },
  { id: 3, name: 'Find it', blurb: 'No name. Play the move.' },
  { id: 4, name: 'From either side', blurb: 'Same job, board sometimes flipped.' },
  { id: 5, name: 'Or nothing', blurb: 'Some positions have no tactic at all.' },
];

function boardDrill(puzzle, { showMotif = false, flipped = false } = {}) {
  const pattern = PATTERN_BY_ID.get(puzzle.motif);
  return {
    patternId: puzzle.motif,
    prompt: showMotif
      ? `${pattern.name}. White to move: play it.`
      : 'White to move. Find the move that wins.',
    mount(host, commit) {
      const wrap = el('div');
      renderBoard(wrap, puzzle.fen, { flipped, onMove: (uci) => commit(uci) });
      host.replaceChildren(wrap, el('p', { class: 'chess-hint', text: 'Click the piece, then its destination.' }));
    },
    grade(answer) {
      const correct = puzzle.solution.includes(answer);
      return {
        correct,
        detail: correct
          ? `${pattern.name}. ${puzzle.explain}`
          : `Not that one. ${puzzle.explain} (${puzzle.gain}.)`,
        reveal: (host) => {
          const grid = host.querySelector('.gboard');
          if (!grid) return;
          for (const uci of puzzle.solution) {
            for (const sq of moveSquares(uci)) {
              grid.querySelector(`[data-sq="${sq}"]`)?.classList.add('is-right');
            }
          }
          if (!correct && answer && answer.length === 4) {
            for (const sq of moveSquares(answer)) {
              grid.querySelector(`[data-sq="${sq}"]`)?.classList.add('is-wrong');
            }
          }
        },
      };
    },
  };
}

function nameIt() {
  const puzzle = pick(PUZZLES);
  const pattern = PATTERN_BY_ID.get(puzzle.motif);
  const wrong = shuffle(TACTIC_IDS.filter((id) => id !== puzzle.motif)).slice(0, 3);
  const options = shuffle([puzzle.motif, ...wrong]);
  return {
    patternId: puzzle.motif,
    prompt: 'The winning move is marked. Which motif is it?',
    mount(host, commit) {
      const wrap = el('div');
      const highlight = new Map();
      for (const sq of moveSquares(puzzle.solution[0])) highlight.set(sq, 'is-hint');
      renderBoard(wrap, puzzle.fen, { interactive: false, highlight });
      host.replaceChildren(wrap, el('div', { class: 'choicegrid' }, options.map((id) =>
        el('button', { class: 'choice', type: 'button', onclick: () => commit(id) },
          PATTERN_BY_ID.get(id).name))));
    },
    grade(answer) {
      const correct = answer === puzzle.motif;
      return {
        correct,
        detail: correct ? `${pattern.name}. ${puzzle.explain}`
          : `That was a ${pattern.name.toLowerCase()}. ${puzzle.explain}`,
      };
    },
  };
}

function orNothing() {
  const quiet = Math.random() < 0.4;
  if (!quiet) {
    const puzzle = pick(PUZZLES);
    const base = boardDrill(puzzle, { flipped: Math.random() < 0.3 });
    return {
      ...base,
      prompt: 'White to move. Find the winning move, or say there is nothing here.',
      mount(host, commit) {
        base.mount(host, commit);
        host.append(el('div', { class: 'toolbar' },
          el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => commit('none') },
            'Nothing here')));
      },
      grade(answer) {
        if (answer === 'none') {
          return {
            correct: false,
            detail: `There was something: ${puzzle.explain} (${puzzle.gain}.)`,
            reveal: base.grade(puzzle.solution[0]).reveal,
          };
        }
        return base.grade(answer);
      },
    };
  }
  const position = pick(QUIET);
  return {
    patternId: 'chess-none',
    prompt: 'White to move. Find the winning move, or say there is nothing here.',
    mount(host, commit) {
      const wrap = el('div');
      renderBoard(wrap, position.fen, { onMove: (uci) => commit(uci) });
      host.replaceChildren(wrap, el('div', { class: 'toolbar' },
        el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => commit('none') },
          'Nothing here')));
    },
    grade(answer) {
      const correct = answer === 'none';
      return {
        correct,
        detail: correct
          ? `Right. ${position.explain} Knowing when to stop is the part a puzzle set normally never trains.`
          : `${position.explain} Every move here loses material or changes nothing, which is what most real positions look like.`,
      };
    },
  };
}

function makeDrill(levelId) {
  switch (levelId) {
    case 1: return nameIt();
    case 2: return boardDrill(pick(PUZZLES), { showMotif: true });
    case 3: return boardDrill(pick(PUZZLES));
    case 4: return boardDrill(pick(PUZZLES), { flipped: randInt(2) === 1 });
    case 5: return orNothing();
    default: return nameIt();
  }
}

// ── Play: a puzzle browser ───────────────────────────────────

function mountPlay(host, ctx) {
  let index = 0;
  let shown = false;

  const draw = () => {
    const puzzle = PUZZLES[index % PUZZLES.length];
    const pattern = PATTERN_BY_ID.get(puzzle.motif);
    const boardHost = el('div');
    const highlight = new Map();
    if (shown) for (const uci of puzzle.solution) {
      for (const sq of moveSquares(uci)) highlight.set(sq, 'is-right');
    }
    renderBoard(boardHost, puzzle.fen, { interactive: false, highlight });

    host.replaceChildren(el('div', { class: 'stack' },
      el('section', { class: 'section' },
        el('div', { class: 'section__titles' },
          el('h2', { class: 'section__title', text: `Position ${index % PUZZLES.length + 1} of ${PUZZLES.length}` }),
          el('p', { class: 'section__lead', text: shown ? `${pattern.name}. ${puzzle.explain}` : 'White to move. Work it out, then reveal.' }),
        ),
        el('div', { class: 'statbar' },
          stat('Motif', shown ? pattern.name : 'hidden'),
          stat('Result', shown ? puzzle.gain : 'hidden'),
        ),
        boardHost,
        el('div', { class: 'toolbar' },
          el('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: () => { shown = !shown; draw(); } },
            shown ? 'Hide solution' : 'Show solution'),
          el('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => { index += 1; shown = false; draw(); } }, 'Next'),
          el('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => { index = randInt(PUZZLES.length); shown = false; draw(); } }, 'Shuffle'),
        ),
      ),
    ));
  };

  const stat = (label, value) => el('div', { class: 'stat' },
    el('span', { class: 'stat__label', text: label }),
    el('span', { class: 'stat__value', text: value }));

  draw();
}

export default registerGame({
  id: 'chess',
  name: 'Chess',
  accent: '#e2e8f0',
  tagline: 'Tactics, which is where the games are actually decided',
  coreRule: CORE_RULE,
  patterns: PATTERNS,
  defaults: { drillLevel: 1 },
  views: { play: mountPlay, rules: mountRules },
  drills: { levels: LEVELS, make: makeDrill },
});
