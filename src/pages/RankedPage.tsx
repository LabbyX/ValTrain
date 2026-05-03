import { useCallback, useEffect, useMemo, useState } from 'react'
import { RANKED_MAPS } from '../data/valorant'
import { db, dateKeyFromTs, type RankedMatchRow } from '../db/database'

type Draft = { mapId: string; kills: number; deaths: number; assists: number }

export function RankedPage() {
  const [selectedMap, setSelectedMap] = useState<string>(RANKED_MAPS[0].id)
  const [drafts, setDrafts] = useState<Draft[]>([
    { mapId: RANKED_MAPS[0].id, kills: 18, deaths: 15, assists: 4 },
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
    setDrafts((d) => [...d, { mapId: selectedMap, kills: 0, deaths: 0, assists: 0 }])

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
      await db.ranked.add({
        createdAt: ts,
        dateKey: dk,
        mapId: r.mapId,
        kills: r.kills,
        deaths: r.deaths,
        assists: r.assists,
      })
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
          Добавляйте строки с убийствами, смертями и помощью. Средний K/D по текущему списку
          пересчитывается сразу.
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
                <th>K / D / A</th>
                <th>K/D</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredHist.map((h) => {
                const kd = h.deaths === 0 ? (h.kills > 0 ? '∞' : '—') : (h.kills / h.deaths).toFixed(2)
                return (
                  <tr key={h.id}>
                    <td>{h.dateKey}</td>
                    <td>{mapName(h.mapId)}</td>
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
