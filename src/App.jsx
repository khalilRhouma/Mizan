import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ThemeContext } from './context/ThemeContext'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import LogPage from './pages/LogPage'
import MonthlyPage from './pages/MonthlyPage'
import YearPage from './pages/YearPage'
import { getSettings, saveSettings } from './services/storage'

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export default function App() {
  const [lang, setLang] = useState('ar')
  const [theme, setTheme] = useState('light')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    getSettings().then((s) => {
      if (cancelled) return
      setLang(s.language)
      setTheme(s.theme ?? 'light')
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function handleThemeChange(next) {
    saveSettings({ theme: next }).then(() => setTheme(next))
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center text-text-muted text-sm">
        …
      </div>
    )
  }

  const pageProps = { lang }

  return (
    <ThemeContext.Provider value={theme}>
      <Layout
        lang={lang}
        theme={theme}
        onLanguageChange={setLang}
        onThemeChange={handleThemeChange}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/log" replace />} />
          <Route path="/log" element={<LogPage {...pageProps} />} />
          <Route path="/monthly" element={<MonthlyPage {...pageProps} />} />
          <Route path="/dashboard" element={<DashboardPage {...pageProps} />} />
          <Route path="/year" element={<YearPage {...pageProps} />} />
        </Routes>
      </Layout>
    </ThemeContext.Provider>
  )
}
