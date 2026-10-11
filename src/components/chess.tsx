"use client";

import { Carousel, SWITCH_MS, Tile } from "./widgets";

// Openings I play. The board shows the position after `moves`; hovering reveals the name and note.
const OPENINGS = [
  {
    name: "King's Gambit",
    note: "for when I want chaos",
    moves: ["e2e4", "e7e5", "f2f4", "e5f4", "g1f3"],
    san: ["e4", "e5", "f4", "exf4", "Nf3"],
  },
  {
    name: "Italian Game",
    note: "my favourite",
    moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5"],
    san: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"],
  },
];

const BACK = "rnbqkbnr";
const START = new Map<string, string>();
for (let f = 0; f < 8; f++) {
  const file = "abcdefgh"[f];
  START.set(`${file}1`, BACK[f].toUpperCase());
  START.set(`${file}2`, "P");
  START.set(`${file}7`, "p");
  START.set(`${file}8`, BACK[f]);
}

function position(moves: string[]) {
  const board = new Map(START);
  for (const m of moves) {
    board.set(m.slice(2, 4), board.get(m.slice(0, 2))!);
    board.delete(m.slice(0, 2));
  }
  return board;
}

// Filled glyphs for both sides, coloured per side. ︎ keeps them as text
// rather than emoji on platforms that would otherwise swap in ♟️.
const GLYPH: Record<string, string> = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};
const xy = (sq: string) => [sq.charCodeAt(0) - 97, 8 - Number(sq[1])];

const notation = (san: string[]) =>
  san.map((m, i) => (i % 2 ? m : `${i / 2 + 1}. ${m}`)).join(" ");

function Board({ name, note, moves, san }: (typeof OPENINGS)[number]) {
  const last = moves.at(-1)!;
  const highlight = [last.slice(0, 2), last.slice(2, 4)];
  return (
    <svg
      viewBox="0 0 8 8"
      role="img"
      aria-label={`${name}: ${notation(san)}`}
      data-tip={name}
      data-tip-sub={note}
      className="block size-full"
    >
      {Array.from({ length: 64 }, (_, n) => {
        const [x, y] = [n % 8, Math.floor(n / 8)];
        return (
          <rect
            key={n}
            x={x}
            y={y}
            width="1"
            height="1"
            fill={(x + y) % 2 ? "#6e5444" : "#c9bba5"}
          />
        );
      })}
      {highlight.map((sq) => {
        const [x, y] = xy(sq);
        return (
          <rect
            key={sq}
            x={x}
            y={y}
            width="1"
            height="1"
            fill="#e9c46a"
            opacity="0.35"
          />
        );
      })}
      {[...position(moves)].map(([sq, piece]) => {
        const [x, y] = xy(sq);
        const white = piece === piece.toUpperCase();
        return (
          <text
            key={sq}
            x={x + 0.5}
            y={y + 0.56}
            fontSize="0.8"
            textAnchor="middle"
            dominantBaseline="central"
            strokeWidth="0.045"
            paintOrder="stroke"
            fontFamily="'Apple Symbols','Segoe UI Symbol','DejaVu Sans',sans-serif"
            fill={white ? "#f3eee6" : "#2a211c"}
            stroke={white ? "#2a211c" : "#c9bba5"}
          >
            {GLYPH[piece.toLowerCase()]}
            {"︎"}
          </text>
        );
      })}
    </svg>
  );
}

export function ChessCard() {
  return (
    <Tile>
      {/* Offset by half an interval so this never changes at the same time as the activity card */}
      <Carousel slides={OPENINGS.map((o) => <Board key={o.name} {...o} />)} every={SWITCH_MS} delay={SWITCH_MS / 2} />
    </Tile>
  );
}
