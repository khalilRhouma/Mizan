const ACCENT_COLORS = {
  accent: 'text-accent',
  success: 'text-success',
  danger: 'text-danger',
}

function formatAmount(n) {
  return n.toFixed(3)
}

export default function KpiCard({ label, amount, suffix = 'د.ت', accent = 'accent' }) {
  return (
    <div className="card">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className={`font-mono text-2xl sm:text-3xl font-bold mt-2 ${ACCENT_COLORS[accent] ?? ACCENT_COLORS.accent}`}>
        {formatAmount(amount)} {suffix}
      </p>
    </div>
  )
}
