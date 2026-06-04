import { getCategoriesByType, MONTH_NAMES } from '../constants'
import { t } from '../i18n'
import {
  fundMonthlySeries,
  groupByCategory,
  monthlyTotals,
  yearMonths,
} from '../lib/calc'
import { formatAmount } from '../lib/chartUtils'

function rowTotal(values) {
  return Object.values(values).reduce((s, v) => s + v, 0)
}

function AmountCell({ value }) {
  if (value === 0) return <td className="px-2 py-2 text-center font-mono text-text-muted/40">—</td>
  return (
    <td className="px-2 py-2 text-center font-mono text-sm text-text-primary whitespace-nowrap">
      {formatAmount(value)}
    </td>
  )
}

export default function YearGridTable({ lang, year, transactions, monthlyFundsList, fundSplits }) {
  const months = yearMonths(year)
  const monthNames = MONTH_NAMES[lang === 'en' ? 'en' : 'ar']
  const incomeMatrix = {}
  const expenseMatrix = {}

  for (const cat of getCategoriesByType('income')) {
    incomeMatrix[cat.key] = {}
    for (const ym of months) {
      incomeMatrix[cat.key][ym] = groupByCategory(transactions, ym, 'income')[cat.key] ?? 0
    }
  }
  for (const cat of getCategoriesByType('expense')) {
    expenseMatrix[cat.key] = {}
    for (const ym of months) {
      expenseMatrix[cat.key][ym] = groupByCategory(transactions, ym, 'expense')[cat.key] ?? 0
    }
  }

  const incomeTotals = months.map((ym) => monthlyTotals(transactions, ym).incomeTND)
  const expenseTotals = months.map((ym) => monthlyTotals(transactions, ym).expenseTND)
  const netTotals = months.map((ym) => monthlyTotals(transactions, ym).netTND)
  const fundSeries = fundMonthlySeries(monthlyFundsList, months, transactions, fundSplits)

  const fundRows = [
    { key: 'commitments', label: t('fundCommitments', lang) },
    { key: 'personal', label: t('fundPersonal', lang) },
    { key: 'investment', label: t('fundInvestment', lang) },
  ]

  function renderCategoryRows(matrix, type) {
    const categories = getCategoriesByType(type)
    return categories.map((cat) => {
      const values = matrix[cat.key] ?? {}
      const total = rowTotal(values)
      if (total === 0) return null
      return (
        <tr key={cat.key} className="data-table-row">
          <td className="sticky start-0 z-10 bg-surface px-3 py-2 text-sm text-text-muted whitespace-nowrap border-e border-border">
            {lang === 'en' ? cat.en : cat.ar}
          </td>
          {months.map((ym) => (
            <AmountCell key={ym} value={values[ym] ?? 0} />
          ))}
          <td className="px-3 py-2 text-center font-mono text-sm font-semibold text-text-primary border-s border-border">
            {formatAmount(total)}
          </td>
        </tr>
      )
    })
  }

  function renderTotalRow(label, values, accent) {
    const total = values.reduce((s, v) => s + v, 0)
    return (
      <tr className="data-table-row font-semibold">
        <td className={`sticky start-0 z-10 bg-surface px-3 py-2 text-sm whitespace-nowrap border-e border-border ${accent}`}>
          {label}
        </td>
        {values.map((v, i) => (
          <AmountCell key={months[i]} value={v} />
        ))}
        <td className={`px-3 py-2 text-center font-mono text-sm border-s border-border ${accent}`}>
          {formatAmount(total)}
        </td>
      </tr>
    )
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full min-w-[900px] text-sm border-collapse">
        <thead>
          <tr className="border-b border-border bg-primary">
            <th className="sticky start-0 z-10 bg-primary px-3 py-3 text-start text-text-muted font-medium border-e border-border">
              {t('category', lang)}
            </th>
            {months.map((ym, i) => (
              <th key={ym} className="px-2 py-3 text-center text-text-muted font-medium whitespace-nowrap">
                {monthNames[i]}
              </th>
            ))}
            <th className="px-3 py-3 text-center text-text-muted font-medium border-s border-border">
              {t('rowTotal', lang)}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={months.length + 2} className="px-3 py-2 text-xs font-semibold text-success uppercase tracking-wide bg-success/5">
              {t('incomeSection', lang)}
            </td>
          </tr>
          {renderCategoryRows(incomeMatrix, 'income')}
          {renderTotalRow(t('totalIncome', lang), incomeTotals, 'text-success')}

          <tr>
            <td colSpan={months.length + 2} className="px-3 py-2 text-xs font-semibold text-danger uppercase tracking-wide bg-danger/5">
              {t('expensesSection', lang)}
            </td>
          </tr>
          {renderCategoryRows(expenseMatrix, 'expense')}
          {renderTotalRow(t('totalExpenses', lang), expenseTotals, 'text-danger')}

          <tr className="data-table-row">
            <td colSpan={months.length + 2} className="h-2" />
          </tr>
          {renderTotalRow(t('netSavings', lang), netTotals, 'text-accent')}

          <tr>
            <td colSpan={months.length + 2} className="px-3 py-2 text-xs font-semibold text-accent uppercase tracking-wide bg-accent/5">
              {t('savingsFunds', lang)}
            </td>
          </tr>
          {fundRows.map(({ key, label }) => {
            const values = fundSeries.map((f) => f[key])
            const total = values.reduce((s, v) => s + v, 0)
            return (
              <tr key={key} className="data-table-row">
                <td className="sticky start-0 z-10 bg-surface px-3 py-2 text-sm text-text-muted whitespace-nowrap border-e border-border">
                  {label}
                </td>
                {values.map((v, i) => (
                  <AmountCell key={months[i]} value={v} />
                ))}
                <td className="px-3 py-2 text-center font-mono text-sm font-semibold text-accent border-s border-border">
                  {formatAmount(total)}
                </td>
              </tr>
            )
          })}
          {renderTotalRow(
            t('allFunds', lang),
            fundSeries.map((f) => f.commitments + f.personal + f.investment),
            'text-accent',
          )}
        </tbody>
      </table>
    </div>
  )
}
