import { useMemo, useRef } from 'react'
import { format, isThisYear, parseISO } from 'date-fns'
import { useWindowVirtualizer } from '../hooks/useWindowVirtualizer'
import { useMoney } from '../hooks/useMoney'
import { TransactionRow } from './TransactionRow'
import type { Transaction } from '../types'

const HEADER_H = 44
const ROW_H = 64

type Item = { kind: 'header'; date: string; spent: number } | { kind: 'tx'; tx: Transaction; index: number }

function dayLabel(d: string) {
  const date = parseISO(d)
  return format(date, isThisYear(date) ? 'EEEE, d MMMM' : 'EEEE, d MMMM yyyy')
}

/**
 * Transactions grouped by day, virtualized so only rows near the viewport are in the DOM.
 * Row heights are fixed per kind (see .v-row-* in CSS) which keeps offset math exact.
 */
export function VirtualTransactionList({ transactions, grouped }: { transactions: Transaction[]; grouped: boolean }) {
  const money = useMoney()
  const ref = useRef<HTMLUListElement>(null)

  const items = useMemo<Item[]>(() => {
    if (!grouped) return transactions.map((tx, index) => ({ kind: 'tx', tx, index }))
    const out: Item[] = []
    let header: Extract<Item, { kind: 'header' }> | null = null
    transactions.forEach((tx, index) => {
      if (!header || header.date !== tx.date) {
        header = { kind: 'header', date: tx.date, spent: 0 }
        out.push(header)
      }
      if (tx.type === 'expense') header.spent += tx.amount
      out.push({ kind: 'tx', tx, index })
    })
    return out
  }, [transactions, grouped])

  const heights = useMemo(() => items.map((i) => (i.kind === 'header' ? HEADER_H : ROW_H)), [items])
  const { range, offsets, totalHeight } = useWindowVirtualizer(ref, heights)

  return (
    <ul ref={ref} className="v-list" style={{ height: totalHeight }} aria-label="Transactions">
      {items.slice(range[0], range[1]).map((item, i) => {
        const at = range[0] + i
        const style = { transform: `translateY(${offsets[at]}px)` }
        return item.kind === 'header' ? (
          <li key={`h-${item.date}`} className="v-row v-row-header" style={style}>
            <h2 className="tx-group-head">
              <span>{dayLabel(item.date)}</span>
              <span className="tx-group-total">{money(item.spent)}</span>
            </h2>
          </li>
        ) : (
          <TransactionRow
            key={item.tx.id}
            tx={item.tx}
            className="v-row v-row-tx"
            style={style}
            posInSet={item.index + 1}
            setSize={transactions.length}
          />
        )
      })}
    </ul>
  )
}
