import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { getCategoryLabel } from '../../constants'
import { t } from '../../i18n'
import { CategoryIcon } from '../../lib/categoryIcons'
import { DONUT_COLORS, formatAmount } from '../../lib/chartUtils'

function CustomTooltip({ active, payload, lang }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="bg-surface-elevated border border-border rounded-btn px-3 py-2 text-sm shadow-float">
      <p className="text-text-primary">{getCategoryLabel(item.key, lang)}</p>
      <p className="text-text-muted tabular-nums">{formatAmount(item.value)} د.ت</p>
    </div>
  )
}

export default function CategoryDonutChart({ lang, categoryData }) {
  const chartData = Object.entries(categoryData)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value)
  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-text-muted text-sm">
        {t('noTransactions', lang)}
      </div>
    )
  }

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="key"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={96}
              paddingAngle={2}
              cornerRadius={4}
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.key} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip lang={lang} />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Total in the middle of the ring */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-text-muted">{t('expense', lang)}</span>
          <span className="text-lg font-semibold tabular-nums text-text-primary">{formatAmount(total)}</span>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5">
        {chartData.map((item, index) => {
          const percent = Math.round((item.value / total) * 100)
          const color = DONUT_COLORS[index % DONUT_COLORS.length]
          return (
            <li key={item.key} className="flex items-center gap-3 text-sm">
              <span
                className="inline-flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                style={{ backgroundColor: `${color}1f`, color }}
                aria-hidden="true"
              >
                <CategoryIcon category={item.key} className="w-4 h-4" />
              </span>
              <span className="flex-1 min-w-0 truncate text-text-primary">{getCategoryLabel(item.key, lang)}</span>
              <span className="text-xs text-text-muted tabular-nums">{percent}%</span>
              <span className="tabular-nums font-medium text-text-primary whitespace-nowrap">{formatAmount(item.value)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
