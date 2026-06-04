import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatMonthLabel } from '../constants'
import CardPaymentsPanel from '../components/CardPaymentsPanel'
import CategoryBreakdown from '../components/CategoryBreakdown'
import DebtLedgerPanel from '../components/DebtLedgerPanel'
import HomeCashPanel from '../components/HomeCashPanel'
import MonthSummaryCards from '../components/MonthSummaryCards'
import SavingsFundsForm from '../components/SavingsFundsForm'
import Card from '../components/ui/Card'
import { t } from '../i18n'
import {
  eurTotal,
  filterDebtsForMonth,
  getEurTransactions,
  groupByCategory,
  homeCashSummary,
  monthlyTotals,
  paymentMethodTotals,
  suggestFunds,
} from '../lib/calc'
import {
  getDebts,
  getMonthlyFunds,
  getSettings,
  getTransactions,
  saveMonthlyFunds,
  saveSettings,
} from '../services/storage'

function currentYearMonth() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

export default function MonthlyPage({ lang }) {
  const [yearMonth, setYearMonth] = useState(currentYearMonth)
  const [transactions, setTransactions] = useState([])
  const [debts, setDebts] = useState([])
  const [funds, setFunds] = useState({
    commitments: 0,
    personal: 0,
    investment: 0,
  })
  const [savedNotice, setSavedNotice] = useState(false)
  const [fundSplits, setFundSplits] = useState({
    commitments: 40,
    personal: 20,
    investment: 40,
  })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [txs, debtList, settings] = await Promise.all([
        getTransactions(),
        getDebts(),
        getSettings(),
      ])
      setTransactions(txs)
      setDebts(debtList)
      setFundSplits({ ...settings.fundSplits })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const totals = useMemo(
    () => monthlyTotals(transactions, yearMonth),
    [transactions, yearMonth],
  )
  const incomeByCategory = useMemo(
    () => groupByCategory(transactions, yearMonth, 'income'),
    [transactions, yearMonth],
  )
  const expenseByCategory = useMemo(
    () => groupByCategory(transactions, yearMonth, 'expense'),
    [transactions, yearMonth],
  )
  const expenseByPayment = useMemo(
    () => paymentMethodTotals(transactions, yearMonth, 'expense'),
    [transactions, yearMonth],
  )
  const cashSummary = useMemo(
    () => homeCashSummary(transactions, yearMonth),
    [transactions, yearMonth],
  )
  const eurTxns = useMemo(
    () => getEurTransactions(transactions, yearMonth),
    [transactions, yearMonth],
  )
  const eurSum = useMemo(
    () => eurTotal(transactions, yearMonth),
    [transactions, yearMonth],
  )
  const borrowedEntries = useMemo(
    () => filterDebtsForMonth(debts.filter((d) => d.type === 'borrowed'), yearMonth),
    [debts, yearMonth],
  )
  const lendingEntries = useMemo(
    () => filterDebtsForMonth(debts.filter((d) => d.type === 'lent'), yearMonth),
    [debts, yearMonth],
  )

  useEffect(() => {
    if (loading) return
    let cancelled = false
    getMonthlyFunds(yearMonth).then((saved) => {
      if (cancelled) return
      if (saved) {
        setFunds({
          commitments: saved.commitments,
          personal: saved.personal,
          investment: saved.investment,
        })
      } else {
        setFunds(suggestFunds(totals.netTND, fundSplits))
      }
    })
    return () => {
      cancelled = true
    }
  }, [yearMonth, totals.netTND, fundSplits, loading])

  function handleFundChange(field, value) {
    setFunds((prev) => ({ ...prev, [field]: value }))
    setSavedNotice(false)
  }

  function handleSplitChange(field, value) {
    setFundSplits((prev) => ({ ...prev, [field]: value }))
    setSavedNotice(false)
  }

  function handleApplySplits() {
    setFunds(suggestFunds(totals.netTND, fundSplits))
    setSavedNotice(false)
  }

  async function handleSaveFunds(e) {
    e.preventDefault()
    await saveMonthlyFunds({ yearMonth, ...funds })
    await saveSettings({ fundSplits })
    setSavedNotice(true)
  }

  if (loading) {
    return (
      <div className="page-content-narrow text-center text-text-muted py-12 text-sm">…</div>
    )
  }

  return (
    <div className="page-content-narrow page-stack">
      <div className="sticky top-24 z-10 bg-primary/95 backdrop-blur-sm py-2 -mx-4 px-4 border-b border-border">
        <Card>
          <label htmlFor="month" className="label-field">
            {t('month', lang)}
          </label>
          <input
            id="month"
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="input-field"
          />
          <p className="text-sm md:text-base text-text-muted mt-2">{formatMonthLabel(yearMonth, lang)}</p>
        </Card>
      </div>

      <MonthSummaryCards lang={lang} totals={totals} />

      <CategoryBreakdown
        lang={lang}
        incomeByCategory={incomeByCategory}
        expenseByCategory={expenseByCategory}
        bankExpenses={expenseByPayment.bank ?? 0}
        cashExpenses={expenseByPayment.cash ?? 0}
      />

      <HomeCashPanel lang={lang} summary={cashSummary} />

      <SavingsFundsForm
        lang={lang}
        funds={funds}
        fundSplits={fundSplits}
        onChange={handleFundChange}
        onSplitChange={handleSplitChange}
        onApplySplits={handleApplySplits}
        onSave={handleSaveFunds}
        savedNotice={savedNotice}
      />

      <DebtLedgerPanel lang={lang} type="borrowed" entries={borrowedEntries} onChanged={refresh} />

      <DebtLedgerPanel lang={lang} type="lent" entries={lendingEntries} onChanged={refresh} />

      <CardPaymentsPanel lang={lang} eurTxns={eurTxns} eurSum={eurSum} />
    </div>
  )
}
