import EventKey from '../consts/event-key'
import { Trail, TRAIL_COSTS } from '../consts/level'
import SceneKey from '../consts/scene-key'
import TextureKey, { IconsKey } from '../consts/texture-key'
import IconButton from '../objects/ui/icon-button'
import Panel from '../objects/ui/panel'
import TextButton from '../objects/ui/text-button'
import { getCurrentTrail, getTotalCoins, getUnlockedTrails, setCurrentTrail, unlockTrail } from '../utils/level'
import { transitionEventsEmitter } from '../utils/transition'
import TrailScene from './trail-scene'

export default class ShopScene extends Phaser.Scene {
  private coinsText!: Phaser.GameObjects.Text
  private totalCoins: number = 0
  private currentTrail: number = 0
  private activeTrail: number = 0
  private button!: TextButton
  private buttonPrev!: IconButton
  private buttonNext!: IconButton
  private unlockedTrails: Trail[] = []

  constructor() {
    super({ key: SceneKey.Shop })
  }

  create() {
    const { width, height } = this.scale
    this.add
      .text(width / 2, 24, 'BOUTIQUE', {
        fontFamily: TextureKey.FontHeading,
        fontSize: '96px',
        color: '#262b44',
      })
      .setOrigin(0.5, 0)

    new IconButton(this, 80, 80, IconsKey.Back, () => this.goBack())

    this.add.circle(width - 212, 60, 20, 0xfee761)
    this.totalCoins = getTotalCoins()
    this.currentTrail = getCurrentTrail()
    this.activeTrail = this.currentTrail
    this.unlockedTrails = getUnlockedTrails()

    this.coinsText = this.add.text(width - 180, 34, `x${this.totalCoins.toString().padStart(3, '0')}`, {
      fontFamily: TextureKey.FontHeading,
      fontSize: '48px',
      color: '#ffffff',
    })

    this.buttonPrev = new IconButton(this, width / 4 - 120, height / 2, IconsKey.Chevron, () => this.changeTrail(-1))
    this.buttonPrev.rotateIcon(180)
    this.buttonNext = new IconButton(this, (width / 4) * 3 + 120, height / 2, IconsKey.Chevron, () =>
      this.changeTrail(1)
    )

    this.add.existing(new Panel(this, width / 4 - 8, height / 4 - 8, width / 2 + 16, height / 2 + 16))

    this.button = new TextButton(this, width / 2, height - 120, 'Utilisé', () => {
      this.handleButtonClick()
    })
    this.updateButton()

    this.scene.launch(SceneKey.Transition)
    this.scene.launch(SceneKey.Trail)
  }

  goBack() {
    transitionEventsEmitter.emit(EventKey.TransitionStart)
    transitionEventsEmitter.once(
      EventKey.TransitionEnd,
      () => {
        this.scene.stop(SceneKey.Trail)
        this.scene.start(SceneKey.Levels)
      },
      this
    )
  }

  changeTrail(direction: number) {
    this.activeTrail = Phaser.Math.Clamp(this.activeTrail + direction, 0, Object.values(Trail).length / 2 - 1)
    ;(this.scene.get(SceneKey.Trail) as TrailScene).player.setTrail(this.activeTrail as Trail)
    this.updateButton()
  }

  updateButton() {
    if (this.activeTrail === this.currentTrail) {
      this.button.text = 'Utilisé'
      this.button.disable()
    } else {
      if (this.unlockedTrails.includes(this.activeTrail as Trail)) {
        this.button.text = 'Sélectionner'
        this.button.enable()
      } else {
        const trailCost = TRAIL_COSTS[this.activeTrail as Trail].cost
        this.button.text = `Acheter : ${trailCost}`
        if (this.totalCoins < trailCost) {
          this.button.disable()
        } else {
          this.button.enable()
        }
      }
    }

    this.buttonPrev.setVisible(this.activeTrail > 0)
    this.buttonNext.setVisible(this.activeTrail < Object.values(Trail).length / 2 - 1)
  }

  handleButtonClick() {
    if (!this.unlockedTrails.includes(this.activeTrail as Trail)) {
      const trailCost = TRAIL_COSTS[this.activeTrail as Trail].cost
      if (this.totalCoins < trailCost) {
        return
      }

      this.totalCoins -= trailCost
      this.coinsText.setText(`x${this.totalCoins.toString().padStart(3, '0')}`)
      this.unlockedTrails.push(this.activeTrail as Trail)
      unlockTrail(this.activeTrail as Trail)
    }

    setCurrentTrail(this.activeTrail)
    this.currentTrail = this.activeTrail
    this.updateButton()
  }
}
