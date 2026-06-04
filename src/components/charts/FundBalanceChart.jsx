import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useIsDark } from '../../context/ThemeContext'
import { formatAmount, getChartColors, shortMonthLabel } from '../../lib/chartUtils'
import { t } from '../../i18n'

function CustomTooltip({ active, payload, label, lang }) {
  if (!active || !payload?.length) return null
  const labels = {
    commitments: t('fundCommitments', lang),
    personal: t('fundPersonal', lang),
    investment: t('fundInvestment', lang),
    cumCommitments: `${t('fundCommitments', lang)} (${t('cumulative', lang)})`,
    cumPersonal: `${t('fundPersonal', lang)} (${t('cumulative', lang)})`,
    cumInvestment: `${t('fundInvestment', lang)} (${t('cumulative', lang)})`,
  }
  return (
    <div className="bg-surface border border-border rounded-card p-3 text-sm shadow-card max-w-xs">
      <p className="text-text-muted mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {labels[entry.dataKey] ?? entry.dataKey}: {formatAmount(entry.value)} د.ت
        </p>
      ))}
    </div>
  )
}

export default function FundBalanceChart({ lang, monthlyData, cumulativeData }) {
  const isDark = useIsDark()
  const colors = getChartColors(isDark)

  const chartData = monthlyData.map((row, i) => ({
    name: shortMonthLabel(row.yearMonth, lang),
    commitments: row.commitments,
    personal: row.personal,
    investment: row.investment,
    cumCommitments: cumulativeData[i]?.commitments ?? 0,
    cumPersonal: cumulativeData[i]?.personal ?? 0,
    cumInvestment: cumulativeData[i]?.investment ?? 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: colors.text, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: colors.text, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip lang={lang} />} />
        <Legend
          formatter={(value) => {
            const map = {
              commitments: t('fundCommitments', lang),
              personal: t('fundPersonal', lang),
              investment: t('fundInvestment', lang),
              cumCommitments: `${t('fundCommitments', lang)} Σ`,
              cumPersonal: `${t('fundPersonal', lang)} Σ`,
              cumInvestment: `${t('fundInvestment', lang)} Σ`,
            }
            return <span className="text-text-muted text-xs">{map[value] ?? value}</span>
          }}
        />
        <Bar dataKey="commitments" stackId="monthly" fill={colors.fundCommitments} radius={[2, 2, 0, 0]} />
        <Bar dataKey="personal" stackId="monthly" fill={colors.fundPersonal} />
        <Bar dataKey="investment" stackId="monthly" fill={colors.fundInvestment} radius={[2, 2, 0, 0]} />
        <Line type="monotone" dataKey="cumCommitments" stroke={colors.fundCommitments} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="cumPersonal" stroke={colors.fundPersonal} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="cumInvestment" stroke={colors.fundInvestment} strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
