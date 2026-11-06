import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { formatMonthLabel, MONTH_NAMES } from '../constants'
import { t } from '../i18n'
import { formatAmount } from '../lib/chartUtils'
import { previousYearMonth } from '../lib/dates'

// Percent change vs last month, or null when last month is 0 (no fair comparison).
function percentChange(current, previous) {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 100)
}

function DeltaChip({ change, goodWhenUp, monthName, lang }) {
  if (change === null || change === 0) return null
  const isGood = change > 0 === goodWhenUp
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${
        isGood ? 'bg-[#4fc48d]/15 text-[#7fdcae]' : 'bg-[#ff7b88]/15 text-[#ffa3ac]'
      }`}
    >
      <bdi dir="ltr">
        {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
      </bdi>
      {t('vsMonth', lang, { month: monthName })}
    </span>
  )
}

function Stat({ icon: Icon, label, amount, change, goodWhenUp, monthName, lang }) {
  return (
    <div className="rounded-2xl bg-white/[0.06] p-3 md:p-4 min-w-0">
      <div className="flex items-center gap-2 text-xs text-white/60">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10">
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
        {label}
      </div>
      <p className="mt-2 text-lg md:text-xl font-semibold tabular-nums whitespace-nowrap">
        <bdi dir="ltr">{formatAmount(amount)}</bdi> <span className="text-xs text-white/50">د.ت</span>
      </p>
      <div className="mt-1.5 min-h-[20px]">
        <DeltaChip change={change} goodWhenUp={goodWhenUp} monthName={monthName} lang={lang} />
      </div>
    </div>
  )
}

/**
 * Dashboard hero: the month's net in big numbers, then income and spending
 * with a change vs last month. Always dark (premium "card" look), in both themes.
 */
export default function MonthHero({ lang, yearMonth, totals, previousTotals }) {
  const net = Number(totals.netTND) || 0
  const spentFromSavings = net < 0
  const prevMonth = previousYearMonth(yearMonth)
  const prevName = MONTH_NAMES[lang === 'en' ? 'en' : 'ar'][Number(prevMonth.slice(5)) - 1]

  return (
    <section className="hero-card rounded-card p-5 md:p-8 text-[#f5f2ed] shadow-float">
      <p className="text-xs md:text-sm text-white/60">{formatMonthLabel(yearMonth, lang)}</p>
      <p className="mt-3 text-sm text-white/70">{t(spentFromSavings ? 'spentFromSavings' : 'netSavings', lang)}</p>
      <p className="mt-1 text-4xl md:text-5xl font-semibold tracking-headline tabular-nums whitespace-nowrap">
        <bdi dir="ltr">{formatAmount(Math.abs(net))}</bdi>{' '}
        <span className="text-lg md:text-xl font-medium text-white/50">د.ت</span>
      </p>
      {spentFromSavings && <p className="mt-1 text-xs text-white/50">{t('spentFromSavingsNote', lang)}</p>}

      <div className="grid grid-cols-2 gap-2 md:gap-3 mt-5 md:mt-6">
        <Stat
          icon={ArrowDownLeft}
          label={t('income', lang)}
          amount={totals.incomeTND}
          change={percentChange(totals.incomeTND, previousTotals.incomeTND)}
          goodWhenUp
          monthName={prevName}
          lang={lang}
        />
        <Stat
          icon={ArrowUpRight}
          label={t('expense', lang)}
          amount={totals.expenseTND}
          change={percentChange(totals.expenseTND, previousTotals.expenseTND)}
          goodWhenUp={false}
          monthName={prevName}
          lang={lang}
        />
      </div>
    </section>
  )
}
