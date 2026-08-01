import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { cashBalanceAllTime, homeCashSummary } from './cashBalance.js'

const txs = [
  {
    kind: 'cash_withdrawal',
    amount: 100,
    date: '2026-01-10',
    type: 'expense',
    paymentMethod: 'bank',
    currency: 'TND',
  },
  {
    kind: 'normal',
    type: 'expense',
    paymentMethod: 'cash',
    currency: 'TND',
    amount: 30,
    date: '2026-01-15',
  },
]

describe('cash balance offset', () => {
  it('defaults offset to 0', () => {
    assert.equal(cashBalanceAllTime(txs), 70)
  })

  it('adds offset to all-time balance', () => {
    assert.equal(cashBalanceAllTime(txs, undefined, 25), 95)
  })

  it('homeCashSummary applies offset only to balance', () => {
    const s = homeCashSummary(txs, '2026-01', 25)
    assert.equal(s.withdrawn, 100)
    assert.equal(s.spent, 30)
    assert.equal(s.balance, 95)
  })
})
