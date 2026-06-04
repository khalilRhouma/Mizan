import { getCategoriesByType } from '../constants'
import Card from './ui/Card'
import { t } from '../i18n'
import { formatAmount } from '../lib/chartUtils'

function CategorySection({ lang, type, grouped, bankTotal, cashTotal }) {
  const categories = getCategoriesByType(type)
  const title = type === 'income' ? t('incomeSection', lang) : t('expensesSection', lang)
  const total = Object.values(grouped).reduce((s, v) => s + v, 0)

  return (
    <Card title={title}>
      {categories.map((cat) => {
        const amount = grouped[cat.key] ?? 0
        if (amount === 0) return null
        return (
          <div key={cat.key} className="flex justify-between text-sm md:text-base py-1 md:py-1.5 data-table-row px-1">
            <span className="text-text-muted">{lang === 'en' ? cat.en : cat.ar}</span>
            <span className="font-mono font-medium text-text-primary">{formatAmount(amount)} د.ت</span>
          </div>
        )
      })}
      {type === 'expense' && (bankTotal > 0 || cashTotal > 0) && (
        <div className="text-xs text-text-muted mt-2 space-y-1 border-t border-border pt-2">
          {bankTotal > 0 && (
            <div className="flex justify-between">
              <span>{t('bankSubtotal', lang)}</span>
              <span className="font-mono">{formatAmount(bankTotal)} د.ت</span>
            </div>
          )}
          {cashTotal > 0 && (
            <div className="flex justify-between">
              <span>{t('cashSubtotal', lang)}</span>
              <span className="font-mono">{formatAmount(cashTotal)} د.ت</span>
            </div>
          )}
        </div>
      )}
      <div className="flex justify-between border-t border-border pt-2 mt-2 font-semibold text-sm md:text-base">
        <span>{type === 'income' ? t('totalIncome', lang) : t('totalExpenses', lang)}</span>
        <span className={`font-mono ${type === 'income' ? 'text-success' : 'text-danger'}`}>
          {formatAmount(total)} د.ت
        </span>
      </div>
    </Card>
  )
}

export default function CategoryBreakdown({
  lang,
  incomeByCategory,
  expenseByCategory,
  bankExpenses,
  cashExpenses,
}) {
  return (
    <>
      <CategorySection
        lang={lang}
        type="income"
        grouped={incomeByCategory}
        bankTotal={0}
        cashTotal={0}
      />
      <CategorySection
        lang={lang}
        type="expense"
        grouped={expenseByCategory}
        bankTotal={bankExpenses}
        cashTotal={cashExpenses}
      />
    </>
  )
}
