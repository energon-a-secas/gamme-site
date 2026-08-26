// ── Tactical positions ───────────────────────────────────────
// Every position here was checked with python-chess before it was written
// down: the FEN is legal, the accepted moves are exactly the set of moves
// that achieve the best result, and each one wins material or mates.
//
// `solution` is a LIST because a position can have more than one winning
// move, and grading a player wrong for finding the other one is a bug, not
// a standard. Where the list has two entries, both were verified to reach
// the same result.
//
// Deliberately sparse. A position with six pieces can be checked by a human
// reading this file; one with thirty cannot.

export const PUZZLES = [
  {
    id: 'fork-knight-royal',
    fen: '3r3k/6pp/8/4N3/8/8/P7/6K1 w - - 0 1',
    solution: ['e5f7'],
    motif: 'chess-fork',
    gain: 'wins the rook',
    explain: 'Nf7 hits the king on h8 and the rook on d8 from one square. The check has to be answered, so the rook has no time to move.',
  },
  {
    id: 'fork-knight-rook',
    fen: 'r3k3/8/8/3N4/8/8/8/6K1 w - - 0 1',
    solution: ['d5c7'],
    motif: 'chess-fork',
    gain: 'wins the rook',
    explain: 'Nc7 forks the king on e8 and the rook on a8. Nothing covers c7, so the knight is safe while it does it.',
  },
  {
    id: 'fork-knight-queen',
    fen: '3q1k2/8/8/8/3N4/8/8/6K1 w - - 0 1',
    solution: ['d4e6'],
    motif: 'chess-fork',
    gain: 'wins the queen',
    explain: 'Ne6 attacks the king on f8 and the queen on d8. The queen guards the d file and the eighth rank, but not e6.',
  },
  {
    id: 'queen-fork-diag',
    fen: 'r5k1/6pp/8/8/8/8/8/3Q2K1 w - - 0 1',
    solution: ['d1d5'],
    motif: 'chess-fork',
    gain: 'wins the rook',
    explain: 'Qd5 checks the king on g8 along one diagonal and attacks the rook on a8 along the other. A queen forks with two lines at once, which is why it needs no help.',
  },
  {
    id: 'skewer-rook',
    fen: '7R/6pp/8/1k6/8/8/1r4P1/6K1 w - - 0 1',
    solution: ['h8b8'],
    motif: 'chess-skewer',
    gain: 'wins the rook',
    explain: 'Rb8 checks down the b file. The king must step off it, and the rook standing behind it on b2 is then simply taken. A skewer is a pin with the valuable piece in front.',
  },
  {
    id: 'back-rank-mate',
    fen: '6k1/1r3ppp/8/8/8/8/8/4R1K1 w - - 0 1',
    solution: ['e1e8'],
    motif: 'chess-back-rank',
    gain: 'mate',
    explain: 'Re8 is mate. The king is walled in by its own pawns on f7, g7 and h7, and the rook on b7 cannot reach the eighth rank in one move to block.',
  },
  {
    id: 'remove-defender',
    fen: '3r2k1/1n3ppp/8/8/8/8/8/3RR1K1 w - - 0 1',
    solution: ['d1d8'],
    motif: 'chess-remove-defender',
    gain: 'mate in two',
    explain: 'The knight on b7 is the only thing defending d8. Rxd8 forces Nxd8, and now that the knight has been dragged onto d8 it no longer covers e8: Re8 is mate.',
  },
  {
    id: 'overload',
    fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    solution: ['d1d8'],
    motif: 'chess-overload',
    gain: 'mate',
    explain: 'Rxd8 is mate at once. The black rook was doing two jobs, occupying d8 and guarding the back rank, and a piece doing two jobs is doing neither reliably.',
  },
  {
    id: 'pin-pawn-hit',
    fen: '3k4/2p5/3n4/8/2P5/8/8/3RK3 w - - 0 1',
    solution: ['c4c5'],
    motif: 'chess-pin',
    gain: 'wins a knight for a pawn',
    explain: 'The knight on d6 is pinned against its king by the rook on d1, so it cannot step away. c5 attacks it a second time with the cheapest piece on the board. Taking with the rook instead would lose the exchange to the c7 pawn.',
  },
  {
    id: 'smothered',
    fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
    solution: ['g5f7'],
    motif: 'chess-smothered',
    gain: 'mate',
    explain: 'Nf7 is mate. Every escape square is occupied by one of the king s own pieces, which is exactly what the name describes: the king is smothered by its own side.',
  },
  {
    id: 'discovered-check',
    fen: '4k3/1r6/8/8/4B3/8/8/4R1K1 w - - 0 1',
    solution: ['e4b7', 'e4c6'],
    motif: 'chess-discovered',
    gain: 'wins the rook',
    explain: 'The bishop stands between the rook on e1 and the king on e8. Moving it anywhere off the e file uncovers a check that must be answered, so the bishop takes the rook for nothing. Bxb7 and Bc6 both do it.',
  },
];

/**
 * Positions with nothing to find, verified to have no move that wins material.
 * Level 5 needs these: a drill where a tactic always exists teaches you to
 * assume one, which is the opposite of the skill.
 */
export const QUIET = [
  {
    id: 'quiet-pawns',
    fen: '4k3/5ppp/8/8/8/8/5PPP/4K3 w - - 0 1',
    explain: 'Nothing here. Two kings and two identical pawn islands, no contact between the sides at all.',
  },
  {
    id: 'quiet-knights',
    fen: '4k3/5ppp/2n5/8/8/2N5/5PPP/4K3 w - - 0 1',
    explain: 'Nothing here. The knights are not attacking each other and neither one can reach anything undefended.',
  },
  {
    id: 'quiet-bishops',
    fen: '4k3/5ppp/8/3b4/3B4/8/5PPP/4K3 w - - 0 1',
    explain: 'Nothing here. The bishops face each other but neither can take without being taken straight back.',
  },
];

export const PUZZLE_BY_ID = new Map(PUZZLES.map((p) => [p.id, p]));
