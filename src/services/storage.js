const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

const DEFAULT_SETTINGS = {
  language: 'ar',
  theme: 'light',
  salary: 0,
  fundSplits: { commitments: 40, personal: 20, investment: 40 },
  cashBalanceOffset: 0,
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || `API error ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export async function getCategories() {
  return request('/categories')
}

export async function getTransactions() {
  return request('/transactions')
}

export async function saveTransaction(tx) {
  return request('/transactions', { method: 'POST', body: JSON.stringify(tx) })
}

export async function deleteTransaction(id) {
  return request(`/transactions/${id}`, { method: 'DELETE' })
}

export async function settleCardPayments() {
  return request('/transactions/settle-card', { method: 'POST' })
}

export async function getMonthlyFundsList() {
  return request('/monthly-funds')
}

export async function getMonthlyFunds(yearMonth) {
  try {
    return await request(`/monthly-funds/${yearMonth}`)
  } catch {
    return null
  }
}

export async function saveMonthlyFunds(funds) {
  return request('/monthly-funds', { method: 'POST', body: JSON.stringify(funds) })
}

export async function getDebts() {
  return request('/debts')
}

export async function getBorrowedDebts() {
  const debts = await getDebts()
  return debts.filter((d) => d.type === 'borrowed')
}

export async function getLendings() {
  const debts = await getDebts()
  return debts.filter((d) => d.type === 'lent')
}

export async function saveDebt(debt) {
  return request('/debts', { method: 'POST', body: JSON.stringify(debt) })
}

export async function deleteDebt(id) {
  return request(`/debts/${id}`, { method: 'DELETE' })
}

export async function getSettings() {
  try {
    const data = await request('/settings')
    if (data.language === 'fr') data.language = 'en'
    return {
      ...DEFAULT_SETTINGS,
      ...data,
      fundSplits: { ...DEFAULT_SETTINGS.fundSplits, ...data.fundSplits },
    }
  } catch {
    return { ...DEFAULT_SETTINGS, fundSplits: { ...DEFAULT_SETTINGS.fundSplits } }
  }
}

/** PATCH only the given fields, e.g. saveSettings({ theme: 'dark' }). */
export async function saveSettings(changes) {
  return request('/settings', {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })
}

// --- quick add ---------------------------------------------------------------

/** Turn free text (one spend per line) into draft transactions. Saves nothing. */
export async function parseQuickAdd(text, today) {
  const data = await request('/quick-add/parse', {
    method: 'POST',
    body: JSON.stringify({ text, today }),
  })
  return data.drafts
}

/** Remember "word -> category" for saved drafts: [{ keywords, category }]. */
export async function learnCategoryRules(items) {
  if (items.length === 0) return { learned: 0 }
  return request('/category-rules/learn', { method: 'POST', body: JSON.stringify({ items }) })
}

export async function getCategoryRules() {
  return request('/category-rules')
}

export async function deleteCategoryRule(id) {
  return request(`/category-rules/${id}`, { method: 'DELETE' })
}
