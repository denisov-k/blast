import { Board } from "../core/Board";
import {
  BOMB_RADIUS,
  INITIAL_BOMB_BOOSTERS,
  INITIAL_MOVES,
  INITIAL_REFRESH_BOOSTERS,
  INITIAL_TELEPORT_BOOSTERS,
  TARGET_SCORE,
} from "../core/config";
import { Position, TileMovement, TileSpawn } from "../core/types";
import { BoardService } from "./BoardService";

export enum GameState {
  Playing = "playing",
  Won = "won",
  Lost = "lost",
}

type GameEvents = {
  onScoreChanged?: (score: number) => void;
  onMovesChanged?: (moves: number) => void;
  onRefreshBoostersChanged?: (count: number) => void;
  onBombBoostersChanged?: (count: number) => void;
  onTeleportBoostersChanged?: (count: number) => void;
  onStateChanged?: (state: GameState) => void;
};

export type MoveResult = {
  removed: Position[];
  moved: TileMovement[];
  spawned: TileSpawn[];
};

export type TeleportResult = {
  from: Position;
  to: Position;
};

export class GameService {
  board: Board;
  boardService: BoardService;

  score = 0;
  targetScore = TARGET_SCORE;
  moves = INITIAL_MOVES;
  refreshBoosters = INITIAL_REFRESH_BOOSTERS;
  bombBoosters = INITIAL_BOMB_BOOSTERS;
  teleportBoosters = INITIAL_TELEPORT_BOOSTERS;

  state: GameState = GameState.Playing;

  private events: GameEvents = {};

  constructor(width: number, height: number) {
    this.board = new Board(width, height);
    this.boardService = new BoardService(this.board);
  }

  setEvents(events: GameEvents) {
    this.events = events;
    this.events.onScoreChanged?.(this.score);
    this.events.onMovesChanged?.(this.moves);
    this.events.onRefreshBoostersChanged?.(this.refreshBoosters);
    this.events.onBombBoostersChanged?.(this.bombBoosters);
    this.events.onTeleportBoostersChanged?.(this.teleportBoosters);
    this.events.onStateChanged?.(this.state);
  }

  handleClick(x: number, y: number): MoveResult | null {
    if (this.state !== GameState.Playing) return null;
    if (this.moves <= 0) return null;

    const removed = this.boardService.removeGroup(x, y);

    if (removed.length === 0) return null;

    const moved = this.boardService.applyGravity();
    const spawned = this.boardService.fill();

    this.score += this.calculateScore(removed.length);
    this.moves--;

    this.events.onScoreChanged?.(this.score);
    this.events.onMovesChanged?.(this.moves);

    this.checkGameState();

    return { removed, moved, spawned };
  }

  useRefreshBooster(): boolean {
    if (this.state !== GameState.Playing) return false;
    if (this.refreshBoosters <= 0) return false;

    this.refreshBoosters--;
    this.board.init();

    this.events.onRefreshBoostersChanged?.(this.refreshBoosters);

    return true;
  }

  useBombBooster(x: number, y: number): MoveResult | null {
    if (this.state !== GameState.Playing) return null;
    if (this.bombBoosters <= 0) return null;

    const removed = this.boardService.removeTilesInRadius(x, y, BOMB_RADIUS);
    if (removed.length === 0) return null;

    const moved = this.boardService.applyGravity();
    const spawned = this.boardService.fill();

    this.bombBoosters--;
    this.score += this.calculateScore(removed.length);

    this.events.onBombBoostersChanged?.(this.bombBoosters);
    this.events.onScoreChanged?.(this.score);

    this.checkGameState();

    return { removed, moved, spawned };
  }

  useTeleportBooster(from: Position, to: Position): TeleportResult | null {
    if (this.state !== GameState.Playing) return null;
    if (this.teleportBoosters <= 0) return null;

    const didSwap = this.boardService.swapTiles(from, to);
    if (!didSwap) return null;

    this.teleportBoosters--;
    this.events.onTeleportBoostersChanged?.(this.teleportBoosters);

    return { from, to };
  }

  private calculateScore(size: number) {
    return size * size * 10;
  }

  private checkGameState() {
    if (this.score >= this.targetScore) {
      this.setState(GameState.Won);
      return;
    }

    if (this.moves <= 0) {
      this.setState(GameState.Lost);
    }
  }

  private setState(state: GameState) {
    if (this.state === state) return;

    this.state = state;
    this.events.onStateChanged?.(state);
  }
}
