import { SuperTileType, TileColor } from "./types";

export class Tile {
  constructor(
    public x: number,
    public y: number,
    public color: TileColor,
    public superType: SuperTileType | null = null
  ) {}

  get isSuperTile(): boolean {
    return this.superType !== null;
  }
}
