import { useCallback, useEffect, useMemo, useState } from 'react'
import CardPaymentsPanel from '../components/CardPaymentsPanel'
import CategoryBreakdown from '../components/CategoryBreakdown'
import DebtLedgerPanel from '../components/DebtLedgerPanel'
import HomeCashPanel from '../components/HomeCashPanel'
import MonthHero from '../components/MonthHero'
import MonthSwitcher from '../components/MonthSwitcher'
import SavingsFundsForm from '../components/SavingsFundsForm'
import { t } from '../i18n'
import {
  filterDebtsForMonth,
  getOutstandingEurTransactions,
  groupByCategory,
  cashBalanceAllTime,
  homeCashSummary,
  monthlyTotals,
  outstandingEurTotal,
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
  settleCardPayments,
} from '../services/storage'
import { previousYearMonth } from '../lib/dates'

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
  const [cashBalanceOffset, setCashBalanceOffset] = useState(0)
  const [settlingCard, setSettlingCard] = useState(false)
  const [loading, setLoading] = useState(true)

  // Keeps the current data visible while reloading (no flicker after a save).
  const refresh = useCallback(async () => {
    try {
      const [txs, debtList, settings] = await Promise.all([
        getTransactions(),
        getDebts(),
        getSettings(),
      ])
      setTransactions(txs)
      setDebts(debtList)
      setFundSplits({ ...settings.fundSplits })
      setCashBalanceOffset(settings.cashBalanceOffset ?? 0)
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
  const previousTotals = useMemo(
    () => monthlyTotals(transactions, previousYearMonth(yearMonth)),
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
    () => homeCashSummary(transactions, yearMonth, cashBalanceOffset),
    [transactions, yearMonth, cashBalanceOffset],
  )
  const eurTxns = useMemo(
    () => getOutstandingEurTransactions(transactions),
    [transactions],
  )
  const eurSum = useMemo(
    () => outstandingEurTotal(transactions),
    [transactions],
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

  async function handleSettleCard() {
    if (eurTxns.length === 0 || settlingCard) return
    if (!window.confirm(t('resetCardConfirm', lang))) return
    setSettlingCard(true)
    try {
      await settleCardPayments()
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.currency === 'EUR' && tx.type === 'expense' && tx.kind !== 'cash_withdrawal' && !tx.cardSettled
            ? { ...tx, cardSettled: true }
            : tx,
        ),
      )
    } finally {
      setSettlingCard(false)
    }
  }

  async function handleBalanceCorrect(targetAmount) {
    const raw = cashBalanceAllTime(transactions)
    const nextOffset = targetAmount - raw
    await saveSettings({ cashBalanceOffset: nextOffset })
    setCashBalanceOffset(nextOffset)
  }

  if (loading) {
    return (
      <div className="page-content-narrow text-center text-text-muted py-12 text-sm">…</div>
    )
  }

  return (
    <div className="page-content-narrow page-stack">
      <div className="sticky top-[76px] md:top-[92px] z-10 flex justify-center">
        <MonthSwitcher lang={lang} value={yearMonth} onChange={setYearMonth} />
      </div>

      <MonthHero lang={lang} yearMonth={yearMonth} totals={totals} previousTotals={previousTotals} />

      <CategoryBreakdown
        lang={lang}
        incomeByCategory={incomeByCategory}
        expenseByCategory={expenseByCategory}
        bankExpenses={expenseByPayment.bank ?? 0}
        cashExpenses={expenseByPayment.cash ?? 0}
      />

      <HomeCashPanel lang={lang} summary={cashSummary} onBalanceCorrect={handleBalanceCorrect} />

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

      <CardPaymentsPanel
        lang={lang}
        eurTxns={eurTxns}
        eurSum={eurSum}
        onSettle={handleSettleCard}
        settling={settlingCard}
      />
    </div>
  )
}
