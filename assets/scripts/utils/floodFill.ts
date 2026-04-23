import { Board } from "../core/Board";
import { Tile } from "../core/Tile";

export function findGroup(board: Board, x: number, y: number): Tile[] {
  const start = board.getTile(x, y);
  if (!start) return [];

  const visited = new Set<string>();
  const stack = [start];
  const result: Tile[] = [];

  while (stack.length) {
    const tile = stack.pop()!;
    const key = `${tile.x}:${tile.y}`;

    if (visited.has(key)) continue;
    visited.add(key);

    result.push(tile);

    const neighbors = [
      board.getTile(tile.x + 1, tile.y),
      board.getTile(tile.x - 1, tile.y),
      board.getTile(tile.x, tile.y + 1),
      board.getTile(tile.x, tile.y - 1),
    ].filter(Boolean) as Tile[];

    for (const n of neighbors) {
      if (n.color === start.color) {
        stack.push(n);
      }
    }
  }

  return result;
}
