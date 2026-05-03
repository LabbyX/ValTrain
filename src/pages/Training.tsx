import { useCallback, useEffect, useMemo, useState } from 'react'
import { VALORANT_WEAPONS } from '../data/valorant'
import {
  db,
  dateKeyFromTs,
  type Difficulty,
  type TrainingEntry,
} from '../db/database'
import { TrainingCharts, trainingInsights } from '../components/TrainingCharts'

export function Training() {
  const [entries, setEntries] = useState<TrainingEntry[]>([])
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const reload = useCallback(async () => {
    const all = await db.training.orderBy('createdAt').reverse().toArray()
    setEntries(all)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterFrom && e.dateKey < filterFrom) return false
      if (filterTo && e.dateKey > filterTo) return false
      return true
    })
  }, [entries, filterFrom, filterTo])

  const insights = useMemo(() => trainingInsights(filtered), [filtered])

  /* ——— 100 ботов ——— */
  const [bApproach, setBApproach] = useState(5)
  const [bCompleted, setBCompleted] = useState<boolean[]>(() => Array(5).fill(false))

  useEffect(() => {
    setBCompleted((prev) => {
      const next = Array.from({ length: bApproach }, (_, i) => prev[i] ?? false)
      return next
    })
  }, [bApproach])

  const setCompletedSafe = (index: number, value: boolean) => {
    setBCompleted((prev) => {
      const next = [...prev]
      if (value) {
        if (index > 0 && !next[index - 1]) return prev
        next[index] = true
        return next
      }
      next[index] = false
      for (let j = index + 1; j < next.length; j++) next[j] = false
      return next
    })
  }

  const saveBots100 = async () => {
    const ts = Date.now()
    await db.training.add({
      createdAt: ts,
      dateKey: dateKeyFromTs(ts),
      subtype: 'bots100',
      bots100: {
        approachCount: bApproach,
        completed: [...bCompleted],
      },
    })
    void reload()
  }

  /* ——— Сложные боты ——— */
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [hardCount, setHardCount] = useState(3)
  const [hardKills, setHardKills] = useState<number[]>(() => [20, 22, 18])

  useEffect(() => {
    setHardKills((prev) =>
      Array.from({ length: hardCount }, (_, i) =>
        Math.min(30, Math.max(0, prev[i] ?? 20)),
      ),
    )
  }, [hardCount])

  const saveHardBots = async () => {
    const ts = Date.now()
    await db.training.add({
      createdAt: ts,
      dateKey: dateKeyFromTs(ts),
      subtype: 'hardBots',
      hardBots: {
        difficulty,
        approaches: hardKills.map((killsOutOf30) => ({ killsOutOf30 })),
      },
    })
    void reload()
  }

  /* ——— Deathmatch ——— */
  const [dmRows, setDmRows] = useState<{ kills: number; deaths: number; weapon: string }[]>([
    { kills: 25, deaths: 18, weapon: 'Vandal' },
  ])

  const saveDm = async () => {
    const ts = Date.now()
    await db.training.add({
      createdAt: ts,
      dateKey: dateKeyFromTs(ts),
      subtype: 'deathmatch',
      deathmatch: { rounds: dmRows.map((r) => ({ ...r })) },
    })
    void reload()
  }

  const diffLabel =
    difficulty === 'low' ? 'Низкая' : difficulty === 'medium' ? 'Средняя' : 'Высокая'

  return (
    <div>
      <section className="vt-section vt-card" style={{ marginBottom: '1.25rem' }}>
        <h2 className="vt-card-title">Фильтр по датам</h2>
        <p className="vt-card-desc">
          Задайте интервал для таблицы и графиков ниже. Пустые поля — без ограничения.
        </p>
        <div className="vt-row">
          <div>
            <label className="vt-label" htmlFor="tf-from">
              С даты
            </label>
            <input
              id="tf-from"
              className="vt-input"
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="vt-label" htmlFor="tf-to">
              По дату
            </label>
            <input
              id="tf-to"
              className="vt-input"
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
            />
          </div>
          <button type="button" className="vt-btn vt-btn--ghost" onClick={() => { setFilterFrom(''); setFilterTo('') }}>
            Сбросить
          </button>
        </div>
      </section>

      {/* 1 */}
      <section className="vt-section vt-card">
        <h2 className="vt-card-title">1. Уничтожить 100 ботов</h2>
        <p className="vt-card-desc">
          Выберите число подходов. У каждого номера — ромб; отметьте круг, когда подход выполнен.
          Следующий подход недоступен, пока не закрыт предыдущий.
        </p>
        <div className="vt-row" style={{ marginBottom: '1rem' }}>
          <div>
            <label className="vt-label" htmlFor="b-ap">
              Подходов
            </label>
            <input
              id="b-ap"
              className="vt-input"
              type="number"
              min={1}
              max={24}
              value={bApproach}
              onChange={(e) => setBApproach(Math.min(24, Math.max(1, Number(e.target.value) || 1)))}
            />
          </div>
          <button type="button" className="vt-btn" onClick={() => void saveBots100()}>
            Сохранить сессию
          </button>
        </div>
        <div className="vt-bots-grid">
          {bCompleted.map((done, i) => {
            const locked = i > 0 && !bCompleted[i - 1]
            return (
              <div key={i} className="vt-approach-slot">
                <div
                  className={
                    'vt-approach-num' +
                    (done ? ' vt-approach-num--done' : '') +
                    (locked && !done ? ' vt-approach-num--locked' : '')
                  }
                  title={locked ? 'Сначала завершите предыдущий подход' : ''}
                >
                  {i + 1}
                </div>
                <button
                  type="button"
                  className={'vt-circle-btn' + (done ? ' vt-circle-btn--done' : '')}
                  disabled={locked && !done}
                  aria-label={`Подход ${i + 1} ${done ? 'выполнен' : 'не выполнен'}`}
                  onClick={() => setCompletedSafe(i, !done)}
                  title={done ? 'Снять отметку (сбросятся следующие)' : 'Отметить выполненным'}
                />
              </div>
            )
          })}
        </div>
      </section>

      {/* 2 */}
      <section className="vt-section vt-card">
        <h2 className="vt-card-title">2. Сложные боты</h2>
        <p className="vt-card-desc">
          Сложность и число подходов; в каждом укажите, сколько целей убито из 30.
        </p>
        <div className="vt-row" style={{ marginBottom: '1rem' }}>
          <div>
            <label className="vt-label" htmlFor="hd">
              Сложность
            </label>
            <select
              id="hd"
              className="vt-select"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              <option value="low">Низкая</option>
              <option value="medium">Средняя</option>
              <option value="high">Высокая</option>
            </select>
          </div>
          <div>
            <label className="vt-label" htmlFor="hc">
              Подходов
            </label>
            <input
              id="hc"
              className="vt-input"
              type="number"
              min={1}
              max={20}
              value={hardCount}
              onChange={(e) => setHardCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
            />
          </div>
          <button type="button" className="vt-btn" onClick={() => void saveHardBots()}>
            Сохранить
          </button>
        </div>
        <div className="vt-table-wrap">
          <table className="vt-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Убийств из 30</th>
              </tr>
            </thead>
            <tbody>
              {hardKills.map((k, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    <input
                      className="vt-input"
                      style={{ maxWidth: 120 }}
                      type="number"
                      min={0}
                      max={30}
                      value={k}
                      onChange={(e) => {
                        const v = Math.min(30, Math.max(0, Number(e.target.value) || 0))
                        setHardKills((prev) => prev.map((x, j) => (j === i ? v : x)))
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="vt-muted" style={{ marginTop: '0.75rem' }}>
          Текущая сложность в записи:{' '}
          <span
            className={
              'vt-tag ' +
              (difficulty === 'low' ? 'vt-tag--low' : difficulty === 'medium' ? 'vt-tag--mid' : 'vt-tag--high')
            }
          >
            {diffLabel}
          </span>
        </p>
      </section>

      {/* 3 */}
      <section className="vt-section vt-card">
        <h2 className="vt-card-title">3. Deathmatch</h2>
        <p className="vt-card-desc">
          Несколько сыгранных DM за раз: убийства из 40, смерти, оружие (список как в Valorant).
        </p>
        <div style={{ marginBottom: '0.75rem' }}>
          <button
            type="button"
            className="vt-btn vt-btn--ghost"
            onClick={() => setDmRows((r) => [...r, { kills: 20, deaths: 20, weapon: 'Phantom' }])}
          >
            + Раунд DM
          </button>
        </div>
        <div className="vt-table-wrap">
          <table className="vt-table">
            <thead>
              <tr>
                <th>K / 40</th>
                <th>Смерти</th>
                <th>Оружие</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {dmRows.map((row, i) => (
                <tr key={i}>
                  <td>
                    <input
                      className="vt-input"
                      style={{ maxWidth: 90 }}
                      type="number"
                      min={0}
                      max={40}
                      value={row.kills}
                      onChange={(e) => {
                        const v = Math.min(40, Math.max(0, Number(e.target.value) || 0))
                        setDmRows((prev) => prev.map((x, j) => (j === i ? { ...x, kills: v } : x)))
                      }}
                    />
                  </td>
                  <td>
                    <input
                      className="vt-input"
                      style={{ maxWidth: 90 }}
                      type="number"
                      min={0}
                      value={row.deaths}
                      onChange={(e) => {
                        const v = Math.max(0, Number(e.target.value) || 0)
                        setDmRows((prev) => prev.map((x, j) => (j === i ? { ...x, deaths: v } : x)))
                      }}
                    />
                  </td>
                  <td>
                    <select
                      className="vt-select"
                      style={{ maxWidth: 200 }}
                      value={row.weapon}
                      onChange={(e) =>
                        setDmRows((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, weapon: e.target.value } : x)),
                        )
                      }
                    >
                      {VALORANT_WEAPONS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="vt-btn vt-btn--ghost"
                      disabled={dmRows.length <= 1}
                      onClick={() => setDmRows((prev) => prev.filter((_, j) => j !== i))}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="vt-btn" style={{ marginTop: '0.75rem' }} onClick={() => void saveDm()}>
          Сохранить DM-сессии
        </button>
      </section>

      {/* Insights */}
      <section className="vt-section vt-card">
        <h2 className="vt-card-title">Наблюдения по отфильтрованным данным</h2>
        <p className="vt-card-desc">
          Сравнение последней даты с предыдущей в выборке (если есть минимум две разные даты).
        </p>
        {insights.pos.length === 0 && insights.neg.length === 0 ? (
          <p className="vt-muted">Недостаточно точек для сравнения — добавьте записи за разные дни.</p>
        ) : (
          <>
            {insights.pos.length > 0 && (
              <ul className="vt-insight-list">
                {insights.pos.map((t, i) => (
                  <li key={`p-${i}`} className="vt-pill-pos">
                    {t}
                  </li>
                ))}
              </ul>
            )}
            {insights.neg.length > 0 && (
              <ul className="vt-insight-list" style={{ marginTop: '0.75rem' }}>
                {insights.neg.map((t, i) => (
                  <li key={`n-${i}`} className="vt-pill-neg">
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* Charts */}
      <section className="vt-section">
        <h2>Графики прогресса</h2>
        <TrainingCharts entries={filtered} />
      </section>

      {/* History */}
      <section className="vt-section vt-card">
        <h2 className="vt-card-title">Журнал записей</h2>
        <div className="vt-table-wrap">
          <table className="vt-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тип</th>
                <th>Кратко</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>{e.dateKey}</td>
                  <td>
                    {e.subtype === 'bots100' && '100 ботов'}
                    {e.subtype === 'hardBots' && 'Сложные боты'}
                    {e.subtype === 'deathmatch' && 'Deathmatch'}
                  </td>
                  <td className="vt-muted">{summarize(e)}</td>
                  <td>
                    <button
                      type="button"
                      className="vt-btn vt-btn--ghost"
                      onClick={() => {
                        if (e.id != null) void db.training.delete(e.id).then(reload)
                      }}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="vt-muted">Нет записей в этом диапазоне.</p>}
      </section>
    </div>
  )
}

function summarize(e: TrainingEntry): string {
  if (e.subtype === 'bots100' && e.bots100) {
    const d = e.bots100.completed.filter(Boolean).length
    return `${d} / ${e.bots100.approachCount} подходов`
  }
  if (e.subtype === 'hardBots' && e.hardBots) {
    const avg =
      e.hardBots.approaches.reduce((s, x) => s + x.killsOutOf30, 0) /
      Math.max(1, e.hardBots.approaches.length)
    return `${e.hardBots.difficulty}, ср. ${avg.toFixed(1)} / 30`
  }
  if (e.subtype === 'deathmatch' && e.deathmatch) {
    let k = 0,
      d = 0
    for (const r of e.deathmatch.rounds) {
      k += r.kills
      d += r.deaths
    }
    const kd = d === 0 ? k : (k / d).toFixed(2)
    return `${e.deathmatch.rounds.length} игр, K/D ~ ${kd}`
  }
  return '—'
}
