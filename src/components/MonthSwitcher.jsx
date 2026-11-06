import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthLabel } from '../constants'
import { t } from '../i18n'
import { previousYearMonth } from '../lib/dates'

function nextYearMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Compact month picker: previous / month name / next. Tapping the name opens
 * the native month picker. In RTL the arrows point the reading way.
 */
export default function MonthSwitcher({ lang, value, onChange }) {
  const isRtl = lang === 'ar'
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft
  const NextIcon = isRtl ? ChevronLeft : ChevronRight
  const arrow =
    'w-10 h-10 inline-flex items-center justify-center rounded-full text-text-primary hover:bg-hover active:scale-95 transition'

  return (
    <div className="inline-flex items-center gap-1 nav-pill p-1">
      <button type="button" onClick={() => onChange(previousYearMonth(value))} aria-label={t('previousMonth', lang)} className={arrow}>
        <PrevIcon className="w-5 h-5" />
      </button>
      <label className="relative px-3 py-2 rounded-full hover:bg-hover cursor-pointer text-sm md:text-base font-semibold text-text-primary min-w-[9rem] text-center">
        {formatMonthLabel(value, lang)}
        <input
          type="month"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-label={t('month', lang)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>
      <button type="button" onClick={() => onChange(nextYearMonth(value))} aria-label={t('nextMonth', lang)} className={arrow}>
        <NextIcon className="w-5 h-5" />
      </button>
    </div>
  )
}
