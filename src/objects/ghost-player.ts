import { DepthLayer, PLAYER_SIZE } from '../consts/globals'
import { GhostFrame } from '../utils/ghost'

const GHOST_COLOR = 0x29adff

export default class GhostPlayer extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Rectangle
  private label: Phaser.GameObjects.Text
  private frames: GhostFrame[]
  private frameCursor = 0

  constructor(scene: Phaser.Scene, frames: GhostFrame[]) {
    const start = frames[0] ?? { x: 0, y: 0 }
    super(scene, start.x, start.y)
    this.frames = frames

    this.sprite = scene.add.rectangle(0, 0, PLAYER_SIZE, PLAYER_SIZE, GHOST_COLOR, 0.35)
    this.sprite.setStrokeStyle(3, GHOST_COLOR, 0.8)
    this.add(this.sprite)

    this.label = scene.add.text(0, -PLAYER_SIZE / 2 - 20, 'Meilleur temps', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#29adff',
    })
    this.label.setOrigin(0.5, 1)
    this.add(this.label)

    this.setSize(PLAYER_SIZE, PLAYER_SIZE)
    this.setDepth(DepthLayer.Bobby)
    this.setVisible(false)
    scene.add.existing(this)
  }

  get duration() {
    return this.frames.length ? this.frames[this.frames.length - 1].t : 0
  }

  get recordedFrames(): readonly GhostFrame[] {
    return this.frames
  }

  getElapsedAtX(x: number): number | null {
    if (!this.frames.length) return null

    let closest = this.frames[0]
    let closestDist = Math.abs(closest.x - x)

    for (let i = 1; i < this.frames.length; i++) {
      const dist = Math.abs(this.frames[i].x - x)
      if (dist < closestDist) {
        closest = this.frames[i]
        closestDist = dist
      }
    }

    return closest.t
  }

  reset() {
    this.frameCursor = 0
    this.setVisible(true)
    this.setAlpha(1)
  }

  playAt(elapsed: number) {
    if (!this.frames.length) return

    if (elapsed >= this.duration) {
      // Le fantôme a fini sa course : on le laisse disparaître en fondu.
      this.setVisible(false)
      return
    }

    while (this.frameCursor < this.frames.length - 2 && this.frames[this.frameCursor + 1].t <= elapsed) {
      this.frameCursor++
    }

    const current = this.frames[this.frameCursor]
    const next = this.frames[this.frameCursor + 1] ?? current
    const span = next.t - current.t || 1
    const ratio = Phaser.Math.Clamp((elapsed - current.t) / span, 0, 1)

    this.x = Phaser.Math.Linear(current.x, next.x, ratio)
    this.y = Phaser.Math.Linear(current.y, next.y, ratio)
  }
}
