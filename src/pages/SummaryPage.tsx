import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  db,
  getOrCreateSettings,
  type MouseSettings,
  type RankedMatchRow,
  type TrainingEntry,
} from '../db/database'
import { RANKED_MAPS } from '../data/valorant'
import { TrainingCharts, trainingInsights } from '../components/TrainingCharts'
import { matchOutcome } from '../utils/matchScore'

function inRange(dateKey: string, from: string, to: string) {
  if (from && dateKey < from) return false
  if (to && dateKey > to) return false
  return true
}

export function SummaryPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [training, setTraining] = useState<TrainingEntry[]>([])
  const [ranked, setRanked] = useState<RankedMatchRow[]>([])
  const [settings, setSettings] = useState<MouseSettings | null>(null)

  const load = useCallback(async () => {
    const [tr, rk, st] = await Promise.all([
      db.training.toArray(),
      db.ranked.toArray(),
      getOrCreateSettings(),
    ])
    setTraining(tr)
    setRanked(rk)
    setSettings(st)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const trF = useMemo(
    () => training.filter((e) => inRange(e.dateKey, from, to)),
    [training, from, to],
  )
  const rkF = useMemo(
    () => ranked.filter((h) => inRange(h.dateKey, from, to)),
    [ranked, from, to],
  )

  const insights = useMemo(() => trainingInsights(trF), [trF])

  const rankedAgg = useMemo(() => {
    let k = 0,
      d = 0,
      a = 0
    const byMap = new Map<string, { k: number; d: number; n: number }>()
    for (const r of rkF) {
      k += r.kills
      d += r.deaths
      a += r.assists
      const cur = byMap.get(r.mapId) ?? { k: 0, d: 0, n: 0 }
      cur.k += r.kills
      cur.d += r.deaths
      cur.n += 1
      byMap.set(r.mapId, cur)
    }
    const kd = d === 0 ? (k > 0 ? Number.POSITIVE_INFINITY : null) : k / d
    let wins = 0,
      losses = 0,
      draws = 0
    for (const r of rkF) {
      const o = matchOutcome(r.scoreLeft, r.scoreRight)
      if (o === 'win') wins++
      else if (o === 'loss') losses++
      else if (o === 'draw') draws++
    }
    const mapsWorst = [...byMap.entries()]
      .filter(([, v]) => v.d > 0)
      .map(([id, v]) => ({
        id,
        kd: v.k / v.d,
        n: v.n,
        name: RANKED_MAPS.find((m) => m.id === id)?.name ?? id,
      }))
      .sort((x, y) => x.kd - y.kd)
    return { k, d, a, kd, mapsWorst, wins, losses, draws }
  }, [rkF])

  const dmAgg = useMemo(() => {
    const dm = trF.filter((e) => e.subtype === 'deathmatch')
    let kk = 0,
      dd = 0
    for (const e of dm) {
      for (const r of e.deathmatch?.rounds ?? []) {
        kk += r.kills
        dd += r.deaths
      }
    }
    return {
      sessions: dm.length,
      kd: dd === 0 ? (kk > 0 ? Number.POSITIVE_INFINITY : null) : kk / dd,
    }
  }, [trF])

  const hardAgg = useMemo(() => {
    const rows = trF.filter((e) => e.subtype === 'hardBots')
    let sum = 0,
      cnt = 0
    for (const e of rows) {
      for (const ap of e.hardBots?.approaches ?? []) {
        sum += ap.killsOutOf30
        cnt += 1
      }
    }
    return { avg: cnt ? sum / cnt : null, sessions: rows.length }
  }, [trF])

  const botsAgg = useMemo(() => {
    const rows = trF.filter((e) => e.subtype === 'bots100')
    let done = 0,
      total = 0
    for (const e of rows) {
      const b = e.bots100
      if (!b) continue
      total += b.approachCount
      done += b.completed.filter(Boolean).length
    }
    return {
      sessions: rows.length,
      pct: total ? (done / total) * 100 : null,
    }
  }, [trF])

  const recommendations = useMemo(() => {
    const rec: string[] = []
    if (rankedAgg.kd != null && rankedAgg.kd !== Number.POSITIVE_INFINITY && rankedAgg.kd < 0.95) {
      rec.push(
        'Рейтинговый K/D ниже 1 — имеет смысл усилить aim-тренировки (DM и боты) перед каткой.',
      )
    }
    if (dmAgg.kd != null && dmAgg.kd !== Number.POSITIVE_INFINITY && dmAgg.kd < 1) {
      rec.push('В Deathmatch K/D ниже 1 — попробуйте сменить оружие разминки или сократить агрессию первые минуты.')
    }
    if (hardAgg.avg != null && hardAgg.avg < 18) {
      rec.push('Средний результат по сложным ботам ниже ~18/30 — добавьте подходов на средней сложности перед высокой.')
    }
    if (botsAgg.pct != null && botsAgg.pct < 70) {
      rec.push('Меньше 70% завершённых подходов «100 ботов» — разбейте цель на меньшее число подходов за раз.')
    }
    if (rankedAgg.mapsWorst.length && rankedAgg.mapsWorst[0].kd < 0.9 && rankedAgg.mapsWorst[0].n >= 2) {
      const m = rankedAgg.mapsWorst[0]
      rec.push(`На карте «${m.name}» K/D слабее остальных (${m.kd.toFixed(2)}) — разберите реплеи или посты лайнапы.`)
    }
    if (settings && settings.sensitivityAim > 0.9) {
      rec.push('Высокая чувствительность прицела — проверьте микрокоррекции на трекинге; иногда снижение даёт стабильнее голова.')
    }
    if (rec.length === 0) {
      rec.push('Показатели в норме для выбранного периода — поддерживайте регулярность и отмечайте слабые карты вручную.')
    }
    return rec
  }, [rankedAgg, dmAgg, hardAgg, botsAgg, settings])

  const kdFmt = (v: number | null) =>
    v == null ? '—' : v === Number.POSITIVE_INFINITY ? '∞' : v.toFixed(2)

  return (
    <div>
      <section className="vt-section vt-card">
        <h2 className="vt-card-title">Период отчёта</h2>
        <p className="vt-card-desc">
          Фильтрует тренировки, рейтинговые игры и блоки ниже. Пустые поля — весь архив.
        </p>
        <div className="vt-row">
          <div>
            <label className="vt-label">С даты</label>
            <input className="vt-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="vt-label">По дату</label>
            <input className="vt-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button type="button" className="vt-btn vt-btn--ghost" onClick={() => { setFrom(''); setTo('') }}>
            Весь период
          </button>
        </div>
      </section>

      <section className="vt-section vt-card">
        <h2 className="vt-card-title">Сводка</h2>
        <div className="vt-grid-cards">
          <div style={{ padding: '0.5rem 0' }}>
            <span className="vt-label">Тренировки (записей)</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--vt-font-display)' }}>
              {trF.length}
            </div>
            <p className="vt-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
              DM-сессий: {dmAgg.sessions}, сложные боты: {hardAgg.sessions}, 100 ботов: {botsAgg.sessions}
            </p>
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            <span className="vt-label">Deathmatch K/D (период)</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--vt-font-display)' }}>
              {kdFmt(dmAgg.kd)}
            </div>
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            <span className="vt-label">Сложные боты, среднее / 30</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--vt-font-display)' }}>
              {hardAgg.avg != null ? hardAgg.avg.toFixed(1) : '—'}
            </div>
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            <span className="vt-label">100 ботов — доля завершённых</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--vt-font-display)' }}>
              {botsAgg.pct != null ? `${botsAgg.pct.toFixed(0)}%` : '—'}
            </div>
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            <span className="vt-label">Рейтинговые игры</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--vt-font-display)' }}>
              {rkF.length}
            </div>
            <p className="vt-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
              K/D: {kdFmt(rankedAgg.kd)} · Помощи: {rankedAgg.a}
              {(rankedAgg.wins > 0 || rankedAgg.losses > 0 || rankedAgg.draws > 0) && (
                <>
                  <br />
                  По счёту:{' '}
                  <span style={{ color: 'var(--vt-success)' }}>В {rankedAgg.wins}</span>
                  {' · '}
                  <span style={{ color: 'var(--vt-accent)' }}>П {rankedAgg.losses}</span>
                  {' · '}
                  <span style={{ color: 'var(--vt-warning)' }}>Н {rankedAgg.draws}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      {settings && (
        <section className="vt-section vt-card">
          <h2 className="vt-card-title">Настройки (снимок)</h2>
          <ul className="vt-insight-list" style={{ color: 'var(--vt-text)' }}>
            <li>DPI: {settings.dpi}</li>
            <li>Чувствительность прицела: {settings.sensitivityAim.toFixed(2)}</li>
            <li>В прицеле (scoped): {settings.scopedSensitivityMultiplier.toFixed(2)}×</li>
            <li>ADS: {settings.adsSensitivityMultiplier.toFixed(2)}×</li>
            <li>eDPI ≈ {(settings.dpi * settings.sensitivityAim).toFixed(0)}</li>
          </ul>
        </section>
      )}

      <section className="vt-section vt-card">
        <h2 className="vt-card-title">Улучшения и зоны внимания</h2>
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
          <ul className="vt-insight-list" style={{ marginTop: '0.6rem' }}>
            {insights.neg.map((t, i) => (
              <li key={`n-${i}`} className="vt-pill-neg">
                {t}
              </li>
            ))}
          </ul>
        )}
        {insights.pos.length === 0 && insights.neg.length === 0 && (
          <p className="vt-muted">Мало данных для сравнения дней в выбранном периоде.</p>
        )}
      </section>

      <section className="vt-section vt-card">
        <h2 className="vt-card-title">Рекомендации</h2>
        <ul className="vt-insight-list" style={{ color: 'var(--vt-text)' }}>
          {recommendations.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </section>

      {rankedAgg.mapsWorst.length > 0 && (
        <section className="vt-section vt-card">
          <h2 className="vt-card-title">Карты по K/D (в периоде)</h2>
          <p className="vt-card-desc">От худшего к лучшему, только где были смерти.</p>
          <div className="vt-table-wrap">
            <table className="vt-table">
              <thead>
                <tr>
                  <th>Карта</th>
                  <th>Игр</th>
                  <th>K/D</th>
                </tr>
              </thead>
              <tbody>
                {rankedAgg.mapsWorst.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>{m.n}</td>
                    <td>{m.kd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="vt-section">
        <h2>Графики тренировок за период</h2>
        <TrainingCharts entries={trF} />
      </section>
    </div>
  )
}
