import { useEffect, useState } from 'react'
import { db, getOrCreateSettings, type MouseSettings } from '../db/database'

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div className="vt-slider-row">
      <div className="vt-slider-head">
        <label className="vt-label" style={{ marginBottom: 0 }}>
          {label}
        </label>
        <span className="vt-slider-value">{format(value)}</span>
      </div>
      <input
        className="vt-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export function SettingsPage() {
  const [s, setS] = useState<MouseSettings | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    void getOrCreateSettings().then(setS)
  }, [])

  const persist = async (next: MouseSettings) => {
    setS(next)
    await db.settings.put({ ...next, id: 1 })
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1200)
  }

  if (!s) return <p className="vt-muted">Загрузка…</p>

  const eDPI = (s.dpi * s.sensitivityAim).toFixed(0)

  return (
    <div className="vt-card vt-page-enter">
      <h2 className="vt-card-title">Настройки мыши и прицела</h2>
      <p className="vt-card-desc">
        Ползунки сохраняются в локальной базе. Подписи соответствуют пунктам Valorant на русском.
      </p>

      <Slider
        label="DPI мыши"
        min={400}
        max={3200}
        step={50}
        value={s.dpi}
        format={(v) => `${v} DPI`}
        onChange={(dpi) => void persist({ ...s, dpi })}
      />

      <Slider
        label="Чувствительность прицела (Sensitivity · Aim)"
        min={0.1}
        max={2}
        step={0.01}
        value={s.sensitivityAim}
        format={(v) => v.toFixed(2)}
        onChange={(sensitivityAim) => void persist({ ...s, sensitivityAim })}
      />

      <Slider
        label="Множитель чувствительности в прицеле (Scoped Sensitivity Multiplier)"
        min={0.5}
        max={2}
        step={0.05}
        value={s.scopedSensitivityMultiplier}
        format={(v) => `${v.toFixed(2)}×`}
        onChange={(scopedSensitivityMultiplier) => void persist({ ...s, scopedSensitivityMultiplier })}
      />

      <Slider
        label="Множитель ADS (ADS Sensitivity Multiplier)"
        min={0.5}
        max={2}
        step={0.05}
        value={s.adsSensitivityMultiplier}
        format={(v) => `${v.toFixed(2)}×`}
        onChange={(adsSensitivityMultiplier) => void persist({ ...s, adsSensitivityMultiplier })}
      />

      <div
        style={{
          marginTop: '1rem',
          padding: '0.85rem 1rem',
          borderRadius: 10,
          background: 'var(--vt-bg-elevated)',
          border: '1px solid var(--vt-border)',
        }}
      >
        <span className="vt-label" style={{ marginBottom: '0.25rem' }}>
          Ориентир eDPI (DPI × чувствительность прицела)
        </span>
        <div style={{ fontFamily: 'var(--vt-font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
          {eDPI}
        </div>
        <p className="vt-muted" style={{ margin: '0.45rem 0 0', fontSize: '0.82rem' }}>
          Удобно сравнивать с про-настройками; сам по себе комфорт важнее числа.
        </p>
      </div>

      {savedFlash && (
        <p className="vt-muted" style={{ marginTop: '0.75rem', color: 'var(--vt-success)' }}>
          Сохранено
        </p>
      )}
    </div>
  )
}
