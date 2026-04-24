import { Tile } from "./Tile";
import { getTileColorCount, SuperTileType, TileColor } from "./types";

export class Board {
  grid: (Tile | null)[][] = [];

  constructor(public width: number, public height: number) {
    this.init();
  }

  init() {
    for (let x = 0; x < this.width; x++) {
      this.grid[x] = [];
      for (let y = 0; y < this.height; y++) {
        this.grid[x][y] = this.createRandomTile(x, y);
      }
    }
  }

  getTile(x: number, y: number): Tile | null {
    return this.grid[x]?.[y] ?? null;
  }

  setTile(x: number, y: number, tile: Tile | null) {
    this.grid[x][y] = tile;
    if (tile) {
      tile.x = x;
      tile.y = y;
    }
  }

  createRandomTile(x: number, y: number): Tile {
    const color = Math.floor(Math.random() * getTileColorCount()) as TileColor;
    return new Tile(x, y, color);
  }

  createSuperTile(
    x: number,
    y: number,
    color: TileColor,
    superType: SuperTileType
  ): Tile {
    return new Tile(x, y, color, superType);
  }
}
