// ── Minesweeper pattern cards ────────────────────────────────
// Every pattern here is the same equation with different numbers in it.
// The diagrams are the equation drawn; the "why" is the equation written.

import { el } from '../../utils.js';
import { miniGrid } from './view.js';

/** A diagram that is algebra rather than a grid. Some rules have no picture. */
function algebra(lines, caption) {
  return el('figure', { class: 'diagram diagram--algebra' },
    el('div', { class: 'algebra' }, lines.map((l) =>
      el('code', { class: l.startsWith('=') ? 'algebra__result' : 'algebra__line', text: l.replace(/^=\s?/, '') }))),
    caption ? el('figcaption', { text: caption }) : null,
  );
}

export const CORE_RULE = {
  title: 'Every number is an equation',
  body: 'A revealed number n, with k mines already found around it and a set U of unknown neighbours, is telling you exactly one thing: the cells in U contain n minus k mines. That is the whole game. Every named pattern below is that equation with a particular right-hand side, or two of those equations subtracted from each other.',
  formula: 'sum(U) = n - k',
};

export const PATTERNS = [
  // ── Tier 1: read it ────────────────────────────────────────
  {
    id: 'ms-satisfied',
    name: 'Satisfied number',
    tier: 1,
    trigger: 'A number already has as many mines found around it as its value.',
    action: 'Every other cell it touches is safe. Open all of them.',
    why: 'The equation reads sum(U) = n - k with n equal to k, so the right-hand side is 0. A set of cells holding zero mines is a set of cells you can open. This is the single most common deduction in the game and the one people forget under time pressure.',
    tags: ['rule 1', 'right side 0'],
    diagram: () => miniGrid(['MSS', 'S2S', 'SSM'], 'Both of the 2 mines already found, so the other six are safe.'),
  },
  {
    id: 'ms-full-count',
    name: 'Full count',
    tier: 1,
    trigger: 'A number has exactly as many unknown neighbours as mines it still needs.',
    action: 'All of those cells are mines.',
    why: 'The equation reads sum(U) = n - k where the right-hand side equals the size of U. The only way to fit that many mines into that many cells is one each. This is the mirror image of the satisfied number, and the two together solve most of a board.',
    tags: ['rule 2', 'right side full'],
    diagram: () => miniGrid(['.11', '13M', '1MM'], 'Three mines to place, three cells left.'),
  },
  {
    id: 'ms-1-1',
    name: 'The 1-1 wall',
    tier: 1,
    trigger: 'Two 1s side by side, the first one boxed in by an edge or by open cells.',
    action: 'The far cell past the second 1 is safe.',
    why: 'The first 1 says its two cells hold one mine. The second 1 sees those same two cells plus one more, and still says one mine. Subtract, and the extra cell holds zero. The wall matters because it is what stops the first 1 from seeing a third cell of its own.',
    tags: ['subtraction', 'edges'],
    diagram: () => miniGrid(['111', 'SMS'], 'The board edge boxes in the outer 1s. Both far cells are safe.'),
  },
  {
    id: 'ms-1-2',
    name: 'The 1-2',
    tier: 1,
    trigger: 'A 1 and a 2 side by side, looking at the same run of unknown cells, with the 1 boxed in behind.',
    action: 'The cell past the 2, on the side away from the 1, is a mine.',
    why: 'The 1 claims one mine in its two cells. The 2 sees those same two plus one more and claims two. Subtract: the extra cell holds one mine, and it only has room for one. Same subtraction as the 1-1, different right-hand side.',
    tags: ['subtraction', 'edges'],
    diagram: () => miniGrid(['122', 'SMM'], 'Past the 2, away from the 1.'),
  },
  {
    id: 'ms-1-2-1',
    name: 'The 1-2-1',
    tier: 1,
    trigger: 'Numbers reading 1, 2, 1 along a row, with three unknown cells beneath them.',
    action: 'Mines under the two 1s. The cell under the 2 is safe.',
    why: 'Write the three equations. a+b = 1, a+b+c = 2, b+c = 1. The first two give c = 1. The third then gives b = 0, and the first gives a = 1. Nothing here is special: it is three instances of the same subtraction, resolved in order.',
    tags: ['classic', 'chain'],
    diagram: () => miniGrid(['121', 'MSM'], 'Under the 1s, not under the 2.'),
  },
  {
    id: 'ms-1-2-2-1',
    name: 'The 1-2-2-1',
    tier: 1,
    trigger: 'Numbers reading 1, 2, 2, 1 along a row, with four unknown cells beneath.',
    action: 'Mines under the two 2s. The cells under the 1s are safe.',
    why: 'The mirror of the 1-2-1, and the reason to derive rather than memorise: the answer flips. a+b = 1, a+b+c = 2 gives c = 1. b+c+d = 2 with c = 1 gives b+d = 1, and c+d = 1 gives d = 0, so b = 1 and a = 0. If you memorised "mines under the 1s" you just walked into two mines.',
    tags: ['classic', 'chain', 'flips'],
    diagram: () => miniGrid(['1221', 'SMMS'], 'Under the 2s. The opposite of the 1-2-1.'),
  },

  // ── Tier 2: derive it ──────────────────────────────────────
  {
    id: 'ms-subset',
    name: 'Set subtraction',
    tier: 2,
    trigger: 'Two numbers, where every unknown cell of one is also seen by the other.',
    action: 'The cells only the larger one sees hold the difference of the two counts.',
    why: 'This is the rule the whole tier above is made of. If A is inside B, then B minus A is a set holding b minus a mines. When that difference is 0 the cells are safe; when it equals the number of cells they are all mines. Learn this one and you never have to memorise a named pattern again, including ones nobody has named.',
    tags: ['the general rule', 'tier 1 is this'],
    diagram: () => algebra([
      'A ⊆ B',
      'sum(A) = a',
      'sum(B) = b',
      '= sum(B \\ A) = b - a',
    ], 'Every named pattern above is this with numbers filled in.'),
  },
  {
    id: 'ms-chord',
    name: 'Chording',
    tier: 2,
    trigger: 'A revealed number whose flags already equal its value.',
    action: 'One middle click opens every remaining neighbour at once.',
    why: 'Not a deduction, a keystroke. It is the difference between a fast board and a slow one, and one of the clearest reasons two implementations feel different: some have it and some do not. It also does not check that your flags are right. Chording on a number you flagged wrongly opens a mine, which is why fast players flag less, not more.',
    tags: ['technique', 'ruleset dependent'],
    diagram: () => miniGrid(['MMS', 'S2S', 'SSS'], 'Two flags you already placed, value 2, and one click opens the other six.'),
  },
  {
    id: 'ms-global-count',
    name: 'Counting what is left',
    tier: 2,
    trigger: 'The mine counter, plus a region of unknown cells that no number reaches.',
    action: 'Compare the two. Often it settles cells that no local number can.',
    why: 'The total mine count is one more equation, and it covers the whole board rather than one neighbourhood. Late in a game it is frequently the only equation left that says anything. If the counter reads 3 and exactly 3 cells remain unknown, you are done. This is also the equation a hidden mine counter takes away from you.',
    tags: ['endgame', 'the extra equation'],
    diagram: () => algebra([
      'mines left = 3',
      'unknown cells = 3',
      '= every one of them is a mine',
    ], 'The counter is an equation. Use it.'),
  },
  {
    id: 'ms-opening',
    name: 'The opening click',
    tier: 2,
    trigger: 'A fresh board.',
    action: 'Depends entirely on the ruleset, and on nothing you can see.',
    why: 'If the first click is guaranteed to open a zero region, click anywhere with room around it and take the large opening. If the first click is merely safe, corners give a smaller opening but a cleaner edge to work from. If the first click can be a mine, nothing you do changes your odds. Three different correct answers, decided by a setting you cannot see from the board.',
    tags: ['ruleset dependent', 'read the Rules tab'],
    diagram: () => miniGrid(['###', '#S#', '###'], 'Which of the three policies is this site using?'),
  },

  // ── Tier 3: count it ───────────────────────────────────────
  {
    id: 'ms-enumerate',
    name: 'Enumerate the layouts',
    tier: 3,
    trigger: 'No single number and no pair of numbers resolves anything.',
    action: 'List every mine layout the visible numbers allow. Cells that agree across all of them are settled.',
    why: 'Subtraction only compares two equations at a time. Sometimes the constraint that decides a cell only appears when you satisfy all of them at once. Writing out the consistent layouts is tedious and always works, and it is the step that separates people who finish hard boards from people who guess on them. Play mode does this for you when you press Explain.',
    tags: ['last resort before guessing', 'always works'],
    diagram: () => algebra([
      'layout 1:  M S M S',
      'layout 2:  S M M S',
      'layout 3:  S S M M',
      '= the third cell is a mine in every one',
    ], 'Agreement across every layout is a deduction.'),
  },
  {
    id: 'ms-probability',
    name: 'Guess where it is cheapest',
    tier: 3,
    trigger: 'Enumeration finishes and still nothing is certain.',
    action: 'Click the cell with the lowest mine probability, not the one that feels safest.',
    why: 'Cells away from every number are not automatically safer. The correct probability weights each layout by how many ways the leftover mines can fill the cells no number touches, which is a binomial, and it routinely moves the answer by ten points or more. Counting layouts and dividing is the intuitive method and it is wrong.',
    tags: ['weighted', 'not solution counting'],
    diagram: () => algebra([
      'naive:    solutions with a mine here / all solutions',
      'correct:  weight each layout by C(cellsFarFromNumbers, minesLeft)',
      '= the two disagree, and the second one is right',
    ], 'Play mode shows the real numbers on demand.'),
  },
  {
    id: 'ms-fifty-fifty',
    name: 'The forced coin flip',
    tier: 3,
    trigger: 'Two cells that swap roles in every consistent layout, at exactly 50 percent.',
    action: 'Nothing. Recognise it, click one, and stop looking for the deduction.',
    why: 'This position is not your failure. It is a property of how the board was dealt. Measured here: about one classic Expert board in nine ends on an exact coin flip. Most forced guesses are not coin flips though, they are lopsided, which is why the odds are worth reading before you click. Sites that advertise no-guess mode reject all of these boards at generation time, which is why the same game feels solvable on one site and unfair on another.',
    tags: ['not your fault', 'the whole reason for no-guess mode'],
    diagram: () => miniGrid([' 11 ', ' ## '], 'Both 1s see exactly the same two cells.'),
  },
];

export const PATTERN_BY_ID = new Map(PATTERNS.map((p) => [p.id, p]));

/** Which pattern a solver rule maps to, for grading real positions. */
export const RULE_TO_PATTERN = {
  satisfied: 'ms-satisfied',
  'full-count': 'ms-full-count',
  subset: 'ms-subset',
  enumerate: 'ms-enumerate',
  count: 'ms-global-count',
};
