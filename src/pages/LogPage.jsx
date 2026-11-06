import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import QuickAddCard from '../components/QuickAddCard'
import TransactionForm from '../components/TransactionForm'
import TransactionList from '../components/TransactionList'
import Card from '../components/ui/Card'
import { CATEGORIES } from '../constants'
import { t } from '../i18n'
import { localDateString } from '../lib/dates'
import { getTransactions } from '../services/storage'

const FORM_OPEN_KEY = 'mizan.detailedFormOpen'

function readFormOpen() {
  try {
    return localStorage.getItem(FORM_OPEN_KEY) === '1'
  } catch {
    return false
  }
}

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
  // The current month by default: the list stays short. 'All months' clears it.
  const [monthFilter, setMonthFilter] = useState(() => localDateString().slice(0, 7))
  // Quick add covers most entries, so the long form is folded by default.
  const [formOpen, setFormOpen] = useState(readFormOpen)
  const formRef = useRef(null)
  const [notesQuery, setNotesQuery] = useState('')

  // Keeps the current list visible while reloading (no flicker after a save).
  const refresh = useCallback(async () => {
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

  function toggleForm() {
    const next = !formOpen
    setFormOpen(next)
    try {
      localStorage.setItem(FORM_OPEN_KEY, next ? '1' : '0')
    } catch {
      // private mode: just do not remember
    }
  }

  function handleEdit(tx) {
    setEditingTransaction(tx)
    // Wait for the form to render, then bring it into view.
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
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
      <QuickAddCard lang={lang} onSaved={refresh} />
      <div ref={formRef} className="scroll-mt-24 space-y-3">
        {!editingTransaction && (
          <button
            type="button"
            onClick={toggleForm}
            aria-expanded={formOpen}
            className="w-full flex items-center justify-between gap-3 rounded-card border border-border bg-surface shadow-card px-5 py-4 text-start hover:bg-hover/50 transition"
          >
            <span className="flex items-center gap-3 text-sm md:text-base font-medium text-text-primary">
              <SlidersHorizontal className="w-[18px] h-[18px] text-text-muted" aria-hidden="true" />
              {t(formOpen ? 'hideDetailedEntry' : 'detailedEntry', lang)}
            </span>
            <ChevronDown
              className={`w-5 h-5 text-text-muted transition-transform ${formOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        )}
        {(formOpen || editingTransaction) && (
          <TransactionForm
            key={editingTransaction?.id ?? 'new'}
            lang={lang}
            editingTransaction={editingTransaction}
            onSaved={handleSaved}
            onCancelEdit={() => setEditingTransaction(null)}
          />
        )}
      </div>
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
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16" />
            ))}
          </div>
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
