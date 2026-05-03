import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from 'recharts'
import type { TrainingEntry } from '../db/database'

function dmKd(entry: TrainingEntry): number | null {
  const r = entry.deathmatch?.rounds
  if (!r?.length) return null
  let k = 0,
    d = 0
  for (const x of r) {
    k += x.kills
    d += x.deaths
  }
  if (d === 0) return k
  return k / d
}

function hardAvg(entry: TrainingEntry): number | null {
  const a = entry.hardBots?.approaches
  if (!a?.length) return null
  const sum = a.reduce((s, x) => s + x.killsOutOf30, 0)
  return sum / a.length
}

/** Агрегируем по дате: среднее по всем сессиям за день */
export function buildChartRows(entries: TrainingEntry[]) {
  const byDate = new Map<
    string,
    { dmKds: number[]; hardAvgs: number[]; botsCompleted: number[] }
  >()

  for (const e of entries) {
    const dk = byDate.get(e.dateKey) ?? { dmKds: [], hardAvgs: [], botsCompleted: [] }
    if (e.subtype === 'deathmatch') {
      const v = dmKd(e)
      if (v != null) dk.dmKds.push(v)
    }
    if (e.subtype === 'hardBots') {
      const v = hardAvg(e)
      if (v != null) dk.hardAvgs.push(v)
    }
    if (e.subtype === 'bots100' && e.bots100) {
      const done = e.bots100.completed.filter(Boolean).length
      const total = e.bots100.approachCount
      dk.botsCompleted.push(total > 0 ? done / total : 0)
    }
    byDate.set(e.dateKey, dk)
  }

  const dates = [...byDate.keys()].sort()
  return dates.map((dateKey) => {
    const x = byDate.get(dateKey)!
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
    return {
      dateKey,
      dmKd: avg(x.dmKds),
      hardBotsAvg30: avg(x.hardAvgs),
      bots100Progress: avg(x.botsCompleted) != null ? (avg(x.botsCompleted)! * 100).toFixed(0) : null,
    }
  })
}

export function TrainingCharts({ entries }: { entries: TrainingEntry[] }) {
  const rows = buildChartRows(entries)
  if (!rows.length) {
    return (
      <p className="vt-muted">Добавьте записи тренировок — здесь появятся графики по датам.</p>
    )
  }

  const lineData = rows.map((r) => ({
    ...r,
    dmKd: r.dmKd ?? undefined,
    hardBotsAvg30: r.hardBotsAvg30 ?? undefined,
  }))

  const barData = rows
    .filter((r) => r.bots100Progress != null)
    .map((r) => ({
      dateKey: r.dateKey,
      pct: Number(r.bots100Progress),
    }))

  return (
    <div className="vt-charts">
      <div className="vt-card">
        <h3 className="vt-card-title">K/D в DM и средние убийства (сложные боты)</h3>
        <p className="vt-card-desc">
          По оси X — дата. Линии усредняют все сессии за день: отношение убийств к смертям в DM и
          средний результат из 30 по сложным ботам.
        </p>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={lineData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis dataKey="dateKey" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--vt-bg-elevated)',
                  border: '1px solid var(--vt-border)',
                  borderRadius: 8,
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="dmKd"
                name="K/D Deathmatch"
                stroke="var(--vt-accent)"
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="hardBotsAvg30"
                name="Сложные боты (ср. из 30)"
                stroke="var(--vt-teal)"
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="vt-card">
        <h3 className="vt-card-title">Завершение подходов «100 ботов»</h3>
        <p className="vt-card-desc">
          Процент завершённых подходов от запланированных за день (по всем сохранённым сессиям).
        </p>
        {barData.length === 0 ? (
          <p className="vt-muted">Нет сохранённых записей по 100 ботам.</p>
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="dateKey" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--vt-bg-elevated)',
                    border: '1px solid var(--vt-border)',
                    borderRadius: 8,
                  }}
                  formatter={(v: number) => [`${v}%`, 'Завершено']}
                />
                <Bar dataKey="pct" name="%" fill="var(--vt-accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

export function trainingInsights(entries: TrainingEntry[]): { pos: string[]; neg: string[] } {
  const rows = buildChartRows(entries)
  if (rows.length < 2) return { pos: [], neg: [] }

  const last = rows[rows.length - 1]
  const prev = rows[rows.length - 2]
  const pos: string[] = []
  const neg: string[] = []

  if (last.dmKd != null && prev.dmKd != null) {
    if (last.dmKd > prev.dmKd + 0.05) pos.push('K/D в Deathmatch вырос по сравнению с предыдущей датой.')
    if (last.dmKd < prev.dmKd - 0.05) neg.push('K/D в Deathmatch просел — проверьте разминку и фокус.')
  }

  if (last.hardBotsAvg30 != null && prev.hardBotsAvg30 != null) {
    if (last.hardBotsAvg30 > prev.hardBotsAvg30 + 1)
      pos.push('Средний результат по сложным ботам улучшился.')
    if (last.hardBotsAvg30 < prev.hardBotsAvg30 - 1)
      neg.push('По сложным ботам средний результат ниже прошлого дня.')
  }

  if (last.bots100Progress != null && prev.bots100Progress != null) {
    if (Number(last.bots100Progress) >= Number(prev.bots100Progress))
      pos.push('Доля завершённых подходов «100 ботов» не хуже предыдущего дня.')
    else neg.push('Меньше завершённых подходов «100 ботов», чем в прошлый раз.')
  }

  return { pos, neg }
}
