import { useEffect, useState } from 'react'
import YearGridTable from '../components/YearGridTable'
import Card from '../components/ui/Card'
import { t } from '../i18n'
import { getMonthlyFundsList, getSettings, getTransactions } from '../services/storage'

function currentYear() {
  return String(new Date().getFullYear())
}

export default function YearPage({ lang }) {
  const [year, setYear] = useState(currentYear)
  const [transactions, setTransactions] = useState([])
  const [monthlyFundsList, setMonthlyFundsList] = useState([])
  const [fundSplits, setFundSplits] = useState({
    commitments: 40,
    personal: 20,
    investment: 40,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getTransactions(), getMonthlyFundsList(), getSettings()])
      .then(([txs, funds, settings]) => {
        if (cancelled) return
        setTransactions(txs)
        setMonthlyFundsList(funds)
        setFundSplits({ ...settings.fundSplits })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="text-center text-text-muted py-12 text-sm">…</div>
    )
  }

  return (
    <div className="page-stack">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="page-title">{t('yearViewTitle', lang)}</h1>
          <p className="page-subtitle">{t('yearViewSubtitle', lang)}</p>
        </div>
        <div>
          <label htmlFor="year" className="label-field">{t('year', lang)}</label>
          <input
            id="year"
            type="number"
            min="2000"
            max="2100"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="input-field w-32 font-mono"
          />
        </div>
      </div>

      <Card>
        <YearGridTable
          lang={lang}
          year={year}
          transactions={transactions}
          monthlyFundsList={monthlyFundsList}
          fundSplits={fundSplits}
        />
      </Card>
    </div>
  )
}
