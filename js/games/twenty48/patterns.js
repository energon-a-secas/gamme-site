// ── 2048 patterns ────────────────────────────────────────────
// Eight patterns, all reducing to the same rule: a merge needs two equal
// tiles next to each other, so the game is a sorting problem wearing a
// scoring hat. Every board in a diagram was checked against the engine.

import { gridFrom } from './game.js';
import { diagramNode } from './board.js';

export const coreRule = {
  title: 'Merges need equal neighbours, so the whole game is keeping the board sorted',
  body: 'Two tiles combine only when they are equal and next to each other along the direction you press. '
    + 'A board sorted along one path always has its next merge waiting: the values fall by halves, so the two '
    + 'smallest sit together at the tail, and merging them makes a tile that still fits where it lands. A scrambled '
    + 'board hides equal tiles behind unequal ones, and tiles do not jump. When no two equal tiles touch anywhere '
    + 'and no cell is free, there is no move. That is the only way you lose: not by running out of score, by running out of order.',
  formula: 'sorted along one path  =>  the next merge is always available',
};

const diagram = (grid, caption, mark = []) => () => diagramNode(grid, caption, mark);

// Verified: all four moves legal, only Down takes the 512 off the corner,
// zero breaks along the snake, anchor row full.
const CLEAN = gridFrom([[512, 256, 128, 64], [2, 4, 8, 32], [0, 0, 0, 2], [2, 0, 0, 0]]);
// Verified: the 256 has no equal anywhere, all four moves are legal, and the
// two 4s beside it and the two 8s above and below it are split by it.
const WALLED = gridFrom([[2, 8, 16, 2], [4, 256, 4, 0], [16, 8, 32, 8], [0, 4, 2, 16]]);
// Verified: 0 breaks now. Up keeps 0. Left and Right each make 1. Down makes 2.
const FOLD = gridFrom([[512, 256, 128, 32], [0, 0, 32, 32], [0, 0, 0, 0], [0, 0, 0, 0]]);
// Verified: zero breaks, and the five empty cells are the last five positions
// on the path from the top left, so every hole really is at the tail.
const TAIL = gridFrom([[1024, 512, 256, 128], [8, 16, 32, 64], [4, 2, 2, 0], [0, 0, 0, 0]]);
// Verified: Down is the only legal move, and it takes the 256 off the corner.
const FROZEN = gridFrom([[256, 4, 2, 4], [4, 8, 4, 8], [8, 16, 8, 16], [0, 0, 0, 0]]);
// Verified: only Up and Left change anything, both only slide, and both leave a
// board that is dead whatever spawns in the hole.
const DOOMED = gridFrom([[0, 8, 4, 16], [64, 16, 32, 8], [32, 128, 64, 256], [512, 256, 512, 128]]);

export const patterns = [{
  id: 'twenty48-corner-anchor',
  name: 'Corner anchor',
  tier: 1,
  trigger: 'Your biggest tile is anywhere but a corner, or the move you are about to play would take it out of one.',
  action: 'Pick one corner on move one and never play a move that can pull the maximum off it.',
  why: 'The biggest tile has no equal anywhere on the board, so it can never be merged away. It is permanent weight '
    + 'that only grows. In a corner it blocks nothing: everything smaller still has room to sort itself behind it. '
    + 'In the middle it is a wall, and equal tiles on opposite sides of it can never reach each other, because tiles '
    + 'slide past nothing. Losing the corner does not cost you one tile. It costs you the ordering that every merge '
    + 'you had planned was measured from.',
  diagram: diagram(WALLED, 'The 256 has no equal on this board, so nothing will ever merge with it. Parked in the middle it splits its own row and column: the two 4s beside it can never reach each other, and neither can the two 8s above and below it.', [5]),
  tags: ['anchor', 'opening'],
}, {
  id: 'twenty48-anchor-row',
  name: 'The full anchor row',
  tier: 1,
  trigger: 'The row holding your anchor has an empty cell in it.',
  action: 'Fill that row before you play the move that runs along it.',
  why: 'A row that is full and holds no equal pair cannot move along its own direction at all: every tile is already '
    + 'packed against the wall and nothing has anywhere to slide. That is what pins the corner tile, and it is what '
    + 'gives you a third direction you can press without checking. One hole in the row and the same press slides the '
    + 'whole row across, anchor included. A merge inside the row opens a hole just as surely as a tile leaving it, so '
    + 'full is not the same as safe: full and no pair is safe.',
  diagram: diagram(CLEAN, 'The top row is full and has no equal pair in it. Left and Right cannot move it, so the 512 cannot leave.', [0, 1, 2, 3]),
  tags: ['anchor', 'safety'],
}, {
  id: 'twenty48-three-directions',
  name: 'Three directions',
  tier: 1,
  trigger: 'You are reaching for the move that points away from the anchor row.',
  action: 'Play only the three moves that cannot empty that row. Treat the fourth as an emergency, not an option.',
  why: 'Two of the four moves push everything toward your corner, so they can never take the anchor off it. A third '
    + 'runs along the anchor row, and a full row with no pair in it has nowhere to slide, so that move is safe as long '
    + 'as you keep the row full. The fourth pulls the whole board away from the corner and empties the anchor row in a '
    + 'single press. That is not a preference, it is a count: three of the moves preserve the ordering and one destroys it.',
  diagram: diagram(CLEAN, 'Anchor top left: Left, Up and Right all leave the 512 in place. Down is the only move that takes it out.', [0]),
  tags: ['policy', 'anchor'],
}, {
  id: 'twenty48-snake',
  name: 'The snake',
  tier: 2,
  trigger: 'Read the board along one path from the anchor and the values go down, then up, then down.',
  action: 'Sort it so values only fall along the path: across the anchor row, back along the next row, and so on.',
  why: 'A merge needs two equal tiles touching. Along a path that only falls, the two smallest values sit together at '
    + 'the tail, so a merge is always available, and the tile it makes still fits under the one ahead of it. A break, '
    + 'meaning a step where the path goes up, is a merge that can never be delivered: the smaller tile would have to '
    + 'pass through a bigger one to reach its equal. Count the breaks and you have measured how close you are to having '
    + 'no move left, which is the only thing that ends the game.',
  diagram: diagram(CLEAN, 'Left to right along the top, back along the second row, and so on. Every step falls: zero breaks.', [0]),
  tags: ['ordering', 'reading'],
}, {
  id: 'twenty48-merge-small-first',
  name: 'Merge the small end first',
  tier: 2,
  trigger: 'A pair is ready and you have not looked at the tile ahead of it on the path.',
  action: 'Double the pair in your head and compare it with the tile ahead. If it comes out bigger, take the tail merge instead.',
  why: 'A merge doubles a tile where it sits, and the path only stays sorted if the tile ahead of it is still at least '
    + 'as big afterwards. Inside one row the game handles this for you: it merges the pair nearest the wall, and the tile '
    + 'before that pair is already larger. Across a fold it does not, because the two rows slide independently, so a pair '
    + 'doubled at the start of one row can end up larger than the tile it sits under. That is where breaks come from. At '
    + 'the tail the tile ahead is usually far bigger already, which is why the small end is where merges are free.',
  diagram: diagram(FOLD, 'Three 32s around the fold. Merging the pair along the second row makes a 64 sitting under a 32: one break. Merging the fold upward instead makes 64 in the top row and the path still falls.', [3, 6, 7]),
  tags: ['ordering', 'timing'],
}, {
  id: 'twenty48-feed-the-snake',
  name: 'Feed the snake',
  tier: 2,
  trigger: 'You can see a route to combining your two biggest tiles and it takes three or four setup moves.',
  action: 'Take the small merges at the tail instead and let the big one arrive by itself.',
  why: 'Every move that changes the board spawns a tile, so a four move plan costs you four new tiles on a board that '
    + 'is already short of space. The big merge frees one cell, and it frees it at the head, where there was no pressure. '
    + 'Four tail merges free four cells exactly where the spawns land, and they leave the path sorted, which is the '
    + 'condition that makes the big merge available anyway. You do not have to force the chain. A sorted path hands you '
    + 'the next merge every time, and the big ones fall out of the small ones.',
  diagram: diagram(TAIL, 'The head is finished. Every empty cell is at the tail end of the path, and so is the next merge: the two marked 2s. That is also where the next tile lands.', [9, 10]),
  tags: ['tempo', 'planning'],
}, {
  id: 'twenty48-emergency-move',
  name: 'The emergency move',
  tier: 3,
  trigger: 'Your three directions all come back with the board unchanged.',
  action: 'Before pressing the fourth, work out where the anchor lands and which single move puts it back.',
  why: 'The fourth direction empties the anchor row, so the maximum drops out of its corner and every ordering you '
    + 'built is now measured from the wrong cell. That is survivable only when one press puts it straight back, so check '
    + 'that before you commit: apply the move in your head, find the maximum, and find the move that returns it. Remember '
    + 'the spawn gets to interfere, because a new tile can land in the cell you were planning to slide the anchor through. '
    + 'If no single move brings it back, you are choosing which loss to take, and the one that leaves the most empty cells '
    + 'is the one that buys the most moves.',
  diagram: diagram(FROZEN, 'Left, Up and Right all return the board unchanged. Down is forced, and it drops the 256 out of the corner. Up puts it back, unless the spawn lands in the way.', [0]),
  tags: ['recovery', 'counting'],
}, {
  id: 'twenty48-dead-board',
  name: 'Reading a dead board',
  tier: 3,
  trigger: 'One empty cell left, and the moves you still have only slide.',
  action: 'Count it out: does this move merge, and if it does not, test the hole it leaves against each value that can spawn, one at a time, because a 2 and a 4 do not match the same neighbours.',
  why: 'A move never removes an empty cell, so the board can only be killed when there is exactly one hole and the move '
    + 'you play slides without merging. Then the spawn fills the last cell, and a full board is dead unless two neighbours '
    + 'are equal. That gives you the entire check two moves early: how many holes, does this press merge anything, and if '
    + 'not, what sits beside the hole it leaves behind. A merge buys a second hole, and a second hole is always a move, '
    + 'because a board with an empty cell and a tile on it always has one. Check the two spawn values separately: a hole only a 4 can '
    + 'match is not survival, it is a one in ten chance at the original rate, and on a ruleset that never spawns a 4 it is already a loss.',
  diagram: diagram(DOOMED, 'One hole, top left. Only Up and Left do anything and both only slide, so the next spawn fills the board with no equal neighbours anywhere. This position is already over.', [0]),
  tags: ['endgame', 'counting'],
}];
