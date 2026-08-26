// ── Play ─────────────────────────────────────────────────────
// A normal game, plus two buttons a normal game does not have:
// Explain, which names the rule that settles the next cell, and Odds,
// which prices every guess. On a loss it also tells you whether the board
// was solvable at all, because "you should have seen that" is often false.

import { el, fmtMs, showToast } from '../../utils.js';
import {
  createBoard, playMove, minesRemaining, revealAll, DIFFICULTIES, HIDDEN, REVEALED,
} from './engine.js';
import { analyze } from './analysis.js';
import { mineProbabilities, bestGuess } from './probability.js';
import { openFirst, isNoGuess, pickOpeningCell } from './generate.js';
import { renderBoard, paintOverlay } from './view.js';
import { PATTERN_BY_ID, RULE_TO_PATTERN } from './patterns.js';

export function mountPlay(host, ctx) {
  const st = {
    board: null,
    startedAt: 0,
    timer: null,
    elapsed: 0,
    busy: false,
    verdict: null,
  };

  const shell = el('div', { class: 'stack' });
  const statbar = el('div', { class: 'statbar' });
  const boardWrap = el('div', { class: 'boardwrap' });
  const notice = el('div', { class: 'notice', hidden: true });
  const controls = el('div', { class: 'toolbar' });
  shell.append(statbar, controls, notice, boardWrap);
  host.replaceChildren(shell);

  function newGame() {
    const diff = DIFFICULTIES[ctx.settings.difficulty] || DIFFICULTIES.beginner;
    st.board = createBoard(diff.w, diff.h, diff.mines, rulesetFrom(ctx.settings));
    st.startedAt = 0;
    st.elapsed = 0;
    st.verdict = null;
    stopTimer();
    notice.hidden = true;
    draw();
  }

  function rulesetFrom(s) {
    return {
      firstClick: s.firstClick,
      noGuess: s.noGuess,
      noGuessDepth: s.noGuessDepth,
      chording: s.chording,
      flagsRequired: s.flagsRequired,
      showMineCount: s.showMineCount,
    };
  }

  function startTimer() {
    if (st.timer) return;
    st.startedAt = performance.now();
    st.timer = setInterval(() => {
      st.elapsed = performance.now() - st.startedAt;
      const node = document.getElementById('msClock');
      if (node) node.textContent = `${(st.elapsed / 1000).toFixed(1)}s`;
    }, 100);
  }
  function stopTimer() { clearInterval(st.timer); st.timer = null; }

  async function onCell(i, action) {
    const b = st.board;
    if (!b || b.dead || b.won || st.busy) return;

    if (!b.placed) {
      if (action !== 'open') return;
      st.busy = true;
      if (b.ruleset.noGuess) {
        notice.hidden = false;
        notice.className = 'notice';
        notice.replaceChildren(el('p', { text: 'Dealing a board that logic alone can finish…' }));
      }
      await openFirst(b, i, {
        onProgress: ({ attempts, ms, budgetMs }) => {
          notice.replaceChildren(el('p', {
            text: `Dealing a board that logic alone can finish: ${attempts} tried, ${Math.round(ms / 100) / 10}s of ${budgetMs / 1000}s.`,
          }));
        },
      });
      st.busy = false;
      notice.hidden = !b.guessWarning;
      if (b.guessWarning) {
        notice.className = 'notice notice--warn';
        notice.replaceChildren(el('p', { text: b.guessWarning.text }));
      }
      startTimer();
      if (b.mine[i]) {
        // Only reachable under firstClick 'anywhere'. Show the board the way
        // any other loss shows it, rather than leaving the rest hidden.
        b.dead = true;
        b.hitIndex = i;
        revealAll(b);
      }
      finish(b);
      draw();
      return;
    }

    startTimer();
    playMove(b, i, action === 'open' ? 'open' : action);
    finish(b);
    draw();
  }

  function finish(b) {
    if (!b.dead && !b.won) return;
    stopTimer();
    if (b.dead) {
      // The question people actually want answered after a loss.
      const probe = createBoard(b.w, b.h, b.mines, b.ruleset);
      probe.mine = b.mine; probe.num = b.num; probe.placed = true;
      const opening = firstOpenedZero(b);
      st.verdict = opening === null ? null : isNoGuess(probe, opening);
    }
  }

  function firstOpenedZero(b) {
    for (let i = 0; i < b.st.length; i++) {
      if (b.st[i] === REVEALED && !b.mine[i] && b.num[i] === 0) return i;
    }
    return null;
  }

  function explain() {
    const b = st.board;
    if (!b || !b.placed || b.dead || b.won) return showToast('Open a cell first.');
    const r = analyze(b);
    const grid = boardWrap.querySelector('.msboard');
    if (!r.steps.length && r.exhausted) {
      const g = bestGuess(b);
      if (grid && g) paintOverlay(grid, g.cells.map((i) => [i, 'hint']));
      return say(g
        ? `Nothing is forced. The cheapest click is ${Math.round(g.probability * 100)} percent to be a mine${g.cells.length > 1 ? `, and ${g.cells.length} cells tie for it` : ''}. ${Math.abs(g.probability - 0.5) < 1e-9 && g.cells.length > 1 ? 'That is a true coin flip, and no amount of looking will change it.' : ''}`
        : 'Nothing is forced here.', 'warn');
    }
    // The FIRST step is the deduction available from what is on screen right
    // now. The last one may depend on three earlier deductions the player has
    // not made yet, which reads as a non sequitur.
    const step = r.steps[0];
    if (!step) return say('Nothing left to deduce.', 'warn');
    const pattern = PATTERN_BY_ID.get(RULE_TO_PATTERN[step.rule]);
    if (grid) paintOverlay(grid, [
      ...step.source.map((i) => [i, 'source']),
      ...step.cells.map((i) => [i, step.kind === 'safe' ? 'safe' : 'mine']),
    ]);
    say(`${pattern ? pattern.name + '. ' : ''}${step.text}`);
  }

  function odds() {
    const b = st.board;
    if (!b || !b.placed || b.dead || b.won) return showToast('Open a cell first.');
    const r = mineProbabilities(b);
    const grid = boardWrap.querySelector('.msboard');
    if (!r) return say('Too many layouts to count here. Play a few more certain cells and ask again.', 'warn');
    for (const [i, p] of r.probs) {
      const node = grid?.querySelector(`[data-i="${i}"]`);
      if (node && b.st[i] === HIDDEN) {
        node.classList.add('has-odds');
        // Rounding alone printed "0" for a cell that is merely very likely safe,
        // which reads as proven. Keep 0 and 100 for the cells logic settles.
        node.dataset.odds = p === 0 ? '0'
          : p === 1 ? '100'
          : p < 0.005 ? '<1'
          : p > 0.995 ? '>99'
          : String(Math.round(p * 100));
      }
    }
    const g = bestGuess(b);
    const settled = [...r.probs.values()].filter((p) => p === 0 || p === 1).length;
    say(g
      ? `Every hidden cell now shows its chance of being a mine. ${settled ? `${settled} of them read 0 or 100, which means logic already settles them: those are not guesses. ` : ''}The cheapest real guess is ${Math.round(g.probability * 100)} percent. Cells far from any number are not automatically the safest, which is the whole reason the weighting exists.`
      : 'No hidden cells left.');
  }

  function say(text, kind) {
    notice.hidden = false;
    notice.className = `notice${kind ? ` notice--${kind}` : ''}`;
    notice.replaceChildren(el('p', { text }));
  }

  function draw() {
    const b = st.board;
    const left = b.ruleset.showMineCount ? minesRemaining(b) : '?';
    statbar.replaceChildren(
      stat('Mines left', String(left)),
      stat('Time', `${(st.elapsed / 1000).toFixed(1)}s`, 'msClock'),
      stat('Ruleset', rulesetSummary(b.ruleset)),
      stat('State', b.dead ? 'Lost' : b.won ? 'Won' : b.placed ? 'Playing' : 'Ready'),
    );

    controls.replaceChildren(
      el('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: newGame }, 'New board'),
      el('button', { class: 'btn btn--secondary btn--sm', type: 'button', onclick: explain }, 'Explain next move'),
      el('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: odds }, 'Show odds'),
      el('select', {
        class: 'select', 'aria-label': 'Difficulty',
        onchange: (e) => { ctx.settings.difficulty = e.target.value; ctx.save(); newGame(); },
      }, Object.entries(DIFFICULTIES).map(([key, d]) => el('option', {
        value: key, selected: key === ctx.settings.difficulty,
      }, `${d.label} ${d.w}x${d.h}, ${d.mines}`))),
    );

    renderBoard(boardWrap, b, { onCell });

    if (b.dead || b.won) {
      notice.hidden = false;
      notice.className = `notice notice--${b.won ? 'good' : 'warn'}`;
      notice.replaceChildren(
        el('p', { text: b.won
          ? `Cleared in ${fmtMs(st.elapsed)}.`
          : 'You hit a mine.' }),
        !b.won && st.verdict !== null ? el('p', { class: 'notice__sub', text: st.verdict
          ? 'That board was solvable by logic alone from your opening. Somewhere there was a deduction available.'
          : 'That board was not solvable by logic alone. At some point it was going to force a guess, whatever you did.' }) : null,
      );
    }
  }

  function stat(label, value, id) {
    return el('div', { class: 'stat' },
      el('span', { class: 'stat__label', text: label }),
      el('span', { class: 'stat__value', id: id || null, text: value }));
  }

  newGame();
  return () => stopTimer();
}

export function rulesetSummary(r) {
  const bits = [];
  bits.push(r.firstClick === 'zero' ? 'opens a region' : r.firstClick === 'safe' ? 'first click safe' : 'first click can kill');
  if (r.noGuess) bits.push('no guessing');
  if (!r.chording) bits.push('no chording');
  return bits.join(', ');
}
