import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { getCategoryLabel } from '../../constants'
import { DONUT_COLORS, formatAmount } from '../../lib/chartUtils'

function CustomTooltip({ active, payload, lang }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="bg-surface border border-border rounded-card p-3 text-sm shadow-card">
      <p className="text-text-primary">{getCategoryLabel(item.key, lang)}</p>
      <p className="text-accent font-mono">{formatAmount(item.value)} د.ت</p>
    </div>
  )
}

export default function CategoryDonutChart({ lang, categoryData }) {
  const chartData = Object.entries(categoryData)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value)

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-text-muted text-sm">
        —
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="key"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
        >
          {chartData.map((entry, index) => (
            <Cell key={entry.key} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip lang={lang} />} />
        <Legend
          formatter={(value) => (
            <span className="text-text-muted text-xs">{getCategoryLabel(value, lang)}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
