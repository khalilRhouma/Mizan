import { formatAmount } from '../../lib/chartUtils'

const ACCENT_COLORS = {
  accent: 'text-accent',
  success: 'text-success',
  danger: 'text-danger',
  neutral: 'text-text-primary',
}

export default function KpiCard({ label, amount, suffix = 'د.ت', accent = 'accent', note }) {
  return (
    <div className="card">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      {/* Number and currency stay on one line; <bdi> keeps a minus sign on the right side in RTL */}
      <p
        className={`text-2xl lg:text-3xl font-bold mt-2 tabular-nums whitespace-nowrap ${ACCENT_COLORS[accent] ?? ACCENT_COLORS.accent}`}
      >
        <bdi>{formatAmount(amount)}</bdi> <span className="text-base sm:text-lg font-semibold">{suffix}</span>
      </p>
      {note && <p className="text-xs text-text-muted mt-1">{note}</p>}
    </div>
  )
}
