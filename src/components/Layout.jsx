import { NavLink, useNavigate } from 'react-router-dom'
import { CalendarDays, CalendarRange, ChartPie, CloudUpload, Moon, NotebookPen, Plus, Sun } from 'lucide-react'
import { t } from '../i18n'
import { syncNow, usePendingSaves } from '../lib/pwa'
import { saveSettings } from '../services/storage'

const NAV_ITEMS = [
  { to: '/log', label: 'navLog', Icon: NotebookPen },
  { to: '/monthly', label: 'navMonthly', Icon: CalendarDays },
  { to: '/dashboard', label: 'navDashboard', Icon: ChartPie },
  { to: '/year', label: 'navYear', Icon: CalendarRange },
]

function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center w-10 h-10 rounded-full text-text-primary hover:bg-hover active:scale-95 transition"
    >
      {children}
    </button>
  )
}

export default function Layout({ lang, theme, onLanguageChange, onThemeChange, children }) {
  const isRtl = lang === 'ar'
  const pendingSaves = usePendingSaves()
  const navigate = useNavigate()

  function toggleLanguage() {
    const next = lang === 'ar' ? 'en' : 'ar'
    saveSettings({ language: next }).then(() => onLanguageChange(next))
  }

  function toggleTheme() {
    onThemeChange(theme === 'dark' ? 'light' : 'dark')
  }

  // "+" opens quick add and focuses it (QuickAddCard watches ?quick).
  function openQuickAdd() {
    navigate(`/log?quick=${Date.now()}`)
  }

  const themeLabel = t(theme === 'dark' ? 'themeLight' : 'themeDark', lang)

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} lang={lang} className="min-h-screen bg-primary">
      <header className="sticky top-0 z-20 px-3 pt-3 pb-2 md:px-4 md:pt-5 md:pb-4">
        <div className="max-w-6xl mx-auto nav-pill ps-3 pe-2 py-2 md:ps-5 md:pe-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/mizan-icon.svg" alt="" className="w-8 h-8 rounded-[10px] shrink-0" />
            <span className="text-base md:text-lg font-semibold tracking-headline text-text-primary">
              {t('appTitle', lang)}
            </span>
            {pendingSaves > 0 && (
              <button
                type="button"
                onClick={syncNow}
                title={t('sendNow', lang)}
                className="badge-warning inline-flex items-center gap-1.5 py-1 hover:opacity-80"
              >
                <CloudUpload className="w-3.5 h-3.5" aria-hidden="true" />
                {t('pendingSaves', lang, { n: pendingSaves })}
                <span className="hidden sm:inline">· {t('sendNow', lang)}</span>
              </button>
            )}
          </div>

          {/* Desktop and tablet: links in the top bar */}
          <nav className="hidden md:flex items-center gap-1 bg-hover/60 rounded-full p-1">
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                    isActive ? 'bg-surface-elevated text-text-primary shadow-card' : 'text-text-muted hover:text-text-primary'
                  }`
                }
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {t(label, lang)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1 shrink-0">
            <IconButton label={themeLabel} onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </IconButton>
            <button
              type="button"
              onClick={toggleLanguage}
              className="h-10 min-w-10 px-3 rounded-full text-xs font-semibold text-text-primary hover:bg-hover active:scale-95 transition"
            >
              {t('langToggle', lang)}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 md:px-8 pb-28 md:pb-12">{children}</main>

      {/* Phone: bottom tab bar with a big "+" for quick add */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/90 backdrop-blur-xl border-t border-border pb-safe"
        aria-label={t('appTitle', lang)}
      >
        <div className="grid grid-cols-5 items-end h-16 max-w-md mx-auto">
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <TabLink key={item.to} {...item} lang={lang} />
          ))}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={openQuickAdd}
              aria-label={t('quickAdd', lang)}
              className="-translate-y-4 w-14 h-14 rounded-full bg-ink text-cream shadow-float flex items-center justify-center active:scale-95 transition"
            >
              <Plus className="w-7 h-7" strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>
          {NAV_ITEMS.slice(2).map((item) => (
            <TabLink key={item.to} {...item} lang={lang} />
          ))}
        </div>
      </nav>
    </div>
  )
}

function TabLink({ to, label, Icon, lang }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-medium transition-colors ${
          isActive ? 'text-text-primary' : 'text-text-muted'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`flex items-center justify-center w-12 h-7 rounded-full transition ${isActive ? 'bg-accent/15 text-accent' : ''}`}>
            <Icon className="w-5 h-5" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
          </span>
          {t(label, lang)}
        </>
      )}
    </NavLink>
  )
}
