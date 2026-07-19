import { PLAYER_SIZE, PlayerMode } from '../consts/globals'
import { Trail } from '../consts/level'
import SceneKey from '../consts/scene-key'
import Player from '../objects/player'
import { getCurrentTrail } from '../utils/level'

export default class TrailScene extends Phaser.Scene {
  public player!: Player

  constructor() {
    super({ key: SceneKey.Trail })
  }

  create() {
    const { width, height } = this.scale

    const trail = getCurrentTrail()
    this.player = new Player(this, width / 2, height / 2, Trail.None, true)
    this.player.setTrail(trail)

    const platform = this.add
      .rectangle(width / 2, height / 2 + PLAYER_SIZE, width * 8, height / 2, 0xbe4a2f)
      .setOrigin(0.5, 0)
    this.physics.add.existing(platform, true)

    this.physics.add.collider(this.player, platform)
    this.cameras.main.setBounds(0, 0, width * 4, height)
    this.cameras.main.setViewport(width / 4, height / 4, width / 2, height / 2)
    this.cameras.main.startFollow(this.player)
    this.cameras.main.setBackgroundColor(0x0099db)

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const { x, y, width, height } = this.cameras.main
      if (pointer.x < x || pointer.x > x + width || pointer.y < y || pointer.y > y + height) {
        return
      }
      this.player.jump()
    })
  }

  update(time: number) {
    this.player.update({
      time,
      isGoingLeft: false,
      isGoingRight: true,
      playerMode: PlayerMode.Platformer,
      stickedVelocityX: 0,
      justTriggeredJump: false,
    })

    const cameraView = this.cameras.main.worldView
    if (this.player.x > cameraView.right + PLAYER_SIZE) {
      this.player.x = 0
    }
  }
}
