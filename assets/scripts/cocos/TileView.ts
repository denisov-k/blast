import { SuperTileType } from "../core/types";

const { ccclass, property } = cc._decorator;

@ccclass
export default class TileView extends cc.Component {
  @property(cc.SpriteFrame)
  sprites: cc.SpriteFrame[] = [];

  @property(cc.SpriteFrame)
  rowSuperSprite: cc.SpriteFrame = null;

  @property(cc.SpriteFrame)
  columnSuperSprite: cc.SpriteFrame = null;

  @property(cc.SpriteFrame)
  radiusSuperSprite: cc.SpriteFrame = null;

  @property(cc.SpriteFrame)
  boardSuperSprite: cc.SpriteFrame = null;

  x: number = 0;
  y: number = 0;

  private isLocked: boolean = false;
  private isSelected: boolean = false;
  private badgeLabel: cc.Label | null = null;

  private onClickHandler: ((x: number, y: number) => void) | null = null;

  onLoad() {
    this.node.on(cc.Node.EventType.TOUCH_END, this.onClick, this);
  }

  onDestroy() {
    this.node.off(cc.Node.EventType.TOUCH_END, this.onClick, this);
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

  reset(x: number, y: number, type: number, superType: SuperTileType | null) {
    this.setCoords(x, y);

    this.isSelected = false;
    this.node.scale = 1;
    this.node.opacity = 255;
    this.isLocked = false;

    this.setType(type, superType);
  }

  setType(type: number, superType: SuperTileType | null) {
    const sprite = this.getComponent(cc.Sprite);
    const superSprite = this.getSuperSprite(superType);

    sprite.spriteFrame = superSprite || this.sprites[type];
    sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
    sprite.node.color = cc.Color.WHITE;

    const badgeLabel = this.ensureBadgeLabel();
    const shouldShowBadge = !!superType && !superSprite;
    badgeLabel.string = shouldShowBadge ? this.getSuperBadge(superType) : "";
    badgeLabel.node.active = shouldShowBadge;
  }

  setCoords(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  setSelected(isSelected: boolean) {
    this.isSelected = isSelected;
    this.node.scale = isSelected ? 1.08 : 1;
  }

  private ensureBadgeLabel(): cc.Label {
    if (this.badgeLabel) return this.badgeLabel;

    const badgeNode = new cc.Node("Badge");
    badgeNode.parent = this.node;
    badgeNode.setPosition(0, 0);

    const label = badgeNode.addComponent(cc.Label);
    label.fontSize = 28;
    label.lineHeight = 28;
    label.string = "";

    badgeNode.color = cc.color(60, 40, 20);
    badgeNode.active = false;

    this.badgeLabel = label;

    return label;
  }

  private getSuperBadge(superType: SuperTileType | null): string {
    switch (superType) {
      case SuperTileType.Row:
        return "H";
      case SuperTileType.Column:
        return "V";
      case SuperTileType.Radius:
        return "R";
      case SuperTileType.Board:
        return "A";
      default:
        return "";
    }
  }

  private getSuperSprite(
    superType: SuperTileType | null
  ): cc.SpriteFrame | null {
    switch (superType) {
      case SuperTileType.Row:
        return this.rowSuperSprite;
      case SuperTileType.Column:
        return this.columnSuperSprite;
      case SuperTileType.Radius:
        return this.radiusSuperSprite;
      case SuperTileType.Board:
        return this.boardSuperSprite;
      default:
        return null;
    }
  }
}
