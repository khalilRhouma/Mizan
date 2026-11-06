import { NavLink } from 'react-router-dom'
import { t } from '../i18n'
import { syncNow, usePendingSaves } from '../lib/pwa'
import { saveSettings } from '../services/storage'

function ThemeIcon({ theme }) {
  if (theme === 'dark') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
        <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
  )
}

export default function Layout({ lang, theme, onLanguageChange, onThemeChange, children }) {
  const isRtl = lang === 'ar'
  const pendingSaves = usePendingSaves()

  function toggleLanguage() {
    const next = lang === 'ar' ? 'en' : 'ar'
    saveSettings({ language: next }).then(() => onLanguageChange(next))
  }

  function toggleTheme() {
    onThemeChange(theme === 'dark' ? 'light' : 'dark')
  }

  const navClass = ({ isActive }) =>
    `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} lang={lang} className="min-h-screen bg-primary">
      <header className="sticky top-0 z-20 pt-6 px-4 pb-4">
        <div className="max-w-6xl mx-auto nav-pill px-4 py-3 sm:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 shrink-0">
              <h1 className="text-base md:text-lg font-medium tracking-nav text-text-primary">
                {t('appTitle', lang)}
              </h1>
              {pendingSaves > 0 && (
                <button
                  type="button"
                  onClick={syncNow}
                  title={t('sendNow', lang)}
                  className="badge-warning border border-warning hover:opacity-80"
                >
                  ⏳ {t('pendingSaves', lang, { n: pendingSaves })} · {t('sendNow', lang)}
                </button>
              )}
            </div>
            <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
              <NavLink to="/log" className={navClass}>
                {t('navLog', lang)}
              </NavLink>
              <NavLink to="/monthly" className={navClass}>
                {t('navMonthly', lang)}
              </NavLink>
              <NavLink to="/dashboard" className={navClass}>
                {t('navDashboard', lang)}
              </NavLink>
              <NavLink to="/year" className={navClass}>
                {t('navYear', lang)}
              </NavLink>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={t(theme === 'dark' ? 'themeLight' : 'themeDark', lang)}
                title={t(theme === 'dark' ? 'themeLight' : 'themeDark', lang)}
                className="nav-link nav-link-inactive flex items-center justify-center w-9 h-9 p-0"
              >
                <ThemeIcon theme={theme} />
              </button>
              <button
                type="button"
                onClick={toggleLanguage}
                className="btn-secondary px-4 py-1.5 text-xs"
              >
                {t('langToggle', lang)}
              </button>
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pb-8 md:pb-12">{children}</main>
    </div>
  )
}
