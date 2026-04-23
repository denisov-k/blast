const { ccclass, property } = cc._decorator;

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

  private tiles: Map<string, cc.Node> = new Map();
  private isInteractionLocked = false;

  setClickHandler(cb: (x: number, y: number) => void) {
    this.onTileClick = cb;
  }

  setInteractionLocked(isLocked: boolean) {
    this.isInteractionLocked = isLocked;
  }

  // =========================
  // INITIAL RENDER (ONLY ON START / RESET)
  // =========================
  render(board) {
    this.clear();

    const cellSize = this.getCellSize(board);

    const boardWidthPx = board.width * cellSize;
    const boardHeightPx = board.height * cellSize;

    this.backgroundNode.width = boardWidthPx + 40;
    this.backgroundNode.height = boardHeightPx + 40;
    this.backgroundNode.zIndex = -1;

    const offsetX = -boardWidthPx / 2 + cellSize / 2;
    const offsetY = -boardHeightPx / 2 + cellSize / 2;

    for (let x = 0; x < board.width; x++) {
      for (let y = 0; y < board.height; y++) {
        const tile = board.getTile(x, y);
        if (!tile) continue;

        const yFlipped = board.height - 1 - y;

        const pos = new cc.Vec3(
          offsetX + x * cellSize,
          offsetY + yFlipped * cellSize,
          0
        );

        this.spawnTile(x, y, tile.color, pos, cellSize);
      }
    }
  }

  // =========================
  // SPAWN
  // =========================
  private spawnTile(
    x: number,
    y: number,
    type: number,
    pos: cc.Vec3,
    cellSize: number
  ) {
    const node = cc.instantiate(this.tilePrefab);
    node.parent = this.node;

    node.width = cellSize;
    node.height = cellSize;

    node.setPosition(pos);

    const view = node.getComponent("TileView");
    view.setStartCoords(x, y);
    view.setType(type);

    view.setClickHandler((tx, ty) => {
      if (this.isInteractionLocked) return;

      this.onTileClick?.(tx, ty);
    });

    this.tiles.set(`${x}_${y}`, node);

    return node;
  }

  // =========================
  // ANIMATION: REMOVE
  // =========================
  animateRemove(
    cells: { x: number; y: number }[],
    cb?: () => void
  ) {
    let remaining = 0;

    for (const c of cells) {
      const tile = this.getTileNode(c.x, c.y);
      if (!tile) continue;

      remaining++;

      cc.tween(tile)
        .to(0.15, { scale: 0, opacity: 0 })
        .call(() => {
          tile.destroy();
          this.tiles.delete(`${c.x}_${c.y}`);

          remaining--;
          if (remaining <= 0) cb?.();
        })
        .start();
    }

    if (remaining === 0) cb?.();
  }

  // =========================
  // ANIMATION: GRAVITY (stub for now)
  // =========================
  animateGravity(board, cb: () => void) {
    // позже сюда добавим move tween по diff
    this.scheduleOnce(cb, 0.1);
  }

  // =========================
  // ANIMATION: FILL (stub for now)
  // =========================
  animateFill(board, cb: () => void) {
    // позже сюда добавим spawn + drop tween
    this.scheduleOnce(cb, 0.1);
  }

  // =========================
  // HELPERS
  // =========================
  private getTileNode(x: number, y: number): cc.Node | null {
    return this.tiles.get(`${x}_${y}`) || null;
  }

  private clear() {
    this.node.removeAllChildren();
    this.tiles.clear();
  }

  private getCellSize(board): number {
    const screenSize = cc.view.getVisibleSize();

    const padding = 40;

    const headerHeight = this.header.height + 40;
    const footerHeight = this.footer.height + 40;

    const maxWidth = screenSize.width - padding;
    const maxHeight =
      screenSize.height - headerHeight - footerHeight - padding;

    const sizeByWidth = maxWidth / board.width;
    const sizeByHeight = maxHeight / board.height;

    return Math.floor(Math.min(sizeByWidth, sizeByHeight));
  }

  onResize(board) {
    this.render(board);
  }
}
