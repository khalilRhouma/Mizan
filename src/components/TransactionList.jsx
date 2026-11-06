import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getCategoryLabel, getCurrencySymbol, getPaymentMethodLabel } from '../constants'
import { t } from '../i18n'
import { CategoryIcon } from '../lib/categoryIcons'
import { formatAmount } from '../lib/chartUtils'
import { friendlyDay } from '../lib/dates'
import { deleteTransaction, saveTransaction } from '../services/storage'

function paymentLabel(tx, lang) {
  if (tx.kind === 'cash_withdrawal') return t('badgeWithdrawal', lang)
  if (tx.paymentMethod === 'card') return t('payCard', lang)
  return getPaymentMethodLabel(tx.paymentMethod === 'cash' ? 'cash' : 'bank', lang)
}

// Soft colored circle behind the category icon: green income, orange
// withdrawal, neutral expense (red is kept for the amount only).
function toneClasses(tx) {
  if (tx.kind === 'cash_withdrawal') return 'bg-warning/10 text-warning'
  if (tx.type === 'income') return 'bg-success/10 text-success'
  return 'bg-hover text-text-primary'
}

function groupByDay(transactions) {
  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.createdAt - a.createdAt
  })
  const groups = []
  for (const tx of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.date === tx.date) last.items.push(tx)
    else groups.push({ date: tx.date, items: [tx] })
  }
  return groups
}

// Spent that day in TND (EUR card spends and withdrawals are not counted).
function daySpent(items) {
  return items
    .filter((tx) => tx.type === 'expense' && tx.kind !== 'cash_withdrawal' && tx.currency !== 'EUR')
    .reduce((sum, tx) => sum + Number(tx.amount), 0)
}

export default function TransactionList({ lang, transactions, editingId, onEdit, onChanged }) {
  // Delete at once, then offer "Undo" for a few seconds: saving the same
  // transaction again (same id) restores it exactly.
  async function handleDelete(tx) {
    try {
      await deleteTransaction(tx.id)
    } catch {
      toast.error(t('deleteFailed', lang))
      return
    }
    onChanged(tx.id)
    toast(t('deleted', lang), {
      duration: 6000,
      action: {
        label: t('undo', lang),
        onClick: async () => {
          try {
            await saveTransaction(tx)
            onChanged()
          } catch {
            toast.error(t('saveFailed', lang))
          }
        },
      },
    })
  }

  if (transactions.length === 0) {
    return <p className="text-center text-text-muted py-8 text-sm md:text-base">{t('noTransactions', lang)}</p>
  }

  const labels = { today: t('today', lang), yesterday: t('yesterday', lang) }

  return (
    <div className="space-y-5">
      {groupByDay(transactions).map((group) => {
        const spent = daySpent(group.items)
        return (
          <section key={group.date}>
            <div className="flex items-baseline justify-between gap-3 px-1 mb-1">
              <h3 className="text-sm font-semibold text-text-primary">{friendlyDay(group.date, lang, labels)}</h3>
              {spent > 0 && (
                <span className="text-xs text-text-muted tabular-nums whitespace-nowrap">
                  <bdi dir="ltr">-{formatAmount(spent)}</bdi> د.ت
                </span>
              )}
            </div>
            <ul className="rounded-2xl bg-surface-elevated border border-border overflow-hidden">
              {group.items.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  lang={lang}
                  isEditing={editingId === tx.id}
                  onEdit={() => onEdit(tx)}
                  onDelete={() => handleDelete(tx)}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function TransactionRow({ tx, lang, isEditing, onEdit, onDelete }) {
  const isIncome = tx.type === 'income'
  const isWithdrawal = tx.kind === 'cash_withdrawal'
  const sign = isWithdrawal ? '' : isIncome ? '+' : '-'
  const amountColor = isWithdrawal ? 'text-warning' : isIncome ? 'text-success' : 'text-text-primary'

  return (
    <li
      className={`group flex items-center gap-3 px-3 py-3 border-b border-border last:border-b-0 transition-colors ${
        isEditing ? 'bg-accent/10' : 'hover:bg-hover/60'
      }`}
    >
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-3 min-w-0 flex-1 text-start"
        aria-label={`${t('edit', lang)}: ${getCategoryLabel(tx.category, lang)}`}
      >
        <span className={`icon-chip ${toneClasses(tx)}`} aria-hidden="true">
          <CategoryIcon
            category={isWithdrawal ? 'cash_withdrawal' : tx.category}
            className="w-5 h-5"
            strokeWidth={1.75}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm md:text-base font-medium text-text-primary truncate">
            {getCategoryLabel(tx.category, lang)}
          </p>
          <p className="text-xs text-text-muted truncate">
            {paymentLabel(tx, lang)}
            {tx.notes && (
              <>
                {' '}
                · <span dir="auto">{tx.notes}</span>
              </>
            )}
          </p>
        </div>
        <span className={`text-sm md:text-base font-semibold tabular-nums whitespace-nowrap shrink-0 ${amountColor}`}>
          <bdi dir="ltr">
            {sign}
            {formatAmount(tx.amount)}
          </bdi>{' '}
          <span className="text-xs font-medium text-text-muted">{getCurrencySymbol(tx.currency)}</span>
        </span>
      </button>
      <div className="flex items-center shrink-0 -me-1">
        <button
          type="button"
          onClick={onEdit}
          aria-label={t('edit', lang)}
          title={t('edit', lang)}
          className="hidden md:inline-flex w-10 h-10 items-center justify-center rounded-full text-text-muted hover:text-accent hover:bg-accent/10 transition"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t('delete', lang)}
          title={t('delete', lang)}
          className="w-10 h-10 inline-flex items-center justify-center rounded-full text-text-muted hover:text-danger hover:bg-danger/10 transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  )
}
