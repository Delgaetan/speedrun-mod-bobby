export interface HistoryEntry {
  time: number
  date: number // Date.now()
}

const HISTORY_KEY_PREFIX = 'runHistory_'
const MAX_HISTORY_ENTRIES = 5

export function getHistory(level: number): HistoryEntry[] {
  const raw = localStorage.getItem(HISTORY_KEY_PREFIX + level)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as HistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addHistoryEntry(level: number, time: number) {
  const history = getHistory(level)
  history.unshift({ time, date: Date.now() })
  const trimmed = history.slice(0, MAX_HISTORY_ENTRIES)
  localStorage.setItem(HISTORY_KEY_PREFIX + level, JSON.stringify(trimmed))
}

export function clearAllHistory() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(HISTORY_KEY_PREFIX))
    .forEach((key) => localStorage.removeItem(key))
}
