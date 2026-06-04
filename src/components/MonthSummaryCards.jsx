import { t } from '../i18n'
import KpiCard from './ui/KpiCard'

export default function MonthSummaryCards({ lang, totals }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <KpiCard label={t('totalIncome', lang)} amount={totals.incomeTND} accent="success" />
      <KpiCard label={t('totalExpenses', lang)} amount={totals.expenseTND} accent="danger" />
      <KpiCard label={t('netSavings', lang)} amount={totals.netTND} accent="accent" />
    </div>
  )
}
