import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useIsDark } from '../../context/ThemeContext'
import { formatAmount, getChartColors, shortMonthLabel } from '../../lib/chartUtils'
import { t } from '../../i18n'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-card p-3 text-sm shadow-card">
      <p className="text-text-muted mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatAmount(entry.value)} د.ت
        </p>
      ))}
    </div>
  )
}

export default function IncomeExpenseChart({ lang, data }) {
  const isDark = useIsDark()
  const colors = getChartColors(isDark)

  const chartData = data.map((row) => ({
    name: shortMonthLabel(row.yearMonth, lang),
    income: row.incomeTND,
    expense: row.expenseTND,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: colors.text, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: colors.text, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span className="text-text-muted text-xs">
              {value === 'income' ? t('income', lang) : t('expense', lang)}
            </span>
          )}
        />
        <Bar dataKey="income" name="income" fill={colors.success} radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="expense" fill={colors.danger} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
