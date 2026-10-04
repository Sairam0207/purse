import type { CSSProperties } from 'react'
import { getCategory } from '../lib/categories'
import { useMoney } from '../hooks/useMoney'
import { useUI } from '../store/ui'
import type { Transaction } from '../types'

interface Props {
  tx: Transaction
  style?: CSSProperties
  className?: string
  /** Position info so screen readers announce "item 12 of 10,000" in virtualized lists. */
  posInSet?: number
  setSize?: number
}

export function TransactionRow({ tx, style, className, posInSet, setSize }: Props) {
  const money = useMoney()
  const openEdit = useUI((s) => s.openEdit)
  const cat = getCategory(tx.categoryId)
  const sign = tx.type === 'income' ? '+' : '−'

  return (
    <li style={style} className={className} aria-posinset={posInSet} aria-setsize={setSize}>
      <button className="tx-row" onClick={() => openEdit(tx)}>
        <span className="tx-swatch" style={{ background: cat.color }} aria-hidden="true" />
        <span className="tx-main">
          <span className="tx-note">{tx.note || cat.name}</span>
          <span className="tx-cat">{cat.name}</span>
        </span>
        <span className={`tx-amount ${tx.type}`}>
          <span className="sr-only">{tx.type === 'income' ? 'Income' : 'Expense'} </span>
          {sign}
          {money(tx.amount)}
        </span>
      </button>
    </li>
  )
}
