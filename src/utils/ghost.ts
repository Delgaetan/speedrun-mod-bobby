export interface GhostFrame {
  t: number // temps écoulé depuis le début du run (ms)
  x: number
  y: number
}

export interface GhostRun {
  frames: GhostFrame[]
}

const GHOST_KEY_PREFIX = 'ghostRun_'

export function getGhostRun(level: number): GhostRun | null {
  const raw = localStorage.getItem(GHOST_KEY_PREFIX + level)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as GhostRun
    if (!parsed?.frames?.length) return null
    return parsed
  } catch {
    return null
  }
}

export function saveGhostRun(level: number, run: GhostRun) {
  localStorage.setItem(GHOST_KEY_PREFIX + level, JSON.stringify(run))
}

export function exportGhostRun(level: number): string | null {
  const run = getGhostRun(level)
  if (!run) return null
  return JSON.stringify({ level, ...run })
}

export function importGhostRun(json: string, targetLevel?: number): number | null {
  try {
    const parsed = JSON.parse(json) as GhostRun & { level?: number }
    if (!parsed?.frames?.length) return null

    const level = targetLevel ?? parsed.level
    if (!level) return null

    saveGhostRun(level, { frames: parsed.frames })
    return level
  } catch {
    return null
  }
}

export function clearAllGhostRuns() {
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(GHOST_KEY_PREFIX)) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key))
}
