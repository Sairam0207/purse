import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format, parseISO } from 'date-fns'
import type { MonthPoint } from '../lib/stats'
import { useMoney } from '../hooks/useMoney'

export function TrendChart({ data }: { data: MonthPoint[] }) {
  const money = useMoney()
  const rows = data.map((d) => ({ ...d, label: format(parseISO(`${d.month}-01`), 'MMM') }))

  return (
    <figure className="trend">
      {/* inert: hidden from assistive tech AND removed from tab order (Recharts renders focusable SVG). */}
      <div className="trend-chart" aria-hidden="true" inert>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart accessibilityLayer={false} data={rows} barGap={3} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-soft)', fontSize: 13 }} />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--ink-soft)', fontSize: 12 }}
              tickFormatter={(v: number) => money(v, true)}
            />
            <Tooltip
              cursor={{ fill: 'var(--bg-sunk)' }}
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 10,
                color: 'var(--ink)',
              }}
              formatter={(v, name) => [money(Number(v)), name === 'income' ? 'Income' : 'Spent']}
            />
            <Bar dataKey="income" fill="var(--income)" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="expense" fill="var(--expense)" radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Charts aren't readable by screen readers, so the same data is exposed as a table. */}
      <table className="sr-only">
        <caption>Income and spending by month</caption>
        <thead>
          <tr><th>Month</th><th>Income</th><th>Spent</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}><td>{r.label}</td><td>{money(r.income)}</td><td>{money(r.expense)}</td></tr>
          ))}
        </tbody>
      </table>
      <figcaption className="trend-legend">
        <span><i style={{ background: 'var(--income)' }} />Income</span>
        <span><i style={{ background: 'var(--expense)' }} />Spent</span>
      </figcaption>
    </figure>
  )
}
