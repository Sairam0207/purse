import { Link } from 'react-router-dom'
import { getCategory } from '../lib/categories'
import type { CategoryTotal } from '../lib/stats'
import { useMoney } from '../hooks/useMoney'

interface Props {
  totals: CategoryTotal[]
  budgets: Record<string, number>
  month: string
}

export function CategoryBreakdown({ totals, budgets, month }: Props) {
  const money = useMoney()
  const max = totals[0]?.total ?? 0
  const sum = totals.reduce((s, t) => s + t.total, 0)

  if (!totals.length) {
    return <p className="empty-inline">No expenses this month.</p>
  }

  return (
    <ol className="breakdown">
      {totals.map(({ categoryId, total, count }) => {
        const cat = getCategory(categoryId)
        const budget = budgets[categoryId]
        const over = budget !== undefined && total > budget
        return (
          <li key={categoryId}>
            <Link className="breakdown-row" to={`/transactions?cat=${categoryId}&month=${month}`}>
              <span className="breakdown-label">
                <span className="tx-swatch" style={{ background: cat.color }} aria-hidden="true" />
                {cat.name}
                <span className="breakdown-count">{count}</span>
              </span>
              <span className={`breakdown-value${over ? ' over' : ''}`}>{money(total)}</span>
              <span className="breakdown-bar" aria-hidden="true">
                <span style={{ width: `${(total / max) * 100}%`, background: cat.color }} />
              </span>
              <span className="sr-only">
                {Math.round((total / sum) * 100)}% of spending{over ? ', over budget' : ''}
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
