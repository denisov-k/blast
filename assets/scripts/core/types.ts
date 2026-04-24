export enum TileColor {
  Red,
  Green,
  Blue,
  Yellow,
  Purple,
}

export interface Position {
  x: number;
  y: number;
}

export interface TileMovement {
  from: Position;
  to: Position;
  color: TileColor;
}

export interface TileSpawn {
  position: Position;
  color: TileColor;
}

export function getTileColorCount(): number {
  return Object.keys(TileColor).length / 2;
}
