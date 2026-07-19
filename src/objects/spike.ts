import TextureKey from '../consts/texture-key'

export default class Spike extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, dir: number) {
    super(scene, x, y, TextureKey.Spike)
    scene.physics.add.existing(this)

    this.angle = dir * 90
    const body = this.body as Phaser.Physics.Arcade.Body

    const scale = 0.9
    const oldRadius = this.displayWidth / 3
    const radius = oldRadius * scale

    body.setCircle(radius)

    const oldOffsetX = dir % 2 === 0 ? this.displayWidth / 6 : dir === 1 ? 0 : this.displayWidth / 3
    const oldOffsetY = dir % 2 === 1 ? this.displayWidth / 6 : dir === 0 ? this.displayWidth / 3 : 0

    body.setOffset(oldOffsetX + (oldRadius - radius), oldOffsetY + (oldRadius - radius))

    scene.add.existing(this)
  }

  fall() {
    this.scene.tweens.add({
      targets: this,
      duration: 80,
      repeat: 4,
      yoyo: true,
      ease: 'Bounce.easeInOut',
      x: this.x + 4,
      onComplete: () => {
        const body = this.body as Phaser.Physics.Arcade.Body
        body.allowGravity = true
      },
    })
  }
}
