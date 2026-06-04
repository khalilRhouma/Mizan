import { t } from '../i18n'
import Card from './ui/Card'
import { formatAmount } from '../lib/chartUtils'

export default function HomeCashPanel({ lang, summary }) {
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
          <p className={`font-mono text-lg font-semibold mt-1 ${summary.balance >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatAmount(summary.balance)} د.ت
          </p>
        </div>
      </div>
    </Card>
  )
}
