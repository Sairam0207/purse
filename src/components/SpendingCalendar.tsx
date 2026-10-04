import { useMemo, useRef, type KeyboardEvent } from 'react'
import { format, getDay, parseISO } from 'date-fns'
import { useMoney } from '../hooks/useMoney'
import { intensityLevels } from '../lib/heatmap'

interface Props {
  month: string
  totals: number[]
  counts: number[]
  selectedDay: number | null
  today: number | null
  onSelect: (day: number | null) => void
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * The signature view: each day of the month is a cell whose fill shows how much you spent.
 * Implemented as a grid of buttons with roving arrow-key navigation.
 */
export function SpendingCalendar({ month, totals, counts, selectedDay, today, onSelect }: Props) {
  const money = useMoney()
  const gridRef = useRef<HTMLDivElement>(null)
  const levels = useMemo(() => intensityLevels(totals), [totals])
  const first = parseISO(`${month}-01`)
  const offset = (getDay(first) + 6) % 7 // Monday-first
  const focusDay = selectedDay ?? today ?? 1

  const move = (e: KeyboardEvent<HTMLButtonElement>, day: number) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (!delta) return
    e.preventDefault()
    const target = Math.min(totals.length, Math.max(1, day + delta))
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${target}"]`)?.focus()
  }

  return (
    <div className="calendar">
      <div className="calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d.slice(0, 1)}<span className="wd-rest">{d.slice(1)}</span></span>
        ))}
      </div>
      <div className="calendar-grid" ref={gridRef} role="group" aria-label={`Daily spending, ${format(first, 'MMMM yyyy')}`}>
        {Array.from({ length: offset }, (_, i) => (
          <span key={`pad-${i}`} className="cal-pad" />
        ))}
        {totals.map((total, i) => {
          const day = i + 1
          const future = today !== null && day > today
          const label = `${format(new Date(first.getFullYear(), first.getMonth(), day), 'EEEE d MMMM')}: ${
            total ? `${money(total)} spent, ${counts[i]} ${counts[i] === 1 ? 'expense' : 'expenses'}` : 'nothing spent'
          }`
          return (
            <button
              key={day}
              data-day={day}
              className="cal-day"
              data-level={levels[i]}
              data-today={day === today || undefined}
              data-future={future || undefined}
              aria-pressed={selectedDay === day}
              aria-label={label}
              tabIndex={day === focusDay ? 0 : -1}
              disabled={future}
              onClick={() => onSelect(selectedDay === day ? null : day)}
              onKeyDown={(e) => move(e, day)}
            >
              <span className="cal-num">{day}</span>
              {total > 0 && <span className="cal-amt">{money(total, true)}</span>}
            </button>
          )
        })}
      </div>
      <div className="calendar-legend" aria-hidden="true">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="legend-cell" data-level={l} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
