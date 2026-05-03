import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Training } from './pages/Training'
import { SettingsPage } from './pages/SettingsPage'
import { RankedPage } from './pages/RankedPage'
import { SummaryPage } from './pages/SummaryPage'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="training" element={<Training />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="ranked" element={<RankedPage />} />
            <Route path="summary" element={<SummaryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
