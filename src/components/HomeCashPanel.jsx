import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n'
import Card from './ui/Card'
import { formatAmount } from '../lib/chartUtils'

export default function HomeCashPanel({ lang, summary, onBalanceCorrect }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)
  const ignoreBlurRef = useRef(false)
  const inFlightRef = useRef(false)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  function startEdit() {
    if (!onBalanceCorrect || saving) return
    setDraft(String(summary.balance))
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setDraft('')
  }

  async function confirmEdit() {
    if (!onBalanceCorrect || inFlightRef.current) return
    const n = Number(draft)
    if (!Number.isFinite(n)) {
      cancelEdit()
      return
    }
    inFlightRef.current = true
    setSaving(true)
    try {
      await onBalanceCorrect(n)
      setEditing(false)
      setDraft('')
    } catch {
      // Keep edit open; parent leaves offset unchanged on failure
    } finally {
      inFlightRef.current = false
      setSaving(false)
    }
  }

  return (
    <Card title={t('homeCash', lang)}>
      <p className="text-xs text-text-muted mb-4 -mt-2">{t('homeCashHint', lang)}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface rounded-card border border-border p-4">
          <p className="text-xs text-text-muted">{t('withdrawnThisMonth', lang)}</p>
          <p className="font-mono text-lg font-semibold text-warning mt-1">
            {formatAmount(summary.withdrawn)} د.ت
          </p>
        </div>
        <div className="bg-surface rounded-card border border-border p-4">
          <p className="text-xs text-text-muted">{t('spentFromCash', lang)}</p>
          <p className="font-mono text-lg font-semibold text-warning mt-1">
            {formatAmount(summary.spent)} د.ت
          </p>
        </div>
        <div className="bg-surface rounded-card border border-border p-4">
          <p className="text-xs text-text-muted">{t('currentBalance', lang)}</p>
          {editing ? (
            <div className="mt-1 flex items-baseline gap-1">
              <input
                ref={inputRef}
                type="number"
                step="any"
                disabled={saving}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => {
                  if (ignoreBlurRef.current) {
                    ignoreBlurRef.current = false
                    return
                  }
                  confirmEdit()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    confirmEdit()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    ignoreBlurRef.current = true
                    cancelEdit()
                  }
                }}
                className={`font-mono text-lg font-semibold bg-transparent border-b border-border outline-none w-full max-w-[10rem] ${
                  Number(draft) >= 0 || draft === '' || Number.isNaN(Number(draft))
                    ? 'text-success'
                    : 'text-danger'
                }`}
                aria-label={t('editBalance', lang)}
              />
              <span className="font-mono text-lg font-semibold text-text-muted">د.ت</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              title={t('editBalance', lang)}
              className={`font-mono text-lg font-semibold mt-1 cursor-pointer text-start ${
                summary.balance >= 0 ? 'text-success' : 'text-danger'
              }`}
            >
              {formatAmount(summary.balance)} د.ت
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}
