import Dexie, { type Table } from 'dexie'

export type Difficulty = 'low' | 'medium' | 'high'

export interface Bots100Data {
  approachCount: number
  /** Индекс i завершён только если все j < i завершены при сохранении */
  completed: boolean[]
}

export interface HardBotsApproach {
  killsOutOf30: number
}

export interface HardBotsData {
  difficulty: Difficulty
  approaches: HardBotsApproach[]
}

export interface DeathmatchRound {
  kills: number
  deaths: number
  weapon: string
}

export interface DeathmatchData {
  rounds: DeathmatchRound[]
}

export type TrainingSubtype = 'bots100' | 'hardBots' | 'deathmatch'

export interface TrainingEntry {
  id?: number
  createdAt: number
  /** YYYY-MM-DD для фильтра */
  dateKey: string
  subtype: TrainingSubtype
  bots100?: Bots100Data
  hardBots?: HardBotsData
  deathmatch?: DeathmatchData
}

export interface MouseSettings {
  id?: number
  dpi: number
  sensitivityAim: number
  scopedSensitivityMultiplier: number
  adsSensitivityMultiplier: number
}

export interface RankedMatchRow {
  id?: number
  createdAt: number
  dateKey: string
  mapId: string
  kills: number
  deaths: number
  assists: number
}

class ValTrainDB extends Dexie {
  training!: Table<TrainingEntry, number>
  settings!: Table<MouseSettings, number>
  ranked!: Table<RankedMatchRow, number>

  constructor() {
    super('ValTrainDB')
    this.version(1).stores({
      training: '++id, dateKey, subtype, createdAt',
      settings: '++id',
      ranked: '++id, dateKey, createdAt',
    })
  }
}

export const db = new ValTrainDB()

export function dateKeyFromTs(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function getOrCreateSettings(): Promise<MouseSettings> {
  const row = await db.settings.get(1)
  if (row) return row
  const defaults: MouseSettings = {
    id: 1,
    dpi: 800,
    sensitivityAim: 0.45,
    scopedSensitivityMultiplier: 1,
    adsSensitivityMultiplier: 1,
  }
  await db.settings.put(defaults)
  return defaults
}
