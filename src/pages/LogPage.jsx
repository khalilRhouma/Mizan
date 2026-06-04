import { useCallback, useEffect, useState } from 'react'
import TransactionForm from '../components/TransactionForm'
import TransactionList from '../components/TransactionList'
import Card from '../components/ui/Card'
import { t } from '../i18n'
import { getTransactions } from '../services/storage'

export default function LogPage({ lang }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTransaction, setEditingTransaction] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const txs = await getTransactions()
      setTransactions(txs)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  function handleSaved() {
    setEditingTransaction(null)
    refresh()
  }

  function handleEdit(tx) {
    setEditingTransaction(tx)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleChanged(deletedId) {
    if (deletedId && editingTransaction?.id === deletedId) {
      setEditingTransaction(null)
    }
    refresh()
  }

  return (
    <div className="page-content-narrow page-stack">
      <TransactionForm
        lang={lang}
        editingTransaction={editingTransaction}
        onSaved={handleSaved}
        onCancelEdit={() => setEditingTransaction(null)}
      />
      <Card title={t('transactions', lang)}>
        {loading ? (
          <p className="text-center text-text-muted py-8 text-sm">…</p>
        ) : (
          <TransactionList
            lang={lang}
            transactions={transactions}
            editingId={editingTransaction?.id}
            onEdit={handleEdit}
            onChanged={handleChanged}
          />
        )}
      </Card>
    </div>
  )
}
