import { useDeferredValue, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { useLedger } from '../store/ledger'
import { useUI } from '../store/ui'
import { CATEGORIES, getCategory } from '../lib/categories'
import { summarize } from '../lib/stats'
import { useMoney } from '../hooks/useMoney'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { VirtualTransactionList } from '../components/VirtualTransactionList'
import { Button, EmptyState } from '../ui'
import { filterTransactions, type Sort } from '../lib/filter'

export default function Transactions() {
  useDocumentTitle('Transactions')
  const money = useMoney()
  const transactions = useLedger((s) => s.transactions)
  const openNew = useUI((s) => s.openNew)
  // Filters live in the URL so a filtered view can be bookmarked, shared and survives refresh.
  const [params, setParams] = useSearchParams()

  const q = params.get('q') ?? ''
  const type = params.get('type') ?? ''
  const cat = params.get('cat') ?? ''
  const month = params.get('month') ?? ''
  const sort = (params.get('sort') as Sort) || 'newest'
  const deferredQ = useDeferredValue(q)

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'type' && value && cat && getCategory(cat).type !== value) next.delete('cat')
    setParams(next, { replace: true })
  }

  const months = useMemo(
    () => [...new Set(transactions.map((t) => t.date.slice(0, 7)))].sort().reverse(),
    [transactions],
  )

  const filtered = useMemo(
    () => filterTransactions(transactions, { q: deferredQ, type, cat, month, sort }),
    [transactions, deferredQ, type, cat, month, sort],
  )
  const totals = useMemo(() => summarize(filtered), [filtered])
  const hasFilters = Boolean(q || type || cat || month)

  return (
    <div className="page">
      <div className="page-head">
        <h1>Transactions</h1>
      </div>

      <div className="filters" role="search">
        <label className="field search-field">
          <span className="sr-only">Search notes and categories</span>
          <input
            type="search"
            placeholder="Search notes and categories"
            value={q}
            onChange={(e) => setParam('q', e.target.value)}
          />
        </label>
        <label className="field">
          <span className="sr-only">Type</span>
          <select value={type} onChange={(e) => setParam('type', e.target.value)}>
            <option value="">All types</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>
        </label>
        <label className="field">
          <span className="sr-only">Category</span>
          <select value={cat} onChange={(e) => setParam('cat', e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.filter((c) => !type || c.type === type).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="sr-only">Month</span>
          <select value={month} onChange={(e) => setParam('month', e.target.value)}>
            <option value="">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>{format(parseISO(`${m}-01`), 'MMMM yyyy')}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="sr-only">Sort</span>
          <select value={sort} onChange={(e) => setParam('sort', e.target.value === 'newest' ? '' : e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="largest">Largest first</option>
          </select>
        </label>
      </div>

      <p className="result-summary" aria-live="polite">
        {filtered.length.toLocaleString()} {filtered.length === 1 ? 'transaction' : 'transactions'}
        {totals.expense > 0 && <>, {money(totals.expense)} spent</>}
        {totals.income > 0 && <>, {money(totals.income)} received</>}
        {hasFilters && (
          <Button variant="quiet" onClick={() => setParams({}, { replace: true })}>
            Clear filters
          </Button>
        )}
      </p>

      {filtered.length === 0 ? (
        transactions.length === 0 ? (
          <EmptyState
            title="Your ledger is empty"
            action={<Button variant="primary" onClick={() => openNew()}>Add transaction</Button>}
          >
            Add your first expense or income to start tracking, or load sample data in Settings.
          </EmptyState>
        ) : (
          <EmptyState title="No matches">Try a different search, or clear the filters to see everything.</EmptyState>
        )
      ) : (
        <div className="tx-groups">
          <VirtualTransactionList transactions={filtered} grouped={sort !== 'largest'} />
        </div>
      )}
    </div>
  )
}
