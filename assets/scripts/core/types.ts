export enum TileColor {
  Red,
  Green,
  Blue,
  Yellow,
  Purple,
}

export enum SuperTileType {
  Row = "row",
  Column = "column",
  Radius = "radius",
  Board = "board",
}

export interface Position {
  x: number;
  y: number;
}

export interface TileState {
  position: Position;
  color: TileColor;
  superType: SuperTileType | null;
}

export interface TileMovement {
  from: Position;
  to: Position;
  color: TileColor;
}

export interface TileSpawn {
  position: Position;
  color: TileColor;
  superType: SuperTileType | null;
}

export interface TileUpdate {
  position: Position;
  color: TileColor;
  superType: SuperTileType | null;
}

export function getTileColorCount(): number {
  return Object.keys(TileColor).length / 2;
}

export function getRandomSuperTileType(): SuperTileType {
  const types = [
    SuperTileType.Row,
    SuperTileType.Column,
    SuperTileType.Radius,
    SuperTileType.Board,
  ];

  return types[Math.floor(Math.random() * types.length)];
}
