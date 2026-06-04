import { getCategoryLabel, getCurrencySymbol } from '../constants'
import { t } from '../i18n'
import Card from './ui/Card'
import { formatAmount } from '../lib/chartUtils'

export default function CardPaymentsPanel({ lang, eurTxns, eurSum }) {
  return (
    <Card title={t('cardPayments', lang)}>
      {eurTxns.length === 0 ? (
        <p className="text-sm text-text-muted">{t('noCardPayments', lang)}</p>
      ) : (
        <ul>
          {eurTxns.map((tx) => (
            <li key={tx.id} className="flex justify-between text-sm py-2 data-table-row px-1">
              <span className="text-text-muted">
                {getCategoryLabel(tx.category, lang)} — {tx.date}
              </span>
              <span className="font-mono font-medium text-accent">
                {formatAmount(tx.amount)} {getCurrencySymbol('EUR')}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-between border-t border-border pt-2 mt-2 font-semibold text-sm">
        <span>{t('total', lang)}</span>
        <span className="font-mono text-accent">
          {formatAmount(eurSum)} {getCurrencySymbol('EUR')}
        </span>
      </div>
    </Card>
  )
}
