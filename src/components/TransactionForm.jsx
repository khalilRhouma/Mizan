import { useState } from 'react'
import { toast } from 'sonner'
import { getCategoriesByType } from '../constants'
import { t } from '../i18n'
import { saveTransaction } from '../services/storage'
import { localDateString } from '../lib/dates'
import { getLastCategory, rememberCategory } from '../lib/lastCategory'
import { isQueued } from '../lib/pwa'

function modeFromTransaction(tx) {
  if (tx?.kind === 'cash_withdrawal') return 'withdrawal'
  if (tx?.type === 'income') return 'income'
  return 'expense'
}

export default function TransactionForm({ lang, editingTransaction, onSaved, onCancelEdit }) {
  const isEditing = Boolean(editingTransaction)

  // Initial values come from the transaction being edited (if any).
  // LogPage gives this component a `key`, so starting or stopping an edit
  // mounts a fresh form instead of syncing state in an effect.
  const tx = editingTransaction
  const [mode, setMode] = useState(tx ? modeFromTransaction(tx) : 'expense')
  const [type, setType] = useState(tx?.type ?? 'expense')
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '')
  const [paymentMethod, setPaymentMethod] = useState(tx?.paymentMethod ?? 'bank')
  const [category, setCategory] = useState(tx?.category ?? getLastCategory('expense'))
  const [date, setDate] = useState(tx?.date ?? localDateString())
  const [notes, setNotes] = useState(tx?.notes ?? '')
  const [recurring, setRecurring] = useState(tx?.recurring ?? false)

  const categories = getCategoriesByType(type)

  function handleModeChange(nextMode) {
    if (isEditing) return
    setMode(nextMode)
    if (nextMode === 'income') {
      setType('income')
      setPaymentMethod('bank')
      setCategory(getLastCategory('income'))
    } else if (nextMode === 'expense') {
      setType('expense')
      setPaymentMethod('bank')
      setCategory(getLastCategory('expense'))
    }
  }

  function handlePaymentMethodChange(method) {
    setPaymentMethod(method)
  }

  function resetForm() {
    setMode('expense')
    setType('expense')
    setAmount('')
    setPaymentMethod('bank')
    setCategory(getLastCategory('expense'))
    setDate(localDateString())
    setNotes('')
    setRecurring(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) return

    const id = editingTransaction?.id ?? crypto.randomUUID()
    const createdAt = editingTransaction?.createdAt ?? Date.now()

    try {
      let result
      if (mode === 'withdrawal') {
        result = await saveTransaction({
          id,
          date,
          type: 'expense',
          kind: 'cash_withdrawal',
          amount: parsedAmount,
          currency: 'TND',
          paymentMethod: 'bank',
          category: 'cash_withdrawal',
          notes: notes.trim(),
          recurring: false,
          createdAt,
        })
      } else {
        result = await saveTransaction({
          id,
          date,
          type,
          kind: 'normal',
          amount: parsedAmount,
          currency: paymentMethod === 'card' ? 'EUR' : 'TND',
          paymentMethod,
          category,
          notes: notes.trim(),
          recurring,
          createdAt,
        })
        rememberCategory(type, category)
      }
      if (isQueued(result)) toast.info(t('savedOffline', lang))
      else toast.success(isEditing ? t('updated', lang) : t('saved', lang))
      resetForm()
      onSaved()
    } catch {
      // The form stays filled so nothing is lost; the API rejected it (422) or is down.
      toast.error(t('saveFailed', lang))
    }
  }

  function handleCancel() {
    resetForm()
    onCancelEdit?.()
  }

  const modeBtn = (key) =>
    `btn-segment ${
      mode === key
        ? 'bg-ink text-cream border-ink'
        : 'bg-surface-elevated text-text-muted border-border hover:bg-hover hover:text-text-primary'
    } ${isEditing ? 'opacity-60 cursor-not-allowed' : ''}`

  const payBtn = (key) =>
    `btn-segment ${
      paymentMethod === key
        ? key === 'card'
          ? 'bg-ink text-cream border-ink'
          : key === 'cash'
            ? 'bg-warning text-cream border-warning'
            : 'bg-ink text-cream border-ink'
        : 'bg-surface-elevated text-text-muted border-border hover:bg-hover hover:text-text-primary'
    }`

  return (
    <form
      onSubmit={handleSubmit}
      className={`card space-y-4 ${
        isEditing ? 'border-accent ring-1 ring-accent/30' : ''
      }`}
    >
      {isEditing && (
        <p className="text-sm font-medium text-accent">{t('editingEntry', lang)}</p>
      )}

      <div className="flex gap-2">
        <button type="button" disabled={isEditing} onClick={() => handleModeChange('expense')} className={modeBtn('expense')}>
          {t('expense', lang)}
        </button>
        <button type="button" disabled={isEditing} onClick={() => handleModeChange('income')} className={modeBtn('income')}>
          {t('income', lang)}
        </button>
        <button type="button" disabled={isEditing} onClick={() => handleModeChange('withdrawal')} className={modeBtn('withdrawal')}>
          {t('cashWithdrawal', lang)}
        </button>
      </div>

      <div>
        <label htmlFor="amount" className="label-field">
          {t('amount', lang)}
        </label>
        <input
          id="amount"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.001"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input-field font-mono"
        />
      </div>

      {mode === 'expense' && (
        <>
          <div>
            <span className="label-field">{t('paymentMethod', lang)}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => handlePaymentMethodChange('cash')} className={payBtn('cash')}>
                {t('payCash', lang)}
              </button>
              <button type="button" onClick={() => handlePaymentMethodChange('bank')} className={payBtn('bank')}>
                {t('payBank', lang)}
              </button>
              <button type="button" onClick={() => handlePaymentMethodChange('card')} className={payBtn('card')}>
                {t('payCard', lang)}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="category" className="label-field">
              {t('category', lang)}
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field"
            >
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {lang === 'en' ? c.en : c.ar}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {mode === 'income' && (
        <div>
          <label htmlFor="category-income" className="label-field">
            {t('category', lang)}
          </label>
          <select
            id="category-income"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field"
          >
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {lang === 'en' ? c.en : c.ar}
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === 'withdrawal' && (
        <p className="text-sm text-warning bg-warning/10 border border-warning/20 rounded-btn px-4 py-2">
          {t('homeCashHint', lang)}
        </p>
      )}

      <div>
        <label htmlFor="date" className="label-field">
          {t('date', lang)}
        </label>
        <input
          id="date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="notes" className="label-field">
          {t('notes', lang)}
        </label>
        <input
          id="notes"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input-field"
        />
      </div>

      {mode !== 'withdrawal' && (
        <label className="flex items-center gap-2 text-sm md:text-base text-text-muted">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="rounded border-border bg-surface-elevated text-ink focus:ring-border"
          />
          {t('recurring', lang)}
        </label>
      )}

      <div className="flex gap-2">
        <button type="submit" className="flex-1 btn-primary">
          {isEditing ? t('save', lang) : t('add', lang)}
        </button>
        {isEditing && (
          <button type="button" onClick={handleCancel} className="flex-1 btn-secondary">
            {t('cancel', lang)}
          </button>
        )}
      </div>
    </form>
  )
}
