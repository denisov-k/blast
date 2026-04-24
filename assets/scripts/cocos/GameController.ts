import BoardView from "./BoardView";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  GAME_TITLE,
  GAME_VERSION
} from "../core/config";
import {
  GameService,
  GameState,
  MoveResult,
  TeleportResult,
} from "../services/GameService";
import { Position } from "../core/types";

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

  @property(cc.Node)
  refreshButtonNode: cc.Node = null!;

  @property(cc.Label)
  refreshCountLabel: cc.Label = null!;

  @property(cc.Node)
  bombButtonNode: cc.Node = null!;

  @property(cc.Label)
  bombCountLabel: cc.Label = null!;

  @property(cc.Node)
  teleportButtonNode: cc.Node = null!;

  @property(cc.Label)
  teleportCountLabel: cc.Label = null!;

  private game!: GameService;
  private boardView!: BoardView;
  private isMoveInProgress = false;
  private pendingResultState: GameState | null = null;
  private refreshBoosters = 0;
  private bombBoosters = 0;
  private teleportBoosters = 0;
  private isBombArmed = false;
  private isTeleportArmed = false;
  private teleportSource: Position | null = null;

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
    this.refreshButtonNode.on(
      cc.Node.EventType.TOUCH_END,
      this.onRefreshClick,
      this
    );
    this.bombButtonNode.on(
      cc.Node.EventType.TOUCH_END,
      this.onBombButtonClick,
      this
    );
    this.teleportButtonNode.on(
      cc.Node.EventType.TOUCH_END,
      this.onTeleportButtonClick,
      this
    );

    cc.view.setResizeCallback(() => {
      this.onResize();
    });

    this.startNewGame();
  }

  onDestroy() {
    this.playAgainButton?.node.off(
      cc.Node.EventType.TOUCH_END,
      this.onPlayAgainClick,
      this
    );
    this.refreshButtonNode?.off(
      cc.Node.EventType.TOUCH_END,
      this.onRefreshClick,
      this
    );
    this.bombButtonNode?.off(
      cc.Node.EventType.TOUCH_END,
      this.onBombButtonClick,
      this
    );
    this.teleportButtonNode?.off(
      cc.Node.EventType.TOUCH_END,
      this.onTeleportButtonClick,
      this
    );
  }

  private startNewGame() {
    this.game = new GameService(BOARD_WIDTH, BOARD_HEIGHT);
    this.isMoveInProgress = false;
    this.pendingResultState = null;
    this.isBombArmed = false;
    this.isTeleportArmed = false;
    this.teleportSource = null;
    this.boardView.setInteractionLocked(false);
    this.hideResultModal();
    this.updateBombArmState();
    this.updateTeleportArmState();

    this.game.setEvents({
      onScoreChanged: (score) => {
        this.scoreLabel.string = `Очки:\n${score} / ${this.game.targetScore}`;
      },

      onMovesChanged: (moves) => {
        this.movesLabel.string = `${moves}`;
      },

      onRefreshBoostersChanged: (count) => {
        this.refreshBoosters = count;
        this.refreshCountLabel.string = `${count}`;
        this.updateBoosterButtonsState();
      },

      onBombBoostersChanged: (count) => {
        this.bombBoosters = count;
        this.bombCountLabel.string = `${count}`;
        this.updateBoosterButtonsState();
      },

      onTeleportBoostersChanged: (count) => {
        this.teleportBoosters = count;
        this.teleportCountLabel.string = `${count}`;
        this.updateBoosterButtonsState();
      },

      onStateChanged: (state) => {
        this.handleGameStateChanged(state);
      }
    });

    this.boardView.resetBoard(this.game.board);
  }

  onTileClick(x: number, y: number) {
    if (this.isMoveInProgress) return;
    if (this.isBombArmed) {
      this.onBombTargetSelected(x, y);
      return;
    }
    if (this.isTeleportArmed) {
      this.onTeleportTargetSelected({ x, y });
      return;
    }

    this.isMoveInProgress = true;
    this.boardView.setInteractionLocked(true);
    this.updateBoosterButtonsState();

    const result = this.game.handleClick(x, y);

    if (!result) {
      this.isMoveInProgress = false;
      this.boardView.setInteractionLocked(this.game.state !== GameState.Playing);
      this.updateBoosterButtonsState();
      return;
    }

    this.runMoveSequence(result);
  }

  onResize() {
    if (!this.game) return;

    if (this.isMoveInProgress) {
      this.boardView.resetBoard(this.game.board);
      this.finishMoveSequence();
      return;
    }

    this.boardView.onResize(this.game.board);
  }

  private runMoveSequence(result: MoveResult) {
    this.boardView.animateRemove(result.removed, () => {
      this.boardView.applyTileUpdates(result.updated);
      this.boardView.animateGravity(result.moved, () => {
        this.boardView.animateFill(result.spawned, () => {
          this.finishMoveSequence();
        });
      });
    });
  }

  private finishMoveSequence() {
    this.isMoveInProgress = false;
    this.boardView.setInteractionLocked(this.game.state !== GameState.Playing);
    this.updateBoosterButtonsState();
    this.flushPendingResultState();
  }

  private handleGameStateChanged(state: GameState) {
    if (state === GameState.Playing) {
      this.pendingResultState = null;
      this.hideResultModal();
      this.updateBoosterButtonsState();
      return;
    }

    if (this.isMoveInProgress) {
      this.pendingResultState = state;
      return;
    }

    this.showResultState(state);
  }

  private flushPendingResultState() {
    if (!this.pendingResultState) return;

    const state = this.pendingResultState;
    this.pendingResultState = null;
    this.showResultState(state);
  }

  private showResultState(state: GameState) {
    this.isBombArmed = false;
    this.isTeleportArmed = false;
    this.teleportSource = null;
    this.updateBombArmState();
    this.updateTeleportArmState();
    this.boardView.setInteractionLocked(true);
    this.updateBoosterButtonsState();

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

  private onRefreshClick() {
    if (!this.canUseRefreshBooster()) return;

    this.isMoveInProgress = true;
    this.isBombArmed = false;
    this.isTeleportArmed = false;
    this.teleportSource = null;
    this.updateBombArmState();
    this.updateTeleportArmState();
    this.boardView.setInteractionLocked(true);
    this.updateBoosterButtonsState();

    const didUseBooster = this.game.useRefreshBooster();
    if (!didUseBooster) {
      this.isMoveInProgress = false;
      this.boardView.setInteractionLocked(this.game.state !== GameState.Playing);
      this.updateBoosterButtonsState();
      return;
    }

    this.runRefreshSequence();
  }

  private onBombButtonClick() {
    if (!this.canArmBombBooster()) return;

    this.isTeleportArmed = false;
    this.teleportSource = null;
    this.isBombArmed = !this.isBombArmed;
    this.updateBombArmState();
    this.updateTeleportArmState();
    this.updateBoosterButtonsState();
  }

  private onTeleportButtonClick() {
    if (!this.canArmTeleportBooster()) return;

    this.isBombArmed = false;
    this.updateBombArmState();
    this.teleportSource = null;
    this.isTeleportArmed = !this.isTeleportArmed;
    this.updateTeleportArmState();
    this.updateBoosterButtonsState();
  }

  private onPlayAgainClick() {
    this.startNewGame();
  }

  private runRefreshSequence() {
    this.boardView.animateRefresh(this.game.board, () => {
      this.isMoveInProgress = false;
      this.boardView.setInteractionLocked(this.game.state !== GameState.Playing);
      this.updateBoosterButtonsState();
    });
  }

  private onBombTargetSelected(x: number, y: number) {
    if (!this.isBombArmed) return;

    this.isMoveInProgress = true;
    this.boardView.setInteractionLocked(true);

    const result = this.game.useBombBooster(x, y);
    this.isBombArmed = false;
    this.updateBombArmState();

    if (!result) {
      this.isMoveInProgress = false;
      this.boardView.setInteractionLocked(this.game.state !== GameState.Playing);
      this.updateBoosterButtonsState();
      return;
    }

    this.updateBoosterButtonsState();

    this.runMoveSequence(result);
  }

  private onTeleportTargetSelected(position: Position) {
    if (!this.isTeleportArmed) return;

    if (!this.teleportSource) {
      this.teleportSource = position;
      this.updateTeleportArmState();
      this.updateBoosterButtonsState();
      return;
    }

    if (
      this.teleportSource.x === position.x &&
      this.teleportSource.y === position.y
    ) {
      this.teleportSource = null;
      this.updateTeleportArmState();
      this.updateBoosterButtonsState();
      return;
    }

    this.isMoveInProgress = true;
    this.boardView.setInteractionLocked(true);

    const result = this.game.useTeleportBooster(this.teleportSource, position);

    this.isTeleportArmed = false;
    this.teleportSource = null;
    this.updateTeleportArmState();

    if (!result) {
      this.isMoveInProgress = false;
      this.boardView.setInteractionLocked(this.game.state !== GameState.Playing);
      this.updateBoosterButtonsState();
      return;
    }

    this.updateBoosterButtonsState();
    this.runTeleportSequence(result);
  }

  private canUseRefreshBooster(): boolean {
    return (
      !!this.game &&
      this.game.state === GameState.Playing &&
      !this.isMoveInProgress &&
      !this.isBombArmed &&
      !this.isTeleportArmed &&
      this.refreshBoosters > 0
    );
  }

  private canArmBombBooster(): boolean {
    return (
      !!this.game &&
      this.game.state === GameState.Playing &&
      !this.isMoveInProgress &&
      !this.isTeleportArmed &&
      this.bombBoosters > 0
    );
  }

  private canArmTeleportBooster(): boolean {
    return (
      !!this.game &&
      this.game.state === GameState.Playing &&
      !this.isMoveInProgress &&
      !this.isBombArmed &&
      this.teleportBoosters > 0
    );
  }

  private runTeleportSequence(result: TeleportResult) {
    this.boardView.animateSwap(result.from, result.to, () => {
      this.isMoveInProgress = false;
      this.boardView.setInteractionLocked(this.game.state !== GameState.Playing);
      this.updateBoosterButtonsState();
    });
  }

  private updateBoosterButtonsState() {
    if (this.refreshButtonNode) {
      this.refreshButtonNode.opacity = this.canUseRefreshBooster() ? 255 : 140;
    }

    if (this.bombButtonNode) {
      this.bombButtonNode.opacity =
        this.canArmBombBooster() || this.isBombArmed ? 255 : 140;
    }

    if (this.teleportButtonNode) {
      this.teleportButtonNode.opacity =
        this.canArmTeleportBooster() || this.isTeleportArmed ? 255 : 140;
    }
  }

  private updateBombArmState() {
    if (!this.bombButtonNode) return;

    this.bombButtonNode.scale = this.isBombArmed ? 1.08 : 1;
  }

  private updateTeleportArmState() {
    this.boardView.setTileSelected(this.teleportSource);

    if (!this.teleportButtonNode) return;

    this.teleportButtonNode.scale = this.isTeleportArmed ? 1.08 : 1;
  }
}
