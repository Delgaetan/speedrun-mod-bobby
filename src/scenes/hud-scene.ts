import DataKey from '../consts/data-key'
import EventKey from '../consts/event-key'
import { CINEMATIC_FRAME_HEIGHT, NUM_LEVELS_BY_WORLD } from '../consts/globals'
import { GameMode } from '../consts/level'
import SceneKey from '../consts/scene-key'
import TextureKey, { IconsKey } from '../consts/texture-key'
import IconButton from '../objects/ui/icon-button'
import TextButton from '../objects/ui/text-button'
import Panel from '../objects/ui/panel'
import { getLevelInfo, getLevelTotalCoins, updateLevelInfo } from '../utils/level'
import { exportGhostRun, importGhostRun } from '../utils/ghost'
import { getAnyPercentRun } from '../utils/any-percent'
import { stringifyTime } from '../utils/time'
import { transitionEventsEmitter } from '../utils/transition'
import GameScene from './game-scene'

export default class HUDScene extends Phaser.Scene {
  private cinematicFrameTop!: Phaser.GameObjects.Rectangle
  private cinematicFrameBottom!: Phaser.GameObjects.Rectangle
  private showCinematicFrames: boolean
  private coinsText!: Phaser.GameObjects.Text
  private timerText!: Phaser.GameObjects.Text
  private bestTimeText!: Phaser.GameObjects.Text
  private deltaText!: Phaser.GameObjects.Text
  private anyPercentText!: Phaser.GameObjects.Text
  private panelPause!: Phaser.GameObjects.Container
  private HUDItems!: Phaser.GameObjects.Container
  private coinsCollected!: number
  private timerStarted = false
  private startTime = 0
  private pauseTime = 0

  private anyPercentLevelStartTime = 0
  private currentLevel: number | null = null

  constructor() {
    super({ key: SceneKey.HUD })
    this.showCinematicFrames = false
  }

  create() {
    const { width, height } = this.scale

    this.cinematicFrameTop = this.add.rectangle(0, -CINEMATIC_FRAME_HEIGHT, width, CINEMATIC_FRAME_HEIGHT, 0x181425)
    this.cinematicFrameTop.setOrigin(0, 0)
    this.cinematicFrameBottom = this.add.rectangle(0, height, width, CINEMATIC_FRAME_HEIGHT, 0x181425)
    this.cinematicFrameBottom.setOrigin(0, 0)

    const mobileCursorsContainer = this.add.container()
    if (!this.sys.game.device.os.desktop) {
      const cursorLeft = this.add.image(180, 940, TextureKey.BtnCursor).setAngle(180).setAlpha(0.5)
      const cursorRight = this.add.image(420, 940, TextureKey.BtnCursor).setAlpha(0.5)
      mobileCursorsContainer.add([cursorLeft, cursorRight])
    }

    const gameScene = this.scene.get(SceneKey.Game) as GameScene
    this.currentLevel = gameScene.currentLevelNumber
    const isCustomLevel = this.registry.get(DataKey.IsCustomLevel)
    const btnPause = new IconButton(this, 1840, 80, IconsKey.Pause, this.togglePause)
    if (!isCustomLevel) {
      this.input.keyboard?.on('keydown-P', this.togglePause, this)
      this.input.keyboard?.on('keydown-ESC', this.togglePause, this)
    } else {
      btnPause.disableInteractive().setVisible(false)
    }

    // Pièces
    this.coinsCollected = (this.registry.get(DataKey.CoinsCollected) || []).reduce(
      (acc: number, val: number) => acc + val,
      0
    )
    const coin = this.add.circle(60, 60, 20, 0xfee761)
    this.coinsText = this.add.text(92, 34, `x${this.coinsCollected.toString().padStart(2, '0')}`, {
      fontFamily: TextureKey.FontHeading,
      fontSize: '48px',
      color: '#ffffff',
    })
    gameScene.events.on(EventKey.CollectCoin, this.updateCoins, this)

    const isSpeedrunMode = this.registry.get(DataKey.GameMode) === GameMode.Speedrun
    this.timerStarted = false
    this.startTime = 0
    const timerBg = this.add.rectangle(0, 100, 320, 80, 0x262b44, 0.5).setOrigin(0)
    this.timerText = this.add.text(40, 110, '00\'00"000', {
      fontFamily: TextureKey.FontHeading,
      fontSize: '48px',
      color: '#ffffff',
    })
    const timerContainer = this.add.container(0, 0, [timerBg, this.timerText])
    timerContainer.setAlpha(isSpeedrunMode ? 1 : 0)

    // Meilleur temps affiché en permanence
    const bestTime = this.currentLevel ? getLevelInfo(this.currentLevel)?.time : null
    this.bestTimeText = this.add.text(40, 186, bestTime ? `Meilleur : ${stringifyTime(bestTime)}` : '', {
      fontFamily: TextureKey.FontBody,
      fontSize: '22px',
      color: '#29adff',
    })

    // Delta en direct par rapport au fantôme (décalé un peu pour pas chevaucher bestTimeText)
    this.deltaText = this.add.text(40, 226, '', {
      fontFamily: TextureKey.FontBody,
      fontSize: '26px',
      color: '#ffffff',
    })

    // Chrono Any% (somme des niveaux du monde, si un run est actif)
    this.anyPercentText = this.add.text(width - 40, 110, '', {
      fontFamily: TextureKey.FontHeading,
      fontSize: '36px',
      color: '#fee761',
    })
    this.anyPercentText.setOrigin(1, 0)

    gameScene.events.on(EventKey.StartTimer, this.startTimer, this)
    gameScene.events.on(EventKey.StopTimer, this.stopTimer, this)
    gameScene.events.on(EventKey.LevelEnd, this.handleLevelEnd, this)
    gameScene.events.on(EventKey.ToggleCinematicFrames, this.toggleCinematicFrames, this)

    // Panel
    const panelWidth = 640

    const panelHeight = isSpeedrunMode && this.currentLevel ? 460 : 360
    const [centerX, centerY] = [(width - panelWidth) / 2, (height - panelHeight) / 2]

    this.panelPause = this.add.container(0, 0)
    this.panelPause.setVisible(false)

    const panelOverlay = this.add.rectangle(0, 0, width, height, 0x262b44, 0.4)
    panelOverlay.setOrigin(0).setInteractive()

    const panelPauseBg = new Panel(this, centerX, centerY, panelWidth, panelHeight)
    const panelTxt = this.add
      .text(width / 2, centerY + 40, '- Pause -', {
        fontFamily: TextureKey.FontHeading,
        fontSize: '64px',
        color: '#181425',
      })
      .setOrigin(0.5, 0)

    // Rang d'icônes ancré au panel (plutôt qu'à l'écran) pour rester cohérent
    // si panelHeight change selon le mode.
    const iconRowY = centerY + 220
    const btnPlay = new IconButton(this, width / 2, iconRowY, IconsKey.Play, this.togglePause)
    const btnRestart = new IconButton(this, width / 2 + 120, iconRowY, IconsKey.Restart, this.restartCurrentLevel)
    const btnLevels = new IconButton(this, width / 2 - 120, iconRowY, IconsKey.Levels, this.goToLevels)

    const panelExtras: Phaser.GameObjects.GameObject[] = []
    if (isSpeedrunMode && this.currentLevel) {

      const btnExportGhost = new TextButton(this, 0, 0, 'Exporter fantôme', () => this.exportGhost())
      const btnImportGhost = new TextButton(this, 0, 0, 'Importer fantôme', () => this.importGhost())

      const gap = 40
      const totalWidth = btnExportGhost.width + gap + btnImportGhost.width
      const extrasRowY = centerY + panelHeight - 100 // marge de 100px avant le bord bas du panel

      btnExportGhost.setPosition(width / 2 - totalWidth / 2 + btnExportGhost.width / 2, extrasRowY)
      btnImportGhost.setPosition(width / 2 + totalWidth / 2 - btnImportGhost.width / 2, extrasRowY)

      panelExtras.push(btnExportGhost, btnImportGhost)
    }

    this.panelPause.add([panelOverlay, panelPauseBg, panelTxt, btnPlay, btnRestart, btnLevels, ...panelExtras])
    this.HUDItems = this.add.container(0, 0, [
      btnPause,
      coin,
      timerContainer,
      this.bestTimeText,
      this.deltaText,
      this.anyPercentText,
      this.coinsText,
      mobileCursorsContainer,
    ])

    this.events.once('shutdown', this.handleShutdown, this)
  }

  toggleCinematicFrames() {
    this.showCinematicFrames = !this.showCinematicFrames
    this.HUDItems.setVisible(!this.showCinematicFrames)

    this.tweens.add({
      targets: this.cinematicFrameTop,
      y: this.showCinematicFrames ? 0 : -CINEMATIC_FRAME_HEIGHT,
      duration: 500,
      ease: 'Cubic.Out',
    })

    this.tweens.add({
      targets: this.cinematicFrameBottom,
      y: this.showCinematicFrames ? this.scale.height - CINEMATIC_FRAME_HEIGHT : this.scale.height,
      duration: 500,
      ease: 'Cubic.Out',
    })
  }

  handleShutdown() {
    const gameScene = this.scene.get(SceneKey.Game) as GameScene
    gameScene.events.off(EventKey.StartTimer, this.startTimer, this)
    gameScene.events.off(EventKey.StopTimer, this.stopTimer, this)
    gameScene.events.off(EventKey.LevelEnd, this.handleLevelEnd, this)
    gameScene.events.off(EventKey.CollectCoin, this.updateCoins, this)
    gameScene.events.off(EventKey.ToggleCinematicFrames, this.toggleCinematicFrames, this)
  }

  exportGhost() {
    if (!this.currentLevel) return
    const json = exportGhostRun(this.currentLevel)
    if (!json) {
      window.alert('Aucun fantôme enregistré pour ce niveau pour le moment.')
      return
    }
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ghost-level-${this.currentLevel}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  importGhost() {
    if (!this.currentLevel) return
    const json = window.prompt('Colle ici le contenu JSON du fantôme à importer :')
    if (!json) return

    const importedLevel = importGhostRun(json, this.currentLevel)
    if (importedLevel) {
      window.alert(`Fantôme importé pour le niveau ${importedLevel} ! Relance le niveau pour le voir en action.`)
    } else {
      window.alert("Ce contenu n'est pas un fantôme valide.")
    }
  }

  goToLevels() {
    transitionEventsEmitter.emit(EventKey.TransitionStart)
    transitionEventsEmitter.once(
      EventKey.TransitionEnd,
      () => {
        this.registry.set(DataKey.IsPaused, false)
        const gameScene = this.scene.get(SceneKey.Game)
        gameScene.scene.start(SceneKey.Levels)
      },
      this
    )
  }

  restartCurrentLevel() {
    transitionEventsEmitter.emit(EventKey.TransitionStart)
    transitionEventsEmitter.once(
      EventKey.TransitionEnd,
      () => {
        this.registry.set(DataKey.IsPaused, false)
        this.scene.start(SceneKey.Game)
        this.scene.restart()
      },
      this
    )
  }

  togglePause() {
    if (this.showCinematicFrames) return
    const isPaused = this.registry.get(DataKey.IsPaused)
    if (isPaused) {
      this.scene.resume(SceneKey.Game)
      this.pauseTime = this.time.now - this.pauseTime
      this.startTime += this.pauseTime
    } else {
      this.scene.pause(SceneKey.Game)
      ;(this.scene.get(SceneKey.Game) as GameScene).resetPointers()
      this.pauseTime = this.time.now
    }

    this.panelPause.setVisible(!isPaused)
    this.registry.set(DataKey.IsPaused, !isPaused)
  }

  handleLevelEnd({
    currentLevel,
    startedFromCheckpoint,
  }: {
    currentLevel: number | null
    startedFromCheckpoint: boolean
  }) {
    this.stopTimer.call(this)
    if (!currentLevel) return

    const levelInfo = getLevelInfo(currentLevel)
    if (!levelInfo) return

    const previousBestTime = levelInfo.time || Infinity
    const newTime = this.time.now - this.startTime
    const levelTotalCoins = getLevelTotalCoins(currentLevel)
    const previousMaxCoins = levelInfo.coins || 0

    updateLevelInfo(currentLevel, {
      ...(this.registry.get(DataKey.GameMode) === GameMode.Speedrun && newTime < previousBestTime && { time: newTime }),
      ...(this.coinsCollected > previousMaxCoins && { coins: this.coinsCollected }),
      ...(this.coinsCollected === levelTotalCoins && !startedFromCheckpoint && { shinyCoin: true }),
    })

    if (this.registry.get(DataKey.GameMode) === GameMode.Speedrun && newTime < previousBestTime) {
      this.bestTimeText.setText(`Meilleur : ${stringifyTime(newTime)}`)
    }

    this.startTime = 0
  }

  stopTimer() {
    const isSpeedrunMode = this.registry.get(DataKey.GameMode) === GameMode.Speedrun
    if (!this.timerStarted || !isSpeedrunMode) return
    this.timerStarted = false
  }

  startTimer() {
    this.timerStarted = true
    this.startTime = this.time.now
    this.anyPercentLevelStartTime = Date.now()
  }

  updateCoins() {
    this.coinsCollected += 1
    this.coinsText.setText(`x${this.coinsCollected.toString().padStart(2, '0')}`)
  }

  update() {
    const isPaused = this.registry.get(DataKey.IsPaused)

    // Le timer du niveau et le delta fantôme se figent bien en pause

    if (!isPaused) {
      if (this.startTime !== 0 && this.timerStarted) {
        const time = stringifyTime(this.time.now - this.startTime)
        this.timerText.setText(time)
      }

      // Delta en direct par rapport au fantôme
      if (this.timerStarted) {
        const gameScene = this.scene.get(SceneKey.Game) as GameScene
        const delta = gameScene.currentGhostDelta
        if (delta !== null) {
          const seconds = (delta / 1000).toFixed(2)
          const isAhead = delta < 0
          this.deltaText.setText(`${isAhead ? '-' : '+'}${Math.abs(Number(seconds)).toFixed(2)}s`)
          this.deltaText.setColor(isAhead ? '#4ade80' : '#f87171')
        } else {
          this.deltaText.setText('')
        }
      } else {
        this.deltaText.setText('')
      }
    }


    if (this.currentLevel) {
      const world = Math.ceil(this.currentLevel / NUM_LEVELS_BY_WORLD)
      const anyPercentState = getAnyPercentRun()
      if (anyPercentState?.world === world) {
        const currentLevelElapsed = this.timerStarted ? Date.now() - this.anyPercentLevelStartTime : 0
        this.anyPercentText.setText(`ANY% : ${stringifyTime(anyPercentState.totalTime + currentLevelElapsed)}`)
      } else {
        this.anyPercentText.setText('')
      }
    }
  }
}
