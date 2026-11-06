import { useEffect, useMemo, useState } from 'react'
import CategoryDonutChart from '../components/charts/CategoryDonutChart'
import FundBalanceChart from '../components/charts/FundBalanceChart'
import IncomeExpenseChart from '../components/charts/IncomeExpenseChart'
import SavingsAreaChart from '../components/charts/SavingsAreaChart'
import Card from '../components/ui/Card'
import KpiCard from '../components/ui/KpiCard'
import { t } from '../i18n'
import {
  fundCumulativeSeries,
  fundMonthlySeries,
  groupByCategory,
  monthlyTotals,
  savingsTimeSeries,
  trailingYearMonths,
} from '../lib/calc'
import { getMonthlyFundsList, getSettings, getTransactions } from '../services/storage'

function currentYearMonth() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

export default function DashboardPage({ lang }) {
  const [kpiMonth, setKpiMonth] = useState(currentYearMonth)
  const [donutMonth, setDonutMonth] = useState(currentYearMonth)
  const [rangeMonths, setRangeMonths] = useState(12)
  const [transactions, setTransactions] = useState([])
  const [monthlyFundsList, setMonthlyFundsList] = useState([])
  const [fundSplits, setFundSplits] = useState({
    commitments: 40,
    personal: 20,
    investment: 40,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getTransactions(), getMonthlyFundsList(), getSettings()])
      .then(([txs, funds, settings]) => {
        if (cancelled) return
        setTransactions(txs)
        setMonthlyFundsList(funds)
        setFundSplits({ ...settings.fundSplits })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const periodMonths = useMemo(() => trailingYearMonths(rangeMonths), [rangeMonths])

  const kpiTotals = useMemo(
    () => monthlyTotals(transactions, kpiMonth),
    [transactions, kpiMonth],
  )

  const barData = useMemo(
    () =>
      periodMonths.map((ym) => ({
        yearMonth: ym,
        ...monthlyTotals(transactions, ym),
      })),
    [transactions, periodMonths],
  )

  const savingsData = useMemo(
    () => savingsTimeSeries(transactions, periodMonths),
    [transactions, periodMonths],
  )

  const expenseByCategory = useMemo(
    () => groupByCategory(transactions, donutMonth, 'expense'),
    [transactions, donutMonth],
  )

  const fundMonthly = useMemo(
    () => fundMonthlySeries(monthlyFundsList, periodMonths, transactions, fundSplits),
    [monthlyFundsList, periodMonths, transactions, fundSplits],
  )

  const fundCumulative = useMemo(
    () => fundCumulativeSeries(monthlyFundsList, periodMonths, transactions, fundSplits),
    [monthlyFundsList, periodMonths, transactions, fundSplits],
  )

  if (loading) {
    return (
      <div className="text-center text-text-muted py-12 text-sm">…</div>
    )
  }

  return (
    <div className="page-stack">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="page-title">{t('dashboardTitle', lang)}</h1>
          <p className="page-subtitle">{t('dashboardSubtitle', lang)}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="kpi-month" className="label-field">{t('kpiMonth', lang)}</label>
            <input
              id="kpi-month"
              type="month"
              value={kpiMonth}
              onChange={(e) => setKpiMonth(e.target.value)}
              className="input-field w-auto"
            />
          </div>
          <div>
            <label htmlFor="range" className="label-field">{t('chartRange', lang)}</label>
            <select
              id="range"
              value={rangeMonths}
              onChange={(e) => setRangeMonths(Number(e.target.value))}
              className="input-field w-auto"
            >
              <option value={6}>{t('months6', lang)}</option>
              <option value={12}>{t('months12', lang)}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label={t('totalIncome', lang)} amount={kpiTotals.incomeTND} accent="success" />
        <KpiCard label={t('totalExpenses', lang)} amount={kpiTotals.expenseTND} accent="danger" />
        <KpiCard label={t('netSavings', lang)} amount={kpiTotals.netTND} accent="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-8" title={t('incomeVsExpense', lang)}>
          <IncomeExpenseChart lang={lang} data={barData} />
        </Card>
        <Card
          className="lg:col-span-4"
          title={t('expenseBreakdown', lang)}
          action={
            <input
              type="month"
              value={donutMonth}
              onChange={(e) => setDonutMonth(e.target.value)}
              className="input-field w-auto text-xs py-1"
            />
          }
        >
          <CategoryDonutChart lang={lang} categoryData={expenseByCategory} />
        </Card>
      </div>

      <Card title={t('savingsOverTime', lang)}>
        <SavingsAreaChart lang={lang} data={savingsData} />
      </Card>

      <Card title={t('fundBalanceOverTime', lang)}>
        <p className="text-xs text-text-muted mb-4">{t('fundChartHint', lang)}</p>
        <FundBalanceChart lang={lang} monthlyData={fundMonthly} cumulativeData={fundCumulative} />
      </Card>
    </div>
  )
}
