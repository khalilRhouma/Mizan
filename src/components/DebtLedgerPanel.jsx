import { useState } from 'react'
import { getCurrencySymbol } from '../constants'
import { t } from '../i18n'
import { isOverdue } from '../lib/calc'
import { deleteDebt, getDebts, saveDebt } from '../services/storage'
import Card from './ui/Card'
import { formatAmount } from '../lib/chartUtils'

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm() {
  return {
    label: '',
    amount: '',
    date: todayString(),
    deadline: '',
    notes: '',
  }
}

export default function DebtLedgerPanel({ lang, type, entries, onChanged }) {
  const title = type === 'borrowed' ? t('debts', lang) : t('lending', lang)
  const emptyMsg = type === 'borrowed' ? t('noDebts', lang) : t('noLending', lang)

  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function startEdit(entry) {
    setEditingId(entry.id)
    setForm({
      label: entry.label,
      amount: String(entry.amount),
      date: entry.date,
      deadline: entry.deadline ?? '',
      notes: entry.notes ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const parsedAmount = parseFloat(form.amount)
    if (!parsedAmount || parsedAmount <= 0 || !form.label.trim()) return

    const debts = await getDebts()
    const existing = editingId ? debts.find((item) => item.id === editingId) : null

    await saveDebt({
      id: editingId ?? crypto.randomUUID(),
      type,
      label: form.label.trim(),
      amount: parsedAmount,
      currency: existing?.currency ?? 'TND',
      date: form.date,
      deadline: form.deadline,
      notes: form.notes.trim(),
      status: existing?.status ?? 'open',
      createdAt: existing?.createdAt ?? Date.now(),
    })

    cancelEdit()
    onChanged()
  }

  async function handleDelete(id) {
    await deleteDebt(id)
    if (editingId === id) cancelEdit()
    onChanged()
  }

  async function toggleStatus(entry) {
    await saveDebt({
      ...entry,
      status: entry.status === 'open' ? 'closed' : 'open',
    })
    onChanged()
  }

  return (
    <Card title={title}>
      {entries.length === 0 ? (
        <p className="text-sm text-text-muted mb-4">{emptyMsg}</p>
      ) : (
        <ul className="mb-4">
          {entries.map((entry) => {
            const overdue = isOverdue(entry)
            const isEditing = editingId === entry.id
            return (
              <li
                key={entry.id}
                className={`py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between data-table-row px-1 rounded-md ${
                  isEditing ? 'bg-accent/10 ring-1 ring-accent/30' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text-primary">{entry.label}</span>
                    {entry.status === 'closed' && (
                      <span className="badge-muted">{t('closed', lang)}</span>
                    )}
                    {overdue && <span className="badge-danger">{t('overdue', lang)}</span>}
                  </div>
                  <p className="text-xs text-text-muted">
                    {entry.date}
                    {entry.deadline && ` → ${entry.deadline}`}
                  </p>
                  {entry.notes && <p className="text-xs text-text-muted/70">{entry.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-sm font-semibold text-text-primary">
                    {formatAmount(entry.amount)} {getCurrencySymbol(entry.currency)}
                  </span>
                  <button type="button" onClick={() => startEdit(entry)} className="btn-accent-ghost">
                    {t('edit', lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleStatus(entry)}
                    className="text-xs text-text-muted hover:text-text-primary px-2 py-1 rounded hover:bg-hover"
                  >
                    {entry.status === 'open' ? t('close', lang) : t('open', lang)}
                  </button>
                  <button type="button" onClick={() => handleDelete(entry.id)} className="btn-danger-ghost">
                    {t('delete', lang)}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <form
        onSubmit={handleSubmit}
        className={`border-t border-border pt-4 space-y-3 ${
          editingId ? 'bg-accent/5 -mx-2 px-2 pb-2 rounded-md' : ''
        }`}
      >
        {editingId && (
          <p className="text-sm font-medium text-accent">{t('editingEntry', lang)}</p>
        )}
        <div>
          <label className="label-field">{t('label', lang)}</label>
          <input
            type="text"
            required
            value={form.label}
            onChange={(e) => updateField('label', e.target.value)}
            className="input-field"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">{t('amount', lang)}</label>
            <input
              type="number"
              min="0"
              step="0.001"
              required
              value={form.amount}
              onChange={(e) => updateField('amount', e.target.value)}
              className="input-field font-mono"
            />
          </div>
          <div>
            <label className="label-field">{t('date', lang)}</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => updateField('date', e.target.value)}
              className="input-field"
            />
          </div>
        </div>
        <div>
          <label className="label-field">{t('deadline', lang)}</label>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => updateField('deadline', e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="label-field">{t('notes', lang)}</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            className="input-field"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 btn-primary">
            {editingId ? t('save', lang) : t('add', lang)}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="flex-1 btn-secondary">
              {t('cancel', lang)}
            </button>
          )}
        </div>
      </form>
    </Card>
  )
}
