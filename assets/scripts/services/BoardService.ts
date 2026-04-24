import { Board } from "../core/Board";
import { Position, SuperTileType, TileMovement, TileSpawn } from "../core/types";
import { findGroup } from "../utils/floodFill";

export class BoardService {
  constructor(private board: Board) {}

  hasAvailableMove(): boolean {
    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        const tile = this.board.getTile(x, y);
        if (!tile) continue;

        if (tile.isSuperTile) {
          return true;
        }

        const rightTile = this.board.getTile(x + 1, y);
        if (rightTile && rightTile.color === tile.color) {
          return true;
        }

        const topTile = this.board.getTile(x, y + 1);
        if (topTile && topTile.color === tile.color) {
          return true;
        }
      }
    }

    return false;
  }

  removeGroup(x: number, y: number): Position[] {
    const group = findGroup(this.board, x, y);

    if (group.length < 2) return [];

    const removed = group.map((tile) => ({ x: tile.x, y: tile.y }));

    for (const tile of group) {
      this.board.setTile(tile.x, tile.y, null);
    }

    return removed;
  }

  removeTilesInRadius(centerX: number, centerY: number, radius: number): Position[] {
    const removed: Position[] = [];

    for (let x = centerX - radius; x <= centerX + radius; x++) {
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        const tile = this.board.getTile(x, y);
        if (!tile) continue;

        const dx = x - centerX;
        const dy = y - centerY;
        if (dx * dx + dy * dy > radius * radius) continue;

        removed.push({ x, y });
      }
    }

    for (const tile of removed) {
      this.board.setTile(tile.x, tile.y, null);
    }

    return removed;
  }

  swapTiles(from: Position, to: Position): boolean {
    if (from.x === to.x && from.y === to.y) return false;

    const fromTile = this.board.getTile(from.x, from.y);
    const toTile = this.board.getTile(to.x, to.y);
    if (!fromTile || !toTile) return false;

    this.board.setTile(from.x, from.y, toTile);
    this.board.setTile(to.x, to.y, fromTile);

    return true;
  }

  activateSuperTile(x: number, y: number, superType: SuperTileType, radius: number): Position[] {
    switch (superType) {
      case SuperTileType.Row:
        return this.removeRow(y);
      case SuperTileType.Column:
        return this.removeColumn(x);
      case SuperTileType.Radius:
        return this.removeTilesInRadius(x, y, radius);
      case SuperTileType.Board:
        return this.removeAllTiles();
      default:
        return [];
    }
  }

  applyGravity(): TileMovement[] {
    const moved: TileMovement[] = [];

    for (let x = 0; x < this.board.width; x++) {
      let empty = this.board.height - 1;

      for (let y = this.board.height - 1; y >= 0; y--) {
        const tile = this.board.getTile(x, y);

        if (tile) {
          if (y !== empty) {
            moved.push({
              from: { x, y },
              to: { x, y: empty },
              color: tile.color,
            });
            this.board.setTile(x, empty, tile);
            this.board.setTile(x, y, null);
          }
          empty--;
        }
      }
    }

    return moved;
  }

  fill(): TileSpawn[] {
    const spawned: TileSpawn[] = [];

    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        if (!this.board.getTile(x, y)) {
          const tile = this.board.createRandomTile(x, y);
          this.board.setTile(x, y, tile);
          spawned.push({
            position: { x, y },
            color: tile.color,
            superType: tile.superType,
          });
        }
      }
    }

    return spawned;
  }

  private removeRow(row: number): Position[] {
    const removed: Position[] = [];

    for (let x = 0; x < this.board.width; x++) {
      if (this.board.getTile(x, row)) {
        removed.push({ x, y: row });
      }
    }

    this.clearPositions(removed);

    return removed;
  }

  private removeColumn(column: number): Position[] {
    const removed: Position[] = [];

    for (let y = 0; y < this.board.height; y++) {
      if (this.board.getTile(column, y)) {
        removed.push({ x: column, y });
      }
    }

    this.clearPositions(removed);

    return removed;
  }

  private removeAllTiles(): Position[] {
    const removed: Position[] = [];

    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        if (this.board.getTile(x, y)) {
          removed.push({ x, y });
        }
      }
    }

    this.clearPositions(removed);

    return removed;
  }

  private clearPositions(positions: Position[]) {
    for (const position of positions) {
      this.board.setTile(position.x, position.y, null);
    }
  }
}
