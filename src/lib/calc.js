import { DEFAULT_FUND_SPLITS } from '../constants'
import { localDateString } from './dates.js'

function normalizeSplits(splits) {
  const s = {
    commitments: splits?.commitments ?? DEFAULT_FUND_SPLITS.commitments,
    personal: splits?.personal ?? DEFAULT_FUND_SPLITS.personal,
    investment: splits?.investment ?? DEFAULT_FUND_SPLITS.investment,
  }
  const total = s.commitments + s.personal + s.investment
  if (total <= 0) {
    return { ...DEFAULT_FUND_SPLITS }
  }
  return s
}

export function suggestFunds(netTND, splits) {
  const s = normalizeSplits(splits)
  const total = s.commitments + s.personal + s.investment
  return {
    commitments: netTND * (s.commitments / total),
    personal: netTND * (s.personal / total),
    investment: netTND * (s.investment / total),
  }
}

function isInMonth(date, yearMonth) {
  return date.startsWith(yearMonth)
}

function isNormalTransaction(tx) {
  return tx.kind !== 'cash_withdrawal'
}

function filterMonthTND(transactions, yearMonth) {
  return transactions.filter(
    (tx) => tx.currency === 'TND' && isInMonth(tx.date, yearMonth) && isNormalTransaction(tx),
  )
}

export function monthlyTotals(transactions, yearMonth) {
  const monthTx = filterMonthTND(transactions, yearMonth)
  const incomeTND = monthTx
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const expenseTND = monthTx
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0)
  return {
    incomeTND,
    expenseTND,
    netTND: incomeTND - expenseTND,
  }
}

export function paymentMethodTotals(transactions, yearMonth, type) {
  const monthTx = filterMonthTND(transactions, yearMonth).filter((tx) => tx.type === type)
  return monthTx.reduce(
    (acc, tx) => {
      const method = tx.paymentMethod ?? 'bank'
      acc[method] = (acc[method] ?? 0) + tx.amount
      return acc
    },
    { cash: 0, bank: 0, card: 0 },
  )
}

export function groupByCategory(transactions, yearMonth, type) {
  const monthTx = filterMonthTND(transactions, yearMonth).filter(
    (tx) => tx.type === type,
  )
  return monthTx.reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] ?? 0) + tx.amount
    return acc
  }, {})
}

export function getOutstandingEurTransactions(transactions) {
  return transactions.filter(
    (tx) =>
      tx.currency === 'EUR' &&
      isNormalTransaction(tx) &&
      tx.type === 'expense' &&
      !tx.cardSettled,
  )
}

export function outstandingEurTotal(transactions) {
  return getOutstandingEurTransactions(transactions).reduce(
    (sum, tx) => sum + tx.amount,
    0,
  )
}

export {
  cashBalanceAllTime,
  getWithdrawals,
  homeCashSummary,
} from './cashBalance.js'

export function filterDebtsForMonth(debts, yearMonth) {
  return debts.filter((debt) => {
    // Open debts are always visible — they are ongoing obligations
    if (debt.status === 'open') return true
    const createdInMonth = debt.date.startsWith(yearMonth)
    const deadlineInMonth = debt.deadline && debt.deadline.startsWith(yearMonth)
    return createdInMonth || deadlineInMonth
  })
}

export function isOverdue(debt) {
  if (debt.status !== 'open' || !debt.deadline) return false
  const today = localDateString()
  return debt.deadline < today
}

export function yearMonths(year) {
  return Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, '0')
    return `${year}-${month}`
  })
}

export function trailingYearMonths(count = 12) {
  const result = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    result.push(`${d.getFullYear()}-${month}`)
  }
  return result
}

export function yearlyTotalsSeries(transactions, year) {
  return yearMonths(year).map((yearMonth) => ({
    yearMonth,
    ...monthlyTotals(transactions, yearMonth),
  }))
}

export function yearlyCategoryMatrix(transactions, year, type) {
  const months = yearMonths(year)
  const monthData = months.map((yearMonth) => groupByCategory(transactions, yearMonth, type))
  const keys = new Set(monthData.flatMap((m) => Object.keys(m)))
  const matrix = {}
  for (const key of keys) {
    matrix[key] = {}
    for (const ym of months) {
      matrix[key][ym] = groupByCategory(transactions, ym, type)[key] ?? 0
    }
  }
  return matrix
}

export function savingsTimeSeries(transactions, yearMonthsList) {
  return yearMonthsList.map((yearMonth) => ({
    yearMonth,
    netTND: monthlyTotals(transactions, yearMonth).netTND,
  }))
}

function getFundsForMonth(monthlyFundsList, yearMonth, transactions, fundSplits) {
  const saved = monthlyFundsList.find((f) => f.yearMonth === yearMonth)
  if (saved) {
    return {
      commitments: saved.commitments ?? 0,
      personal: saved.personal ?? 0,
      investment: saved.investment ?? 0,
    }
  }
  const net = monthlyTotals(transactions, yearMonth).netTND
  return suggestFunds(net, fundSplits)
}

export function fundMonthlySeries(monthlyFundsList, yearMonthsList, transactions, fundSplits) {
  return yearMonthsList.map((yearMonth) => ({
    yearMonth,
    ...getFundsForMonth(monthlyFundsList, yearMonth, transactions, fundSplits),
  }))
}

export function fundCumulativeSeries(monthlyFundsList, yearMonthsList, transactions, fundSplits) {
  let commitments = 0
  let personal = 0
  let investment = 0
  return yearMonthsList.map((yearMonth) => {
    const funds = getFundsForMonth(monthlyFundsList, yearMonth, transactions, fundSplits)
    commitments += funds.commitments
    personal += funds.personal
    investment += funds.investment
    return { yearMonth, commitments, personal, investment }
  })
}
