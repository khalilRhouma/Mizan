/**
 * Date as "YYYY-MM-DD" in the device's LOCAL time zone.
 *
 * Do not use `new Date().toISOString().slice(0, 10)`: toISOString() is UTC,
 * so in Tunisia (UTC+1) it returns yesterday between 00:00 and 01:00.
 */
export function localDateString(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * A short, friendly day label for lists: "today", "yesterday", or
 * "Monday 3 November" (year added only when it is not the current year).
 * `labels` gives the words for today/yesterday in the UI language.
 */
export function friendlyDay(dateStr, lang, labels, today = new Date()) {
  const todayStr = localDateString(today)
  if (dateStr === todayStr) return labels.today
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (dateStr === localDateString(yesterday)) return labels.yesterday

  const date = parseLocalDate(dateStr)
  const sameYear = date.getFullYear() === today.getFullYear()
  // Latin digits in Arabic too, like the rest of the app.
  const locale = lang === 'ar' ? 'ar-TN-u-nu-latn' : 'en-GB'
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date)
}

/** "2026-01" -> "2025-12" */
export function previousYearMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
