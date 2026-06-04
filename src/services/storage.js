const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

const DEFAULT_SETTINGS = {
  language: 'ar',
  theme: 'light',
  salary: 0,
  fundSplits: { commitments: 40, personal: 20, investment: 40 },
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

export async function getTransactions() {
  return request('/transactions')
}

export async function saveTransaction(tx) {
  return request('/transactions', { method: 'POST', body: JSON.stringify(tx) })
}

export async function deleteTransaction(id) {
  return request(`/transactions/${id}`, { method: 'DELETE' })
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

export async function saveSettings(settings) {
  const current = await getSettings()
  return request('/settings', {
    method: 'PATCH',
    body: JSON.stringify({ ...current, ...settings }),
  })
}
