function isInMonth(date, yearMonth) {
  return date.startsWith(yearMonth)
}

function isNormalTransaction(tx) {
  return tx.kind !== 'cash_withdrawal'
}

export function getWithdrawals(transactions, yearMonth) {
  return transactions.filter(
    (tx) => tx.kind === 'cash_withdrawal' && isInMonth(tx.date, yearMonth),
  )
}

export function cashBalanceAllTime(transactions, beforeMonth, offset = 0) {
  let withdrawals = 0
  let spent = 0

  for (const tx of transactions) {
    if (beforeMonth && tx.date.slice(0, 7) >= beforeMonth) continue

    if (tx.kind === 'cash_withdrawal') {
      withdrawals += tx.amount
    } else if (
      tx.type === 'expense' &&
      tx.paymentMethod === 'cash' &&
      tx.currency === 'TND' &&
      isNormalTransaction(tx)
    ) {
      spent += tx.amount
    }
  }

  return withdrawals - spent + (offset || 0)
}

export function homeCashSummary(transactions, yearMonth, offset = 0) {
  const withdrawn = getWithdrawals(transactions, yearMonth).reduce(
    (sum, tx) => sum + tx.amount,
    0,
  )
  const spent = transactions
    .filter(
      (tx) =>
        isInMonth(tx.date, yearMonth) &&
        tx.type === 'expense' &&
        tx.paymentMethod === 'cash' &&
        tx.currency === 'TND' &&
        isNormalTransaction(tx),
    )
    .reduce((sum, tx) => sum + tx.amount, 0)
  const balance = cashBalanceAllTime(transactions, undefined, offset)

  return { withdrawn, spent, balance }
}
