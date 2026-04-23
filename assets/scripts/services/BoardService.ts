import { Board } from "../core/Board";
import { Tile } from "../core/Tile";
import { findGroup } from "../utils/floodFill";

export class BoardService {
  constructor(private board: Board) {}

  removeGroup(x: number, y: number): Tile[] {
    const group = findGroup(this.board, x, y);

    if (group.length < 2) return [];

    for (const tile of group) {
      this.board.setTile(tile.x, tile.y, null);
    }

    return group;
  }

  applyGravity(): boolean {
    let changed = false;

    for (let x = 0; x < this.board.width; x++) {
      let empty = this.board.height - 1;

      for (let y = this.board.height - 1; y >= 0; y--) {
        const tile = this.board.getTile(x, y);

        if (tile) {
          if (y !== empty) {
            this.board.setTile(x, empty, tile);
            this.board.setTile(x, y, null);
            changed = true;
          }
          empty--;
        }
      }
    }

    return changed;
  }

  fill(): boolean {
    let changed = false;

    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        if (!this.board.getTile(x, y)) {
          this.board.setTile(
            x,
            y,
            this.board.createRandomTile(x, y)
          );
          changed = true;
        }
      }
    }

    return changed;
  }
}
