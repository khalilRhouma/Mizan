import { t } from '../i18n'
import KpiCard from './ui/KpiCard'

export default function MonthSummaryCards({ lang, totals }) {
  const net = Number(totals.netTND) || 0
  const income = Number(totals.incomeTND) || 0
  // A negative month is not an error: the money came from savings. Say it in words, no minus sign.
  const spentFromSavings = net < 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <KpiCard
        label={t('totalIncome', lang)}
        amount={income}
        accent="success"
        note={income === 0 ? t('noIncomeThisMonth', lang) : undefined}
      />
      <KpiCard label={t('totalExpenses', lang)} amount={totals.expenseTND} accent="danger" />
      <KpiCard
        label={t(spentFromSavings ? 'spentFromSavings' : 'netSavings', lang)}
        amount={Math.abs(net)}
        accent={spentFromSavings ? 'neutral' : 'accent'}
        note={spentFromSavings ? t('spentFromSavingsNote', lang) : undefined}
      />
    </div>
  )
}
