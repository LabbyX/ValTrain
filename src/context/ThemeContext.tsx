import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'valtrain-theme'

const ThemeContext = createContext<{
  theme: Theme
  toggleTheme: () => void
} | null>(null)

function applyDom(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof localStorage === 'undefined') return 'dark'
    const s = localStorage.getItem(STORAGE_KEY) as Theme | null
    return s === 'light' || s === 'dark' ? s : 'dark'
  })

  useEffect(() => {
    applyDom(theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme outside ThemeProvider')
  return ctx
}
