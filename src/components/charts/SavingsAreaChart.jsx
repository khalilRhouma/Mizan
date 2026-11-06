import {
  Area,
  AreaChart,
  CartesianGrid,
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
    <div className="bg-surface-elevated border border-border rounded-btn px-3 py-2 text-sm shadow-float">
      <p className="text-text-muted mb-1">{label}</p>
      <p className="text-accent tabular-nums">{formatAmount(payload[0].value)} د.ت</p>
    </div>
  )
}

export default function SavingsAreaChart({ lang, data }) {
  const isDark = useIsDark()
  const colors = getChartColors(isDark)

  const chartData = data.map((row) => ({
    name: shortMonthLabel(row.yearMonth, lang),
    net: row.netTND,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.accent} stopOpacity={0.4} />
            <stop offset="100%" stopColor={colors.success} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: colors.text, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: colors.text, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="net"
          name={t('netSavings', lang)}
          stroke={colors.accent}
          fill="url(#savingsGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
