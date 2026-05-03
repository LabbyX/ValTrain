import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { RANKED_MAPS } from '../data/valorant'
import { db, dateKeyFromTs, type RankedMatchRow } from '../db/database'
import { matchOutcome, scoreOutcomeClass } from '../utils/matchScore'

const SCORE_MAX = 30

type Draft = {
  mapId: string
  kills: number
  deaths: number
  assists: number
  scoreLeft: number | null
  scoreRight: number | null
}

function parseScore(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  if (Number.isNaN(n) || n < 0) return null
  return Math.min(SCORE_MAX, Math.floor(n))
}

export function RankedPage() {
  const [selectedMap, setSelectedMap] = useState<string>(RANKED_MAPS[0].id)
  const [drafts, setDrafts] = useState<Draft[]>([
    {
      mapId: RANKED_MAPS[0].id,
      kills: 18,
      deaths: 15,
      assists: 4,
      scoreLeft: null,
      scoreRight: null,
    },
  ])
  const [history, setHistory] = useState<RankedMatchRow[]>([])
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const reload = useCallback(async () => {
    const rows = await db.ranked.orderBy('createdAt').reverse().toArray()
    setHistory(rows)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const addRow = () =>
    setDrafts((d) => [
      ...d,
      { mapId: selectedMap, kills: 0, deaths: 0, assists: 0, scoreLeft: null, scoreRight: null },
    ])

  const batchKd = useMemo(() => {
    let k = 0,
      d = 0
    for (const r of drafts) {
      k += r.kills
      d += r.deaths
    }
    if (k === 0 && d === 0) return null
    if (d === 0) return Number.POSITIVE_INFINITY
    return k / d
  }, [drafts])

  const saveBatch = async () => {
    const ts = Date.now()
    const dk = dateKeyFromTs(ts)
    for (const r of drafts) {
      const row: Omit<RankedMatchRow, 'id'> = {
        createdAt: ts,
        dateKey: dk,
        mapId: r.mapId,
        kills: r.kills,
        deaths: r.deaths,
        assists: r.assists,
      }
      if (r.scoreLeft != null && r.scoreRight != null) {
        row.scoreLeft = r.scoreLeft
        row.scoreRight = r.scoreRight
      }
      await db.ranked.add(row)
    }
    void reload()
  }

  const filteredHist = useMemo(() => {
    return history.filter((h) => {
      if (filterFrom && h.dateKey < filterFrom) return false
      if (filterTo && h.dateKey > filterTo) return false
      return true
    })
  }, [history, filterFrom, filterTo])

  const rankedStockRows = useMemo(() => {
    const ordered = [...filteredHist].reverse()
    let equity = 100
    return ordered.map((h, idx) => {
      const out = matchOutcome(h.scoreLeft, h.scoreRight)
      const kd = h.deaths === 0 ? (h.kills > 0 ? 2 : 1) : h.kills / h.deaths
      // "Биржевой" индекс формы: исход + небольшой вклад K/D
      const delta =
        (out === 'win' ? 4 : out === 'loss' ? -4 : out === 'draw' ? 1 : 0) +
        Math.max(-2.5, Math.min(2.5, (kd - 1) * 2))
      equity = Math.max(20, Math.round((equity + delta) * 10) / 10)
      return {
        n: idx + 1,
        equity,
        dateKey: h.dateKey,
        map: h.mapId,
      }
    })
  }, [filteredHist])

  const mapName = (id: string) => RANKED_MAPS.find((m) => m.id === id)?.name ?? id

  return (
    <div>
      <section className="vt-section">
        <h2 style={{ marginBottom: '0.75rem' }}>Выбор карты</h2>
        <div className="vt-map-grid">
          {RANKED_MAPS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={
                'vt-map-card' + (selectedMap === m.id ? ' vt-map-card--selected' : '')
              }
              onClick={() => setSelectedMap(m.id)}
            >
              <div
                className="vt-map-thumb"
                style={m.image ? { backgroundImage: `url(${m.image})` } : undefined}
              />
              <div className="vt-map-name">{m.name}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="vt-section vt-card">
        <h2 className="vt-card-title">Несколько игр подряд</h2>
        <p className="vt-card-desc">
          K/D/A, счёт матча слева «мы», справа «соперники»: больше слева — победа (зелёный), меньше —
          поражение (красный), равные — ничья (жёлтый). Если счёт не указать, подсветки не будет.
        </p>

        <div className="vt-row" style={{ marginBottom: '1rem', alignItems: 'center' }}>
          <button type="button" className="vt-btn vt-btn--ghost" onClick={addRow}>
            + Игра ({mapName(selectedMap)})
          </button>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <span className="vt-label" style={{ marginBottom: 2 }}>
              Средний K/D (список)
            </span>
            <div style={{ fontFamily: 'var(--vt-font-display)', fontSize: '1.35rem', fontWeight: 700 }}>
              {batchKd == null
                ? '—'
                : batchKd === Number.POSITIVE_INFINITY
                  ? '∞'
                  : batchKd.toFixed(2)}
            </div>
          </div>
          <button type="button" className="vt-btn" onClick={() => void saveBatch()}>
            Сохранить все игры
          </button>
        </div>

        <div className="vt-table-wrap">
          <table className="vt-table">
            <thead>
              <tr>
                <th>Карта</th>
                <th>Счёт</th>
                <th>K</th>
                <th>D</th>
                <th>A</th>
                <th>K/D</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {drafts.map((row, i) => {
                const kd = row.deaths === 0 ? (row.kills > 0 ? '∞' : '—') : (row.kills / row.deaths).toFixed(2)
                const oc = matchOutcome(row.scoreLeft, row.scoreRight)
                const scoreClass = scoreOutcomeClass(oc)
                return (
                  <tr key={i}>
                    <td>
                      <select
                        className="vt-select"
                        style={{ maxWidth: 160 }}
                        value={row.mapId}
                        onChange={(e) =>
                          setDrafts((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, mapId: e.target.value } : x)),
                          )
                        }
                      >
                        {RANKED_MAPS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={scoreClass}>
                      <div className="vt-score-cell-inner">
                        <input
                          className="vt-score-input"
                          type="number"
                          min={0}
                          max={SCORE_MAX}
                          placeholder="—"
                          value={row.scoreLeft ?? ''}
                          aria-label="Наши раунды"
                          onChange={(e) => {
                            const v = parseScore(e.target.value)
                            setDrafts((prev) =>
                              prev.map((x, j) => (j === i ? { ...x, scoreLeft: v } : x)),
                            )
                          }}
                        />
                        <span className="vt-score-sep">:</span>
                        <input
                          className="vt-score-input"
                          type="number"
                          min={0}
                          max={SCORE_MAX}
                          placeholder="—"
                          value={row.scoreRight ?? ''}
                          aria-label="Раунды соперника"
                          onChange={(e) => {
                            const v = parseScore(e.target.value)
                            setDrafts((prev) =>
                              prev.map((x, j) => (j === i ? { ...x, scoreRight: v } : x)),
                            )
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <input
                        className="vt-input"
                        style={{ maxWidth: 72 }}
                        type="number"
                        min={0}
                        value={row.kills}
                        onChange={(e) => {
                          const v = Math.max(0, Number(e.target.value) || 0)
                          setDrafts((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, kills: v } : x)),
                          )
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="vt-input"
                        style={{ maxWidth: 72 }}
                        type="number"
                        min={0}
                        value={row.deaths}
                        onChange={(e) => {
                          const v = Math.max(0, Number(e.target.value) || 0)
                          setDrafts((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, deaths: v } : x)),
                          )
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="vt-input"
                        style={{ maxWidth: 72 }}
                        type="number"
                        min={0}
                        value={row.assists}
                        onChange={(e) => {
                          const v = Math.max(0, Number(e.target.value) || 0)
                          setDrafts((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, assists: v } : x)),
                          )
                        }}
                      />
                    </td>
                    <td>{kd}</td>
                    <td>
                      <button
                        type="button"
                        className="vt-btn vt-btn--ghost"
                        disabled={drafts.length <= 1}
                        onClick={() => setDrafts((prev) => prev.filter((_, j) => j !== i))}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="vt-section vt-card">
        <h2 className="vt-card-title">Динамика рейтинга (как график биржи)</h2>
        <p className="vt-card-desc">
          Линия строится по матчам в хронологическом порядке: победы и высокий K/D поднимают индекс,
          поражения опускают. Нужны записи в истории.
        </p>
        {rankedStockRows.length === 0 ? (
          <p className="vt-muted">Добавьте рейтинговые матчи — здесь появится линия динамики.</p>
        ) : (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={rankedStockRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="n" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--vt-bg-elevated)',
                    border: '1px solid var(--vt-border)',
                    borderRadius: 8,
                  }}
                  formatter={(v: number) => [v.toFixed(1), 'Индекс']}
                  labelFormatter={(n) => `Матч #${n}`}
                />
                <Line
                  type="monotone"
                  dataKey="equity"
                  name="Рейтинговый индекс"
                  stroke="var(--vt-brand)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="vt-section vt-card">
        <h2 className="vt-card-title">История рейтинговых</h2>
        <div className="vt-row" style={{ marginBottom: '1rem' }}>
          <div>
            <label className="vt-label">С даты</label>
            <input className="vt-input" type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
          </div>
          <div>
            <label className="vt-label">По дату</label>
            <input className="vt-input" type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
          </div>
        </div>
        <div className="vt-table-wrap">
          <table className="vt-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Карта</th>
                <th>Счёт</th>
                <th>K / D / A</th>
                <th>K/D</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredHist.map((h) => {
                const kd = h.deaths === 0 ? (h.kills > 0 ? '∞' : '—') : (h.kills / h.deaths).toFixed(2)
                const oc = matchOutcome(h.scoreLeft, h.scoreRight)
                const scoreClass = scoreOutcomeClass(oc)
                const hasScore = h.scoreLeft != null && h.scoreRight != null
                return (
                  <tr key={h.id}>
                    <td>{h.dateKey}</td>
                    <td>{mapName(h.mapId)}</td>
                    <td className={scoreClass}>
                      <div className="vt-score-cell-inner">
                        {hasScore ? (
                          <>
                            {h.scoreLeft}
                            <span className="vt-score-sep">:</span>
                            {h.scoreRight}
                          </>
                        ) : (
                          <span style={{ fontWeight: 600, opacity: 0.75 }}>—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {h.kills} / {h.deaths} / {h.assists}
                    </td>
                    <td>{kd}</td>
                    <td>
                      <button
                        type="button"
                        className="vt-btn vt-btn--ghost"
                        onClick={() => h.id != null && void db.ranked.delete(h.id).then(reload)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filteredHist.length === 0 && <p className="vt-muted">Нет записей.</p>}
      </section>
    </div>
  )
}
