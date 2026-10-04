import { addMonths, format, parseISO } from 'date-fns'
import { IconChevron } from './Icons'

interface Props {
  month: string
  onChange: (month: string) => void
  max?: string
}

export function MonthSwitcher({ month, onChange, max }: Props) {
  const date = parseISO(`${month}-01`)
  const shift = (n: number) => onChange(format(addMonths(date, n), 'yyyy-MM'))
  const atMax = max !== undefined && month >= max

  return (
    <div className="month-switcher">
      <button className="icon-btn" aria-label="Previous month" onClick={() => shift(-1)}>
        <IconChevron dir="left" />
      </button>
      <h1 className="month-title" aria-live="polite">
        {format(date, 'MMMM')} <span className="month-year">{format(date, 'yyyy')}</span>
      </h1>
      <button className="icon-btn" aria-label="Next month" onClick={() => shift(1)} disabled={atMax}>
        <IconChevron />
      </button>
    </div>
  )
}
