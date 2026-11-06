import { useCallback, useEffect, useMemo, useState } from 'react'
import TransactionForm from '../components/TransactionForm'
import TransactionList from '../components/TransactionList'
import Card from '../components/ui/Card'
import { CATEGORIES } from '../constants'
import { t } from '../i18n'
import { getTransactions } from '../services/storage'

function normalizeSearchText(value) {
  return (value || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
}

function categorySearchText(category) {
  if (category === 'cash_withdrawal') return 'سحب نقد للصندوق cash withdrawal'
  const cat = CATEGORIES.find((c) => c.key === category)
  if (!cat) return category || ''
  return `${cat.ar} ${cat.en}`
}

function filterTransactions(transactions, monthFilter, notesQuery) {
  const tokens = normalizeSearchText(notesQuery).trim().split(/\s+/).filter(Boolean)
  return transactions.filter((tx) => {
    if (monthFilter && !tx.date.startsWith(monthFilter)) return false
    if (tokens.length === 0) return true
    const haystack = normalizeSearchText(`${categorySearchText(tx.category)} ${tx.notes || ''}`)
    return tokens.every((token) => haystack.includes(token))
  })
}

export default function LogPage({ lang }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [monthFilter, setMonthFilter] = useState('')
  const [notesQuery, setNotesQuery] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const txs = await getTransactions()
      setTransactions(txs)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  function handleSaved() {
    setEditingTransaction(null)
    refresh()
  }

  function handleEdit(tx) {
    setEditingTransaction(tx)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const visibleTransactions = useMemo(
    () => filterTransactions(transactions, monthFilter, notesQuery),
    [transactions, monthFilter, notesQuery],
  )

  function handleChanged(deletedId) {
    if (deletedId && editingTransaction?.id === deletedId) {
      setEditingTransaction(null)
    }
    refresh()
  }

  return (
    <div className="page-content-narrow page-stack">
      <TransactionForm
        lang={lang}
        editingTransaction={editingTransaction}
        onSaved={handleSaved}
        onCancelEdit={() => setEditingTransaction(null)}
      />
      <Card title={t('transactions', lang)}>
        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          <div>
            <label htmlFor="log-month" className="label-field">
              {t('month', lang)}
            </label>
            <div className="flex gap-2">
              <input
                id="log-month"
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="input-field"
              />
              {monthFilter && (
                <button
                  type="button"
                  onClick={() => setMonthFilter('')}
                  className="btn-secondary shrink-0"
                >
                  {t('allMonths', lang)}
                </button>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="log-notes" className="label-field">
              {t('searchNotes', lang)}
            </label>
            <input
              id="log-notes"
              type="search"
              value={notesQuery}
              onChange={(e) => setNotesQuery(e.target.value)}
              placeholder={t('searchNotesPlaceholder', lang)}
              className="input-field"
            />
          </div>
        </div>
        {loading ? (
          <p className="text-center text-text-muted py-8 text-sm">…</p>
        ) : visibleTransactions.length === 0 ? (
          <p className="text-center text-text-muted py-8 text-sm md:text-base">
            {transactions.length === 0 ? t('noTransactions', lang) : t('noMatchingTransactions', lang)}
          </p>
        ) : (
          <TransactionList
            lang={lang}
            transactions={visibleTransactions}
            editingId={editingTransaction?.id}
            onEdit={handleEdit}
            onChanged={handleChanged}
          />
        )}
      </Card>
    </div>
  )
}
