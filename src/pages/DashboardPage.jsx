import { useEffect, useMemo, useState } from 'react'
import CategoryDonutChart from '../components/charts/CategoryDonutChart'
import FundBalanceChart from '../components/charts/FundBalanceChart'
import IncomeExpenseChart from '../components/charts/IncomeExpenseChart'
import SavingsAreaChart from '../components/charts/SavingsAreaChart'
import Card from '../components/ui/Card'
import MonthHero from '../components/MonthHero'
import { t } from '../i18n'
import {
  fundCumulativeSeries,
  fundMonthlySeries,
  groupByCategory,
  monthlyTotals,
  savingsTimeSeries,
  trailingYearMonths,
} from '../lib/calc'
import { previousYearMonth } from '../lib/dates'
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

  const previousTotals = useMemo(
    () => monthlyTotals(transactions, previousYearMonth(kpiMonth)),
    [transactions, kpiMonth],
  )

  // Charts start at the first month that has data (no long row of empty bars).
  const chartMonths = useMemo(() => {
    const months = new Set(transactions.map((tx) => tx.date.slice(0, 7)))
    const first = periodMonths.findIndex((ym) => months.has(ym))
    if (first <= 0) return periodMonths
    return periodMonths.slice(Math.min(first, periodMonths.length - 3))
  }, [transactions, periodMonths])

  const barData = useMemo(
    () =>
      chartMonths.map((ym) => ({
        yearMonth: ym,
        ...monthlyTotals(transactions, ym),
      })),
    [transactions, chartMonths],
  )

  const savingsData = useMemo(
    () => savingsTimeSeries(transactions, chartMonths),
    [transactions, chartMonths],
  )

  const expenseByCategory = useMemo(
    () => groupByCategory(transactions, donutMonth, 'expense'),
    [transactions, donutMonth],
  )

  const fundMonthly = useMemo(
    () => fundMonthlySeries(monthlyFundsList, chartMonths, transactions, fundSplits),
    [monthlyFundsList, chartMonths, transactions, fundSplits],
  )

  const fundCumulative = useMemo(
    () => fundCumulativeSeries(monthlyFundsList, chartMonths, transactions, fundSplits),
    [monthlyFundsList, chartMonths, transactions, fundSplits],
  )

  if (loading) {
    return (
      <div className="page-stack" aria-busy="true">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-56 !rounded-card" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="skeleton h-80 !rounded-card lg:col-span-8" />
          <div className="skeleton h-80 !rounded-card lg:col-span-4" />
        </div>
      </div>
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

      <MonthHero lang={lang} yearMonth={kpiMonth} totals={kpiTotals} previousTotals={previousTotals} />

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
