// ── 2048 drills ──────────────────────────────────────────────
// Five levels, all graded against a property computed from the board:
// which moves take the maximum off its corner, which moves change the
// board at all, which keep the anchor row full, which leave the fewest
// breaks in the snake, and which leave a board that is not dead once one of
// the values this ruleset can spawn lands in it. No level grades an opinion
// about the best move.

import { el } from '../../utils.js';
import {
  DIRS, DIR_LABEL, CORNER_NAME,
  applyMove, emptyCells, maxTile, anchorRowIndices, deadAfterMove, hasPair,
  survivingSpawnValues,
} from './game.js';
import { boardNode, choiceRow, paintChoices, dirReadout } from './board.js';
import { findPosition } from './generate.js';

// ── Copy helpers ─────────────────────────────────────────────
const NUM = ['none', 'One', 'Two', 'Three', 'Four'];
const v = (arr, one, many) => (arr.length === 1 ? one : many);

function list(dirs) {
  const names = dirs.map((d) => DIR_LABEL[d] || d);
  if (!names.length) return 'nothing';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "a 2", or "a 2 or a 4". Only the values this ruleset can actually spawn. */
const spawnList = (vals) => vals.map((n) => `a ${n}`).join(' or ');
/** How the level 5 copy names the spawn it cannot control. */
const whatever = (vals) => (vals.length > 1 ? 'whatever spawns next' : `once the ${vals[0]} spawns`);
const pct = (p) => `${Math.round(p * 100)}%`;

// ── Levels ───────────────────────────────────────────────────

const LEVELS = [{
  id: 1,
  name: 'Anchor slip',
  blurb: 'Find the move that takes the biggest tile out of its corner.',
  patternId: 'twenty48-corner-anchor',
  hint: 'A move can only pull the corner tile out if its line has somewhere to slide.',
  mark: (f) => [f.corner],
  prompt: (f) => `The ${maxTile(f.grid)} sits in ${CORNER_NAME[f.corner]}, marked. Which move slides it off that corner?`,
  detail(f) {
    const kept = DIRS.filter((d) => !f.answers.includes(d));
    const inert = kept.filter((d) => !applyMove(f.grid, d).moved);
    const held = kept.filter((d) => applyMove(f.grid, d).moved);
    const bits = [`${list(f.answers)} ${v(f.answers, 'is', 'are')} the answer: apply it and the ${maxTile(f.grid)} is no longer on ${CORNER_NAME[f.corner]}.`];
    if (held.length) bits.push(`${list(held)} ${v(held, 'moves', 'move')} other tiles and ${v(held, 'leaves', 'leave')} the ${maxTile(f.grid)} where it is.`);
    if (inert.length) bits.push(`${list(inert)} ${v(inert, 'changes', 'change')} nothing, and a move that changes nothing cannot dislodge anything.`);
    bits.push('Corner anchor: every merge you have lined up is ordered behind that one tile. The move that moves it throws away the ordering, not just the tile.');
    return bits.join(' ');
  },
  readout: (f) => dirReadout('The corner tile after each move', DIRS.map((dir) => {
    const res = applyMove(f.grid, dir);
    if (!res.moved) return { dir, text: 'changes nothing' };
    return { dir, text: res.grid[f.corner] >= f.grid[f.corner] ? 'stays in the corner' : 'leaves the corner' };
  })),
}, {
  id: 2,
  name: 'Dead directions',
  blurb: 'Tick every move that actually changes the board.',
  patternId: 'twenty48-emergency-move',
  multi: true,
  hint: 'A line that is packed against the wall with no equal pair has nowhere to go.',
  mark: () => [],
  prompt: () => 'Tick every move that changes the board, then submit. A move that leaves the grid identical is not a move.',
  detail(f) {
    const illegal = DIRS.filter((d) => !f.legal.includes(d));
    const bits = [
      `${list(f.legal)} ${v(f.legal, 'changes', 'change')} the board. ${list(illegal)} ${v(illegal, 'does', 'do')} not: every line running that way is already packed against the wall with no equal pair to merge, so the grid comes back identical.`,
      '2048 does not spawn a tile for a move that changed nothing, so it costs you nothing and gains you nothing.',
    ];
    bits.push(f.legal.length === 1
      ? `One direction left is the emergency itself. You are not choosing ${list(f.legal)}, you are being handed it, so work out where the maximum lands and which single move puts it back before you press.`
      : 'Counting these is how you know when your three working directions have quietly become two, which is the moment before you are forced into the fourth.');
    return bits.join(' ');
  },
  readout: (f) => dirReadout('Does the grid change', DIRS.map((dir) => ({
    dir, text: f.legal.includes(dir) ? 'changes the board' : 'identical, not a move',
  }))),
}, {
  id: 3,
  name: 'Hold the row',
  blurb: 'Keep the anchor row full so nothing can slide it.',
  patternId: 'twenty48-anchor-row',
  hint: 'A merge inside the row empties it just as surely as a tile leaving it.',
  mark: (f) => anchorRowIndices(f.corner),
  prompt: (f) => `The marked row holds the ${maxTile(f.grid)} and all four cells are full. Counting only moves that change the board, which one leaves it full?`,
  detail(f) {
    const row = anchorRowIndices(f.corner);
    const others = f.legal.filter((d) => !f.answers.includes(d));
    const cost = others.map((d) => {
      const holes = row.filter((i) => applyMove(f.grid, d).grid[i] === 0).length;
      return `${DIR_LABEL[d]} opens ${plural(holes, 'hole')}`;
    });
    return [
      `${list(f.answers)} ${v(f.answers, 'leaves', 'leave')} all four cells filled. ${cost.join(', ')}.`,
      'A row that is full with no equal pair in it cannot move along its own direction at all: nothing has anywhere to slide. That is what pins the corner tile.',
      'Open one hole in it, by a tile leaving or by a merge inside it, and the next move along that row slides the row, and the anchor rides along.',
    ].join(' ');
  },
  readout(f) {
    const row = anchorRowIndices(f.corner);
    return dirReadout('Cells filled in the anchor row', DIRS.map((dir) => {
      const res = applyMove(f.grid, dir);
      if (!res.moved) return { dir, text: 'changes nothing' };
      return { dir, text: `${row.filter((i) => res.grid[i] !== 0).length} of 4` };
    }));
  },
}, {
  id: 4,
  name: 'Keep the order',
  blurb: 'Which move leaves the fewest breaks in the snake.',
  patternId: 'twenty48-snake',
  hint: 'Read the non-empty cells along the path. Count the steps that go up.',
  mark: (f) => [f.corner],
  prompt: (f) => `The snake runs from the marked corner: along that row, back along the next, and so on. It has ${plural(f.before, 'break')} right now. Of the moves that leave the ${maxTile(f.grid)} on that corner, which leaves the fewest breaks?`,
  detail(f) {
    const held = f.scored.filter((s) => s.keeps);
    const low = Math.min(...held.map((s) => s.breaks));
    const rest = held.filter((s) => !f.answers.includes(s.dir))
      .sort((a, b) => a.breaks - b.breaks)
      .map((s) => `${DIR_LABEL[s.dir]} leaves ${s.breaks}`);
    const loose = f.scored.filter((s) => !s.keeps).map((s) => s.dir);
    const bits = [`${list(f.answers)} ${v(f.answers, 'leaves', 'leave')} ${plural(low, 'break')}; the board had ${f.before}. ${rest.join(', ')}.`];
    if (loose.length) {
      bits.push(`${list(loose)} ${v(loose, 'is', 'are')} out of the running whatever the break count beside ${v(loose, 'it', 'them')} says: ${v(loose, 'it takes', 'they take')} the ${maxTile(f.grid)} off ${CORNER_NAME[f.corner]}, and a snake measured from a corner the maximum has left is not the snake you are keeping.`);
    }
    bits.push('A break is a step along the path where the next non-empty cell is bigger than the one before it.');
    bits.push('Every break is a merge the path cannot deliver: the smaller tile has to get past a bigger one to reach its equal, and tiles do not jump. Sorted along one path means the next merge is always waiting for you.');
    return bits.join(' ');
  },
  readout: (f) => dirReadout('Breaks in the snake after each move', DIRS.map((dir) => {
    const hit = f.scored.find((s) => s.dir === dir);
    if (!hit) return { dir, text: 'changes nothing' };
    return { dir, text: hit.keeps ? String(hit.breaks) : `${hit.breaks}, but the ${maxTile(f.grid)} leaves the corner` };
  })),
}, {
  id: 5,
  name: 'Two moves early',
  blurb: 'One hole left. Find the move that is not already dead.',
  patternId: 'twenty48-dead-board',
  hint: 'A move that merges frees a second cell. A move that only slides does not.',
  mark: () => [],
  prompt: (f) => `One empty cell left, and this board spawns ${spawnList(f.spawnValues)}. Of the moves that change the board, ${NUM[f.killers.length].toLowerCase()} ${v(f.killers, 'leaves', 'leave')} a position that is dead ${whatever(f.spawnValues)}. Find ${f.answers.length === 1 ? 'the one' : 'one'} that does not.`,
  detail(f) {
    const vals = f.spawnValues;
    const bits = [];
    for (const dir of f.answers) {
      const res = applyMove(f.grid, dir);
      const free = emptyCells(res.grid).length;
      const alive = survivingSpawnValues(f.grid, dir, vals);
      const kills = vals.filter((n) => !alive.includes(n));
      if (free > 1) {
        bits.push(`${DIR_LABEL[dir]} merges, which frees a second cell: with two holes the spawn cannot fill the board, and a board with an empty cell always has a move.`);
      } else if (kills.length) {
        bits.push(`${DIR_LABEL[dir]} only slides, and only ${spawnList(alive)} survives it: ${spawnList(kills)} in that hole touches nothing equal and the board is over. A ${alive[0]} arrives ${pct(alive[0] === 4 ? f.fourChance : 1 - f.fourChance)} of the time, so this is the move that can survive, not a move that is safe.`);
      } else if (hasPair(res.grid)) {
        bits.push(`${DIR_LABEL[dir]} only slides, but it leaves two equal tiles touching elsewhere on the board, and that pair is a move ${vals.length > 1 ? 'whatever spawns' : `once the ${vals[0]} lands`}.`);
      } else {
        bits.push(`${DIR_LABEL[dir]} only slides, and the hole it leaves has a neighbour ${spawnList(alive)} can match, so the spawn itself hands you the next move.`);
      }
    }
    const nothingMatches = vals.length > 1
      ? `neither ${vals.map((n) => `a ${n}`).join(' nor ')} dropped in it touches an equal tile`
      : `the ${vals[0]} that drops into it touches nothing equal`;
    bits.push(`${list(f.killers)} only ${v(f.killers, 'slides', 'slide')}: one hole in, one hole out, and ${nothingMatches}. That board is dead the moment it spawns.`);
    bits.push('This is the loss, two moves before it shows up: no space and no order left, so no equal pair anywhere.');
    return bits.join(' ');
  },
  readout: (f) => dirReadout('After the move, and after the spawn', DIRS.map((dir) => {
    const dead = deadAfterMove(f.grid, dir, f.spawnValues);
    if (dead === null) return { dir, text: 'changes nothing' };
    const free = emptyCells(applyMove(f.grid, dir).grid).length;
    if (dead) return { dir, text: `dead ${whatever(f.spawnValues)}` };
    const alive = survivingSpawnValues(f.grid, dir, f.spawnValues);
    if (free === 1 && alive.length < f.spawnValues.length) {
      return { dir, text: `alive only on ${spawnList(alive)}` };
    }
    return { dir, text: `${plural(free, 'cell')} free, still alive` };
  })),
}];

export const levels = LEVELS.map(({ id, name, blurb }) => ({ id, name, blurb }));

// ── The drill object ─────────────────────────────────────────

function sameSet(a, b) {
  const x = Array.isArray(a) ? a : [];
  return x.length === b.length && b.every((d) => x.includes(d));
}

export function make(levelId) {
  const level = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
  let found = null;
  try { found = findPosition(level.id); } catch { found = null; }
  if (!found) return null;

  let buttons = null;
  let stage = null;

  return {
    patternId: level.patternId,
    prompt: level.prompt(found),
    hint: level.hint,

    mount(host, commit) {
      stage = host;
      const board = boardNode(found.grid, { mark: level.mark(found), label: 'Drill position' });
      const picked = new Set();
      let submit = null;

      const row = choiceRow((dir, btn) => {
        if (!level.multi) return commit(dir);
        btn.classList.toggle('is-picked');
        if (picked.has(dir)) picked.delete(dir); else picked.add(dir);
        if (submit) submit.disabled = picked.size === 0;
        return undefined;
      });
      buttons = row.buttons;

      if (level.multi) {
        submit = el('button', {
          class: 'btn btn--primary', type: 'button', disabled: true,
          onclick: () => commit(DIRS.filter((d) => picked.has(d))),
        }, 'Submit');
      }

      host.replaceChildren(el('div', { class: 'stack stack--tight' },
        board,
        row.wrap,
        submit ? el('div', { class: 'toolbar' }, submit) : null,
      ));
    },

    grade(answer) {
      const correct = level.multi
        ? sameSet(answer, found.answers)
        : found.answers.includes(answer);
      return {
        correct,
        detail: level.detail(found),
        reveal: (host) => {
          if (buttons) paintChoices(buttons, found.answers, answer);
          const target = host || stage;
          if (target) target.append(level.readout(found));
        },
      };
    },
  };
}
