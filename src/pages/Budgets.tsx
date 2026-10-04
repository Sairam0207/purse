import { useMemo, useState } from 'react'
import { format, getDaysInMonth } from 'date-fns'
import { useLedger } from '../store/ledger'
import { categoriesFor } from '../lib/categories'
import { expensesByCategory, inMonth, monthKey } from '../lib/stats'
import { minorToInput, parseAmount } from '../lib/format'
import { useMoney } from '../hooks/useMoney'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useToday } from '../hooks/useToday'
import { toast } from '../store/toast'
import { ProgressBar } from '../ui'

function BudgetInput({ categoryId, value, label }: { categoryId: string; value?: number; label: string }) {
  const setBudget = useLedger((s) => s.setBudget)
  const [draft, setDraft] = useState(value ? minorToInput(value) : '')
  const [error, setError] = useState(false)

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed === '') {
      if (value !== undefined) {
        setBudget(categoryId, null)
        toast(`Budget removed for ${label}`)
      }
      setError(false)
      return
    }
    const parsed = parseAmount(trimmed)
    if (parsed === null) return setError(true)
    setError(false)
    if (parsed !== value) {
      setBudget(categoryId, parsed)
      toast(`Budget set for ${label}`)
    }
  }

  return (
    <input
      className="budget-input"
      inputMode="decimal"
      placeholder="No limit"
      aria-label={`Monthly budget for ${label}`}
      aria-invalid={error || undefined}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
    />
  )
}

export default function Budgets() {
  useDocumentTitle('Budgets')
  const money = useMoney()
  const transactions = useLedger((s) => s.transactions)
  const budgets = useLedger((s) => s.budgets)
  const now = useToday()
  const month = monthKey(now)
  const spentBy = useMemo(() => {
    const map = new Map(expensesByCategory(inMonth(transactions, month)).map((t) => [t.categoryId, t.total]))
    return (id: string) => map.get(id) ?? 0
  }, [transactions, month])

  const categories = categoriesFor('expense')
  const totalBudget = categories.reduce((s, c) => s + (budgets[c.id] ?? 0), 0)
  const budgetedSpent = categories.reduce((s, c) => s + (budgets[c.id] ? spentBy(c.id) : 0), 0)
  const daysLeft = getDaysInMonth(now) - now.getDate() + 1
  const remaining = totalBudget - budgetedSpent
  const perDay = remaining > 0 ? Math.floor(remaining / daysLeft / 100) * 100 : 0

  return (
    <div className="page">
      <div className="page-head">
        <h1>Budgets</h1>
        <p className="page-sub">Monthly limits for {format(now, 'MMMM')}. Leave a category empty for no limit.</p>
      </div>

      {totalBudget > 0 && (
        <p className="headline headline-sm">
          {remaining >= 0 ? (
            <>
              <strong>{money(remaining)}</strong> left across your budgets. That's about {money(perDay)} a day
              for the next {daysLeft} {daysLeft === 1 ? 'day' : 'days'}.
            </>
          ) : (
            <>
              You're <strong className="expense">{money(-remaining)}</strong> over your budgets this month.
            </>
          )}
        </p>
      )}

      <ul className="budget-list">
        {categories.map((c) => {
          const spent = spentBy(c.id)
          const budget = budgets[c.id]
          const ratio = budget ? spent / budget : 0
          const state = !budget ? 'none' : ratio > 1 ? 'over' : ratio > 0.85 ? 'near' : 'ok'
          return (
            <li key={c.id} className="budget-item" data-state={state}>
              <div className="budget-top">
                <span className="budget-name">
                  <span className="tx-swatch" style={{ background: c.color }} aria-hidden="true" />
                  {c.name}
                </span>
                <BudgetInput key={`${c.id}-${budget ?? 'none'}`} categoryId={c.id} value={budget} label={c.name} />
              </div>
              {budget ? (
                <>
                  <ProgressBar
                    className="budget-bar"
                    label={`${c.name} spending`}
                    value={spent}
                    max={budget}
                    valueText={`${money(spent)} of ${money(budget)}`}
                    tone={state === 'over' ? 'over' : state === 'near' ? 'warn' : 'ok'}
                  />
                  <p className="budget-meta">
                    {money(spent)} spent
                    <span>
                      {state === 'over' ? `${money(spent - budget)} over` : `${money(budget - spent)} left`}
                    </span>
                  </p>
                </>
              ) : (
                <p className="budget-meta">{spent > 0 ? `${money(spent)} spent, no limit set` : 'Nothing spent yet'}</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
