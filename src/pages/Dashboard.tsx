import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { format, getDaysInMonth, parseISO } from 'date-fns'
import { useLedger, sortByNewest } from '../store/ledger'
import { useUI } from '../store/ui'
import { dailyExpenses, expensesByCategory, inMonth, monthKey, monthlyTrend, summarize } from '../lib/stats'
import { useMoney } from '../hooks/useMoney'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useToday } from '../hooks/useToday'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { SpendingCalendar } from '../components/SpendingCalendar'
import { CategoryBreakdown } from '../components/CategoryBreakdown'
import { TrendChart } from '../components/TrendChart'
import { TransactionRow } from '../components/TransactionRow'

export default function Dashboard() {
  useDocumentTitle('Overview')
  const money = useMoney()
  const [params, setParams] = useSearchParams()
  const now = useToday()
  const currentMonth = monthKey(now)
  const month = /^\d{4}-\d{2}$/.test(params.get('m') ?? '') ? params.get('m')! : currentMonth
  const isCurrent = month === currentMonth
  const today = isCurrent ? now.getDate() : null

  const transactions = useLedger((s) => s.transactions)
  const budgets = useLedger((s) => s.budgets)
  const openNew = useUI((s) => s.openNew)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const monthTx = useMemo(() => inMonth(transactions, month), [transactions, month])
  const summary = useMemo(() => summarize(monthTx), [monthTx])
  const byCategory = useMemo(() => expensesByCategory(monthTx), [monthTx])
  const daily = useMemo(() => dailyExpenses(monthTx, month), [monthTx, month])
  const counts = useMemo(() => {
    const c = new Array<number>(daily.length).fill(0)
    for (const t of monthTx) if (t.type === 'expense') c[Number(t.date.slice(8, 10)) - 1]++
    return c
  }, [monthTx, daily.length])
  const trend = useMemo(() => monthlyTrend(transactions, month), [transactions, month])

  const totalBudget = Object.values(budgets).reduce((s, b) => s + b, 0)
  const daysInMonth = getDaysInMonth(parseISO(`${month}-01`))
  const daysLeft = isCurrent ? daysInMonth - now.getDate() : 0

  const dayDate = selectedDay ? `${month}-${String(selectedDay).padStart(2, '0')}` : null
  const listed = useMemo(
    () => sortByNewest(dayDate ? monthTx.filter((t) => t.date === dayDate) : monthTx).slice(0, dayDate ? 50 : 6),
    [monthTx, dayDate],
  )

  const changeMonth = (m: string) => {
    setSelectedDay(null)
    setParams(m === currentMonth ? {} : { m }, { replace: true })
  }

  return (
    <div className="page dashboard">
      <MonthSwitcher month={month} onChange={changeMonth} max={currentMonth} />

      <p className="headline">
        {summary.expense === 0 && summary.income === 0 ? (
          <>Nothing recorded for this month yet.</>
        ) : totalBudget > 0 ? (
          <>
            You {isCurrent ? 'have spent' : 'spent'} <strong>{money(summary.expense)}</strong> of the{' '}
            {money(totalBudget)} you budgeted
            {isCurrent && daysLeft > 0 ? `, with ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} to go.` : '.'}
          </>
        ) : (
          <>
            You {isCurrent ? 'have spent' : 'spent'} <strong>{money(summary.expense)}</strong> this month.
          </>
        )}
      </p>

      <dl className="figures">
        <div>
          <dt>Income</dt>
          <dd className="income">{money(summary.income)}</dd>
        </div>
        <div>
          <dt>Spent</dt>
          <dd className="expense">{money(summary.expense)}</dd>
        </div>
        <div>
          <dt>Left over</dt>
          <dd className={summary.net < 0 ? 'expense' : ''}>{money(summary.net)}</dd>
        </div>
      </dl>

      <div className="dash-grid">
        <section className="panel panel-calendar" aria-labelledby="cal-h">
          <div className="panel-head">
            <h2 id="cal-h">Day by day</h2>
            <p className="panel-hint">Select a day to see what you spent.</p>
          </div>
          <SpendingCalendar
            month={month}
            totals={daily}
            counts={counts}
            today={today}
            selectedDay={selectedDay}
            onSelect={setSelectedDay}
          />

          <div className="day-detail">
            <div className="day-detail-head">
              <h3>
                {dayDate ? format(parseISO(dayDate), 'EEEE, d MMMM') : 'Latest this month'}
              </h3>
              {dayDate && (
                <button className="btn btn-quiet" onClick={() => openNew(dayDate)}>
                  Add to this day
                </button>
              )}
            </div>
            {listed.length ? (
              <ul className="tx-list">
                {listed.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </ul>
            ) : (
              <p className="empty-inline">No transactions{dayDate ? ' on this day' : ''}.</p>
            )}
            {!dayDate && monthTx.length > listed.length && (
              <Link className="text-link" to={`/transactions?month=${month}`}>
                See all {monthTx.length} transactions
              </Link>
            )}
          </div>
        </section>

        <section className="panel panel-categories" aria-labelledby="cat-h">
          <div className="panel-head">
            <h2 id="cat-h">Where it went</h2>
          </div>
          <CategoryBreakdown totals={byCategory} budgets={budgets} month={month} />
        </section>

        <section className="panel panel-trend" aria-labelledby="trend-h">
          <div className="panel-head">
            <h2 id="trend-h">Last six months</h2>
          </div>
          <TrendChart data={trend} />
        </section>
      </div>
    </div>
  )
}
