import { Link } from 'react-router-dom'

const cards = [
  {
    to: '/training',
    title: 'Тренировка',
    desc: '100 ботов, сложные боты, Deathmatch — отметки подходов и графики прогресса.',
  },
  {
    to: '/settings',
    title: 'Настройки мыши',
    desc: 'DPI и три параметра чувствительности Valorant со слайдерами.',
  },
  {
    to: '/ranked',
    title: 'Рейтинговые матчи',
    desc: 'Карты, K/D/A по играм и средний K/D.',
  },
  {
    to: '/summary',
    title: 'Общий итог',
    desc: 'Сводка по всем данным, даты, рекомендации и замечания.',
  },
]

export function Home() {
  return (
    <div className="vt-home">
      <header className="vt-home-intro">
        <p>
          Отмечайте подходы, сохраняйте рейтинговые игры и смотрите динамику по дням .
        </p>
      </header>

      <div className="vt-home-stack">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="vt-link-card vt-card vt-home-nav-card">
            <h2 className="vt-card-title">{c.title}</h2>
            <p className="vt-card-desc">{c.desc}</p>
            <span className="vt-btn vt-btn--ghost vt-home-nav-cta">Открыть →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
