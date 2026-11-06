import { getCategoriesByType } from '../constants'

// Remembers the last category used per type (expense / income) on this device,
// so a new entry does not always start on "Rent". Storage can be blocked
// (private mode), so every access is guarded and falls back to the first category.

const key = (type) => `mizan.lastCategory.${type}`

export function getLastCategory(type) {
  const categories = getCategoriesByType(type)
  try {
    const saved = localStorage.getItem(key(type))
    if (saved && categories.some((c) => c.key === saved)) return saved
  } catch {
    /* storage unavailable */
  }
  return categories[0]?.key ?? ''
}

export function rememberCategory(type, category) {
  try {
    localStorage.setItem(key(type), category)
  } catch {
    /* storage unavailable */
  }
}
