// ── Engine tests ─────────────────────────────────────────────
// Everything this site teaches about Minesweeper rests on the solver and the
// probability model being right, so both are checked against brute force
// rather than against my expectations. Run with:
//
//   node tests/run.mjs
//
// No dependencies, no framework. A failure exits non-zero.

import * as E from '../js/games/minesweeper/engine.js';
import * as S from '../js/games/minesweeper/solver.js';
import * as A from '../js/games/minesweeper/analysis.js';
import { SYSTEMS as CARD_SYSTEMS, GROUPS as CARD_GROUPS, SOURCES as CARD_SOURCES } from '../js/games/cards/systems.js';
import { AXES as CARD_AXES } from '../js/games/cards/axes.js';
import * as CM from '../js/games/cards/model.js';
import * as CT from '../js/games/cards/tactics.js';
import * as CD from '../js/games/cards/drills.js';
import * as P from '../js/games/minesweeper/probability.js';
import * as G from '../js/games/minesweeper/generate.js';
import * as D from '../js/games/minesweeper/drill-gen.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${extra}`); }
}
function section(title) { console.log(`\n${title}`); }

/** Build a board from an ASCII map. '*' is a mine. Reveal the listed coords. */
function build(rows, revealCoords = []) {
  const h = rows.length, w = rows[0].length;
  const b = E.createBoard(w, h, 0);
  let mines = 0;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '*') { b.mine[y * w + x] = 1; mines++; }
  }));
  b.mines = mines;
  b.placed = true;
  E.computeNumbers(b);
  for (const [x, y] of revealCoords) b.st[y * w + x] = E.REVEALED;
  return b;
}
const at = (b, x, y) => y * b.w + x;
const setOf = (b, coords) => new Set(coords.map(([x, y]) => at(b, x, y)));
const eqSets = (a, c) => a.size === c.size && [...a].every((v) => c.has(v));
const show = (b, s) => [...s].map((i) => `(${i % b.w},${Math.floor(i / b.w)})`).join(' ');
const row0 = (b) => [...Array(b.w).keys()].map((x) => b.num[at(b, x, 0)]).join(',');

function randomBoard(w, h, m, opens = 1) {
  const b = E.createBoard(w, h, m);
  const spots = [...Array(w * h).keys()];
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  for (let i = 0; i < m; i++) b.mine[spots[i]] = 1;
  E.computeNumbers(b);
  const safeCells = [...Array(w * h).keys()].filter((i) => !b.mine[i]);
  for (let k = 0; k < opens && safeCells.length; k++) {
    E.reveal(b, safeCells[Math.floor(Math.random() * safeCells.length)]);
  }
  return b;
}

/**
 * Ground truth for probabilities: enumerate every subset of the hidden cells of
 * the right size, keep the ones consistent with every revealed number, and count.
 * Obviously correct and far too slow for anything but a test.
 */
function bruteForce(b) {
  const hidden = [];
  for (let i = 0; i < b.st.length; i++) if (b.st[i] !== E.REVEALED) hidden.push(i);
  const numbers = [];
  for (let i = 0; i < b.st.length; i++) {
    if (b.st[i] === E.REVEALED && !b.mine[i]) numbers.push({ n: b.num[i], ns: E.neighbors(b, i) });
  }
  const counts = new Map(hidden.map((i) => [i, 0]));
  const isMine = new Set();
  let total = 0;
  const walk = (start, left) => {
    if (left === 0) {
      for (const { n, ns } of numbers) {
        let c = 0;
        for (const x of ns) if (isMine.has(x)) c++;
        if (c !== n) return;
      }
      total++;
      for (const x of isMine) counts.set(x, counts.get(x) + 1);
      return;
    }
    for (let k = start; k <= hidden.length - left; k++) {
      isMine.add(hidden[k]);
      walk(k + 1, left - 1);
      isMine.delete(hidden[k]);
    }
  };
  walk(0, b.mines);
  if (!total) return null;
  const probs = new Map();
  for (const [i, c] of counts) probs.set(i, c / total);
  return { probs, total };
}

// ═══ The named patterns produce the deductions the cards claim ═══

section('The named patterns');
{
  const a = build(['...', '*.*'], [[0,0],[1,0],[2,0]]);
  check('1-2-1 reads 1,2,1', row0(a) === '1,2,1', row0(a));
  const ra = A.analyze(a);
  check('1-2-1: mines under the 1s', eqSets(ra.mines, setOf(a, [[0,1],[2,1]])), show(a, ra.mines));
  check('1-2-1: safe under the 2', ra.safe.has(at(a,1,1)), show(a, ra.safe));

  const c = build(['....', '.**.'], [[0,0],[1,0],[2,0],[3,0]]);
  check('1-2-2-1 reads 1,2,2,1', row0(c) === '1,2,2,1', row0(c));
  const rc = A.analyze(c);
  check('1-2-2-1: mines under the 2s, which is the opposite of the 1-2-1',
    eqSets(rc.mines, setOf(c, [[1,1],[2,1]])), show(c, rc.mines));
  check('1-2-2-1: safe under the 1s', eqSets(rc.safe, setOf(c, [[0,1],[3,1]])), show(c, rc.safe));

  const w = build(['...', '.*.'], [[0,0],[1,0],[2,0]]);
  check('1-1 wall reads 1,1,1', row0(w) === '1,1,1', row0(w));
  const rw = A.analyze(w);
  check('1-1: both far cells are safe', eqSets(rw.safe, setOf(w, [[0,1],[2,1]])), show(w, rw.safe));

  const t = build(['...', '.**'], [[0,0],[1,0],[2,0]]);
  check('1-2 reads 1,2,2', row0(t) === '1,2,2', row0(t));
  const rt = A.analyze(t);
  check('1-2: the cell past the 2 is a mine', rt.mines.has(at(t,2,1)), show(t, rt.mines));

  const f = build(['..', '**'], [[0,0],[1,0]]);
  check('full count: both cells are mines', eqSets(A.analyze(f).mines, setOf(f, [[0,1],[1,1]])));

  const big = build(['.....', '.*.*.'], [[0,0],[1,0],[2,0],[3,0],[4,0]]);
  const rb = S.deduce(big);
  check('the subset rule fires on a bounded 1-2-1', rb.steps.some((s) => s.rule === 'subset'));
}

section('The forced coin flip is real');
{
  const b = E.createBoard(2, 2, 1);
  b.mine[2] = 1;
  E.computeNumbers(b);
  b.st[0] = E.REVEALED; b.st[1] = E.REVEALED;
  check('both revealed cells read 1', b.num[0] === 1 && b.num[1] === 1);
  const g = P.bestGuess(b);
  check('both hidden cells sit at exactly 50 percent', Math.abs(g.probability - 0.5) < 1e-12, String(g.probability));
  check('and nothing separates them', g.cells.length === 2);
  check('isForcedFiftyFifty agrees', P.isForcedFiftyFifty(b));
}

section('The solver never contradicts the board');
{
  let checked = 0, bad = 0;
  for (let t = 0; t < 200; t++) {
    const b = randomBoard(9, 9, 10, 1);
    const r = A.analyze(b);
    for (const i of r.safe) { checked++; if (b.mine[i]) bad++; }
    for (const i of r.mines) { checked++; if (!b.mine[i]) bad++; }
  }
  check(`no false deductions across 200 random boards (${checked} claims)`, bad === 0, `${bad} wrong`);
}

section('The solver finds everything brute force finds, not just nothing wrong');
{
  // Soundness was already checked. This is COMPLETENESS, and it is the test that
  // was missing: a solver that ignores the mine counter is never wrong, it just
  // calls forced positions guesses, which is the error this whole site turns on.
  let boards = 0, unsound = 0, incomplete = 0, missedCells = 0;
  for (let t = 0; t < 250; t++) {
    const b = randomBoard(4 + (t % 2), 4, 3 + (t % 3), 1 + (t % 2));
    let hidden = 0;
    for (let i = 0; i < b.st.length; i++) if (b.st[i] !== E.REVEALED) hidden++;
    if (hidden > 16 || hidden < b.mines) continue;
    const truth = bruteForce(b);
    if (!truth) continue;
    boards++;
    const trueSafe = new Set([...truth.probs].filter(([, p]) => p === 0).map(([i]) => i));
    const trueMine = new Set([...truth.probs].filter(([, p]) => p === 1).map(([i]) => i));
    const got = A.forcedCells(b);   // the closure, which is what grading uses
    for (const i of got.safe) if (b.mine[i]) unsound++;
    for (const i of got.mines) if (!b.mine[i]) unsound++;
    let missing = 0;
    for (const i of trueSafe) if (!got.safe.has(i)) missing++;
    for (const i of trueMine) if (!got.mines.has(i)) missing++;
    if (missing) { incomplete++; missedCells += missing; }
  }
  check(`sound across ${boards} boards`, unsound === 0, `${unsound} false claims`);
  check(`complete across ${boards} boards (${missedCells} provable cells missed on ${incomplete})`,
    incomplete === 0, `${incomplete} boards short`);
}

section('The mine counter is an equation the solver actually uses');
{
  // Two mines under one revealed 2, so the rest of the board is empty in every
  // consistent layout. Nothing local can see that; the counter settles it.
  const b = E.createBoard(4, 3, 2);
  b.mines = 2; b.mine[5] = 1; b.mine[9] = 1;
  E.computeNumbers(b); b.placed = true; b.st[6] = E.REVEALED;
  const r = A.analyze(b);
  check('cells no number touches are proved safe by the count',
    [0, 4, 8].every((i) => r.safe.has(i)), [...r.safe].join(','));
  check('and the position is not reported as a guess', r.exhausted === false);

  // The Rules tab promises that hiding the counter removes a deduction.
  const hidden = E.createBoard(4, 3, 2, { showMineCount: false });
  hidden.mines = 2; hidden.mine[5] = 1; hidden.mine[9] = 1;
  E.computeNumbers(hidden); hidden.placed = true; hidden.st[6] = E.REVEALED;
  const rh = A.analyze(hidden);
  check('hiding the counter really does remove that deduction, as the Rules tab claims',
    rh.safe.size === 0 && rh.exhausted === true, `safe=${[...rh.safe]}`);
}

section('Weighted probabilities match brute force');
{
  let compared = 0, worst = 0, boards = 0;
  for (let t = 0; t < 120; t++) {
    const b = randomBoard(4 + (t % 2), 4, 3 + (t % 3), 1 + (t % 2));
    let hidden = 0;
    for (let i = 0; i < b.st.length; i++) if (b.st[i] !== E.REVEALED) hidden++;
    if (hidden > 17) continue;
    const truth = bruteForce(b);
    const mine = P.mineProbabilities(b);
    if (!truth || !mine) continue;
    boards++;
    for (const [cell, tp] of truth.probs) {
      const mp = mine.probs.get(cell);
      if (mp === undefined) continue;
      compared++;
      worst = Math.max(worst, Math.abs(tp - mp));
    }
  }
  check(`${compared} cells over ${boards} boards, worst error ${worst.toExponential(2)}`, worst < 1e-9);
}

section('First-click policies do what they claim');
{
  const first = 40;
  let killed = 0;
  for (let t = 0; t < 500; t++) {
    const b = E.createBoard(9, 9, 10, { firstClick: 'anywhere' });
    G.placeMines(b, first);
    if (b.mine[first]) killed++;
  }
  check(`"anywhere" can kill on move one (${killed}/500 deals)`, killed > 0);

  let hit = 0, opened = 0;
  for (let t = 0; t < 500; t++) {
    const b = E.createBoard(9, 9, 10, { firstClick: 'safe' });
    G.placeMines(b, first);
    if (b.mine[first]) hit++;
    if (b.num[first] === 0) opened++;
  }
  check('"safe" never puts a mine under the click', hit === 0);
  check(`"safe" often gives a bare number instead of an opening (${500 - opened}/500)`, opened < 500);

  let zeroHit = 0, notZero = 0;
  for (let t = 0; t < 500; t++) {
    const b = E.createBoard(9, 9, 10, { firstClick: 'zero' });
    G.placeMines(b, first);
    if (b.mine[first]) zeroHit++;
    if (b.num[first] !== 0) notZero++;
  }
  check('"zero" never puts a mine under the click', zeroHit === 0);
  check('"zero" always opens a region', notZero === 0);
}

section('A loss shows the whole board');
{
  const b = E.createBoard(6, 6, 5, { firstClick: 'anywhere' });
  G.placeMines(b, 0);
  // The state Play mode puts the board in when the opening click is a mine.
  E.reveal(b, 0);
  E.revealAll(b);
  let hiddenMines = 0;
  for (let i = 0; i < b.st.length; i++) if (b.mine[i] && b.st[i] !== E.REVEALED) hiddenMines++;
  check('revealAll leaves no mine hidden', hiddenMines === 0, `${hiddenMines} still hidden`);

  const c = E.createBoard(6, 6, 5, { firstClick: 'anywhere' });
  G.placeMines(c, 0);
  const mineCell = [...Array(36).keys()].find((i) => c.mine[i]);
  E.toggleFlag(c, mineCell);
  E.revealAll(c);
  check('a correctly flagged mine stays flagged rather than being opened',
    c.st[mineCell] === E.FLAGGED);
}

section('Deals are well formed');
{
  let badCount = 0, badNums = 0;
  for (const rule of ['anywhere', 'safe', 'zero']) {
    for (let t = 0; t < 60; t++) {
      const b = E.createBoard(16, 16, 40, { firstClick: rule });
      G.placeMines(b, 100);
      if (b.mine.reduce((a, v) => a + v, 0) !== 40) badCount++;
      for (let i = 0; i < b.num.length; i++) {
        if (b.num[i] !== E.neighbors(b, i).reduce((a, n) => a + b.mine[n], 0)) badNums++;
      }
    }
  }
  check('every deal places exactly the requested mines', badCount === 0, `${badCount} bad`);
  check('adjacency numbers always match the mine array', badNums === 0, `${badNums} mismatches`);
}

section('No-guess generation actually produces no-guess boards');
{
  const b = E.createBoard(9, 9, 10, { firstClick: 'zero', noGuess: true });
  const first = G.pickOpeningCell(b);
  const res = await G.placeMinesNoGuess(b, first, { budgetMs: 8000 });
  check(`beginner no-guess board found (${res.attempts} attempts, ${Math.round(res.ms)}ms)`, res.ok);
  if (res.ok) check('and it verifies as solvable by logic alone', G.isNoGuess(b, first));
}

section('Drill positions are solved, never authored');
{
  const expect = {
    'ms-1-2-1': { safe: 1, mines: 2 }, 'ms-1-2-2-1': { safe: 2, mines: 2 },
    'ms-1-1': { safe: 2, mines: 1 }, 'ms-1-2': { safe: 1, mines: 2 },
    'ms-full-count': { safe: 0, mines: 2 },
  };
  for (const id of D.TEMPLATE_PATTERNS) {
    let bad = 0;
    for (let t = 0; t < 80; t++) {
      const pos = D.templatePosition(id);
      if (pos.safe.length !== expect[id].safe || pos.mines.length !== expect[id].mines) bad++;
      for (const i of pos.mines) if (!pos.board.mine[i]) bad += 100;
      for (const i of pos.safe) if (pos.board.mine[i]) bad += 100;
    }
    check(`${id}: right answer in all 8 orientations`, bad === 0, `${bad} bad`);
  }

  for (const kind of ['local', 'subset', 'enumerate', 'stuck']) {
    let found = 0, wrong = 0;
    for (let t = 0; t < 12; t++) {
      const pos = D.findPosition(kind);
      if (!pos) continue;
      found++;
      for (const i of pos.mines) if (!pos.board.mine[i]) wrong++;
      for (const i of pos.safe) if (pos.board.mine[i]) wrong++;
      if (kind !== 'stuck' && !pos.safe.length && !pos.mines.length) wrong++;
      if (kind === 'stuck' && (pos.safe.length || pos.mines.length)) wrong++;
    }
    check(`${kind}: ${found}/12 positions, ${wrong} wrong claims`, found >= 10 && wrong === 0);
  }

  const ff = D.findFiftyFifty();
  check('a genuine coin-flip position can be found on demand', !!ff && P.isForcedFiftyFifty(ff.board));
}

section('The measured no-guess rate, which is the Rules tab argument');
for (const [name, w, h, m] of [['Beginner', 9, 9, 10], ['Intermediate', 16, 16, 40], ['Expert', 30, 16, 99]]) {
  const r = await G.sampleNoGuessRate(w, h, m, { firstClick: 'zero' }, 300);
  const pct = r.rate * 100;
  console.log(`  ${name.padEnd(13)} ${pct.toFixed(1)}% of deals need no guess (${r.samples} sampled)`);
  check(`${name} rate is a fraction`, r.rate >= 0 && r.rate <= 1);
}

// ═══ The other three games ═══════════════════════════════════
// The Minesweeper engine has the deepest checks because it makes the site's
// strongest claims, but every game grades answers, and an ungrounded answer
// key is the same defect wherever it lives.

const T = await import('../js/games/twenty48/game.js');
const TG = await import('../js/games/twenty48/generate.js');

section('2048 merges, which is what clones get wrong');
{
  const Z = [0, 0, 0, 0];
  const g = (row) => [...row, ...Z, ...Z, ...Z];
  const cases = [
    [[2, 2, 2, 2], 'left', [4, 4, 0, 0], 8],
    [[4, 4, 2, 2], 'left', [8, 4, 0, 0], 12],
    [[2, 2, 4, 0], 'left', [4, 4, 0, 0], 4],
    [[4, 2, 2, 0], 'left', [4, 4, 0, 0], 4],
    [[2, 0, 2, 4], 'left', [4, 4, 0, 0], 4],
    [[2, 4, 8, 16], 'left', [2, 4, 8, 16], 0],
    [[2, 2, 2, 2], 'right', [0, 0, 4, 4], 8],
    [[4, 4, 2, 2], 'right', [0, 0, 8, 4], 12],
  ];
  let bad = 0;
  for (const [row, dir, want, gain] of cases) {
    const grid = g(row);
    const before = JSON.stringify(grid);
    const r = T.applyMove(grid, dir);
    const got = r.grid.slice(0, 4);
    if (JSON.stringify(got) !== JSON.stringify(want)) bad++;
    if (r.gained !== gain) bad++;
    if (JSON.stringify(grid) !== before) bad++;   // applyMove must be pure
  }
  check(`${cases.length} merge cases including the two-merge trap`, bad === 0, `${bad} wrong`);

  const col = [2, 0, 0, 0, 2, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0];
  const up = T.applyMove(col, 'up');
  check('vertical merges work the same way', up.grid[0] === 4 && up.grid[4] === 8 && up.grid[8] === 0);
}

section('2048 drill answers are recomputed, not remembered');
{
  let bad = 0, found = 0;
  for (let i = 0; i < 200; i++) {
    const pos = TG.findPosition(2);
    if (!pos) continue;
    found++;
    const mine = T.DIRS.filter((d) => T.applyMove(pos.grid, d).moved).sort();
    if (JSON.stringify([...pos.answers].sort()) !== JSON.stringify(mine)) bad++;
  }
  check(`level 2: ${found} positions, answer key matches an independent recompute`, bad === 0, `${bad} wrong`);

  const hist = {};
  for (let i = 0; i < 200; i++) {
    const pos = TG.findPosition(2);
    if (pos) hist[T.legalMoves(pos.grid).length] = (hist[T.legalMoves(pos.grid).length] || 0) + 1;
  }
  check('level 2 shows more than just the one-legal-move case',
    Object.keys(hist).length > 1, JSON.stringify(hist));
}

const C = await import('../js/games/chess/puzzles.js');
const CB = await import('../js/games/chess/board.js');

section('Chess positions parse and their answers are real moves');
{
  let bad = 0;
  for (const p of [...C.PUZZLES, ...C.QUIET]) {
    const { board } = CB.parseFen(p.fen);
    const kings = board.filter((sq) => sq && sq.type === 'k');
    if (kings.length !== 2) bad++;
    if (board.filter((sq) => sq && sq.type === 'k' && sq.white).length !== 1) bad++;
    // No pawn may sit on the first or last rank.
    for (let i = 0; i < 64; i++) {
      const row = Math.floor(i / 8);
      if (board[i] && board[i].type === 'p' && (row === 0 || row === 7)) bad++;
    }
  }
  check(`${C.PUZZLES.length + C.QUIET.length} positions are structurally legal`, bad === 0, `${bad} problems`);

  let badMoves = 0;
  for (const p of C.PUZZLES) {
    if (!p.solution.length) badMoves++;
    for (const uci of p.solution) {
      const [from, to] = CB.moveSquares(uci);
      const { board } = CB.parseFen(p.fen);
      if (from < 0 || from > 63 || to < 0 || to > 63) badMoves++;
      if (!board[from]) badMoves++;                  // must move an actual piece
      if (!board[from] || !board[from].white) badMoves++;   // White to move in all of them
    }
  }
  check('every stored solution moves a real white piece', badMoves === 0, `${badMoves} bad`);
  check('square naming round-trips', [...Array(64).keys()].every((i) => CB.squareIndex(CB.squareName(i)) === i));
}

section('Cards teardown data');
{
  check(`${CARD_SYSTEMS.length} systems across ${CARD_GROUPS.length} groups`, CARD_SYSTEMS.length === 13);

  const ids = CARD_SYSTEMS.map((s) => s.id);
  check('ids are unique', new Set(ids).size === ids.length);

  // Half-translating is the likely failure once someone adds a system in a
  // hurry, and it shows up as an English sentence inside the Spanish view.
  const BILINGUAL = ['resource', 'information', 'entry', 'origin', 'family', 'works', 'failure', 'lesson'];
  const half = CARD_SYSTEMS.filter((s) => BILINGUAL.some((f) => !s[f] || !s[f].en || !s[f].es));
  check('every system is fully bilingual', half.length === 0, half.map((s) => s.name).join(', '));

  const missing = CARD_SYSTEMS.filter((s) => CARD_AXES.some((a) => s[a.id] === undefined));
  check('every system fills every axis', missing.length === 0, missing.map((s) => s.name).join(', '));

  const SCALES = {
    catchup: ['none', 'weak', 'strong'], downtime: ['none', 'low', 'high'],
    elimination: ['no', 'late', 'yes'], interaction: ['none', 'indirect', 'direct'],
  };
  const badScale = CARD_SYSTEMS.flatMap((s) => Object.entries(SCALES)
    .filter(([k, vals]) => !vals.includes(s[k])).map(([k]) => `${s.name}.${k}=${s[k]}`));
  check('scale values are all legal', badScale.length === 0, badScale.join(', '));

  check('every source is an https url', CARD_SOURCES.every((s) => /^https:\/\//.test(s.url)));

  // The claim the view rests on. If a data edit ever inverts this, the thesis
  // is wrong and the copy has to change, not the test.
  const score = (s) => (s.elimination === 'no' ? 1 : 0) + (s.catchup !== 'none' ? 1 : 0)
    + (s.downtime !== 'high' ? 1 : 0) + (s.teach <= 15 ? 1 : 0);
  const casual = CARD_SYSTEMS.filter((s) => s.group !== 'tcg');
  const tcg = CARD_SYSTEMS.filter((s) => s.group === 'tcg');
  const avg = (xs) => xs.reduce((a, s) => a + score(s), 0) / xs.length;
  check(`casual games outscore TCGs on the casual axes (${avg(casual).toFixed(2)} vs ${avg(tcg).toFixed(2)})`,
    avg(casual) > avg(tcg));
}

section('Card tactics: lethal search is sound and complete');
{
  // An independent reference: naive depth-first with no memoisation and no
  // pruning. Slower and dumber on purpose, so agreeing with it means the
  // fast search's shortcuts did not change the answer.
  function naiveLethal(state, depth = 0) {
    if (CM.them(state).life <= 0) return true;
    if (depth > 6) return false;
    for (const a of CM.legalActions(state)) {
      if (a.kind === 'end') continue;
      if (naiveLethal(CM.applyAction(state, a), depth + 1)) return true;
    }
    return false;
  }

  const boards = ['scout', 'runner', 'guard', 'knight'];
  const hands = [[], ['bolt'], ['volley'], ['bolt', 'bolt'], ['knight'], ['strike']];
  let cases = 0, disagree = 0, falseNo = 0, falseYes = 0;

  for (const b of boards) {
    for (const h of hands) {
      for (const life of [1, 2, 3, 4, 5, 6, 8, 11]) {
        for (const mana of [0, 1, 2, 3, 4]) {
          CM.resetUids();
          const st = CM.makeState({
            you: { mana, hand: h, board: [{ cardId: b, sick: false }] },
            foe: { life, board: [] },
          });
          const fast = CT.findLethal(st);
          if (fast.capped) continue;
          const slow = naiveLethal(st);
          cases++;
          if (fast.lethal !== slow) {
            disagree++;
            if (slow && !fast.lethal) falseNo++; else falseYes++;
          }
        }
      }
    }
  }
  check(`agrees with brute force on ${cases} positions`, disagree === 0,
    `${falseNo} missed lethals, ${falseYes} phantom lethals`);
  check('no position was left uncertain by the node cap', cases > 700, `only ${cases} decided`);

  // A reported lethal must actually reduce the opponent to zero when replayed.
  let replayed = 0, bad = 0;
  for (const life of [2, 4, 5, 7]) {
    CM.resetUids();
    const st = CM.makeState({
      you: { mana: 4, hand: ['bolt', 'volley'], board: [{ cardId: 'knight', sick: false }] },
      foe: { life, board: [] },
    });
    const r = CT.findLethal(st);
    if (!r.lethal) continue;
    let cur = st;
    for (const a of r.line) cur = CM.applyAction(cur, a);
    replayed++;
    if (CM.them(cur).life > 0) bad++;
  }
  check(`every reported lethal line actually kills (${replayed} replayed)`, bad === 0 && replayed > 0);

  // Summoning sickness is what makes tempo real; a fresh creature must not swing.
  CM.resetUids();
  const sick = CM.makeState({ you: { mana: 3, hand: ['knight'], board: [] }, foe: { life: 3 } });
  check('a creature played this turn cannot attack for lethal', CT.findLethal(sick).lethal === false);

  // Card advantage is arithmetic: one removal killing one creature is even.
  CM.resetUids();
  const trade = CM.makeState({
    you: { mana: 2, hand: ['strike'], board: [] },
    foe: { life: 20, board: [{ cardId: 'knight', sick: false }] },
  });
  const d = CT.cardDelta(trade, [{ kind: 'play', index: 0, cardId: 'strike', target: CM.them(trade).board[0].uid }]);
  check('one removal for one creature is a 1-for-1', d.delta === 0, JSON.stringify(d));
}

section('Card drills grade correctly, not just consistently');
{
  // Level 1: answer with what the search says, and the drill must accept it.
  // If these two ever disagree the drill is grading against a different truth
  // than the one the explanation shows.
  let n = 0, wrongWhenRight = 0, rightWhenWrong = 0;
  for (let i = 0; i < 60; i++) {
    const d = CD.make(1);
    if (!d) continue;
    n++;
    const truth = /Lethal, in|Hay lethal/.test(d.grade('yes').detail) ? 'yes' : 'no';
    if (!d.grade(truth).correct) wrongWhenRight++;
    if (d.grade(truth === 'yes' ? 'no' : 'yes').correct) rightWhenWrong++;
  }
  check(`lethal drill accepts the true answer (${n} drills)`, wrongWhenRight === 0, `${wrongWhenRight} rejected`);
  check('lethal drill rejects the false answer', rightWhenWrong === 0, `${rightWhenWrong} accepted`);

  // Level 2: the drill claims an exact spend exists, so grading must agree
  // with a subset actually summing to the mana.
  let curves = 0, badKey = 0;
  for (let i = 0; i < 60; i++) {
    const d = CD.make(2);
    if (!d) continue;
    curves++;
    const m = /(\d+) mana|Tienes (\d+)/.exec(d.prompt);
    const mana = Number(m && (m[1] || m[2]));
    // An empty pick spends 0, which can only be right if mana were 0.
    if (d.grade([]).correct && mana !== 0) badKey++;
  }
  check(`curve drill built ${curves} positions with a real exact spend`, curves > 0);
  check('curve drill never accepts spending nothing', badKey === 0, `${badKey} accepted`);

  // Level 3: the answer varies by position (removal that whiffs is -1, a
  // sweeper answering three is +2), so the check recomputes it independently
  // rather than assuming a constant.
  let ex = 0, bad3 = 0, seen = new Set();
  for (let i = 0; i < 120; i++) {
    const d = CD.make(3);
    ex++;
    const m = /removed (\d+)/.exec(d.grade(0).detail) || /eliminaste (\d+)/.exec(d.grade(0).detail);
    const spentM = /spent (\d+)/.exec(d.grade(0).detail) || /Gastaste (\d+)/.exec(d.grade(0).detail);
    if (!m || !spentM) { bad3++; continue; }
    const expected = Number(m[1]) - Number(spentM[1]);
    seen.add(expected);
    if (!d.grade(expected).correct) bad3++;
    for (const wrong of [-1, 0, 1, 2].filter((v) => v !== expected)) {
      if (d.grade(wrong).correct) bad3++;
    }
  }
  check(`exchange drill grades every shape correctly (${ex} drills)`, bad3 === 0, `${bad3} mistakes`);
  check(`all three outcomes actually occur (saw ${[...seen].sort().join(', ')})`, seen.size >= 3,
    `only ${seen.size} distinct answers`);

  // Every drill must name a pattern that actually exists, or the record keys
  // rows nobody can find.
  const { patterns: CARD_PATTERNS } = await import('../js/games/cards/patterns.js');
  const ids = new Set(CARD_PATTERNS.map((p) => p.id));
  const used = new Set();
  for (const lv of [1, 2, 3]) {
    for (let i = 0; i < 5; i++) { const d = CD.make(lv); if (d) used.add(d.patternId); }
  }
  const orphan = [...used].filter((id) => !ids.has(id));
  check('every drill points at a real pattern', orphan.length === 0, orphan.join(', '));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
