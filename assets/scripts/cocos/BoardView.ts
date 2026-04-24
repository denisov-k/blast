import { Board } from "../core/Board";
import { Position, TileMovement, TileSpawn } from "../core/types";
import TileView from "./TileView";

const { ccclass, property } = cc._decorator;

type TileEntry = {
  node: cc.Node;
  view: TileView;
};

@ccclass
export default class BoardView extends cc.Component {
  @property(cc.Prefab)
  tilePrefab: cc.Prefab = null!;

  @property(cc.Node)
  backgroundNode: cc.Node = null!;

  @property(cc.Node)
  header: cc.Node = null!;

  @property(cc.Node)
  footer: cc.Node = null!;

  private onTileClick: (x: number, y: number) => void = null!;

  private tiles: Map<string, TileEntry> = new Map();
  private isInteractionLocked = false;
  private cellSize = 0;
  private offsetX = 0;
  private offsetY = 0;
  private boardHeight = 0;
  private selectedTileKey: string | null = null;

  setClickHandler(cb: (x: number, y: number) => void) {
    this.onTileClick = cb;
  }

  setInteractionLocked(isLocked: boolean) {
    this.isInteractionLocked = isLocked;
  }

  // =========================
  // INITIAL RENDER (ONLY ON START / RESET)
  // =========================
  render(board: Board) {
    this.updateLayout(board);
    this.clear();

    for (let x = 0; x < board.width; x++) {
      for (let y = 0; y < board.height; y++) {
        const tile = board.getTile(x, y);
        if (!tile) continue;

        this.spawnTile(x, y, tile.color, this.getTilePosition(x, y));
      }
    }
  }

  setTileSelected(position: Position | null) {
    if (this.selectedTileKey) {
      const previous = this.tiles.get(this.selectedTileKey);
      previous?.view.setSelected(false);
    }

    this.selectedTileKey = position ? this.getKey(position.x, position.y) : null;

    if (!this.selectedTileKey) return;

    const current = this.tiles.get(this.selectedTileKey);
    current?.view.setSelected(true);
  }

  // =========================
  // SPAWN
  // =========================
  private spawnTile(
    x: number,
    y: number,
    type: number,
    pos: cc.Vec3
  ): TileEntry {
    const node = cc.instantiate(this.tilePrefab);
    node.parent = this.node;

    node.width = this.cellSize;
    node.height = this.cellSize;

    node.setPosition(pos);

    const view = node.getComponent(TileView);
    view.reset(x, y, type);

    view.setClickHandler((tx, ty) => {
      if (this.isInteractionLocked) return;

      this.onTileClick?.(tx, ty);
    });

    const entry = { node, view };
    this.tiles.set(this.getKey(x, y), entry);

    return entry;
  }

  // =========================
  // ANIMATION: REMOVE
  // =========================
  animateRemove(cells: Position[], cb?: () => void) {
    let remaining = 0;

    for (const c of cells) {
      const tile = this.getTileNode(c.x, c.y);
      if (!tile) continue;

      remaining++;

      tile.view.playRemove(() => {
        tile.node.destroy();
        this.tiles.delete(this.getKey(c.x, c.y));

        remaining--;
        if (remaining <= 0) cb?.();
      });
    }

    if (remaining === 0) cb?.();
  }

  // =========================
  // ANIMATION: GRAVITY
  // =========================
  animateGravity(moves: TileMovement[], cb?: () => void) {
    // позже сюда добавим move tween по diff
    if (moves.length === 0) {
      cb?.();
      return;
    }

    const nextTiles = new Map(this.tiles);
    const animated = moves
      .map((move) => {
        const entry = this.tiles.get(this.getKey(move.from.x, move.from.y));
        if (!entry) return null;

        nextTiles.delete(this.getKey(move.from.x, move.from.y));
        nextTiles.set(this.getKey(move.to.x, move.to.y), entry);
        entry.view.setCoords(move.to.x, move.to.y);

        return { entry, move };
      })
      .filter(Boolean) as Array<{ entry: TileEntry; move: TileMovement }>;

    this.tiles = nextTiles;

    if (animated.length === 0) {
      cb?.();
      return;
    }

    let remaining = animated.length;

    for (const { entry, move } of animated) {
      cc.tween(entry.node)
        .to(
          0.18,
          { position: this.getTilePosition(move.to.x, move.to.y) },
          { easing: "quadIn" }
        )
        .call(() => {
          remaining--;
          if (remaining <= 0) cb?.();
        })
        .start();
    }
  }

  // =========================
  // ANIMATION: FILL
  // =========================
  animateFill(spawns: TileSpawn[], cb?: () => void) {
    // позже сюда добавим spawn + drop tween
    if (spawns.length === 0) {
      cb?.();
      return;
    }

    const spawnIndexByColumn = new Map<number, number>();
    const animated: Array<{ entry: TileEntry; target: cc.Vec3 }> = [];

    for (const spawn of spawns) {
      const columnIndex = spawnIndexByColumn.get(spawn.position.x) ?? 0;
      const startY = -1 - columnIndex;
      spawnIndexByColumn.set(spawn.position.x, columnIndex + 1);

      const entry = this.spawnTile(
        spawn.position.x,
        spawn.position.y,
        spawn.color,
        this.getTilePosition(spawn.position.x, startY)
      );

      entry.node.opacity = 0;
      entry.node.scale = 0.85;

      animated.push({
        entry,
        target: this.getTilePosition(spawn.position.x, spawn.position.y),
      });
    }

    let remaining = animated.length;

    for (const { entry, target } of animated) {
      cc.tween(entry.node)
        .to(
          0.22,
          { position: target, opacity: 255, scale: 1 },
          { easing: "quadOut" }
        )
        .call(() => {
          remaining--;
          if (remaining <= 0) cb?.();
        })
        .start();
    }
  }

  animateRefresh(board: Board, cb?: () => void) {
    this.setTileSelected(null);
    const currentTiles = Array.from(this.tiles.values());

    const renderRefreshedBoard = () => {
      this.tiles.clear();
      this.render(board);

      const refreshedTiles = Array.from(this.tiles.values());
      if (refreshedTiles.length === 0) {
        cb?.();
        return;
      }

      let remaining = refreshedTiles.length;

      for (const { node } of refreshedTiles) {
        node.opacity = 0;
        node.scale = 0.88;

        cc.tween(node)
          .to(0.18, { opacity: 255, scale: 1 }, { easing: "quadOut" })
          .call(() => {
            remaining--;
            if (remaining <= 0) cb?.();
          })
          .start();
      }
    };

    if (currentTiles.length === 0) {
      renderRefreshedBoard();
      return;
    }

    let remaining = currentTiles.length;

    for (const { node } of currentTiles) {
      cc.tween(node)
        .to(0.12, { opacity: 0, scale: 0.88 }, { easing: "quadIn" })
        .call(() => {
          node.destroy();
          remaining--;
          if (remaining <= 0) {
            renderRefreshedBoard();
          }
        })
        .start();
    }
  }

  animateSwap(from: Position, to: Position, cb?: () => void) {
    this.setTileSelected(null);

    const fromKey = this.getKey(from.x, from.y);
    const toKey = this.getKey(to.x, to.y);
    const fromEntry = this.tiles.get(fromKey);
    const toEntry = this.tiles.get(toKey);

    if (!fromEntry || !toEntry) {
      cb?.();
      return;
    }

    this.tiles.set(fromKey, toEntry);
    this.tiles.set(toKey, fromEntry);
    fromEntry.view.setCoords(to.x, to.y);
    toEntry.view.setCoords(from.x, from.y);

    let remaining = 2;
    const onDone = () => {
      remaining--;
      if (remaining <= 0) cb?.();
    };

    cc.tween(fromEntry.node)
      .to(0.18, { position: this.getTilePosition(to.x, to.y) }, { easing: "quadInOut" })
      .call(onDone)
      .start();

    cc.tween(toEntry.node)
      .to(0.18, { position: this.getTilePosition(from.x, from.y) }, { easing: "quadInOut" })
      .call(onDone)
      .start();
  }

  // =========================
  // HELPERS
  // =========================
  private getTileNode(x: number, y: number): TileEntry | null {
    return this.tiles.get(this.getKey(x, y)) || null;
  }

  private clear() {
    this.selectedTileKey = null;
    for (const { node } of this.tiles.values()) {
      node.destroy();
    }

    this.tiles.clear();
  }

  private updateLayout(board: Board) {
    this.boardHeight = board.height;
    this.cellSize = this.getCellSize(board);

    const boardWidthPx = board.width * this.cellSize;
    const boardHeightPx = board.height * this.cellSize;

    this.backgroundNode.width = boardWidthPx + 40;
    this.backgroundNode.height = boardHeightPx + 40;
    this.backgroundNode.zIndex = -1;

    this.offsetX = -boardWidthPx / 2 + this.cellSize / 2;
    this.offsetY = -boardHeightPx / 2 + this.cellSize / 2;
  }

  private getCellSize(board: Board): number {
    const screenSize = cc.view.getVisibleSize();

    const padding = 40;

    const headerHeight = this.header.height + 40;
    const footerHeight = this.footer.height + 40;

    const maxWidth = screenSize.width - padding;
    const maxHeight =
      screenSize.height - headerHeight - footerHeight - padding;

    const sizeByWidth = maxWidth / board.width;
    const sizeByHeight = maxHeight / board.height;

    return Math.max(1, Math.floor(Math.min(sizeByWidth, sizeByHeight)));
  }

  private getTilePosition(x: number, y: number): cc.Vec3 {
    const yFlipped = this.boardHeight - 1 - y;

    return new cc.Vec3(
      this.offsetX + x * this.cellSize,
      this.offsetY + yFlipped * this.cellSize,
      0
    );
  }

  private getKey(x: number, y: number): string {
    return `${x}_${y}`;
  }

  onResize(board: Board) {
    this.render(board);
  }
}
