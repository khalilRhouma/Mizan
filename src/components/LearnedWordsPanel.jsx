import { useEffect, useMemo, useState } from 'react'
import { getCategoryLabel } from '../constants'
import { t } from '../i18n'
import { deleteCategoryRule, getCategoryRules } from '../services/storage'

/** Words the quick-add parser links to categories; the user can delete wrong ones. */
export default function LearnedWordsPanel({ lang }) {
  const [rules, setRules] = useState(null)

  useEffect(() => {
    let cancelled = false
    getCategoryRules()
      .then((list) => {
        if (!cancelled) setRules(list)
      })
      .catch(() => {
        if (!cancelled) setRules([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const byCategory = useMemo(() => {
    const groups = {}
    for (const r of rules ?? []) (groups[r.category] ??= []).push(r)
    return Object.entries(groups)
  }, [rules])

  async function handleDelete(id) {
    await deleteCategoryRule(id)
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="mt-6 border-t border-border pt-4">
      <h3 className="font-medium text-text-primary">{t('learnedWords', lang)}</h3>
      <p className="text-xs text-text-muted mb-3">{t('learnedWordsHint', lang)}</p>
      {rules === null ? (
        <p className="text-sm text-text-muted">…</p>
      ) : byCategory.length === 0 ? (
        <p className="text-sm text-text-muted">{t('noLearnedWords', lang)}</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {byCategory.map(([category, list]) => (
            <div key={category}>
              <p className="text-sm font-medium text-text-primary mb-1">{getCategoryLabel(category, lang)}</p>
              <div className="flex flex-wrap gap-1.5">
                {list.map((r) => (
                  <span key={r.id} className="inline-flex items-center gap-1 rounded-pill border border-border px-2.5 py-0.5 text-xs" dir="auto">
                    {r.keyword}
                    {r.hits > 1 && <span className="text-text-muted">×{r.hits}</span>}
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="text-danger hover:opacity-70 px-0.5"
                      aria-label={`${t('delete', lang)} ${r.keyword}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
