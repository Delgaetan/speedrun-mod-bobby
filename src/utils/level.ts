import DataKey from '../consts/data-key'
import { DataLevel, PlayerDataLevel, Trail, TRAIL_COSTS } from '../consts/level'
import { levelsData } from '../levels'
import { clearAllGhostRuns } from './ghost'
import { clearAllHistory } from './history'

export function getLevelTotalCoins(level: number | DataLevel) {
  const data = typeof level === 'number' ? levelsData[`level${level}`] : level
  return (data?.coins || []).reduce((acc, { numX, numY }) => acc + Math.max(numX || 1, numY || 1), 0)
}

export function getTotalCoins() {
  const unlockedLevels = getUnlockedLevels()
  let coins = unlockedLevels.reduce((total, level) => {
    return total + (level?.coins || 0)
  }, 0)

  getUnlockedTrails().forEach((trail) => {
    const trailData = TRAIL_COSTS[trail]
    coins -= trailData.cost
  })

  return coins
}

export function getUnlockedLevels(): PlayerDataLevel[] {
  const unlockedLevelsString = localStorage.getItem(DataKey.UnlockedLevels)
  if (unlockedLevelsString) {
    return JSON.parse(unlockedLevelsString)
  } else {
    const level = {
      level: 1,
      time: 0,
    }
    localStorage.setItem(DataKey.UnlockedLevels, JSON.stringify([level]))
    return [level]
  }
}

export function getLevelInfo(levelNum: number) {
  const unlockedLevels = getUnlockedLevels()
  return unlockedLevels.find(({ level }) => level === levelNum)
}

export function updateLevelInfo(levelNum: number, data: Partial<PlayerDataLevel>) {
  const unlockedLevels = getUnlockedLevels()
  const index = unlockedLevels.findIndex(({ level }) => level === levelNum)
  if (index === -1) return

  unlockedLevels[index] = { ...unlockedLevels[index], ...data }
  localStorage.setItem(DataKey.UnlockedLevels, JSON.stringify(unlockedLevels))
}

export function unlockLevel(levelNum: number, time = 0) {
  const unlockedLevels = getUnlockedLevels()
  if (unlockedLevels.some(({ level }) => level === levelNum)) return

  unlockedLevels.push({
    level: levelNum,
    time,
  })
  localStorage.setItem(DataKey.UnlockedLevels, JSON.stringify(unlockedLevels))
}

export function unlockAllLevels() {
  let unlockedLevels = getUnlockedLevels()
  const unlockedLevelSet = new Set(unlockedLevels.map((levelData) => levelData.level))
  for (let level = 1; level <= Object.keys(levelsData).length; level++) {
    if (!unlockedLevelSet.has(level)) {
      unlockedLevels.push({ level, time: 0 })
    }
  }

  localStorage.setItem(DataKey.UnlockedLevels, JSON.stringify(unlockedLevels))
}

export function resetBestTimes() {
  const unlockedLevels = getUnlockedLevels()
  const resetTimesLevels = unlockedLevels.map((level) => ({ ...level, time: 0 }))
  localStorage.setItem(DataKey.UnlockedLevels, JSON.stringify(resetTimesLevels))

  // Remet aussi les fantômes et l'historique à zéro, comme à l'installation
  clearAllGhostRuns()
  clearAllHistory()
}

export function setCurrentWorld(world: number) {
  localStorage.setItem(DataKey.CurrentWorld, world.toString())
}

export function getCurrentWorld() {
  return parseInt(localStorage.getItem(DataKey.CurrentWorld) ?? '1', 10)
}

export function getUnlockedTrails(): Trail[] {
  const unlockedTrailsString = localStorage.getItem(DataKey.UnlockedTrails)
  if (unlockedTrailsString) {
    return JSON.parse(unlockedTrailsString)
  } else {
    const trails = [Trail.None]
    localStorage.setItem(DataKey.UnlockedTrails, JSON.stringify(trails))
    return trails
  }
}

export function unlockTrail(trail: Trail) {
  const unlockedTrails = getUnlockedTrails()
  if (unlockedTrails.includes(trail)) return

  unlockedTrails.push(trail)
  unlockedTrails.sort((a, b) => a - b)
  localStorage.setItem(DataKey.UnlockedTrails, JSON.stringify(unlockedTrails))
}

export function setCurrentTrail(trail: number) {
  localStorage.setItem(DataKey.CurrentTrail, trail.toString())
}

export function getCurrentTrail() {
  return parseInt(localStorage.getItem(DataKey.CurrentTrail) ?? '0', 10)
}
