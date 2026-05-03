import { NavLink, Outlet } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const nav = [
  { to: '/', label: 'Главная', end: true },
  { to: '/training', label: 'Тренировка' },
  { to: '/settings', label: 'Настройки' },
  { to: '/ranked', label: 'Рейтинговые' },
  { to: '/summary', label: 'Общий итог' },
]

export function Layout() {
  const { theme, toggleTheme } = useTheme()

  return (
    <>
      <div className="vt-bg-pattern" aria-hidden />
      <div className="vt-shell">
        <header className="vt-header">
          <div className="vt-brand">
            <span className="vt-brand-mark" />
            <div>
              <h1 className="vt-brand-title">ValTrain</h1>
              <p className="vt-brand-sub">Журнал тренировок Valorant</p>
            </div>
          </div>
          <nav className="vt-nav" aria-label="Разделы">
            {nav.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  'vt-nav-link' + (isActive ? ' vt-nav-link--active' : '')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            className="vt-theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            <span className="vt-theme-toggle-track">
              <span className="vt-theme-toggle-thumb" data-on={theme === 'light'} />
            </span>
            <span className="vt-theme-toggle-label">
              {theme === 'dark' ? 'Тёмная' : 'Светлая'}
            </span>
          </button>
        </header>
        <main className="vt-main vt-page-enter">
          <Outlet />
        </main>
      </div>
    </>
  )
}
