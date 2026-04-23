import { TileColor } from "./types";

export class Tile {
  constructor(
    public x: number,
    public y: number,
    public color: TileColor
  ) {}
}
