import { useState } from 'react'
import { getCategoriesByType, getCategoryLabel } from '../constants'
import { t } from '../i18n'
import { localDateString } from '../lib/dates'
import { learnCategoryRules, parseQuickAdd, saveTransaction } from '../services/storage'
import LearnedWordsPanel from './LearnedWordsPanel'
import Card from './ui/Card'

/**
 * Quick add: type "gas 60" or paste a whole phone note, check the drafts,
 * then save them all. Saved drafts teach the app "word -> category".
 */

function draftStatus(d) {
  if (!d.amount || Number(d.amount) <= 0) return 'noAmount'
  if (!d.category) return 'needsCategory'
  return 'ready'
}

function toEditable(draft) {
  return {
    ...draft,
    uid: crypto.randomUUID(),
    amount: draft.amount == null ? '' : String(draft.amount),
    suggestedCategory: draft.category,
  }
}

function toTransaction(d) {
  const isCard = d.paymentMethod === 'card'
  return {
    id: crypto.randomUUID(),
    date: d.date,
    type: d.type,
    kind: 'normal',
    amount: Number(d.amount),
    // Same rule as the main form: card payments are in EUR.
    currency: isCard ? 'EUR' : 'TND',
    paymentMethod: d.paymentMethod,
    category: d.category,
    notes: d.notes.trim(),
    recurring: false,
    createdAt: Date.now(),
  }
}

export default function QuickAddCard({ lang, onSaved }) {
  const [text, setText] = useState('')
  const [drafts, setDrafts] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null) // { kind: 'success' | 'error', text }
  const [showWords, setShowWords] = useState(false)

  async function handleRead() {
    if (!text.trim() || busy) return
    setBusy(true)
    setMessage(null)
    try {
      const parsed = await parseQuickAdd(text, localDateString())
      setDrafts(parsed.map(toEditable))
    } catch {
      setMessage({ kind: 'error', text: t('quickAddReadError', lang) })
    } finally {
      setBusy(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleRead()
    }
  }

  function updateDraft(uid, changes) {
    setDrafts((prev) => prev.map((d) => (d.uid === uid ? { ...d, ...changes } : d)))
  }

  function removeDraft(uid) {
    setDrafts((prev) => prev.filter((d) => d.uid !== uid))
  }

  function clearAll() {
    setDrafts([])
    setText('')
    setMessage(null)
  }

  const ready = drafts.filter((d) => draftStatus(d) === 'ready')
  const missingCategory = drafts.filter((d) => draftStatus(d) === 'needsCategory').length
  const withoutAmount = drafts.filter((d) => draftStatus(d) === 'noAmount').length

  async function handleSaveAll() {
    if (ready.length === 0 || busy) return
    setBusy(true)
    setMessage(null)
    const savedUids = new Set()
    const learnItems = []
    for (const d of ready) {
      try {
        await saveTransaction(toTransaction(d))
        savedUids.add(d.uid)
        if (d.keywords.length > 0) learnItems.push({ keywords: d.keywords, category: d.category })
      } catch {
        /* keep the draft in the list so the user can fix it */
      }
    }
    try {
      await learnCategoryRules(learnItems)
    } catch {
      /* learning is a bonus: never block saving */
    }
    const remaining = drafts.filter((d) => !savedUids.has(d.uid))
    setDrafts(remaining)
    if (remaining.length === 0) setText('')
    setMessage(
      savedUids.size === ready.length
        ? { kind: 'success', text: t('quickAddSaved', lang, { n: savedUids.size }) }
        : { kind: 'error', text: t('quickAddSaveError', lang) },
    )
    setBusy(false)
    if (savedUids.size > 0) onSaved?.()
  }

  return (
    <Card
      title={t('quickAdd', lang)}
      action={
        <button type="button" className="btn-accent-ghost" onClick={() => setShowWords((v) => !v)}>
          {t('learnedWords', lang)}
        </button>
      }
    >
      <p className="text-sm text-text-muted mb-3">{t('quickAddHint', lang)}</p>

      <div className="flex flex-col sm:flex-row gap-2">
        <textarea
          dir="auto"
          rows={Math.min(Math.max(text.split('\n').length, 2), 8)}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('quickAddPlaceholder', lang)}
          aria-label={t('quickAdd', lang)}
          className="input-field !rounded-2xl resize-y flex-1 leading-relaxed"
        />
        <button type="button" onClick={handleRead} disabled={busy || !text.trim()} className="btn-primary sm:self-start disabled:opacity-50">
          {t('quickAddRead', lang)}
        </button>
      </div>
      <p className="hidden sm:block text-xs text-text-muted mt-1">{t('quickAddShortcut', lang)}</p>

      {message && (
        <p role="status" className={`mt-3 text-sm ${message.kind === 'success' ? 'text-success' : 'text-danger'}`}>
          {message.text}
        </p>
      )}

      {drafts.length > 0 && (
        <div className="mt-4 space-y-3">
          {drafts.map((d) => (
            <DraftRow key={d.uid} lang={lang} draft={d} onChange={(c) => updateDraft(d.uid, c)} onRemove={() => removeDraft(d.uid)} />
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-sm text-text-muted">
              {t('quickAddSummary', lang, { ready: ready.length, missing: missingCategory, errors: withoutAmount })}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={clearAll} className="btn-secondary">
                {t('quickAddClear', lang)}
              </button>
              <button type="button" onClick={handleSaveAll} disabled={busy || ready.length === 0} className="btn-primary disabled:opacity-50">
                {t('quickAddSaveN', lang, { n: ready.length })}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWords && <LearnedWordsPanel lang={lang} />}
    </Card>
  )
}

function DraftRow({ lang, draft, onChange, onRemove }) {
  const status = draftStatus(draft)
  const categories = getCategoriesByType(draft.type)
  const border =
    status === 'noAmount' ? 'border-danger' : status === 'needsCategory' ? 'border-warning' : 'border-border'

  function changeType(type) {
    const keep = getCategoriesByType(type).some((c) => c.key === draft.category)
    onChange({ type, category: keep ? draft.category : null, paymentMethod: type === 'income' ? 'bank' : draft.paymentMethod })
  }

  return (
    <div className={`rounded-2xl border-[1.5px] ${border} bg-surface-elevated p-3`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs text-text-muted break-all" dir="auto">
          {draft.raw}
        </p>
        <button type="button" onClick={onRemove} className="btn-danger-ghost shrink-0" aria-label={t('quickAddRemove', lang)}>
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-12 gap-2">
        <input
          type="date"
          value={draft.date}
          max={localDateString()}
          onChange={(e) => onChange({ date: e.target.value })}
          aria-label={t('date', lang)}
          className="input-field md:col-span-3"
        />
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.001"
          value={draft.amount}
          onChange={(e) => onChange({ amount: e.target.value })}
          aria-label={t('amount', lang)}
          className={`input-field font-mono md:col-span-2 ${status === 'noAmount' ? 'ring-1 ring-danger' : ''}`}
        />
        <select
          value={draft.type}
          onChange={(e) => changeType(e.target.value)}
          aria-label={t('type', lang)}
          className="input-field md:col-span-2"
        >
          <option value="expense">{t('expense', lang)}</option>
          <option value="income">{t('income', lang)}</option>
        </select>
        <select
          value={draft.paymentMethod}
          onChange={(e) => onChange({ paymentMethod: e.target.value })}
          aria-label={t('paymentMethod', lang)}
          className="input-field md:col-span-2"
        >
          <option value="cash">{t('payCash', lang)}</option>
          <option value="bank">{t('payBank', lang)}</option>
          <option value="card">{t('payCard', lang)}</option>
        </select>
        <select
          value={draft.category ?? ''}
          onChange={(e) => onChange({ category: e.target.value || null })}
          aria-label={t('category', lang)}
          className={`input-field col-span-2 md:col-span-3 ${status === 'needsCategory' ? 'ring-1 ring-warning' : ''}`}
        >
          <option value="">{t('quickAddChooseCategory', lang)}</option>
          {categories.map((c) => (
            <option key={c.key} value={c.key}>
              {lang === 'en' ? c.en : c.ar}
            </option>
          ))}
        </select>
        <input
          type="text"
          dir="auto"
          value={draft.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          aria-label={t('notes', lang)}
          className="input-field col-span-2 md:col-span-12"
        />
      </div>

      {status !== 'ready' && (
        <p className={`text-xs mt-2 ${status === 'noAmount' ? 'text-danger' : 'text-warning'}`}>
          {status === 'noAmount' ? t('quickAddNoAmount', lang) : t('quickAddNeedsCategory', lang)}
        </p>
      )}
      {status === 'ready' && draft.categorySource === 'fuzzy' && draft.category === draft.suggestedCategory && (
        <p className="text-xs mt-2 text-text-muted">
          {t('quickAddFuzzy', lang)}: {getCategoryLabel(draft.category, lang)}
        </p>
      )}
    </div>
  )
}
