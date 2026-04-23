import { Board } from "../core/Board";
import { INITIAL_MOVES, TARGET_SCORE } from "../core/config";
import { BoardService } from "./BoardService";

export enum GameState {
  Playing = "playing",
  Won = "won",
  Lost = "lost",
}

type GameEvents = {
  onScoreChanged?: (score: number) => void;
  onMovesChanged?: (moves: number) => void;
  onStateChanged?: (state: GameState) => void;
};

export type MoveResult = {
  removed: { x: number; y: number }[];
};

export class GameService {
  board: Board;
  boardService: BoardService;

  score = 0;
  targetScore = TARGET_SCORE;
  moves = INITIAL_MOVES;

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
    this.events.onStateChanged?.(this.state);
  }

  handleClick(x: number, y: number): MoveResult | null {
    if (this.state !== GameState.Playing) return null;
    if (this.moves <= 0) return null;

    const removed = this.boardService.removeGroup(x, y);

    if (removed.length === 0) return null;

    this.score += this.calculateScore(removed.length);
    this.moves--;

    this.events.onScoreChanged?.(this.score);
    this.events.onMovesChanged?.(this.moves);

    this.checkGameState();

    return { removed };
  }

  stepGravity(): boolean {
    return this.boardService.applyGravity();
  }

  stepFill(): boolean {
    return this.boardService.fill();
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
