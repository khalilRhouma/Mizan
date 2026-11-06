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
