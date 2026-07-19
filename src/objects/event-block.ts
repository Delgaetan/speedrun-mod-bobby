export default class EventBlock extends Phaser.GameObjects.Rectangle {
  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    super(scene, x, y, width, height, 0xc0cbdc)
    this.setOrigin(0)
    scene.add.existing(this)
  }
}
