export const CURRENCIES = [
  { code: 'TND', symbol: 'د.ت' },
  { code: 'EUR', symbol: '€' },
]

export const PAYMENT_METHODS = [
  { key: 'cash', ar: 'نقد', en: 'Cash' },
  { key: 'bank', ar: 'بنك', en: 'Bank' },
  { key: 'card', ar: 'بطاقة', en: 'Card' },
]

export const DEFAULT_FUND_SPLITS = {
  commitments: 40,
  personal: 20,
  investment: 40,
}

/** @deprecated use DEFAULT_FUND_SPLITS */
export const FUND_SPLITS = {
  commitments: DEFAULT_FUND_SPLITS.commitments / 100,
  personal: DEFAULT_FUND_SPLITS.personal / 100,
  investment: DEFAULT_FUND_SPLITS.investment / 100,
}

export const MONTH_NAMES = {
  ar: [
    'جانفي',
    'فيفري',
    'مارس',
    'أفريل',
    'ماي',
    'جوان',
    'جويلية',
    'أوت',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
}

export const CATEGORIES = [
  { key: 'salary', ar: 'راتب الوظيفة', en: 'Salary', type: 'income' },
  { key: 'extra_income', ar: 'دخل إضافي', en: 'Extra income', type: 'income' },
  { key: 'rent', ar: 'إيجار السكن', en: 'Rent', type: 'expense' },
  { key: 'bills', ar: 'فاتورات', en: 'Bills', type: 'expense' },
  { key: 'food', ar: 'مشتريات / طعام', en: 'Food / groceries', type: 'expense' },
  { key: 'clothes', ar: 'ملابس', en: 'Clothes', type: 'expense' },
  { key: 'health', ar: 'دواء / علاج', en: 'Health / medicine', type: 'expense' },
  { key: 'needs', ar: 'حاجيات', en: 'Needs', type: 'expense' },
  { key: 'donations', ar: 'صدقات', en: 'Donations', type: 'expense' },
  { key: 'leisure', ar: 'ترفيه / رياضة', en: 'Leisure / sports', type: 'expense' },
  { key: 'car', ar: 'مصاريف سيارة', en: 'Car expenses', type: 'expense' },
  { key: 'construction', ar: 'بناء / مواد بناء / يد عاملة', en: 'Construction', type: 'expense' },
  { key: 'extra_expense', ar: 'مصروفات إضافية', en: 'Extra expenses', type: 'expense' },
]

export function getCategoryLabel(key, lang) {
  if (key === 'cash_withdrawal') {
    return lang === 'en' ? 'Cash withdrawal' : 'سحب نقد للصندوق'
  }
  const cat = CATEGORIES.find((c) => c.key === key)
  if (!cat) return key
  return lang === 'en' ? cat.en : cat.ar
}

export function getPaymentMethodLabel(key, lang) {
  const method = PAYMENT_METHODS.find((m) => m.key === key)
  if (!method) return key
  return lang === 'en' ? method.en : method.ar
}

export function getCategoriesByType(type) {
  return CATEGORIES.filter((c) => c.type === type)
}

export function getCurrencySymbol(code) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code
}

export function formatMonthLabel(yearMonth, lang) {
  const [year, month] = yearMonth.split('-').map(Number)
  const names = MONTH_NAMES[lang === 'en' ? 'en' : 'ar']
  const name = names[month - 1]
  return `${name} ${year}`
}
