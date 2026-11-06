import { t } from '../i18n'
import Card from './ui/Card'

export default function SavingsFundsForm({
  lang,
  funds,
  fundSplits,
  onChange,
  onSplitChange,
  onApplySplits,
  onSave,
  savedNotice,
}) {
  const splitTotal =
    (fundSplits.commitments || 0) + (fundSplits.personal || 0) + (fundSplits.investment || 0)

  function handleAmountChange(field, value) {
    onChange(field, parseFloat(value) || 0)
  }

  function handleSplitFieldChange(field, value) {
    onSplitChange(field, parseFloat(value) || 0)
  }

  function fundLabel(key, splitKey) {
    return `${t(key, lang)} (${fundSplits[splitKey]}%)`
  }

  return (
    <Card>
      <form onSubmit={onSave} className="space-y-4">
        <h2 className="text-base font-semibold text-text-primary">{t('savingsFunds', lang)}</h2>

        <div className="rounded-card border border-border bg-surface p-4 space-y-3">
          <p className="text-sm font-medium text-text-muted">{t('fundSplitSettings', lang)}</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-text-muted mb-1">{t('fundCommitments', lang)}</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="1"
                value={fundSplits.commitments}
                onChange={(e) => handleSplitFieldChange('commitments', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">{t('fundPersonal', lang)}</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="1"
                value={fundSplits.personal}
                onChange={(e) => handleSplitFieldChange('personal', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">{t('fundInvestment', lang)}</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="1"
                value={fundSplits.investment}
                onChange={(e) => handleSplitFieldChange('investment', e.target.value)}
                className="input-field"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-text-muted">
              {t('splitTotal', lang)}: {splitTotal}%
            </span>
            <button
              type="button"
              onClick={onApplySplits}
              className="text-xs px-4 py-1.5 rounded-btn border-[1.5px] border-ink text-ink hover:bg-hover transition-colors"
            >
              {t('applySplits', lang)}
            </button>
          </div>
        </div>

        <div>
          <label className="label-field">{fundLabel('fundCommitments', 'commitments')}</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.001"
            value={funds.commitments}
            onChange={(e) => handleAmountChange('commitments', e.target.value)}
            className="input-field tabular-nums"
          />
        </div>
        <div>
          <label className="label-field">{fundLabel('fundPersonal', 'personal')}</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.001"
            value={funds.personal}
            onChange={(e) => handleAmountChange('personal', e.target.value)}
            className="input-field tabular-nums"
          />
        </div>
        <div>
          <label className="label-field">{fundLabel('fundInvestment', 'investment')}</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.001"
            value={funds.investment}
            onChange={(e) => handleAmountChange('investment', e.target.value)}
            className="input-field tabular-nums"
          />
        </div>
        <button type="submit" className="w-full btn-primary">
          {t('saveFunds', lang)}
        </button>
        {savedNotice && (
          <p className="text-sm text-success text-center">{t('fundsSaved', lang)}</p>
        )}
      </form>
    </Card>
  )
}
