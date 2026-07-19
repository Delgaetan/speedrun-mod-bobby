import { DataLevel, DataLevels } from '../consts/level'

const modules = import.meta.glob('./level*.json', { eager: true })

export const levelsData: DataLevels = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => {
    const match = path.match(/level(\d+)\.json$/)
    const key = `level${match?.[1]}` as keyof DataLevels
    return [key, mod as DataLevel]
  })
)
