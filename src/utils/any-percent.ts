export interface AnyPercentState {
  world: number
  totalTime: number
  lastLevelCompleted: number
  active: boolean
}

const RUN_KEY = 'anyPercentRun'
const BEST_KEY_PREFIX = 'bestAnyPercent_'

export function startAnyPercentRun(world: number) {
  const state: AnyPercentState = { world, totalTime: 0, lastLevelCompleted: 0, active: true }
  localStorage.setItem(RUN_KEY, JSON.stringify(state))
}

export function getAnyPercentRun(): AnyPercentState | null {
  const raw = localStorage.getItem(RUN_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AnyPercentState
    return parsed?.active ? parsed : null
  } catch {
    return null
  }
}

export function addAnyPercentLevelTime(world: number, level: number, time: number): AnyPercentState | null {
  const state = getAnyPercentRun()
  if (!state || state.world !== world) return null

  state.totalTime += time
  state.lastLevelCompleted = level
  localStorage.setItem(RUN_KEY, JSON.stringify(state))
  return state
}

export function stopAnyPercentRun() {
  localStorage.removeItem(RUN_KEY)
}

export function getBestAnyPercentTime(world: number): number | null {
  const raw = localStorage.getItem(BEST_KEY_PREFIX + world)
  return raw ? Number(raw) : null
}

export function saveBestAnyPercentTimeIfBetter(world: number, time: number): boolean {
  const best = getBestAnyPercentTime(world)
  if (best === null || time < best) {
    localStorage.setItem(BEST_KEY_PREFIX + world, time.toString())
    return true
  }
  return false
}
