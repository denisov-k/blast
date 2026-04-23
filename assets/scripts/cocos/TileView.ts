const { ccclass, property } = cc._decorator;

@ccclass
export default class TileView extends cc.Component {
  @property(cc.SpriteFrame)
  sprites: cc.SpriteFrame[] = [];

  x: number = 0;
  y: number = 0;

  private isLocked: boolean = false;

  private onClickHandler: ((x: number, y: number) => void) | null = null;

  onLoad() {
    this.node.on(cc.Node.EventType.TOUCH_END, this.onClick, this);
  }

  setClickHandler(cb: (x: number, y: number) => void) {
    this.onClickHandler = cb;
  }

  onClick() {
    if (this.isLocked) return;

    if (this.onClickHandler) {
      this.onClickHandler(this.x, this.y);
    }
  }

  playRemove(cb?: () => void) {
    this.isLocked = true;

    cc.tween(this.node)
      .to(0.15, { scale: 0, opacity: 0 })
      .call(() => {
        cb?.();
      })
      .start();
  }

  reset(x: number, y: number, type: number) {
    this.x = x;
    this.y = y;

    this.node.scale = 1;
    this.node.opacity = 255;
    this.isLocked = false;

    this.setType(type);
  }

  setType(type: number) {
    const sprite = this.getComponent(cc.Sprite);

    sprite.spriteFrame = this.sprites[type];
    sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
  }

  setStartCoords(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
