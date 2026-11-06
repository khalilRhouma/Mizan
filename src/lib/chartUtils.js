import { MONTH_NAMES } from '../constants'

// Same colors as the CSS tokens in src/index.css (Recharts needs real values).
export function getChartColors(isDark) {
  if (isDark) {
    return {
      grid: 'rgba(255,255,255,0.06)',
      accent: '#F5824D',
      success: '#4FC48D',
      danger: '#FF7B88',
      text: '#9B978F',
      fundCommitments: '#F5824D',
      fundPersonal: '#4FC48D',
      fundInvestment: '#7D9DE0',
      tooltipBg: '#232322',
      tooltipBorder: 'rgba(255,255,255,0.08)',
    }
  }
  return {
    grid: '#EDE8E0',
    accent: '#F37338',
    success: '#1D7A4E',
    danger: '#C23A4B',
    text: '#6E6A64',
    fundCommitments: '#F37338',
    fundPersonal: '#1D7A4E',
    fundInvestment: '#3860BE',
    tooltipBg: '#FFFFFF',
    tooltipBorder: '#E6E0D7',
  }
}

// Calm, distinct colors for categories (work on light and dark backgrounds).
export const DONUT_COLORS = [
  '#F37338',
  '#1D7A4E',
  '#3860BE',
  '#C23A4B',
  '#D9A441',
  '#7A5CC2',
  '#2A9D8F',
  '#8C6A4F',
  '#E08AA6',
  '#6E6A64',
  '#9BB45C',
  '#B5ADA3',
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
