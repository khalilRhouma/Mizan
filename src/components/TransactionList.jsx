import { getCategoryLabel, getCurrencySymbol, getPaymentMethodLabel } from '../constants'
import { t } from '../i18n'
import { toast } from 'sonner'
import { deleteTransaction, saveTransaction } from '../services/storage'
import { formatAmount } from '../lib/chartUtils'

function TransactionBadge({ tx, lang }) {
  if (tx.kind === 'cash_withdrawal') {
    return <span className="badge-warning">{t('badgeWithdrawal', lang)}</span>
  }
  if (tx.paymentMethod === 'card') {
    return <span className="badge-accent">{t('payCard', lang)}</span>
  }
  if (tx.paymentMethod === 'cash') {
    return <span className="badge-warning">{getPaymentMethodLabel('cash', lang)}</span>
  }
  return <span className="badge-muted">{getPaymentMethodLabel('bank', lang)}</span>
}

export default function TransactionList({ lang, transactions, editingId, onEdit, onChanged }) {
  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.createdAt - a.createdAt
  })

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

  if (sorted.length === 0) {
    return <p className="text-center text-text-muted py-8 text-sm md:text-base">{t('noTransactions', lang)}</p>
  }

  return (
    <ul>
      {sorted.map((tx) => {
        const isIncome = tx.type === 'income'
        const isWithdrawal = tx.kind === 'cash_withdrawal'
        const isEditing = editingId === tx.id
        return (
          <li
            key={tx.id}
            className={`flex items-center justify-between gap-3 py-3 md:py-4 px-1 data-table-row rounded-md ${
              isEditing ? 'bg-accent/10 ring-1 ring-accent/30' : ''
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm md:text-base font-medium text-text-primary truncate">
                  {getCategoryLabel(tx.category, lang)}
                </p>
                <TransactionBadge tx={tx} lang={lang} />
              </div>
              <p className="text-xs md:text-sm text-text-muted">{tx.date}</p>
              {tx.notes && <p className="text-xs md:text-sm text-text-muted/70 truncate">{tx.notes}</p>}
            </div>
            <span
              className={`font-mono text-sm md:text-base font-semibold whitespace-nowrap min-w-[5.5rem] text-end shrink-0 ${
                isWithdrawal ? 'text-warning' : isIncome ? 'text-success' : 'text-danger'
              }`}
            >
              {isWithdrawal ? '→' : isIncome ? '+' : '-'}
              {formatAmount(tx.amount)} {getCurrencySymbol(tx.currency)}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => onEdit(tx)} className="btn-accent-ghost">
                {t('edit', lang)}
              </button>
              <button type="button" onClick={() => handleDelete(tx)} className="btn-danger-ghost">
                {t('delete', lang)}
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
