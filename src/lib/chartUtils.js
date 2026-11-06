import { MONTH_NAMES } from '../constants'

export function getChartColors(isDark) {
  if (isDark) {
    return {
      grid: 'rgba(255,255,255,0.08)',
      accent: '#F37338',
      success: '#4ADE80',
      danger: '#FF6B6B',
      text: '#98989D',
      fundCommitments: '#F37338',
      fundPersonal: '#4ADE80',
      fundInvestment: '#6B8FD4',
      tooltipBg: '#262627',
      tooltipBorder: 'rgba(255,255,255,0.12)',
    }
  }
  return {
    grid: '#D1CDC7',
    accent: '#F37338',
    success: '#2D7A3A',
    danger: '#C41E3A',
    text: '#696969',
    fundCommitments: '#F37338',
    fundPersonal: '#2D7A3A',
    fundInvestment: '#3860BE',
    tooltipBg: '#FCFBFA',
    tooltipBorder: '#D1CDC7',
  }
}

export const DONUT_COLORS = [
  '#F37338',
  '#2D7A3A',
  '#C41E3A',
  '#3860BE',
  '#9A3A0A',
  '#CF4500',
  '#696969',
  '#141413',
  '#D1CDC7',
  '#262627',
  '#4ADE80',
  '#6B8FD4',
]

const amountFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

/** 2800 -> "2,800.000" (3 decimals for millimes, comma every 3 digits). */
export function formatAmount(n) {
  return amountFormat.format(Number(n) || 0)
}

export function shortMonthLabel(yearMonth, lang) {
  const [, month] = yearMonth.split('-').map(Number)
  const names = MONTH_NAMES[lang === 'en' ? 'en' : 'ar']
  return names[month - 1]
}
