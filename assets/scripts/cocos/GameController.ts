import BoardView from "./BoardView";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  GAME_TITLE,
  GAME_VERSION
} from "../core/config";
import { GameService, GameState } from "../services/GameService";

const { ccclass, property } = cc._decorator;

@ccclass
export default class GameController extends cc.Component {
  @property(cc.Node)
  boardViewNode: cc.Node = null!;

  @property(cc.Label)
  scoreLabel: cc.Label = null!;

  @property(cc.Label)
  movesLabel: cc.Label = null!;

  @property(cc.Label)
  versionLabel: cc.Label = null!;

  @property(cc.Node)
  resultOverlay: cc.Node = null!;

  @property(cc.Label)
  resultTitleLabel: cc.Label = null!;

  @property(cc.Label)
  resultBodyLabel: cc.Label = null!;

  @property(cc.Button)
  playAgainButton: cc.Button = null!;

  private game!: GameService;
  private boardView!: BoardView;
  private isMoveInProgress = false;
  private readonly moveResolveDelay = 0.18;

  onLoad() {
    cc.log(`${GAME_TITLE} v${GAME_VERSION}`);
    if (this.versionLabel) {
      this.versionLabel.string = `v${GAME_VERSION}`;
    }

    this.boardView = this.boardViewNode.getComponent(BoardView);
    this.boardView.setClickHandler(this.onTileClick.bind(this));
    this.playAgainButton.node.on(
      cc.Node.EventType.TOUCH_END,
      this.onPlayAgainClick,
      this
    );

    cc.view.setResizeCallback(() => {
      this.onResize();
    });

    this.startNewGame();
  }

  private startNewGame() {
    this.game = new GameService(BOARD_WIDTH, BOARD_HEIGHT);
    this.isMoveInProgress = false;
    this.boardView.setInteractionLocked(false);
    this.hideResultModal();

    this.game.setEvents({
      onScoreChanged: (score) => {
        this.scoreLabel.string = `Очки:\n${score} / ${this.game.targetScore}`;
      },

      onMovesChanged: (moves) => {
        this.movesLabel.string = `${moves}`;
      },

      onStateChanged: (state) => {
        console.log("STATE:", state);
        this.handleGameStateChanged(state);
      }
    });

    this.boardView.render(this.game.board);
  }

  async onTileClick(x: number, y: number) {
    console.log(x, y)
    if (this.isMoveInProgress) return;

    const result = this.game.handleClick(x, y);

    if (!result) return;

    this.isMoveInProgress = true;
    this.boardView.setInteractionLocked(true);

    this.boardView.animateRemove(result.removed);

    this.game.stepGravity();
    this.game.stepFill();

    this.scheduleOnce(() => {
      this.boardView.render(this.game.board);
      this.isMoveInProgress = false;
      this.boardView.setInteractionLocked(this.game.state !== GameState.Playing);
    }, this.moveResolveDelay);
  }

  onResize() {
    console.log("RESIZE");
    this.boardView.render(this.game.board);
  }

  private handleGameStateChanged(state: GameState) {
    if (state === GameState.Playing) {
      this.hideResultModal();
      return;
    }

    this.boardView.setInteractionLocked(true);

    if (state === GameState.Won) {
      this.showResultModal("Победа!", `Счёт: ${this.game.score}`);
      return;
    }

    this.showResultModal("Проигрыш :(", `Счёт: ${this.game.score}`);
  }

  private showResultModal(title: string, body: string) {
    this.resultTitleLabel.string = title;
    this.resultBodyLabel.string = body;
    this.resultOverlay.active = true;
  }

  private hideResultModal() {
    this.resultOverlay.active = false;
  }

  private onPlayAgainClick() {
    this.startNewGame();
  }
}

