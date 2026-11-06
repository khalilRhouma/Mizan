import { getCategoryLabel, getCurrencySymbol } from '../constants'
import { t } from '../i18n'
import Card from './ui/Card'
import { formatAmount } from '../lib/chartUtils'

export default function CardPaymentsPanel({ lang, eurTxns, eurSum, onSettle, settling }) {
  return (
    <Card title={t('cardPayments', lang)}>
      <p className="text-xs text-text-muted mb-4 -mt-2">{t('cardOutstandingHint', lang)}</p>
      {eurTxns.length === 0 ? (
        <p className="text-sm text-text-muted">{t('noCardPayments', lang)}</p>
      ) : (
        <ul>
          {eurTxns.map((tx) => (
            <li key={tx.id} className="flex justify-between gap-3 text-sm py-2 data-table-row px-1">
              <span className="min-w-0 text-text-muted">
                {getCategoryLabel(tx.category, lang)} — {tx.date}
                {tx.notes && <span className="block truncate text-xs text-text-muted/70">{tx.notes}</span>}
              </span>
              <span className="tabular-nums font-medium text-accent shrink-0">
                {formatAmount(tx.amount)} {getCurrencySymbol('EUR')}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-between border-t border-border pt-2 mt-2 font-semibold text-sm">
        <span>{t('total', lang)}</span>
        <span className="tabular-nums text-accent">
          {formatAmount(eurSum)} {getCurrencySymbol('EUR')}
        </span>
      </div>
      <button
        type="button"
        onClick={onSettle}
        disabled={eurTxns.length === 0 || settling}
        className="btn-secondary w-full mt-4 disabled:opacity-50"
      >
        {t('resetCard', lang)}
      </button>
    </Card>
  )
}
